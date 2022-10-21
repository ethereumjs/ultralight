import {
  ENR,
  fromHexString,
  getHistoryNetworkContentId,
  HistoryNetworkContentTypes,
  HistoryProtocol,
  reassembleBlock,
  toHexString,
} from 'portalnetwork'
import { PeerContextType, PeerDispatch, PeerState, PeerStateChange } from './peerReducer'

export class PeerActions {
  state: PeerState
  dispatch: PeerDispatch
  historyProtocol: HistoryProtocol
  constructor(peerContext: PeerContextType, protocol: HistoryProtocol) {
    this.state = peerContext.peerState
    this.dispatch = peerContext.peerDispatch
    this.historyProtocol = protocol
  }

  addToOffer = (type: HistoryNetworkContentTypes): void => {
    this.dispatch({
      type: PeerStateChange.ADDTOOFFER,
      payload: getHistoryNetworkContentId(type, this.state.blockHash),
    })
  }

  handlePing = async (enr: string) => {
    this.dispatch({ type: PeerStateChange.PING, payload: ['yellow.200', 'PINGING'] })
    setTimeout(async () => {
      const pong = await this.historyProtocol.sendPing(ENR.decodeTxt(enr))
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

  handleFindNodes = (peer: ENR) => {
    this.historyProtocol.sendFindNodes(peer.nodeId, [parseInt(this.state.distance)])
  }

  handleOffer = async (enr: string) => {
    await this.historyProtocol.sendOffer(ENR.decodeTxt(enr).nodeId, this.state.offer)
  }

  sendFindContent = async (type: string, enr: string) => {
    if (type === 'header') {
      const headerContentId = fromHexString(
        getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, this.state.blockHash)
      )
      const header = await this.historyProtocol.sendFindContent(
        ENR.decodeTxt(enr).nodeId,
        headerContentId
      )
      const block = reassembleBlock(header!.value as Uint8Array, undefined)
      return block //
    } else if (type === 'body') {
      const headerContentId = fromHexString(
        getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockHeader, this.state.blockHash)
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, headerContentId)
      const bodyContentId = fromHexString(
        getHistoryNetworkContentId(HistoryNetworkContentTypes.BlockBody, this.state.blockHash)
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, bodyContentId)
    } else if (type === 'epoch') {
      const epochContentId = fromHexString(
        getHistoryNetworkContentId(
          HistoryNetworkContentTypes.EpochAccumulator,
          toHexString(this.historyProtocol.accumulator.historicalEpochs()[this.state.epoch])
        )
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, epochContentId)
    }
  }
}
