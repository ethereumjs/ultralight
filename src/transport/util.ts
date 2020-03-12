import { ISocketAddr, SocketAddrStr } from "./types";

export function toSocketAddrStr(socketAddr: ISocketAddr): SocketAddrStr {
  return socketAddr.address + ":" + socketAddr.port;
}
