import { UtpSocketType } from '../Packets/PacketTyping.js'

import { ReadSocket } from './ReadSocket.js'
import { WriteSocket } from './WriteSocket.js'

import type { UtpSocketOptions } from '../Packets/PacketTyping.js'

export * from './congestionControl.js'
export * from './ContentReader.js'
export * from './ContentWriter.js'
export * from './ReadSocket.js'
export * from './socketTyping.js'
export * from './UtpSocket.js'
export * from './WriteSocket.js'

export type SocketType = ReadSocket | WriteSocket

export function createUtpSocket(options: UtpSocketOptions): SocketType {
  if (options.type === UtpSocketType.READ) {
    return new ReadSocket(options)
  } else {
    return new WriteSocket(options)
  }
}
