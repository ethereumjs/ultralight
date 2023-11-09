import {
  ENR,
  fromHexString,
  getContentId,
  getContentKey,
  HistoryNetworkContentType,
  HistoryNetwork,
  reassembleBlock,
  epochRootByIndex,
} from 'portalnetwork'
import { PeerContextType, PeerDispatch, PeerState, PeerStateChange } from './peerReducer'

export class PeerActions {
  state: PeerState
  dispatch: PeerDispatch
  historyNetwork: HistoryNetwork
  constructor(peerContext: PeerContextType, network: HistoryNetwork) {
    this.state = peerContext.peerState
    this.dispatch = peerContext.peerDispatch
    this.historyNetwork = network
  }

  addToOffer = (type: HistoryNetworkContentType): void => {
    this.dispatch({
      type: PeerStateChange.SETOFFER,
      payload: [...this.state.offer, getContentId(type, this.state.blockHash)],
    })
  }

  handlePing = async (enr: string) => {
    this.dispatch({ type: PeerStateChange.PING, payload: ['yellow.200', 'PINGING'] })
    setTimeout(async () => {
      const pong = await this.historyNetwork.sendPing(ENR.decodeTxt(enr))
      if (pong) {
        this.dispatch({ type: PeerStateChange.PING, payload: ['green.200', 'PONG RECEIVED!'] })
        setTimeout(() => {
          this.dispatch({ type: PeerStateChange.PING, payload: ['blue.200', 'PING'] })
        }, 1500)
      } else {
        this.dispatch({ type: PeerStateChange.PING, payload: ['red.200', 'PING FAILED'] })
        setTimeout(() => {
          this.dispatch({ type: PeerStateChange.PING, payload: ['blue.200', 'PINGING'] })
        }, 1000)
      }
    }, 500)
  }

  handleFindNodes = async (peer: ENR) => {
    return await this.historyNetwork.sendFindNodes(peer.nodeId, [parseInt(this.state.distance)])
  }

  handleOffer = async (enr: string) => {
    return await this.historyNetwork.sendOffer(ENR.decodeTxt(enr).nodeId, this.state.offer)
  }

  sendFindContent = async (type: string, enr: string) => {
    if (type === 'header') {
      const headerContentId = fromHexString(
        getContentKey(HistoryNetworkContentType.BlockHeader, fromHexString(this.state.blockHash)),
      )
      const header = await this.historyNetwork.sendFindContent(
        ENR.decodeTxt(enr).nodeId,
        headerContentId,
      )
      const block = reassembleBlock(header!.value as Uint8Array, undefined)
      return block //
    } else if (type === 'body') {
      const headerContentKey = fromHexString(
        getContentKey(HistoryNetworkContentType.BlockHeader, fromHexString(this.state.blockHash)),
      )
      this.historyNetwork!.sendFindContent(ENR.decodeTxt(enr).nodeId, headerContentKey)
      const bodyContentKey = fromHexString(
        getContentKey(HistoryNetworkContentType.BlockBody, fromHexString(this.state.blockHash)),
      )
      this.historyNetwork!.sendFindContent(ENR.decodeTxt(enr).nodeId, bodyContentKey)
    } else if (type === 'epoch') {
      const epochContentKey = fromHexString(
        getContentKey(HistoryNetworkContentType.EpochAccumulator, epochRootByIndex(this.state.epoch)),
      )
      this.historyNetwork!.sendFindContent(ENR.decodeTxt(enr).nodeId, epochContentKey)
    }
  }
}
