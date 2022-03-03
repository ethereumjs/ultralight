import { Discv5 } from '@chainsafe/discv5'
import { Debugger } from 'debug'
import { UtpProtocol } from '..'
import { HistoryNetworkContentKey, PortalNetwork } from '../../..'

interface HistoryNetworkContentRequest {
  type: 'snd' | 'rcv'
  uTP: UtpProtocol
  content: Uint8Array
}

export class PortalNetworkUTP {
  portal: PortalNetwork
  client: Discv5
  openHistoryNetworkRequests: Map<HistoryNetworkContentKey, HistoryNetworkContentRequest> // TODO enable other networks
  logger: Debugger

  constructor(portal: PortalNetwork) {
    this.portal = portal
    this.client = portal.client
    this.logger = portal.logger.extend(`uTP`)
    this.openHistoryNetworkRequests = new Map<
      HistoryNetworkContentKey,
      HistoryNetworkContentRequest
    >()
  }
}
