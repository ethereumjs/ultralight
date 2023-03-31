import { fromHexString } from '@chainsafe/ssz'
import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import {
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
}
