import { fromHexString, toHexString } from '@chainsafe/ssz'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { Address } from '@ethereumjs/util'
import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import { shortId } from '../../util/util.js'
import { RequestCode } from '../../wire/index.js'
import { FindContentMessage, PortalWireMessageType, MessageCodes } from '../../wire/types.js'
import {
  AccountTrieProof,
  AccountTrieProofKeyType,
  AccountTrieProofType,
  BaseProtocol,
  ContractStorageTrieKeyType,
  ContractStorageTrieProofType,
  StateDB,
  StateNetworkContentType,
} from '../index.js'
import { ProtocolId } from '../types.js'

export enum FoundContent {
  'UTP' = 0,
  'CONTENT' = 1,
  'ENRS' = 2,
}

export class StateProtocol extends BaseProtocol {
  protocolId: ProtocolId.StateNetwork
  protocolName = 'StateNetwork'
  logger: Debugger
  stateDB: StateDB
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.protocolId = ProtocolId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
    this.stateDB = new StateDB()
  }

  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    const res = await this._sendFindContent(dstId, key)

    switch (res.selector) {
      case FoundContent.UTP: {
        if (!(res.value instanceof Uint8Array)) {
          throw new Error('Invalid Content Type')
        }
        const id = Buffer.from(res.value).readUint16BE()
        this.logger.extend('FOUNDCONTENT')(`received uTP Connection ID ${id}`)
        await this.handleNewRequest({
          protocolId: ProtocolId.StateNetwork,
          contentKeys: [key],
          peerId: dstId,
          connectionId: id,
          requestCode: RequestCode.FINDCONTENT_READ,
          contents: [],
        })
        return { selector: FoundContent.UTP, value: res.value }
      }
      case FoundContent.CONTENT: {
        if (!(res.value instanceof Uint8Array)) {
          throw new Error('Invalid Content Type')
        }
        this.logger(`received content corresponding to ${toHexString(key)}`)
        try {
          // TODO: Infer content type
          await this.store(key, res.value)
          return { selector: FoundContent.CONTENT, value: res.value }
        } catch (err) {
          this.logger('Error adding content to DB: ' + (err as any).message)
        }
        return { selector: FoundContent.CONTENT, value: res.value }
      }
      case FoundContent.ENRS: {
        if (!(res.value instanceof Array)) {
          throw new Error('Invalid ENR Type')
        }
        this.logger.extend('FOUNDCONTENT')(`received ${res.value.length} ENRs`)
        return { selector: FoundContent.ENRS, value: res.value }
      }
    }
  }
  private _sendFindContent = async (
    dstId: string,
    key: Uint8Array
  ): Promise<{ selector: number; value: any }> => {
    const enr = this.routingTable.getValue(dstId)
    if (!enr) {
      throw new Error(`No ENR found for ${shortId(dstId)}.  FINDCONTENT aborted.`)
    }
    const findContentMsg: FindContentMessage = { contentKey: key }
    const payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: findContentMsg,
    })
    this.logger.extend('FINDCONTENT')(`Sending to ${shortId(dstId)}`)
    const res = await this.sendMessage(enr, Buffer.from(payload), this.protocolId)
    if (res.length === 0) {
      throw new Error('No response received to FINDCONTENT message')
    }

    const portalMessage = PortalWireMessageType.deserialize(res)
    if (portalMessage.selector !== MessageCodes.CONTENT) {
      throw new Error(`Unexpected response to FINDCONTENT message: ${portalMessage.selector}`)
    }
    const contentMsg = portalMessage.value as { selector: number; value: Uint8Array }
    return contentMsg
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    // TODO: Infer content type
    return this.retrieveAccountTrieProof(contentKey)
  }

  public store = async (contentKey: Uint8Array, value: Uint8Array) => {
    const contentType = StateNetworkContentType.AccountTrieProof
    switch (contentType) {
      case StateNetworkContentType.AccountTrieProof: {
        const key = AccountTrieProofKeyType.deserialize(contentKey)
        const accountData = AccountTrieProofType.deserialize(value)
        await this.stateDB.updateAccount(key, accountData)
        break
      }
      // case StateNetworkContentType.ContractByteCode:
      //   // TODO: Figure out best way to add bytecode to DB -- bypass trie and call db.put directly
      //   break
      // case StateNetworkContentType.ContractStorageTrieProof: {
      //   const key = ContractStorageTrieKeyType.deserialize(contentKey)
      //   const storageData = ContractStorageTrieProofType.deserialize(value)
      //   await this.stateDB.updateAccount(key, storageData)
      //   break
      // }
    }
    this.emit('ContentAdded', contentType, toHexString(contentKey), toHexString(value))
  }
  public retrieveAccountTrieProof = async (contentKey: Uint8Array): Promise<Uint8Array> => {
    const { address, stateRoot } = AccountTrieProofKeyType.deserialize(contentKey)
    const stateTrie = await this.stateDB.getStateTrie(stateRoot)
    const state = new DefaultStateManager({ trie: stateTrie })
    const account = await state.getAccount(Address.fromString(toHexString(address)))
    const proof = await stateTrie.createProof(Buffer.from(address))
    const accountTrieProof: AccountTrieProof = {
      balance: account.balance,
      codeHash: account.codeHash,
      nonce: account.nonce,
      storageRoot: account.storageRoot,
      witnesses: proof.map((p) => Buffer.from(p)),
    }
    return AccountTrieProofType.serialize(accountTrieProof)
  }
}
