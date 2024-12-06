import type { ENR } from '@chainsafe/enr'

import type { NetworkId } from '../../../networks/types.js'

export type UtpSocketKey = string

export enum RequestCode {
  FOUNDCONTENT_WRITE = 0,
  FINDCONTENT_READ = 1,
  OFFER_WRITE = 2,
  ACCEPT_READ = 3,
}

export function createSocketKey(nodeId: string, id: number) {
  return `${nodeId}-${id}`
}
export interface INewRequest {
  networkId: NetworkId
  contentKeys: Uint8Array[]
  enr: ENR
  connectionId: number
  requestCode: RequestCode
  contents?: Uint8Array
}
