import { Discv5 } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { UtpProtocol } from '..'
import { HistoryNetworkContentKey, PortalNetwork } from '../../..'

interface UtpRequestKey {
  contentKey: HistoryNetworkContentKey
  peerId: string
}
interface HistoryNetworkContentRequest {
  type: 'snd' | 'rcv'
  uTP: UtpProtocol
  content: Uint8Array | undefined
}

export class PortalNetworkUTP {
  portal: PortalNetwork
  client: Discv5
  openHistoryNetworkRequests: Map<UtpRequestKey, HistoryNetworkContentRequest> // TODO enable other networks
  logger: Debugger

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client
    this.logger = portal.logger.extend(`uTP`)
    this.openHistoryNetworkRequests = new Map<UtpRequestKey, HistoryNetworkContentRequest>()
  }
  handleNewHistoryNetworkRequest(
    type: `snd` | `rcv`,
    contentKey: HistoryNetworkContentKey,
    peerId: string,
    content?: Uint8Array
  ) {
    const uTP: UtpProtocol = new UtpProtocol()
    const key: UtpRequestKey = { contentKey, peerId }
    const newRequest: HistoryNetworkContentRequest = { type, uTP, content }
    this.openHistoryNetworkRequests.set(key, newRequest)
  }
}
