import * as RLP from "rlp";
import { toString as ipBufferToString } from "multiaddr/src/ip";
import { toBigIntBE } from "bigint-buffer";
import * as ip6addr from "ip6addr";
import {
  IPingMessage,
  IPongMessage,
  IFindNodeMessage,
  INodesMessage,
  IRegTopicMessage,
  ITicketMessage,
  IRegConfirmationMessage,
  ITopicQueryMessage,
  Message,
  MessageType,
  ITalkReqMessage,
  ITalkRespMessage,
} from "./types";
import { ENR } from "../enr";

const ERR_INVALID_MESSAGE = "invalid message";

export function decode(data: Buffer): Message {
  const type = data[0];
  switch (type) {
    case MessageType.PING:
      return decodePing(data);
    case MessageType.PONG:
      return decodePong(data);
    case MessageType.FINDNODE:
      return decodeFindNode(data);
    case MessageType.NODES:
      return decodeNodes(data);
    case MessageType.TALKREQ:
      return decodeTalkReq(data);
    case MessageType.TALKRESP:
      return decodeTalkResp(data);
    case MessageType.REGTOPIC:
      return decodeRegTopic(data);
    case MessageType.TICKET:
      return decodeTicket(data);
    case MessageType.REGCONFIRMATION:
      return decodeRegConfirmation(data);
    case MessageType.TOPICQUERY:
      return decodeTopicQuery(data);
    default:
      throw new Error(ERR_INVALID_MESSAGE);
  }
}

function decodePing(data: Buffer): IPingMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.PING,
    id: toBigIntBE(rlpRaw[0]),
    enrSeq: toBigIntBE(rlpRaw[1]),
  };
}

function decodePong(data: Buffer): IPongMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  let stringIpAddr = ipBufferToString(rlpRaw[2]);
  const parsedIp = ip6addr.parse(stringIpAddr);
  if (parsedIp.kind() === "ipv4") {
    stringIpAddr = parsedIp.toString({ format: "v4" });
  }
  return {
    type: MessageType.PONG,
    id: toBigIntBE(rlpRaw[0]),
    enrSeq: toBigIntBE(rlpRaw[1]),
    recipientIp: stringIpAddr,
    recipientPort: rlpRaw[3].length ? rlpRaw[3].readUIntBE(0, rlpRaw[3].length) : 0,
  };
}

function decodeFindNode(data: Buffer): IFindNodeMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  if (!Array.isArray(rlpRaw[1])) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  const distances = ((rlpRaw[1] as unknown) as Buffer[]).map((x) => (x.length ? x.readUIntBE(0, x.length) : 0));
  return {
    type: MessageType.FINDNODE,
    id: toBigIntBE(rlpRaw[0]),
    distances,
  };
}

function decodeNodes(data: Buffer): INodesMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as RLP.Decoded;
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3 || !Array.isArray(rlpRaw[2])) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.NODES,
    id: toBigIntBE(rlpRaw[0]),
    total: rlpRaw[1].length ? rlpRaw[1].readUIntBE(0, rlpRaw[1].length) : 0,
    enrs: rlpRaw[2].map((enrRaw) => ENR.decodeFromValues(enrRaw)),
  };
}

function decodeTalkReq(data: Buffer): ITalkReqMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as RLP.Decoded;
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.TALKREQ,
    id: toBigIntBE(rlpRaw[0]),
    protocol: rlpRaw[1],
    request: rlpRaw[2],
  };
}

function decodeTalkResp(data: Buffer): ITalkRespMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as RLP.Decoded;
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.TALKRESP,
    id: toBigIntBE(rlpRaw[0]),
    response: rlpRaw[1],
  };
}

function decodeRegTopic(data: Buffer): IRegTopicMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4 || !Array.isArray(rlpRaw[2])) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.REGTOPIC,
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
    enr: ENR.decodeFromValues((rlpRaw[2] as unknown) as Buffer[]),
    ticket: rlpRaw[3],
  };
}

function decodeTicket(data: Buffer): ITicketMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.TICKET,
    id: toBigIntBE(rlpRaw[0]),
    ticket: rlpRaw[1],
    waitTime: rlpRaw[2].length ? rlpRaw[2].readUIntBE(0, rlpRaw[2].length) : 0,
  };
}

function decodeRegConfirmation(data: Buffer): IRegConfirmationMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.REGCONFIRMATION,
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
  };
}

function decodeTopicQuery(data: Buffer): ITopicQueryMessage {
  const rlpRaw = (RLP.decode(data.slice(1)) as unknown) as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    type: MessageType.TOPICQUERY,
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
  };
}
