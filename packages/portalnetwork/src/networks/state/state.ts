import { ENR, distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BranchNode, ExtensionNode, LeafNode, Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToHex, bytesToInt, hexToBytes } from '@ethereumjs/util'
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

import { addressToNibbles, packNibbles, unpackNibbles } from './nibbleEncoding.js'
import { StateDB } from './statedb.js'
import { AccountTrieNodeOffer, AccountTrieNodeRetrieval, StateNetworkContentType } from './types.js'
import { AccountTrieNodeContentKey, StateNetworkContentId, nextOffer } from './util.js'

import type { TNibbles } from './types.js'
import type { PortalNetwork } from '../../client/client.js'
import type { FindContentMessage } from '../../wire/types.js'
import type { Debugger } from 'debug'

export class StateNetwork extends BaseNetwork {
  stateDB: StateDB
  networkId: NetworkId.StateNetwork
  networkName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.nodeRadius = nodeRadius ?? 2n ** 253n
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.stateDB = new StateDB(client.db.db)
    this.routingTable.setLogger(this.logger)
    client.uTP.on(
      NetworkId.StateNetwork,
      async (contentType: any, contentKey: Uint8Array, content: Uint8Array) => {
        await this.store(contentType, toHexString(contentKey.slice(1)), content)
      },
    )
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
    this.metrics?.findContentMessagesSent.inc()
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
        this.metrics?.contentMessagesReceived.inc()
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
              await this.store(key[0], toHexString(key.slice(1)), decoded.value as Uint8Array)
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

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array> => {
    const value = await this.stateDB.getContent(contentKey)
    return value !== undefined ? fromHexString(value) : hexToBytes('0x')
  }

  public routingTableInfo = async () => {
    return {
      nodeId: this.enr.nodeId,
      buckets: this.routingTable.buckets.map((bucket) => bucket.values().map((enr) => enr.nodeId)),
    }
  }

  public store = async (
    contentType: StateNetworkContentType,
    contentKey: string,
    content: Uint8Array,
  ) => {
    const fullkey = Uint8Array.from([contentType, ...fromHexString(contentKey)])
    if (contentType === StateNetworkContentType.AccountTrieNode) {
      await this.receiveAccountTrieNodeOffer(fullkey, content)
    } else {
      await this.stateDB.storeContent(fullkey, content)
    }
    this.logger(`content added for: ${contentKey}`)
    this.emit('ContentAdded', contentKey, contentType, content)
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
    gossipCount: number
  }> {
    const { path } = AccountTrieNodeContentKey.decode(contentKey)
    const { blockHash, proof } = AccountTrieNodeOffer.deserialize(content)
    const forwardOffer = await this.forwardAccountTrieOffer(path, proof, blockHash)
    const interested = await this.storeInterestedNodes(path, proof)
    const gossipCount = await this.gossipContent(forwardOffer.contentKey, forwardOffer.content)
    return { stored: interested.interested.length, forwarded: forwardOffer, gossipCount }
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
      const in_radius = distance(bytesToHex(contentId).slice(2), this.enr.nodeId) < this.nodeRadius
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

  async getAccount(address: string, stateroot: Uint8Array, deleteAfter: boolean = true) {
    const lookupTrie = new Trie({
      useKeyHashing: true,
      db: this.stateDB.db,
    })
    lookupTrie.root(stateroot)
    const addressPath = addressToNibbles(fromHexString(address))
    const lookupFunction = async (key: Uint8Array) => {
      const lookup = new ContentLookup(this, key)
      const request = await lookup.startLookup()
      const requestContent = request && 'content' in request ? request.content : undefined
      const keyobj = AccountTrieNodeContentKey.decode(key)
      if (requestContent === undefined) {
        throw new Error(
          `network doesn't have node [${unpackNibbles(keyobj.path)}]${toHexString(
            keyobj.nodeHash,
          )}`,
        )
      }
      const node = AccountTrieNodeRetrieval.deserialize(requestContent).node
      return { nodeHash: keyobj.nodeHash, node }
    }
    const hasRoot = this.stateDB.db._database.get(toHexString(stateroot).slice(2))
    if (hasRoot === undefined) {
      const lookup = new ContentLookup(
        this,
        AccountTrieNodeContentKey.encode({
          path: packNibbles([]),
          nodeHash: stateroot,
        }),
      )
      const request = await lookup.startLookup()
      const requestContent = request && 'content' in request ? request.content : new Uint8Array()
      const node = AccountTrieNodeRetrieval.deserialize(requestContent).node
      this.stateDB.db.temp.set(toHexString(stateroot).slice(2), toHexString(node).slice(2))
    }
    let accountPath = await lookupTrie.findPath(lookupTrie['hash'](fromHexString(address)))
    while (!accountPath.node) {
      const consumedNibbles = accountPath.stack
        .slice(1)
        .map((n) => (n instanceof BranchNode ? 1 : n.keyLength()))
        .reduce((a, b) => a + b, 0)
      const nodePath = addressPath.slice(0, consumedNibbles)
      const current = accountPath.stack[accountPath.stack.length - 1]
      const nextNodeHash =
        current instanceof BranchNode
          ? current.getBranch(parseInt(addressPath[consumedNibbles], 16))
          : current instanceof ExtensionNode
            ? current.value()
            : Uint8Array.from([])
      if (current instanceof LeafNode) {
        return current.value()
      }
      const nextContentKey = AccountTrieNodeContentKey.encode({
        path: packNibbles(nodePath),
        nodeHash: nextNodeHash as Uint8Array,
      })
      const found = await lookupFunction(nextContentKey)
      if ((await this.stateDB.db.get(toHexString(found.nodeHash).slice(2))) === undefined) {
        this.stateDB.db.temp.set(
          toHexString(found.nodeHash).slice(2),
          toHexString(found.node).slice(2),
        )
      }
      accountPath = await lookupTrie.findPath(lookupTrie['hash'](fromHexString(address)))
    }
    if (deleteAfter) {
      this.stateDB.db.temp.clear()
    }
    return accountPath.node.value()
  }
}
