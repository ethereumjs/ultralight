import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";

import {
  Packet,
} from "../packet";

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
  packet: (src: ISocketAddr, packet: Packet) => void;
  error: (err: Error, src: ISocketAddr) => void;
}
export type TransportEventEmitter = StrictEventEmitter<EventEmitter, ITransportEvents>;

export interface ITransportService extends TransportEventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;
  send(to: ISocketAddr, packet: Packet): Promise<void>;
}
