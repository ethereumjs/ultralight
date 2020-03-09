import * as ip from "ip";
import sha256 = require("bcrypto/lib/sha256");

import { ISocketAddr } from "../transport";
import { ENR, NodeId } from "../enr";
import { Tag } from "../packet";

// get/set socket addrs

export function getUDPSocketAddr(enr: ENR): ISocketAddr {
  const rawIp = enr.get("ip");
  if (!rawIp) {
    throw new Error("ENR does not contain an \"ip\" field.");
  }
  const rawUdp = enr.get("udp");
  if (!rawUdp) {
    throw new Error("ENR does not contain an \"udp\" field.");
  }
  return {
    address: ip.toString(rawIp),
    port: rawUdp.readInt16BE(0),
  };
}

export function setUDPSocketAddr(enr: ENR, udpSocketAddr: ISocketAddr): void {
  enr.set("ip", ip.toBuffer(udpSocketAddr.address));
  const rawPort = Buffer.alloc(2);
  rawPort.writeUInt16BE(udpSocketAddr.port, 0);
  enr.set("port", rawPort);
}

// calculate node id / tag

export function getSrcId(enr: ENR, tag: Tag): NodeId {
  const hash = sha256.digest(enr.nodeId);
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ tag[i];
  }
  return hash;
}

export function getTag(enr: ENR, dstId: NodeId): Tag {
  const nodeId = enr.nodeId;
  const hash = sha256.digest(dstId);
  // reuse `hash` buffer for output
  for (let i = 0; i < 32; i++) {
    hash[i] = hash[i] ^ nodeId[i];
  }
  return hash;
}
