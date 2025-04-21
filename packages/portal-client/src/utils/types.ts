export enum ConfigId {
  UdpPort = 'udp-port',
  NodeBindPort = 'node-bind-port',
}

export type InputValue = string | number | `0x${string}`
