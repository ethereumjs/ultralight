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
