import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import { BaseNetwork } from '../network.js'
import { NetworkId } from '../types.js'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Account, Address, bytesToInt, hexToBytes } from '@ethereumjs/util'
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
  eth_getCode,
  eth_getStorageAt,
  eth_getTransactionCount,
  eth_call,
  eth_estimateGas,
} from './eth.js'
import { StateDB } from './statedb.js'
import { getStateNetworkContentKey } from './util.js'
import { ContentLookup } from '../contentLookup.js'

export class StateNetwork extends BaseNetwork {
  stateDB: StateDB
  networkId: NetworkId.StateNetwork
  networkName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.stateDB = new StateDB(this)
    this.networkId = NetworkId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
    client.uTP.on(NetworkId.StateNetwork, async (contentKey: Uint8Array, content: Uint8Array) => {
      await this.store(toHexString(contentKey), toHexString(content))
    })
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
              await this.store(toHexString(key), toHexString(decoded.value as Uint8Array))
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

  public store = async (contentKey: string, content: string) => {
    this.stateDB.storeContent(fromHexString(contentKey), fromHexString(content))
    this.logger(`content added for: ${contentKey}`)
  }

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

  public getAccount = async (address: string, stateRoot: string) => {
    let account
    account = await this.stateDB.getAccount(address, stateRoot)
    if (account !== undefined) return account
    const contentKey = getStateNetworkContentKey({
      address: Address.fromString(address),
      stateRoot: fromHexString(stateRoot),
      contentType: StateNetworkContentType.AccountTrieProof,
    })
    const lookup = new ContentLookup(this, contentKey)
    const res = (await lookup.startLookup()) as { content: Uint8Array; utp: boolean }
    if (res.content !== undefined) {
      const decoded = AccountTrieProofType.deserialize(res.content)
      account = Account.fromAccountData({
        balance: decoded.balance,
        nonce: decoded.nonce,
        codeHash: decoded.codeHash,
        storageRoot: decoded.storageRoot,
      })
    }
    return account
  }
}
