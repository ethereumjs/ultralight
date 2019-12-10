import * as RLP from "rlp";
import * as ip from "ip";
import { toBigIntBE } from "bigint-buffer";
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
} from "./types";
import { ENR } from "../enr";

const ERR_INVALID_MESSAGE = "invalid message";

export function decode(data: Buffer): [MessageType, Message] {
  const type = data[0];
  switch (type) {
    case MessageType.PING:
      return [MessageType.PING, decodePing(data)];
    case MessageType.PONG:
      return [MessageType.PONG, decodePong(data)];
    case MessageType.FINDNODE:
      return [MessageType.FINDNODE, decodeFindNode(data)];
    case MessageType.NODES:
      return [MessageType.NODES, decodeNodes(data)];
    case MessageType.REGTOPIC:
      return [MessageType.REGTOPIC, decodeRegTopic(data)];
    case MessageType.TICKET:
      return [MessageType.TICKET, decodeTicket(data)];
    case MessageType.REGCONFIRMATION:
      return [MessageType.REGCONFIRMATION, decodeRegConfirmation(data)];
    case MessageType.TOPICQUERY:
      return [MessageType.TOPICQUERY, decodeTopicQuery(data)];
    default:
      throw new Error(ERR_INVALID_MESSAGE);
  }
}

function decodePing(data: Buffer): IPingMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    enrSeq: toBigIntBE(rlpRaw[1]),
  };
}

function decodePong(data: Buffer): IPongMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    enrSeq: toBigIntBE(rlpRaw[1]),
    recipientIp: ip.toString(rlpRaw[2]),
    recipientPort: rlpRaw[3].readUIntBE(0, rlpRaw[3].length),
  };
}

function decodeFindNode(data: Buffer): IFindNodeMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    distance: rlpRaw[1].readUIntBE(0, rlpRaw[1].length),
  };
}

function decodeNodes(data: Buffer): INodesMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as RLP.Decoded;
  if (
    !Array.isArray(rlpRaw) || rlpRaw.length !== 3 || !Array.isArray(rlpRaw[2])
  ) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    total: rlpRaw[1].readUIntBE(0, rlpRaw[1].length),
    enrs: rlpRaw[2].map(enrRaw => ENR.decode(enrRaw)),
  };
}

function decodeRegTopic(data: Buffer): IRegTopicMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 4) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
    enr: ENR.decode(rlpRaw[2]),
    ticket: rlpRaw[3],
  };
}

function decodeTicket(data: Buffer): ITicketMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 3) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    ticket: rlpRaw[1],
    waitTime: rlpRaw[2].readUIntBE(0, rlpRaw[2].length),
  };
}

function decodeRegConfirmation(data: Buffer): IRegConfirmationMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
  };
}

function decodeTopicQuery(data: Buffer): ITopicQueryMessage {
  const rlpRaw = RLP.decode(data.slice(1)) as unknown as Buffer[];
  if (!Array.isArray(rlpRaw) || rlpRaw.length !== 2) {
    throw new Error(ERR_INVALID_MESSAGE);
  }
  return {
    id: toBigIntBE(rlpRaw[0]),
    topic: rlpRaw[1],
  };}

