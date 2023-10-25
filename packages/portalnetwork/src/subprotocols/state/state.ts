import debug, { Debugger } from 'debug'
import { PortalNetwork } from '../../client/client.js'
import { BaseProtocol } from '../protocol.js'
import { ProtocolId } from '../types.js'
import { toHexString } from '@chainsafe/ssz'
import { hexToBytes } from '@ethereumjs/util'

export class StateProtocol extends BaseProtocol {
  protocolId: ProtocolId.StateNetwork
  protocolName = 'StateNetwork'
  logger: Debugger
  constructor(client: PortalNetwork, nodeRadius?: bigint) {
    super(client, nodeRadius)
    this.protocolId = ProtocolId.StateNetwork
    this.logger = debug(this.enr.nodeId.slice(0, 5)).extend('Portal').extend('StateNetwork')
    this.routingTable.setLogger(this.logger)
  }

  public sendFindContent = async (_dstId: string, _key: Uint8Array) => {
    return undefined
  }

  public findContentLocally = async (contentKey: Uint8Array): Promise<Uint8Array> => {
    const value = await this.retrieve(toHexString(contentKey))
    return value ? hexToBytes(value) : hexToBytes('0x')
  }

  public routingTableInfo = async () => {
    return {
      nodeId: this.enr.nodeId,
      buckets: [['']],
    }
  }

  public stateStore = async (contentKey: string, content: string) => {
    this.put(ProtocolId.StateNetwork, contentKey, content)
    this.logger(`content added for: ${contentKey}`)
  }

  public store = async () => {}
}
