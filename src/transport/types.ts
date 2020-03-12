import {
  Packet,
  PacketType,
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
  send(to: ISocketAddr, type: PacketType, packet: Packet): Promise<void>;

  on(packet: string, onPacket: (from: ISocketAddr, type: PacketType, packet: Packet) => void): void;

  removeListener(packet: string, onPacket: (from: ISocketAddr, type: PacketType, packet: Packet) => void): void;
}
