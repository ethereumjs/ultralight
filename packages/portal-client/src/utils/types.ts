import type { ENR } from "@chainsafe/enr"

export type NodeId = string

export const enum ConfigId {
  UdpPort = 'udp-port',
  NodeBindPort = 'node-bind-port',
}

export type ResponseType =
  | 'block'
  | 'bigNumber'
  | 'code'
  | 'storage'
  | 'callResult'
  | 'ether'
  | 'generic'

export interface RPCResponse {
  result?: any
  error?: {
    code: number
    message: string
  }
  responseType?: ResponseType
}

export type InputValue = 
  | string 
  | number 
  | `0x${string}`

export interface PeerItem {
  nodeId: NodeId
  enr: ENR
  status: 'Connected' | 'Disconnected'
}

export interface MethodParamConfig {
  showIncludeFullTx?: boolean
  showBlockHeight?: boolean
  showDistances?: boolean
  showEnr?: boolean
}