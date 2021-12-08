import { PacketType } from "..";
import { ConnectionState } from ".";
import { Packet } from "..";

export function isSynAckPacket(packet: Packet, state: ConnectionState | null): boolean {
    return (
      state === ConnectionState.SynSent &&
      packet.header.pType === PacketType.ST_SYN
    );
  }
export function isResetPacket(packet: Packet): boolean {
    return packet.header.pType === PacketType.ST_RESET;
  }
export function isSynPacket(packet: Packet): boolean {
    return packet.header.pType === PacketType.ST_SYN;
  }
export function isDataPacket(packet: Packet): boolean {
    return packet.header.pType === PacketType.ST_DATA;
  }
export function isStatePacket(packet: Packet): boolean {
    return packet.header.pType === PacketType.ST_STATE;
  }
export function isFinPacket(packet: Packet): boolean {
    return packet.header.pType === PacketType.ST_FIN;
  }