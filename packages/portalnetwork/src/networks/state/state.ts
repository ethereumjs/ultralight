import { ENR } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { bytesToInt, hexToBytes } from '@ethereumjs/util'
import debug from 'debug'

import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import {
  ContentMessageType,
  FoundContent,
  MessageCodes,
  PortalWireMessageType,
} from '../../wire/types.js'
import { decodeHistoryNetworkContentKey } from '../history/util.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'

import { StateDB } from './statedb.js'
import { StateNetworkContentType } from './types.js'

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
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.stateDB = new StateDB(client.db.sublevel(NetworkId.StateNetwork))
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
    const nibbles = unpackNibbles(path.packedNibbles, path.isOddLength)
    const newpaths = [...nibbles]
    const nodes = [...proof].slice(0, -1)
    const gossipContents: { contentKey: Uint8Array; content: Uint8Array }[] = []

    while (nodes.length > 0) {
      const rlp = nodes.pop()!
      const curNode = decodeNode(rlp)
      if (curNode instanceof BranchNode) {
        newpaths.pop()
      } else if (curNode instanceof ExtensionNode) {
        newpaths.splice(-curNode.key().length)
      } else {
        this.logger('Should only gossip upper node paths.', curNode)
        throw new Error('Should have already removed leaf node from array')
      }
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](rlp)
      const contentKey = AccountTrieNodeContentKey.encode({
        nodeHash,
        path: tightlyPackNibbles(newpaths),
      })
      const gossipContent = AccountTrieNodeOffer.serialize({ blockHash, proof: nodes })
      gossipContents.push({ contentKey, content: gossipContent })
      const contentId = StateNetworkContentId.fromBytes(contentKey)
      const in_radius = distance(bytesToHex(contentId), this.enr.nodeId) < this.nodeRadius
      if (in_radius) {
        const content = AccountTrieNodeRetrieval.serialize({
          node: rlp,
        })
        await this.stateDB.storeContent(contentKey, content)
      }
      for (const { content, contentKey } of gossipContents) {
        // Gossip Node+Proof for content in peers' radius
        await this.gossipContent(contentKey, content)
      }
    }
    return gossipContents
  }
}
