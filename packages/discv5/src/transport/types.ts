import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";

import { IPacket } from "../packet";

export interface ISocketAddr {
  port: number;
  address: string;
}

export type SocketAddrStr = string;

export interface IRemoteInfo {
  address: string;
  family: "IPv4" | "IPv6";
  port: number;
  size: number;
}

export interface ITransportEvents {
  packet: (src: Multiaddr, packet: IPacket) => void;
  decodeError: (err: Error, src: Multiaddr) => void;
}
export type TransportEventEmitter = StrictEventEmitter<EventEmitter, ITransportEvents>;

export interface ITransportService extends TransportEventEmitter {
  multiaddr: Multiaddr;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(to: Multiaddr, toId: string, packet: IPacket): Promise<void>;
}
