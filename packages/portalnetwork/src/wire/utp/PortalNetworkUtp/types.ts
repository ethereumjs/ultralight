import { ProtocolId } from '../../../subprotocols'

export type UtpSocketKey = string

export enum RequestCode {
  'FOUNDCONTENT_WRITE' = 0,
  'FINDCONTENT_READ' = 1,
  'OFFER_WRITE' = 2,
  'ACCEPT_READ' = 3,
}

export function createSocketKey(remoteAddr: string, sndId: number, rcvId: number) {
  return `${remoteAddr.slice(0, 5)}-${sndId}-${rcvId}`
}
export interface INewRequest {
  protocolId: ProtocolId
  contentKeys: Uint8Array[]
  peerId: string
  connectionId: number
  requestCode: RequestCode
  contents?: Uint8Array[]
}
