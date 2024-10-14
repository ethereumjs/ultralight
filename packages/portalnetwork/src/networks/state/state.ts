import { distance } from '@chainsafe/discv5'
import { ENR } from '@chainsafe/enr'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { BranchNode, Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToInt, bytesToUnprefixedHex, equalsBytes } from '@ethereumjs/util'
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

import { StateManager } from './manager.js'
import { packNibbles, unpackNibbles } from './nibbleEncoding.js'
import { AccountTrieNodeOffer, AccountTrieNodeRetrieval, StateNetworkContentType } from './types.js'
import { AccountTrieNodeContentKey, StateNetworkContentId } from './util.js'

import type { TNibbles } from './types.js'
import type { FindContentMessage } from '../../wire/types.js'
import type { BaseNetworkConfig, ContentLookupResponse } from '../index.js'
import type { Debugger } from 'debug'

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
    return bytesToUnprefixedHex(StateNetworkContentId.fromBytes(contentKey))
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
        const contentType = key[0]
        let response: ContentLookupResponse
        switch (decoded.selector) {
          case FoundContent.UTP: {
            const id = new DataView((decoded.value as Uint8Array).buffer).getUint16(0, false)
            this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
            response = await new Promise((resolve, _reject) => {
              // TODO: Figure out how to clear this listener
              this.on('ContentAdded', (contentKey: Uint8Array, value) => {
                if (equalsBytes(contentKey, key)) {
                  this.logger.extend('FOUNDCONTENT')(`received content for uTP Connection ID ${id}`)
                  resolve({ content: value, utp: true })
                }
              })
              void this.handleNewRequest({
                networkId: this.networkId,
                contentKeys: [key],
                peerId: dstId,
                connectionId: id,
                requestCode: RequestCode.FINDCONTENT_READ,
              })
            })
            break
          }
          case FoundContent.CONTENT:
            this.logger(
              `received ${StateNetworkContentType[contentType]} content corresponding to ${toHexString(key)}`,
            )
            try {
              await this.store(key, decoded.value as Uint8Array)
            } catch {
              this.logger('Error adding content to DB')
            }
            response = { content: decoded.value as Uint8Array, utp: false }
            break
          case FoundContent.ENRS: {
            this.logger(`received ${decoded.value.length} ENRs`)
            response = { enrs: decoded.value as Uint8Array[] }
            break
          }
        }
        return response
      }
    } catch (err: any) {
      this.logger(`Error sending FINDCONTENT to ${shortId(enr)} - ${err.message}`)
    }
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    const value = await this.db.get(contentKey)
    return value !== undefined ? fromHexString(value) : undefined
  }

  public store = async (contentKey: Uint8Array, content: Uint8Array) => {
    const contentType = contentKey[0]
    try {
      if (contentType === StateNetworkContentType.AccountTrieNode) {
        await this.receiveAccountTrieNodeOffer(contentKey, content)
      } else {
        await this.db.put(contentKey, content)
      }
      this.logger(`content added for: ${contentKey}`)
      this.emit('ContentAdded', contentKey, content)
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
    const { path } = AccountTrieNodeContentKey.decode(contentKey)
    const { proof } = AccountTrieNodeOffer.deserialize(content)
    const interested = await this.storeInterestedNodes(path, proof)
    return { stored: interested.interested.length }
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
      await this.db.put(contentKey, dbContent)
    }
    return { interested, notInterested }
  }
}
