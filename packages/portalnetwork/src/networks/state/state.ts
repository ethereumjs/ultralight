import { distance } from '@chainsafe/discv5'
import {
  BranchMPTNode,
  ExtensionMPTNode,
  MerklePatriciaTrie as Trie,
  decodeMPTNode,
} from '@ethereumjs/mpt'
import {
  type PrefixedHexString,
  bytesToHex,
  bytesToInt,
  bytesToUnprefixedHex,
  equalsBytes,
  hexToBytes,
} from '@ethereumjs/util'
import debug from 'debug'

import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import {
  ContentMessageType,
  FoundContent,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'

import type { ENR } from '@chainsafe/enr'
import type { Debugger } from 'debug'
import type { FindContentMessage, Version } from '../../wire/types.js'
import type { BaseNetworkConfig, ContentLookupResponse } from '../index.js'
import { StateManager } from './manager.js'
import { packNibbles, unpackNibbles } from './nibbleEncoding.js'
import {
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  ContractCodeOffer,
  ContractRetrieval,
  StateNetworkContentType,
  StorageTrieNodeOffer,
  StorageTrieNodeRetrieval,
} from './types.js'
import type { TNibbles } from './types.js'
import {
  decodeAccountTrieNodeContentKey,
  decodeContractCodeContentKey,
  decodeStorageTrieNodeContentKey,
  encodeAccountTrieNodeContentKey,
  encodeStorageTrieNodeContentKey,
  extractAccountProof,
  nextOffer,
  stateNetworkContentIdFromBytes,
} from './util.js'

export class StateNetwork extends BaseNetwork {
  networkId: NetworkId.StateNetwork
  networkName = 'StateNetwork'
  logger: Debugger
  stateroots: Map<bigint, Uint8Array> = new Map()
  manager: StateManager

  constructor({ client, db, radius, maxStorage }: BaseNetworkConfig) {
    super({ client, db, radius, maxStorage, networkId: NetworkId.StateNetwork })
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
    this.manager = new StateManager(this)
  }

  public contentKeyToId = (contentKey: Uint8Array): string => {
    return bytesToUnprefixedHex(stateNetworkContentIdFromBytes(contentKey))
  }

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subnetwork spec
   * @returns the value of the FOUNDCONTENT response or undefined
   */
  public sendFindContent = async (enr: ENR, key: Uint8Array) => {
    let version: Version
    try {
      version = await this.portal.highestCommonVersion(enr)
    } catch (e: any) {
      this.logger.extend('error')(e.message)
      return
    }
    this.portal.metrics?.findContentMessagesSent.inc()
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType[version].serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(enr.nodeId)}`)
    const res = await this.sendMessage(enr, payload, this.networkId)
    if (res.length === 0) {
      return undefined
    }

    try {
      if (bytesToInt(res.slice(0, 1)) === MessageCodes.CONTENT) {
        this.portal.metrics?.contentMessagesReceived.inc()
        this.logger.extend('FOUNDCONTENT')(`Received from ${shortId(enr.nodeId)}`)
        const decoded = ContentMessageType.deserialize(res.subarray(1))
        const contentType = key[0]
        let response: ContentLookupResponse
        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            response = await new Promise((resolve, _reject) => {
              // TODO: Figure out how to clear this listener
              this.on('ContentAdded', (contentKey: Uint8Array, value) => {
                if (equalsBytes(contentKey, key) === true) {
                  this.logger.extend('FOUNDCONTENT')(`received content for uTP Connection ID ${id}`)
                  resolve({ content: value, utp: true })
                }
              })
              void this.handleNewRequest({
                networkId: this.networkId,
                contentKeys: [key],
                enr,
                connectionId: id,
                requestCode: RequestCode.FINDCONTENT_READ,
                version,
              })
            })
            break
          }
          case FoundContent.CONTENT:
            this.logger.extend('FOUNDCONTENT')(
              `received ${StateNetworkContentType[contentType]} content corresponding to ${bytesToHex(key)}`,
            )
            try {
              await this.store(key, decoded.value as Uint8Array, false)
            } catch {
              this.logger('Error adding content to DB')
            }
            response = { content: decoded.value as Uint8Array, utp: false }
            break
          case FoundContent.ENRS: {
            this.logger.extend('FOUNDCONTENT')(`received ${decoded.value.length} ENRs`)
            response = { enrs: decoded.value as Uint8Array[] }
            break
          }
        }
        return response
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr.nodeId)} - ${err.message}`)
    }
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    try {
      const value = await this.db.get(contentKey)
      return value !== undefined ? hexToBytes(value as PrefixedHexString) : undefined
    } catch {
      return undefined
    }
  }

  public store = async (contentKey: Uint8Array, content: Uint8Array, offer = true) => {
    const contentType = contentKey[0]
    try {
      if (offer) {
        if (contentType === StateNetworkContentType.AccountTrieNode) {
          if (this.bridge) {
            await this.receiveAccountTrieNodeOffer(contentKey, content)
          } else {
            await this.storeAccountTrieNode(contentKey, content)
          }
        } else if (contentType === StateNetworkContentType.ContractTrieNode) {
          if (this.bridge) {
            await this.receiveStorageTrieNodeOffer(contentKey, content)
          } else {
            await this.storeStorageTrieNode(contentKey, content)
          }
        } else {
          await this.receiveContractCodeOffer(contentKey, content)
        }
        await this.gossipContent(contentKey, content)
      } else {
        if (contentType === StateNetworkContentType.AccountTrieNode) {
          const { nodeHash } = decodeAccountTrieNodeContentKey(contentKey)
          this.manager.trie.db.local.set(bytesToUnprefixedHex(nodeHash), bytesToHex(contentKey))
        } else if (contentType === StateNetworkContentType.ContractTrieNode) {
          const { nodeHash } = decodeStorageTrieNodeContentKey(contentKey)
          this.manager.trie.db.local.set(bytesToUnprefixedHex(nodeHash), bytesToHex(contentKey))
        }
        await this.db.put(contentKey, content)
      }
      this.logger(`content added for: ${bytesToHex(contentKey)}`)
      this.emit('ContentAdded', contentKey, content)
      this.gossipManager.add(contentKey)
    } catch (err: any) {
      this.logger(`Error storing content: ${err.message}`)
    }
  }
  async receiveAccountTrieNodeOffer(
    contentKey: Uint8Array,
    content: Uint8Array,
  ): Promise<{
    stored: number
  }> {
    const { path } = decodeAccountTrieNodeContentKey(contentKey)
    const { proof, blockHash } = AccountTrieNodeOffer.deserialize(content)
    const interested = await this.storeInterestedAccountTrieNodes(path, proof)
    void this.forwardAccountTrieOffer(path, proof, blockHash)
    return { stored: interested.interested.length }
  }

  async storeInterestedAccountTrieNodes(path: TNibbles, proof: Uint8Array[]) {
    const nodes = [...proof]
    const nibbles = unpackNibbles(path)
    this.logger.extend('storeInterestedNodes')(`Nodes: ${proof.length}.  Path: [${nibbles}]`)
    const newpaths = [...nibbles]
    const interested: { contentKey: Uint8Array; dbContent: Uint8Array }[] = []
    const notInterested: { contentKey: Uint8Array; nodeHash: string }[] = []
    let curRlp = nodes.pop()
    let i = 0
    while (curRlp) {
      const curNode = decodeMPTNode(curRlp)
      if (i > 0) {
        if (curNode instanceof BranchMPTNode) {
          newpaths.pop()
        } else if (curNode instanceof ExtensionMPTNode) {
          const consumed = newpaths.splice(-curNode._nibbles.length)
          this.logger.extend('storeInterestedNodes')(
            `Node nibbles (${curNode._nibbles.length}): [${consumed}].  Path: [${newpaths}]`,
          )
        }
      }
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](curRlp)
      this.logger.extend('storeInterestedNodes')(
        `${i} Path: [${newpaths}] - ${curNode.constructor.name}: ${bytesToHex(nodeHash).slice(0, 8)}...`,
      )
      i++
      const contentKey = encodeAccountTrieNodeContentKey({
        nodeHash,
        path: packNibbles(newpaths),
      })
      const contentId = stateNetworkContentIdFromBytes(contentKey)
      const in_radius = distance(bytesToUnprefixedHex(contentId), this.enr.nodeId) < this.nodeRadius
      if (in_radius) {
        const dbContent = AccountTrieNodeRetrieval.serialize({
          node: curRlp,
        })
        interested.push({ contentKey, dbContent })
        this.manager.trie.db.local.set(bytesToUnprefixedHex(nodeHash), bytesToHex(contentKey))
      } else {
        notInterested.push({ contentKey, nodeHash: bytesToHex(nodeHash) })
      }

      curRlp = nodes.pop()
    }
    for (const { contentKey, dbContent } of interested) {
      await this.db.put(contentKey, dbContent)
      this.emit('ContentAdded', contentKey, dbContent)
    }
    return { interested, notInterested }
  }

  async forwardAccountTrieOffer(path: TNibbles, proof: Uint8Array[], blockHash: Uint8Array) {
    const { nodes, newpaths } = nextOffer(path, proof)
    const content = AccountTrieNodeOffer.serialize({ blockHash, proof: [...nodes] })
    const nodeHash = new Trie({ useKeyHashing: true })['hash'](nodes[nodes.length - 1])
    const contentKey = encodeAccountTrieNodeContentKey({
      nodeHash,
      path: packNibbles(newpaths),
    })
    await this.gossipContent(contentKey, content)
    return { content, contentKey }
  }

  async storeAccountTrieNode(contentKey: Uint8Array, content: Uint8Array) {
    const { proof } = AccountTrieNodeOffer.deserialize(content)
    const curRlp = proof.pop()!
    const dbContent = StorageTrieNodeRetrieval.serialize({
      node: curRlp,
    })
    await this.db.put(contentKey, dbContent)
    this.emit('ContentAdded', contentKey, dbContent)
  }

  async storeStorageTrieNode(contentKey: Uint8Array, content: Uint8Array) {
    const { storageProof } = StorageTrieNodeOffer.deserialize(content)
    const curRlp = storageProof.pop()!
    const dbContent = StorageTrieNodeRetrieval.serialize({
      node: curRlp,
    })
    await this.db.put(contentKey, dbContent)
    this.emit('ContentAdded', contentKey, dbContent)
  }

  async receiveStorageTrieNodeOffer(
    contentKey: Uint8Array,
    content: Uint8Array,
  ): Promise<{
    stored: number
  }> {
    const { addressHash, path } = decodeStorageTrieNodeContentKey(contentKey)
    const { blockHash, accountProof, storageProof } = StorageTrieNodeOffer.deserialize(content)
    const interested = await this.storeInterestedStorageTrieNodes(path, storageProof, addressHash)
    await this.receiveAccountTrieNodeOffer(
      ...extractAccountProof(addressHash, accountProof, blockHash),
    )
    void this.forwardStorageTrieOffer(path, storageProof, accountProof, blockHash, addressHash)
    return { stored: interested.interested.length }
  }
  async storeInterestedStorageTrieNodes(
    path: TNibbles,
    proof: Uint8Array[],
    addressHash: Uint8Array,
  ) {
    const nodes = [...proof]
    const nibbles = unpackNibbles(path)
    this.logger.extend('storeInterestedStorageTrieNodes')(
      `Nodes: ${proof.length}.  Path: [${nibbles}]`,
    )
    const newpaths = [...nibbles]
    const interested: { contentKey: Uint8Array; dbContent: Uint8Array }[] = []
    const notInterested: { contentKey: Uint8Array; nodeHash: string }[] = []
    let curRlp = nodes.pop()
    let i = 0
    while (curRlp) {
      const curNode = decodeMPTNode(curRlp)
      if (i > 0) {
        if (curNode instanceof BranchMPTNode) {
          newpaths.pop()
        } else if (curNode instanceof ExtensionMPTNode) {
          const consumed = newpaths.splice(-curNode._nibbles.length)
          this.logger.extend('storeInterestedStorageTrieNodes')(
            `Node nibbles (${curNode._nibbles.length}): [${consumed}].  Path: [${newpaths}]`,
          )
        }
      }
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](curRlp)
      this.logger.extend('storeInterestedStorageTrieNodes')(
        `${i} Path: [${newpaths}] - ${curNode.constructor.name}: ${bytesToHex(nodeHash).slice(0, 8)}...`,
      )
      i++
      const contentKey = encodeStorageTrieNodeContentKey({
        nodeHash,
        path: packNibbles(newpaths),
        addressHash,
      })
      const contentId = stateNetworkContentIdFromBytes(contentKey)
      const in_radius = distance(bytesToUnprefixedHex(contentId), this.enr.nodeId) < this.nodeRadius
      if (in_radius) {
        const dbContent = StorageTrieNodeRetrieval.serialize({
          node: curRlp,
        })
        interested.push({ contentKey, dbContent })
        this.manager.trie.db.local.set(bytesToUnprefixedHex(nodeHash), bytesToHex(contentKey))
      } else {
        notInterested.push({ contentKey, nodeHash: bytesToHex(nodeHash) })
      }

      curRlp = nodes.pop()
    }
    for (const { contentKey, dbContent } of interested) {
      await this.db.put(contentKey, dbContent)
      this.emit('ContentAdded', contentKey, dbContent)
    }
    return { interested, notInterested }
  }
  async forwardStorageTrieOffer(
    path: TNibbles,
    storageProof: Uint8Array[],
    accountProof: Uint8Array[],
    blockHash: Uint8Array,
    addressHash: Uint8Array,
  ) {
    const { nodes, newpaths } = nextOffer(path, storageProof)
    const content = StorageTrieNodeOffer.serialize({
      blockHash,
      accountProof,
      storageProof: [...nodes],
    })
    const nodeHash = new Trie({ useKeyHashing: true })['hash'](nodes[nodes.length - 1])
    const contentKey = encodeStorageTrieNodeContentKey({
      nodeHash,
      path: packNibbles(newpaths),
      addressHash,
    })
    await this.gossipContent(contentKey, content)
    return { content, contentKey }
  }
  async receiveContractCodeOffer(contentKey: Uint8Array, content: Uint8Array) {
    const { addressHash, codeHash } = decodeContractCodeContentKey(contentKey)
    const { accountProof, blockHash, code } = ContractCodeOffer.deserialize(content)
    const codeContent = ContractRetrieval.serialize({ code })
    this.manager.trie.db.local.set(bytesToUnprefixedHex(codeHash), bytesToHex(contentKey))
    await this.db.put(contentKey, codeContent)
    this.emit('ContentAdded', contentKey, codeContent)
    await this.receiveAccountTrieNodeOffer(
      ...extractAccountProof(addressHash, accountProof, blockHash),
    )
  }
}
