import {
  ENR,
  fromHexString,
  getContentId,
  getContentKey,
  ContentType,
  HistoryProtocol,
  reassembleBlock,
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

  addToOffer = (type: ContentType): void => {
    this.dispatch({
      type: PeerStateChange.SETOFFER,
      payload: [...this.state.offer, getContentId(type, this.state.blockHash)],
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

  handleFindNodes = async (peer: ENR) => {
    return await this.historyProtocol.sendFindNodes(peer.nodeId, [parseInt(this.state.distance)])
  }

  handleOffer = async (enr: string) => {
    return await this.historyProtocol.sendOffer(ENR.decodeTxt(enr).nodeId, this.state.offer)
  }

  sendFindContent = async (type: string, enr: string) => {
    if (type === 'header') {
      const headerContentId = fromHexString(
        getContentKey(
          ContentType.BlockHeader,
          Buffer.from(fromHexString(this.state.blockHash))
        )
      )
      const header = await this.historyProtocol.sendFindContent(
        ENR.decodeTxt(enr).nodeId,
        headerContentId
      )
      const block = reassembleBlock(header!.value as Uint8Array, undefined)
      return block //
    } else if (type === 'body') {
      const headerContentKey = fromHexString(
        getContentKey(
          ContentType.BlockHeader,
          Buffer.from(fromHexString(this.state.blockHash))
        )
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, headerContentKey)
      const bodyContentKey = fromHexString(
        getContentKey(
          ContentType.BlockBody,
          Buffer.from(fromHexString(this.state.blockHash))
        )
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, bodyContentKey)
    } else if (type === 'epoch') {
      const epochContentKey = fromHexString(
        getContentKey(
          ContentType.EpochAccumulator,
          this.historyProtocol.accumulator.getHistoricalEpochs[this.state.epoch]
        )
      )
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, epochContentKey)
    }
  }
}
