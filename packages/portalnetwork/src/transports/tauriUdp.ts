import { EventEmitter } from 'events'
import { Buffer } from 'buffer'
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
  STATIC_HEADER_SIZE, 
  decodePacket,
  MIN_PACKET_SIZE,
  MAX_PACKET_SIZE
} from '@chainsafe/discv5/packet'
import { getSocketAddressOnENR } from '@chainsafe/discv5'
import { bind, send } from "@kuyoonjo/tauri-plugin-udp"
import { listen } from "@tauri-apps/api/event"
import localCrypto from './localCrypto.js'
import { bytesToUtf8, concatBytes, hexToBytes } from 'ethereum-cryptography/utils'

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
      const dataCopy = new Uint8Array(data);
    
      const packet = await decodePacketAsync(this.srcId, dataCopy);

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
    console.log('Decrypting packet - total size:', data.length);
    
    if (data.length < MIN_PACKET_SIZE) {
      throw new Error(`Packet too small: ${data.length}`);
    }
    if (data.length > MAX_PACKET_SIZE) {
      throw new Error(`Packet too large: ${data.length}`);
    }
    
    // Extract masking IV
    const maskingIv = data.slice(0, MASKING_IV_SIZE);
    console.log('Masking IV (first 4 bytes):', Array.from(maskingIv.slice(0, 4)));
    
    console.log('Full srcId:', srcId);
    const srcIdHex = srcId.startsWith('0x') ? srcId : `0x${srcId}`;
    const decryptionKey = hexToBytes(srcIdHex).slice(0, MASKING_KEY_SIZE);
    console.log('Full decryption key:', Array.from(decryptionKey));
    
    // Create decipher
    const decipher = await localCrypto.createDecipheriv("aes-128-ctr", decryptionKey, maskingIv);
    console.log('decipher ', decipher)
    // Decrypt the static header portion
    const staticHeaderData = data.slice(MASKING_IV_SIZE, MASKING_IV_SIZE + STATIC_HEADER_SIZE);
    console.log('Static header encrypted size:', staticHeaderData.length);
    
    const staticHeaderBuf = await decipher.update(staticHeaderData);
    console.log('Static header decrypted size:', staticHeaderBuf.length);
    
    
    // Extract protocol ID (should be "discv5")
    const protocolIdBytes = staticHeaderBuf.slice(0, PROTOCOL_SIZE);
    const protocolId = bytesToUtf8(protocolIdBytes);
    console.log('Decoded protocolId:', protocolId);
    
    if (protocolId !== "discv5") {
      throw new Error(`Invalid protocol id: ${protocolId}, raw bytes: ${Array.from(protocolIdBytes)}`);
    }
    
    // Extract version
    const versionBytes = staticHeaderBuf.slice(PROTOCOL_SIZE, PROTOCOL_SIZE + VERSION_SIZE);
    const version = bytesToNumber(versionBytes, VERSION_SIZE);
    console.log('Decoded version:', version);
    
    if (version !== 1) {
      throw new Error(`Invalid version: ${version}`);
    }
    
    // Extract flag
    const flagBytes = staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE, 
                                          PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE);
    const flag = bytesToNumber(flagBytes, FLAG_SIZE);
    console.log('Decoded flag:', flag);
    
    // Extract nonce
    const nonce = staticHeaderBuf.slice(PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE, 
                                      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE);
    
    // Extract authdata size
    const authdataSizeBytes = staticHeaderBuf.slice(
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE,
      PROTOCOL_SIZE + VERSION_SIZE + FLAG_SIZE + NONCE_SIZE + AUTHDATA_SIZE_SIZE
    );
    const authdataSize = bytesToNumber(authdataSizeBytes, AUTHDATA_SIZE_SIZE);
    console.log('Authdata size:', authdataSize);
    
    // Validate authdata size
    if (MASKING_IV_SIZE + STATIC_HEADER_SIZE + authdataSize > data.length) {
      throw new Error(`Invalid authdata size: ${authdataSize}, packet too small`);
    }
    
    // Decrypt the authdata
    const authdataSlice = data.slice(
      MASKING_IV_SIZE + STATIC_HEADER_SIZE, 
      MASKING_IV_SIZE + STATIC_HEADER_SIZE + authdataSize
    );
    
    const authdata = await decipher.update(authdataSlice);
    console.log('Authdata decrypted length:', authdata.length);
    
    // Create the header object
    const header = {
      protocolId,
      version,
      flag,
      nonce,
      authdataSize,
      authdata,
    };
    
    // Concatenate the header components
    const headerBuf = Buffer.concat([staticHeaderBuf, authdata]);
    
    // The message is the remainder of the packet
    const message = data.slice(MASKING_IV_SIZE + STATIC_HEADER_SIZE + authdataSize);
    console.log('Message size:', message.length);
    
    // Construct and return the packet
    return {
      maskingIv,
      header,
      message,
      messageAd: Buffer.concat([Buffer.from(maskingIv), headerBuf]),
    };
  } catch (error) {
    console.error('Error in custom decodePacket:', error);
    throw error;
  }
}
