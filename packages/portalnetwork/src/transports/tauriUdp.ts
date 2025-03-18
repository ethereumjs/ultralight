import { EventEmitter } from 'events'
import { bytesToNumber, ITransportService } from '@chainsafe/discv5'
import { multiaddr as ma } from '@multiformats/multiaddr'
import { 
  encodeHeader, 
  MASKING_IV_SIZE, 
  MASKING_KEY_SIZE, 
  PROTOCOL_SIZE, 
  VERSION_SIZE, 
  FLAG_SIZE, 
  NONCE_SIZE, 
  AUTHDATA_SIZE_SIZE, 
  STATIC_HEADER_SIZE 
} from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { bind, send } from "@kuyoonjo/tauri-plugin-udp"
import { listen } from "@tauri-apps/api/event"
import { bytesToUtf8, concatBytes, hexToBytes } from '@ethereumjs/util'
import localCrypto from './localCrypto'

import type { Multiaddr } from '@multiformats/multiaddr'
import type { IPacket } from '@chainsafe/discv5/packet'
import type { IPMode, IRemoteInfo, TransportEventEmitter, SocketAddress } from '@chainsafe/discv5'
import type { ENR } from '@chainsafe/enr'

interface UdpMessage {
  id: string;
  addr: string;
  port: number;
  data: number[];
}

export class TauriUDPTransportService 
  extends (EventEmitter as { new (): TransportEventEmitter }) 
  implements ITransportService {
  
  private socketId: string;
  private isListening = false;
  private unlisten: (() => void) | null = null;
  
  bindAddrs: Multiaddr[] = [];
  ipMode: IPMode = {
    ip4: true,
    ip6: false,
  };
  
  private srcId: string;
  
  constructor(multiaddr: Multiaddr, srcId: string) {
    super();
    this.bindAddrs = [multiaddr];
    this.srcId = srcId;
    // Create a unique socket ID
    this.socketId = `portal-client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  public async start(): Promise<void> {
    if (this.isListening) return;
    
    const opts = this.bindAddrs[0].toOptions();
    console.log('Starting UDP transport with options:', opts);
    const port = Number.isInteger(opts.port) ? opts.port : 0;
    const host = opts.host || '0.0.0.0';
    const address = `${host}:${port}`;
    
    try {
      await bind(this.socketId, address);
      console.log(`UDP socket bound to ${address}`);
      
      this.unlisten = await listen("plugin://udp", (event) => {
        console.log('event ', event)
        const payload = event.payload as UdpMessage;
        
        if (payload.id !== this.socketId) {
          return;
        }
      
        const data = new Uint8Array(payload.data);
        
        const [address, port] = payload.addr.split(':')
        const rinfo: IRemoteInfo = {
          address,
          port: Number(port),
          family: payload.addr.includes(':') ? 'IPv6' : 'IPv4',
          size: payload.data.length,
        };
        
        this.handleIncoming(data, rinfo);
      });
      
      this.isListening = true;
      console.log(`UDP Transport started with socket ID: ${this.socketId}`);
    } catch (error) {
      console.error('Failed to start UDP transport:', error);
      throw error;
    }
  }
  
  public async stop(): Promise<void> {
    if (!this.isListening) return;
    
    try {
      if (this.unlisten) {
        this.unlisten();
        this.unlisten = null;
      }
      
      this.isListening = false;
      console.log('UDP Transport stopped');
    } catch (error) {
      console.error('Failed to stop UDP transport:', error);
      throw error;
    }
  }
  
  public async send(to: Multiaddr, toId: string, packet: IPacket): Promise<void> {
    if (!this.isListening) {
      throw new Error('Transport not started');
    }
    
    try {
      const nodeAddr = to.toOptions();
      console.log('before encoded packet ', packet)
      console.log('Encryption key (toId):', toId);
      const encryptionKey = hexToBytes(toId.startsWith('0x') ? toId : `0x${toId}`).slice(0, MASKING_KEY_SIZE);
      console.log('Encryption key bytes:', Array.from(encryptionKey));
      console.log('Masking IV for encryption:', Array.from(packet.maskingIv));
      const encodedHeader = await encodeHeader(toId, packet.maskingIv, packet.header);

      const fullPacket = concatBytes(packet.maskingIv, encodedHeader, packet.message);
      console.log('Full packet length:', fullPacket.length);

      const address = `${nodeAddr.host}:${nodeAddr.port}`;
      await send(this.socketId, address, Array.from(fullPacket));
      
      console.log(`Successfully sent packet to ${address}`);
    } catch (error) {
      console.error('Failed to send packet:', error);
      throw error;
    }
  }
  
  private handleIncoming = async (data: Uint8Array, rinfo: IRemoteInfo): Promise<void> => {
    console.log('rinfo ', rinfo)
    console.log(`Processing packet from ${rinfo.address}, size: ${data.length}`);
    
    const multiaddr = ma(
      `/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`
    );
    
    try {
      const packet = await decodePacketAsync(this.srcId, data);

      console.log(`Decoded packet:`, packet);
      
      this.emit('packet', multiaddr, packet);
    } catch (e) {
      console.error('Failed to decode packet:', e);
      this.emit('decodeError', e as any, multiaddr);
    }
  }
  
  public getContactableAddr(enr: ENR): SocketAddress | undefined {
    return getSocketAddressOnENR(enr, this.ipMode);
  }
}

async function decodePacketAsync(srcId: string, data: Uint8Array): Promise<IPacket> {
  try {
    console.log('Decryption key (srcId):', srcId);
    const srcIdHex = srcId.startsWith('0x') ? srcId : `0x${srcId}`;
    const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE);
    console.log('Decryption key bytes:', Array.from(decryptionKey));
    
    const maskingIv = data.slice(0, MASKING_IV_SIZE);
    console.log('Masking IV:', Array.from(maskingIv));
    
    // Create cipher with correct key
    const ctx = localCrypto.createDecipheriv("aes-128-ctr", decryptionKey, maskingIv);
    
    // Decode static header
    const headerSlice = data.slice(MASKING_IV_SIZE, MASKING_IV_SIZE + STATIC_HEADER_SIZE);
    const staticHeaderBuf = await ctx.update(headerSlice);
    
    // Important: Start by verifying the protocol ID is correctly decoded
    const protocolBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE);
    const protocolId = bytesToUtf8(new Uint8Array(protocolBytes));
    console.log('Decoded protocolId:', protocolId);

    if (protocolId !== "discv5") {
      throw new Error(`Invalid protocol id: ${protocolId}`);
    }
    
    const version = bytesToNumber(new Uint8Array(staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE)), VERSION_SIZE);
    if (version !== 1) {
      throw new Error(`Invalid version: ${version}`);
    }
    
    const flag = bytesToNumber(new Uint8Array(staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE, PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE)), FLAG_SIZE);
    const nonce = new Uint8Array(staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE, PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE));
    const authdataSize = bytesToNumber(new Uint8Array(staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE)), AUTHDATA_SIZE_SIZE);
    
    // Decode authdata
    const authdataSlice = data.slice(MASKING_IV_SIZE + STATIC_HEADER_SIZE, MASKING_IV_SIZE + STATIC_HEADER_SIZE + authdataSize);
    const authdata = new Uint8Array(await ctx.update(authdataSlice));
    
    const header = {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    };
    
    const headerBuf = concatBytes(new Uint8Array(staticHeaderBuf), authdata);
    const message = data.slice(MASKING_IV_SIZE + STATIC_HEADER_SIZE + authdataSize);
    
    return {
      maskingIv,
      header,
      message,
      messageAd: concatBytes(maskingIv, headerBuf),
    };
  } catch (error) {
    console.error('Error in custom decodePacket:', error);
    throw error;
  }
}

