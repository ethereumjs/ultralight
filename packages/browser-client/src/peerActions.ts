import {
  ENR,
  fromHexString,
  HistoryNetworkContentKeyType,
  HistoryNetworkContentTypes,
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

  addToOffer = (type: HistoryNetworkContentTypes): void => {
    this.dispatch({
      type: PeerStateChange.ADDTOOFFER,
      payload: HistoryNetworkContentKeyType.serialize({
        selector: type,
        value: {
          chainId: 1,
          blockHash: fromHexString(this.state.blockHash),
        },
      }),
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

  handleRequestSnapshot = (enr: string) => {
    const accumulatorKey = HistoryNetworkContentKeyType.serialize({
      selector: 4,
      value: { selector: 0, value: null },
    })
    this.historyProtocol.sendFindContent(ENR.decodeTxt(enr).nodeId, accumulatorKey)
  }

  handleOffer = async (enr: string) => {
    await this.historyProtocol.sendOffer(ENR.decodeTxt(enr).nodeId, this.state.offer)
  }

  sendFindContent = async (type: string, enr: string) => {
    if (type === 'header') {
      const headerKey = HistoryNetworkContentKeyType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(this.state.blockHash),
        },
      })
      const header = await this.historyProtocol.sendFindContent(
        ENR.decodeTxt(enr).nodeId,
        headerKey
      )
      const block = reassembleBlock(header!.value as Uint8Array, undefined)
      return block //
    } else if (type === 'body') {
      const headerKey = HistoryNetworkContentKeyType.serialize({
        selector: 0,
        value: {
          chainId: 1,
          blockHash: fromHexString(this.state.blockHash),
        },
      })
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, headerKey)
      const bodyKey = HistoryNetworkContentKeyType.serialize({
        selector: 1,
        value: {
          chainId: 1,
          blockHash: fromHexString(this.state.blockHash),
        },
      })
      this.historyProtocol!.sendFindContent(ENR.decodeTxt(enr).nodeId, bodyKey)
    } else if (type === 'epoch') {
      const _epochKey = HistoryNetworkContentKeyType.serialize({
        selector: 3,
        value: {
          chainId: 1,
          blockHash: this.historyProtocol.accumulator.historicalEpochs()[this.state.epoch],
        },
      })
    }
  }
}
