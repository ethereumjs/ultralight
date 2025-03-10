
import { listen, emit } from '@tauri-apps/api/event'
import { EventEmitter } from 'events'
import { invoke } from '@tauri-apps/api/core'

interface SocketOptions {
  type: 'udp4' | 'udp6'
  reuseAddr?: boolean
  recvBufferSize?: number
  sendBufferSize?: number
}

interface RemoteInfo {
  address: string
  family: 'IPv4' | 'IPv6'
  port: number
  size: number
}

class UDPSocket extends EventEmitter {
  private socketId: string
  private isClosed: boolean = false
  private boundAddress: string | null = null
  private boundPort: number | null = null
  private unlistenFn: (() => void) | null = null

  constructor(options: SocketOptions) {
    super()
    this.socketId = `udp-socket-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    console.log(`Created UDP socket with ID: ${this.socketId}`, options)
  }

  async bind(port: number, address: string = '0.0.0.0', callback?: (error?: Error) => void): Promise<void> {
    try {
      console.log(`Binding socket ${this.socketId} to ${address}:${port}`)
      
      await invoke('plugin:udp|bind', {
        id: this.socketId,
        bindAt: `${address}:${port}`,
        broadcast: true
      })

      this.boundAddress = address
      this.boundPort = port
      
      this.unlistenFn = await listen('plugin://udp', async (event) => {
        const payload = event.payload as {
          id: string
          remoteAddress: string
          remotePort: number
          buffer: string
        }
        
        if (payload.id === this.socketId) {
          try {
            const buffer = this.base64ToBuffer(payload.buffer)
            
            const remoteInfo: RemoteInfo = {
              address: payload.remoteAddress,
              family: payload.remoteAddress.includes(':') ? 'IPv6' : 'IPv4',
              port: payload.remotePort,
              size: buffer.length,
            }
            
            this.emit('message', buffer, remoteInfo)
          } catch (err) {
            console.error('Error processing incoming UDP message:', err)
            this.emit('error', err)
          }
        }
      })
      
      if (callback) callback()
    } catch (error) {
      console.error('Failed to bind UDP socket:', error)
      if (callback) callback(error as Error)
      else throw error
    }
  }

  send(
    msg: Buffer | Uint8Array | string,
    offset: number,
    length: number,
    port: number,
    address: string,
    callback?: (error?: Error) => void
  ): void {
    if (this.isClosed) {
      const error = new Error('Socket is closed')
      if (callback) callback(error)
      else this.emit('error', error)
      return
    }

    (async () => {
      try {
        let buffer: Uint8Array
        
        if (typeof msg === 'string') {
          const encoder = new TextEncoder()
          buffer = encoder.encode(msg).slice(offset, offset + length)
        } else if (msg instanceof Buffer) {
          buffer = new Uint8Array(msg.buffer, msg.byteOffset + offset, length)
        } else {
          buffer = msg.slice(offset, offset + length)
        }

        const base64Data = this.bufferToBase64(buffer)
        
        await invoke('plugin:udp|send', {
          id: this.socketId,
          target: `${address}:${port}`,
          message: base64Data
        })
        
        if (callback) callback()
      } catch (error) {
        console.error('Failed to send UDP packet:', error)
        if (callback) callback(error as Error)
        else this.emit('error', error)
      }
    })()
  }

  close(callback?: () => void): void {
    if (this.isClosed) {
      if (callback) callback()
      return
    }

    (async () => {
      try {
        if (this.unlistenFn) {
          await this.unlistenFn()
          this.unlistenFn = null
        }

        await invoke('plugin:udp|close', {
          id: this.socketId
        })

        this.isClosed = true
        this.emit('close')
        if (callback) callback()
      } catch (error) {
        console.error('Failed to close UDP socket:', error)
        this.emit('error', error)
      }
    })()
  }

  address() {
    if (this.isClosed || !this.boundAddress || !this.boundPort) {
      throw new Error('Socket is not bound')
    }
    
    return {
      address: this.boundAddress,
      family: this.boundAddress.includes(':') ? 'IPv6' : 'IPv4',
      port: this.boundPort
    }
  }

  private base64ToBuffer(base64: string): Buffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return Buffer.from(bytes)
  }

  private bufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}

const dgramPolyfill = {
  createSocket(options: SocketOptions | string): UDPSocket {
    if (typeof options === 'string') {
      options = { type: options as 'udp4' | 'udp6' }
    }
    return new UDPSocket(options)
  }
}

export default dgramPolyfill