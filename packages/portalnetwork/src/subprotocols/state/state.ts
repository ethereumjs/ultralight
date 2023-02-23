import { Union } from '@chainsafe/ssz/lib/interface.js'
import { debug, Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import { BaseProtocol } from '../protocol.js'
import { ProtocolId } from '../types.js'

export class StateProtocol extends BaseProtocol {
  protocolId: ProtocolId
  protocolName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.protocolId = ProtocolId.HistoryNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
  }

  public sendFindContent = async (dstId: string, key: Uint8Array) => {
    return undefined
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array | undefined> => {
    return undefined
  }

  public store = async () => {}
}
