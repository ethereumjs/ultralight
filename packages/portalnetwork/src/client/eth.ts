import { PortalNetwork } from '.'
import {
  BeaconLightClientNetwork,
  HistoryProtocol,
  ProtocolId,
  StateProtocol,
} from '../subprotocols'

export class ETH {
  history?: HistoryProtocol
  state?: StateProtocol
  beacon?: BeaconLightClientNetwork

  constructor(portal: PortalNetwork) {
    this.history = portal.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    this.state = portal.protocols.get(ProtocolId.StateNetwork) as StateProtocol
    this.beacon = portal.protocols.get(
      ProtocolId.BeaconLightClientNetwork,
    ) as BeaconLightClientNetwork
  }

  ethGetBalance = async (address: string, blockNumber: bigint): Promise<bigint | undefined> => {
    if (!this.history) {
      throw new Error('Cannot get StateRoot by number without HistoryNetwork')
    }

    if (!this.state) {
      throw new Error('Cannot get balance without StateNetwork')
    }
    const stateRoot = await this.history.getStateRoot(blockNumber)
    if (!stateRoot) {
      throw new Error(`Unable to find StateRoot for block ${blockNumber}`)
    }
    return this.state.stateDB.getBalance(address, stateRoot)
  }
}
