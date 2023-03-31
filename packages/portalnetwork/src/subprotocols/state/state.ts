import { fromHexString, toHexString } from '@chainsafe/ssz'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { Address } from '@ethereumjs/util'
import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
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
    return undefined
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    return undefined
  }

  public store = async (
    contentType: StateNetworkContentType,
    contentKey: string,
    value: Uint8Array
  ) => {
    switch (contentType) {
      case StateNetworkContentType.AccountTrieProof: {
        const key = AccountTrieProofKeyType.deserialize(fromHexString(contentKey))
        const accountData = AccountTrieProofType.deserialize(value)
        await this.stateDB.updateAccount(key, accountData)
        break
      }
      case StateNetworkContentType.ContractByteCode:
        // TODO: Figure out best way to add bytecode to DB -- bypass trie and call db.put directly
        break
      case StateNetworkContentType.ContractStorageTrieProof: {
        const key = ContractStorageTrieKeyType.deserialize(fromHexString(contentKey))
        const storageData = ContractStorageTrieProofType.deserialize(value)
        await this.stateDB.updateAccount(key, storageData)
        break
      }
    }
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
