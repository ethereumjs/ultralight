import { distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { BranchNode, LeafNode, Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToInt, bytesToUnprefixedHex } from '@ethereumjs/util'
import { VM } from '@ethereumjs/vm'
import debug from 'debug'

import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import {
  ContentMessageType,
  FoundContent,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { ContentLookup } from '../contentLookup.js'
import { decodeHistoryNetworkContentKey } from '../history/util.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'

import { applyTransactions } from './applyTx.js'
import { addressToNibbles, packNibbles, unpackNibbles } from './nibbleEncoding.js'
import { StateDB } from './statedb.js'
import { AccountTrieNodeOffer, AccountTrieNodeRetrieval, StateNetworkContentType } from './types.js'
import { AccountTrieNodeContentKey, StateNetworkContentId, nextOffer } from './util.js'

import type { TNibbles } from './types.js'
import type { FindContentMessage } from '../../wire/types.js'
import type { BaseNetworkConfig } from '../index.js'
import type { Block } from '@ethereumjs/block'
import type { RunBlockOpts } from '@ethereumjs/vm'
import type { Debugger } from 'debug'

export class StateNetwork extends BaseNetwork {
  stateDB: StateDB
  networkId: NetworkId.StateNetwork
  networkName = 'StateNetwork'
  logger: Debugger
  constructor({ client, db, radius, maxStorage }: BaseNetworkConfig) {
    super({ client, db, radius, maxStorage, networkId: NetworkId.StateNetwork })
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.stateDB = new StateDB(this.db.db)
    this.routingTable.setLogger(this.logger)
  }

  public contentKeyToId = (contentKey: string): string => {
    return bytesToUnprefixedHex(StateNetworkContentId.fromBytes(fromHexString(contentKey)))
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subnetwork spec
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    const enr = dstId.startsWith('enr:')
      ? ENR.decodeTxt(dstId)
      : this.routingTable.getWithPending(dstId)?.value
        ? this.routingTable.getWithPending(dstId)?.value
        : this.routingTable.getWithPending(dstId.slice(2))?.value
    if (!enr) {
      this.logger(`No ENR found for ${shortId(dstId)}.  FINDCONTENT aborted.`)
      return
    }
    this.portal.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(enr)}`)
    const res = await this.sendMessage(enr, payload, this.networkId)
    if (res.length === 0) {
      return undefined
    }

    try {
      if (bytesToInt(res.slice(0, 1)) === MessageCodes.CONTENT) {
        this.portal.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(enr)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentKey = decodeHistoryNetworkContentKey(toHexString(key))
        const contentHash = contentKey.blockHash
        const contentType = contentKey.contentType

        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            await this.handleNewRequest({
              networkId: this.networkId,
              contentKeys: [key],
              peerId: dstId,
              connectionId: id,
              requestCode: RequestCode.FINDCONTENT_READ,
              contents: [],
            })
            break
          }
          case FoundContent.CONTENT:
            this.logger(
              `received ${StateNetworkContentType[contentType]} content corresponding to ${contentHash}`,
            )
            try {
              await this.store(toHexString(key), decoded.value as Uint8Array)
            } catch {
              this.logger('Error adding content to DB')
            }
            break
          case FoundContent.ENRS: {
            this.logger(`received ${decoded.value.length} ENRs`)
            break
          }
        }
        return decoded
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr)} - ${err.message}`)
    }
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    const value = await this.stateDB.getContent(contentKey)
    return value !== undefined ? fromHexString(value) : undefined
  }

  public routingTableInfo = async () => {
    return {
      nodeId: this.enr.nodeId,
      buckets: this.routingTable.buckets.map((bucket) => bucket.values().map((enr) => enr.nodeId)),
    }
  }

  public store = async (contentKey: string, content: Uint8Array) => {
    const _contentKey = fromHexString(contentKey)
    const contentType = _contentKey[0]
    try {
      if (contentType === StateNetworkContentType.AccountTrieNode) {
        await this.receiveAccountTrieNodeOffer(_contentKey, content)
      } else {
        await this.stateDB.storeContent(_contentKey, content)
      }
      this.logger(`content added for: ${contentKey}`)
      this.emit('ContentAdded', contentKey, contentType, content)
    } catch (err: any) {
      this.logger(`Error storing content: ${err.message}`)
    }
  }
  async receiveAccountTrieNodeOffer(
    contentKey: Uint8Array,
    content: Uint8Array,
  ): Promise<{
    stored: number
    forwarded: {
      contentKey: Uint8Array
      content: Uint8Array
    }
  }> {
    const { path } = AccountTrieNodeContentKey.decode(contentKey)
    const { blockHash, proof } = AccountTrieNodeOffer.deserialize(content)
    const forwardOffer = await this.forwardAccountTrieOffer(path, proof, blockHash)
    const interested = await this.storeInterestedNodes(path, proof)
    return { stored: interested.interested.length, forwarded: forwardOffer }
  }

  async storeInterestedNodes(path: TNibbles, proof: Uint8Array[]) {
    const nodes = [...proof]
    const nibbles = unpackNibbles(path)
    const newpaths = [...nibbles]
    const interested: { contentKey: Uint8Array; dbContent: Uint8Array }[] = []
    const notInterested: { contentKey: Uint8Array; nodeHash: string }[] = []
    let curRlp = nodes.pop()
    while (curRlp) {
      const curNode = decodeNode(curRlp)
      if (curNode instanceof BranchNode) {
        newpaths.pop()
      } else {
        newpaths.splice(-curNode.key().length)
      }
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](curRlp)
      const contentKey = AccountTrieNodeContentKey.encode({
        nodeHash,
        path: packNibbles(newpaths),
      })
      const contentId = StateNetworkContentId.fromBytes(contentKey)
      const in_radius = distance(bytesToUnprefixedHex(contentId), this.enr.nodeId) < this.nodeRadius
      if (in_radius) {
        const dbContent = AccountTrieNodeRetrieval.serialize({
          node: curRlp,
        })
        interested.push({ contentKey, dbContent })
      } else {
        notInterested.push({ contentKey, nodeHash: toHexString(nodeHash) })
      }
      curRlp = nodes.pop()
    }
    for (const { contentKey, dbContent } of interested) {
      await this.stateDB.storeContent(contentKey, dbContent)
    }
    return { interested, notInterested }
  }

  async forwardAccountTrieOffer(
    path: TNibbles,
    proof: Uint8Array[],
    blockHash: Uint8Array,
  ): Promise<{
    content: Uint8Array
    contentKey: Uint8Array
  }> {
    const { nodes, newpaths } = await nextOffer(path, proof)
    const content = AccountTrieNodeOffer.serialize({ blockHash, proof: [...nodes] })
    const nodeHash = new Trie({ useKeyHashing: true })['hash'](nodes[nodes.length - 1])
    const contentKey = AccountTrieNodeContentKey.encode({
      nodeHash,
      path: packNibbles(newpaths),
    })
    return { content, contentKey }
  }

  async getAccount(
    address: string,
    stateroot: Uint8Array,
    deleteAfter: boolean = true,
  ): Promise<Uint8Array | undefined> {
    const accountPath = await this.findPath(stateroot, address)
    if (deleteAfter) {
      this.stateDB.db.temp.clear()
    }
    return accountPath.node?.value() ?? undefined
  }
  async lookupTrieNode(key: Uint8Array) {
    const lookup = new ContentLookup(this, key)
    const request = await lookup.startLookup()
    const keyobj = AccountTrieNodeContentKey.decode(key)
    if (request === undefined || !('content' in request)) {
      throw new Error(
        `network doesn't have node [${unpackNibbles(keyobj.path)}]${toHexString(keyobj.nodeHash)}`,
      )
    }
    const node = AccountTrieNodeRetrieval.deserialize(request.content).node
    return { nodeHash: keyobj.nodeHash, node }
  }
  async findPath(stateroot: Uint8Array, address: string) {
    const lookupTrie = new Trie({
      useKeyHashing: true,
      db: this.stateDB.db,
    })
    lookupTrie.root(stateroot)
    const addressPath = addressToNibbles(fromHexString(address))
    const hasRoot = this.stateDB.db._database.get(bytesToUnprefixedHex(stateroot))
    if (hasRoot === undefined) {
      const lookup = new ContentLookup(
        this,
        AccountTrieNodeContentKey.encode({
          path: packNibbles([]),
          nodeHash: stateroot,
        }),
      )
      const request = await lookup.startLookup()
      if (request === undefined || !('content' in request)) {
        throw new Error(`network doesn't have root node ${toHexString(stateroot)}`)
      }
      const requestContent = request.content
      const node = AccountTrieNodeRetrieval.deserialize(requestContent).node
      this.stateDB.db.temp.set(bytesToUnprefixedHex(stateroot), bytesToUnprefixedHex(node))
    }
    let accountPath = await lookupTrie.findPath(lookupTrie['hash'](fromHexString(address)))
    while (!accountPath.node) {
      const consumedNibbles = accountPath.stack
        .slice(1)
        .map((n) => (n instanceof BranchNode ? 1 : n.keyLength()))
        .reduce((a, b) => a + b, 0)
      const nodePath = addressPath.slice(0, consumedNibbles)
      const current = accountPath.stack[accountPath.stack.length - 1]
      if (current instanceof LeafNode) {
        return { ...accountPath }
      }
      const nextNodeHash =
        current instanceof BranchNode
          ? current.getBranch(parseInt(addressPath[consumedNibbles], 16))
          : current.value()

      if (nextNodeHash === undefined || nextNodeHash === null) {
        return { ...accountPath }
      }
      const nextContentKey = AccountTrieNodeContentKey.encode({
        path: packNibbles(nodePath),
        nodeHash: nextNodeHash as Uint8Array,
      })
      const found = await this.lookupTrieNode(nextContentKey)
      if ((await this.stateDB.db.get(toHexString(found.nodeHash).slice(2))) === undefined) {
        this.stateDB.db.temp.set(
          bytesToUnprefixedHex(found.nodeHash),
          bytesToUnprefixedHex(found.node),
        )
      }
      const nextPath = await lookupTrie.findPath(lookupTrie['hash'](fromHexString(address)))
      if (nextPath.stack.length === accountPath.stack.length) {
        return { ...nextPath }
      }
      accountPath = nextPath
    }
    return { ...accountPath }
  }
  async vm(stateroot: Uint8Array) {
    const common = new Common({
      chain: Chain.Mainnet,
      hardfork: Hardfork.Chainstart,
    })
    const portalClientTrie = new Trie({
      useKeyHashing: true,
      db: this.stateDB.db,
      root: stateroot,
    })
    const portalStateManager = new DefaultStateManager({
      trie: portalClientTrie,
      common,
      accountCacheOpts: {
        deactivate: true,
      },
    })
    const portalVM = await VM.create({
      common,
      stateManager: portalStateManager,
    })
    return portalVM
  }
  runBlock = async (stateroot: Uint8Array, block: Block, opts: RunBlockOpts) => {
    const vm = await this.vm(stateroot)
    return applyTransactions.bind(vm)(block, opts)
  }
}
