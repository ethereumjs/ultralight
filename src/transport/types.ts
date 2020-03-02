import {
  Packet,
} from "../packet";

export interface ISocketAddr {
  port: number;
  address: string;
}

export interface IRemoteInfo {
  address: string;
  family: "IPv4" | "IPv6";
  port: number;
  size: number;
}

export interface ITransportService {
  start(): Promise<void>;
  close(): Promise<void>;
  send(to: ISocketAddr, packet: Packet): Promise<void>;
}
