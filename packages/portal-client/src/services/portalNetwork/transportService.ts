import { EventEmitter } from 'events';
import { ITransportService } from '@chainsafe/discv5';
import { bind, send } from "@kuyoonjo/tauri-plugin-udp";
import { listen } from "@tauri-apps/api/event";
import { multiaddr as ma } from '@multiformats/multiaddr';
import { decodePacket, encodePacket } from '@chainsafe/discv5/packet';
import { getSocketAddressOnENR } from '@chainsafe/discv5';

import type { Multiaddr } from '@multiformats/multiaddr';
import type { IPacket } from '@chainsafe/discv5/packet';
import type { IPMode, IRemoteInfo, TransportEventEmitter } from '@chainsafe/discv5';
import type { ENR } from '@chainsafe/enr';
import type { SocketAddress } from '@chainsafe/discv5';

/**
 * TauriUDPTransportService adapts the Portal Network's ITransportService interface 
 * for use with Tauri's UDP plugin
 */
export class TauriUDPTransportService
  extends (EventEmitter as { new (): TransportEventEmitter })
  implements ITransportService
{
  private socketId: string;
  private isListening = false;
  private unlisten: (() => void) | null = null;
  
  bindAddrs: Multiaddr[] = [];
  ipMode: IPMode = {
    ip4: true,
    ip6: false,
  };
  
  private srcId: string;
  private rateLimiter?: any;

  /**
   * Creates a new TauriUDPTransportService
   * @param multiaddr The multiaddr to bind to 
   * @param srcId Source ID for packet encoding/decoding
   * @param rateLimiter Optional rate limiter
   */
  constructor(multiaddr: Multiaddr, srcId: string, rateLimiter?: any) {
    super();
    this.bindAddrs = [multiaddr];
    this.srcId = srcId;
    this.rateLimiter = rateLimiter;
    // Generate a unique identifier for this socket
    this.socketId = `portal-network-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Starts the transport service by binding to the specified UDP port
   */
  public async start(): Promise<void> {
    if (this.isListening) {
      return;
    }

    const opts = this.bindAddrs[0].toOptions();
    const port = Number.isInteger(opts.port) ? opts.port : 9000;
    const address = opts.host || '0.0.0.0';
    
    try {
      // Bind to the UDP port
      await bind(this.socketId, `${address}:${port}`);
      console.log(`UDP Transport bound to ${address}:${port}`);
      
      // Set up listener for incoming packets
      this.unlisten = await listen("plugin://udp", (event) => {
        // Only process events for our socket
        const payload = event.payload as { id: string, remoteAddress: string, remotePort: number, buffer: string | Uint8Array };
        if (payload.id === this.socketId) {
          const { remoteAddress, remotePort, buffer } = event.payload as { remoteAddress: string, remotePort: number, buffer: string | Uint8Array };
          
          // Convert base64 buffer to Uint8Array if needed
          let data: Uint8Array;
          if (typeof buffer === 'string') {
            data = this.base64ToUint8Array(buffer);
          } else {
            data = new Uint8Array(buffer);
          }
          
          // Process the incoming packet
          this.handleIncoming(data, {
            family: 'IPv4',
            address: remoteAddress,
            port: remotePort,
            size: data.length,
          });
        }
      });
      
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start UDP transport:', error);
      throw error;
    }
  }

  /**
   * Stops the transport service
   */
  public async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    
    try {
      // Unbind the socket
      if (this.unlisten) {
        this.unlisten();
        this.unlisten = null;
      }
      
      // Additional cleanup if needed
      // await unbind(this.socketId); // Uncomment if the UDP plugin has an unbind function
      
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop UDP transport:', error);
      throw error;
    }
  }

  /**
   * Sends a packet to the specified address
   */
  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening) {
      throw new Error('Transport not started');
    }
    
    const nodeAddr = to.toOptions();
    const encodedPacket = encodePacket(toId, packet);
    
    try {
      // Convert the Uint8Array to base64 if the UDP plugin expects it
      const buffer = this.uint8ArrayToBase64(encodedPacket);
      
      // Send the packet
      await send(this.socketId, `${nodeAddr.host}:${nodeAddr.port}`, buffer);
    } catch (error) {
      console.error('Failed to send packet:', error);
      throw error;
    }
  }

  /**
   * Handles incoming UDP packets
   */
  private handleIncoming = (data: Uint8Array, rinfo: IRemoteInfo): void => {
    // Apply rate limiting if configured
    if (this.rateLimiter && !this.rateLimiter.allowEncodedPacket(rinfo.address)) {
      return;
    }
    
    // Create a multiaddr from the remote info
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    );
    
    try {
      // Decode the packet
      const packet = decodePacket(this.srcId, data);
      
      // Emit the packet event for the discv5 library to process
      this.emit('packet', multiaddr, packet);
    } catch (e) {
      // Emit decode errors
      this.emit('decodeError', e as any, multiaddr);
    }
  };

  /**
   * Gets a contactable address from an ENR
   */
  public getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode);
  }

  /**
   * Add expected response for rate limiter
   */
  public addExpectedResponse?(ipAddress: string): void {
    if (this.rateLimiter && this.rateLimiter.addExpectedResponse) {
      this.rateLimiter.addExpectedResponse(ipAddress);
    }
  }

  /**
   * Remove expected response for rate limiter
   */
  public removeExpectedResponse?(ipAddress: string): void {
    if (this.rateLimiter && this.rateLimiter.removeExpectedResponse) {
      this.rateLimiter.removeExpectedResponse(ipAddress);
    }
  }

  /**
   * Utility to convert Uint8Array to base64
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    return btoa(
      Array.from(array)
        .map(val => String.fromCharCode(val))
        .join('')
    );
  }

  /**
   * Utility to convert base64 to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    return new Uint8Array(
      Array.from(binaryString)
        .map(char => char.charCodeAt(0))
    );
  }
}