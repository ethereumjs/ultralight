import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import { BaseProtocol } from '../protocol.js'
import { ProtocolId } from '../types.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { bytesToInt, hexToBytes } from '@ethereumjs/util'
import { ENR } from '@chainsafe/discv5'
import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import {
  FindContentMessage,
  PortalWireMessageType,
  MessageCodes,
  ContentMessageType,
  FoundContent,
} from '../../wire/types.js'
import { decodeHistoryNetworkContentKey } from '../history/util.js'
import { AccountTrieProofType, StateNetworkContentType } from './types.js'
import {
  eth_getBalance,
  eth_getCode,
  eth_getStorageAt,
  eth_getTransactionCount,
  eth_call,
  eth_estimateGas,
} from './eth.js'
import { StateDB } from './statedb.js'

export class StateProtocol extends BaseProtocol {
  stateDB: StateDB
  protocolId: ProtocolId.StateNetwork
  protocolName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.stateDB = new StateDB(this)
    this.protocolId = ProtocolId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
    client.uTP.on(ProtocolId.StateNetwork, async (contentKey: Uint8Array, content: Uint8Array) => {
      await this.stateStore(toHexString(contentKey), toHexString(content))
    })
  }

  /**
   * {@link eth_getBalance}
   */
  public eth_getBalance = eth_getBalance.bind(this)

  /**
   * {@link eth_getStorageAt}
   */
  public eth_getStorageAt = eth_getStorageAt.bind(this)

  /**
   * {@link eth_getTransactionCount}
   */
  public eth_getTransactionCount = eth_getTransactionCount.bind(this)

  /**
   * {@link eth_getCode}
   */
  public eth_getCode = eth_getCode.bind(this)

  /**
   * {@link eth_call}
   */
  public eth_call = eth_call.bind(this)

  /**
   * {@link eth_estimateGas}
   */
  public eth_estimateGas = eth_estimateGas.bind(this)

  /**
   * Send FINDCONTENT request for content corresponding to `key` to peer corresponding to `dstId`
   * @param dstId node id of peer
   * @param key content key defined by the subprotocol spec
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
    const res = await this.sendMessage(enr, payload, this.protocolId)
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
              protocolId: this.protocolId,
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
              await this.stateStore(toHexString(key), toHexString(decoded.value as Uint8Array))
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
    return value ?? hexToBytes('0x')
  }

  public routingTableInfo = async () => {
    return {
      nodeId: this.enr.nodeId,
      buckets: this.routingTable.buckets.map((bucket) => bucket.values().map((enr) => enr.nodeId)),
    }
  }

  public stateStore = async (contentKey: string, content: string) => {
    this.stateDB.storeContent(fromHexString(contentKey), fromHexString(content))
    this.logger(`content added for: ${contentKey}`)
  }

  public store = async () => {}

  public getAccountTrieProof = async (address: Uint8Array, stateRoot: Uint8Array) => {
    const account = await this.stateDB.getAccount(toHexString(address), toHexString(stateRoot))
    const trie = this.stateDB.getAccountTrie(toHexString(stateRoot))
    const proof = await trie.createProof(address)
    return AccountTrieProofType.serialize({
      balance: account!.balance,
      nonce: account!.nonce,
      codeHash: account!.codeHash,
      storageRoot: account!.storageRoot,
      witnesses: proof,
    })
  }
}
