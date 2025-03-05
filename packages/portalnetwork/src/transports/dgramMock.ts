import { EventEmitter } from 'events'
import { bind, send } from '@kuyoonjo/tauri-plugin-udp'
import { listen } from '@tauri-apps/api/event'

type SocketOptions = {
  type: string
  recvBufferSize?: number
  sendBufferSize?: number
  reuseAddr?: boolean
}

type RemoteInfo = {
  address: string
  family: string
  port: number
  size: number
}

class MockDgramSocket extends EventEmitter {
  private socketId: string
  private isListening = false
  private unlisten: (() => void) | null = null
  private isClosed = false

  constructor(typeOrOptions: string | SocketOptions) {
    super()
    this.socketId = `portal-client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    console.log('Created MockDgramSocket with ID:', this.socketId)
  }

  private async setupListener() {
    if (this.unlisten || this.isClosed) return
    
    try {
      this.unlisten = await listen('plugin://udp', (event) => {
        if (this.isClosed) return
        
        const payload = event.payload as {
          id: string
          remoteAddress: string
          remotePort: number
          buffer: string | Uint8Array
        }
        
        if (payload.id === this.socketId) {
          const { remoteAddress, remotePort, buffer } = payload
          
          let data: Buffer
          if (typeof buffer === 'string') {
            data = Buffer.from(this.base64ToUint8Array(buffer))
          } else {
            data = Buffer.from(buffer)
          }
          
          const rinfo: RemoteInfo = {
            address: remoteAddress,
            family: 'IPv4',
            port: remotePort,
            size: data.length,
          }
          
          this.emit('message', data, rinfo)
        }
      })
    } catch (err) {
      console.error('Error setting up UDP listener:', err)
      this.emit('error', err)
    }
  }

  bind(port: number, address: string = '0.0.0.0', callback?: (error?: Error) => void) {
    if (this.isClosed) {
      const error = new Error('Socket is closed')
      if (callback) callback(error)
      return
    }
    
    // Setup listener if not already set up
    this.setupListener().catch(err => {
      console.error('Failed to set up listener:', err)
      if (callback) callback(err instanceof Error ? err : new Error(String(err)))
    })
    
    console.log(`Binding socket to ${address}:${port}`)
    
    bind(this.socketId, `${address}:${port}`)
      .then(() => {
        if (this.isClosed) return
        
        this.isListening = true
        console.log(`Socket bound to ${address}:${port}`)
        this.emit('listening')
        
        if (callback) callback()
      })
      .catch((error) => {
        console.error('Bind error:', error)
        this.emit('error', error)
        
        if (callback) callback(error instanceof Error ? error : new Error(String(error)))
      })
  }

  send(
    buffer: Buffer | Uint8Array,
    offset: number,
    length: number,
    port: number,
    address: string,
    callback?: (error?: Error) => void
  ) {
    if (this.isClosed) {
      const error = new Error('Socket is closed')
      if (callback) callback(error)
      return
    }
    
    if (!this.isListening) {
      const error = new Error('Socket is not bound')
      if (callback) callback(error)
      return
    }
    
    console.log(`Sending ${length} bytes to ${address}:${port}`)
    
    try {
      const data = buffer.slice(offset, offset + length)
      const base64Data = this.uint8ArrayToBase64(new Uint8Array(data))
      
      send(this.socketId, `${address}:${port}`, base64Data)
        .then(() => {
          console.log(`Sent ${length} bytes to ${address}:${port}`)
          if (callback) callback()
        })
        .catch((error) => {
          console.error('Send error:', error)
          if (callback) callback(error instanceof Error ? error : new Error(String(error)))
        })
    } catch (error) {
      console.error('Unexpected send error:', error)
      if (callback) callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  close(callback?: (error?: Error) => void) {
    if (this.isClosed) {
      if (callback) callback()
      return
    }
    
    console.log('Closing socket')
    this.isClosed = true
    
    try {
      if (this.unlisten) {
        this.unlisten()
        this.unlisten = null
      }
      
      this.isListening = false
      this.emit('close')
      
      if (callback) callback()
    } catch (error) {
      console.error('Error closing socket:', error)
      if (callback) callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  address() {
    // This method should return bound address info
    // This is often expected by socket libraries
    if (!this.isListening) {
      throw new Error('Socket is not bound')
    }
    
    return {
      address: '0.0.0.0', // You might want to store the actual address in bind()
      family: 'IPv4',
      port: 0 // You might want to store the actual port in bind()
    }
  }

  private uint8ArrayToBase64(array: Uint8Array): string {
    return btoa(
      Array.from(array)
        .map((val) => String.fromCharCode(val))
        .join('')
    )
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    return new Uint8Array(Array.from(binaryString).map((char) => char.charCodeAt(0)))
  }
}

const mockDgram = {
  createSocket: (typeOrOptions: string | SocketOptions) => {
    console.log('[Dgram] Creating socket with:', typeOrOptions)
    return new MockDgramSocket(typeOrOptions)
  }
}

// Apply polyfill globally
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.dgram = mockDgram
  console.log('dgram polyfill applied to window')
}

if (typeof global !== 'undefined') {
  // @ts-ignore
  global.dgram = mockDgram
  console.log('dgram polyfill applied globally')
}

export default mockDgram

// class MockDgramSocket extends EventEmitter {
//   private socketId: string
//   //@ts-ignore
//   private isListening = false
//   private unlisten: (() => void) | null = null

//   //@ts-ignore
//   constructor(typeOrOptions: string | SocketOptions) {
//     super()
//     this.socketId = `portal-client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
//     console.log('Created MockDgramSocket with ID:', this.socketId)
    
//     // Set up Tauri UDP plugin listener
//     this.setupListener().catch(err => {
//       console.error('Failed to set up listener:', err)
//     })
//   }

//   private async setupListener() {
//     try {
//       this.unlisten = await listen('plugin://udp', (event) => {
//         const payload = event.payload as {
//           id: string
//           remoteAddress: string
//           remotePort: number
//           buffer: string | Uint8Array
//         }
        
//         if (payload.id === this.socketId) {
//           const { remoteAddress, remotePort, buffer } = payload
          
//           let data: Buffer
//           if (typeof buffer === 'string') {
//             data = Buffer.from(this.base64ToUint8Array(buffer))
//           } else {
//             data = Buffer.from(buffer)
//           }
          
//           const rinfo: RemoteInfo = {
//             address: remoteAddress,
//             family: 'IPv4',
//             port: remotePort,
//             size: data.length,
//           }
          
//           this.emit('message', data, rinfo)
//         }
//       })
//     } catch (err) {
//       console.error('Error setting up UDP listener:', err)
//     }
//   }

//   bind(port: number, address: string, callback?: (error?: Error) => void) {
//     try {
//       console.log(`Binding socket to ${address}:${port}`)
//       bind(this.socketId, `${address}:${port}`).then(() => {
//         this.isListening = true
//         console.log(`Socket bound to ${address}:${port}`)
//         if (callback) callback()
//       }).catch((error) => {
//         console.error('Bind error:', error)
//         if (callback) callback(error)
//       })
//     } catch (error) {
//       console.error('Unexpected bind error:', error)
//       if (callback) callback(error as Error)
//     }
//   }

//   send(
//     buffer: Buffer | Uint8Array,
//     offset: number,
//     length: number,
//     port: number,
//     address: string,
//     callback?: (error?: Error) => void
//   ) {
//     try {
//       console.log(`Sending ${length} bytes to ${address}:${port}`)
//       const data = buffer.slice(offset, offset + length)
//       const base64Data = this.uint8ArrayToBase64(new Uint8Array(data))
      
//       send(this.socketId, `${address}:${port}`, base64Data)
//         .then(() => {
//           console.log(`Sent ${length} bytes to ${address}:${port}`)
//           if (callback) callback()
//         })
//         .catch((error) => {
//           console.error('Send error:', error)
//           if (callback) callback(error)
//         })
//     } catch (error) {
//       console.error('Unexpected send error:', error)
//       if (callback) callback(error as Error)
//     }
//   }

//   close(callback?: (error?: Error) => void) {
//     try {
//       console.log('Closing socket')
//       if (this.unlisten) {
//         this.unlisten()
//         this.unlisten = null
//       }
//       this.isListening = false
//       if (callback) callback()
//     } catch (error) {
//       console.error('Error closing socket:', error)
//       if (callback) callback(error as Error)
//     }
//   }

//   private uint8ArrayToBase64(array: Uint8Array): string {
//     return btoa(
//       Array.from(array)
//         .map((val) => String.fromCharCode(val))
//         .join('')
//     )
//   }

//   private base64ToUint8Array(base64: string): Uint8Array {
//     const binaryString = atob(base64)
//     return new Uint8Array(Array.from(binaryString).map((char) => char.charCodeAt(0)))
//   }
// }

// const mockDgram = {
//   createSocket: (typeOrOptions: string | SocketOptions) => {
//     console.log('[Dgram] Creating socket with:', typeOrOptions)
//     return new MockDgramSocket(typeOrOptions)
//   }
// }

// // Apply polyfill globally
// if (typeof window !== 'undefined') {
//   // @ts-ignore
//   window.dgram = mockDgram
//   console.log('dgram polyfill applied to window')
// }

// if (typeof global !== 'undefined') {
//   // @ts-ignore
//   global.dgram = mockDgram
//   console.log('dgram polyfill applied globally')
// }

// export default mockDgram