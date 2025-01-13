import type { ENR } from '@chainsafe/enr'

import type { NetworkId } from '../../../networks/types.js'
import type { INodeAddress } from '@chainsafe/discv5/lib/session/nodeInfo.js'

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
  enr: ENR | INodeAddress
  connectionId: number
  requestCode: RequestCode
  contents?: Uint8Array
}


export const MAX_IN_FLIGHT_PACKETS = 3

export type RequestId = number