import * as RLP from "rlp";
import * as ip from "ip";
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

export function encode(message: Message): Buffer {
  switch (message.type) {
    case MessageType.PING:
      return encodePingMessage(message as IPingMessage);
    case MessageType.PONG:
      return encodePongMessage(message as IPongMessage);
    case MessageType.FINDNODE:
      return encodeFindNodeMessage(message as IFindNodeMessage);
    case MessageType.NODES:
      return encodeNodesMessage(message as INodesMessage);
    case MessageType.REGTOPIC:
      return encodeRegTopicMessage(message as IRegTopicMessage);
    case MessageType.TICKET:
      return encodeTicketMessage(message as ITicketMessage);
    case MessageType.REGCONFIRMATION:
      return encodeRegConfirmMessage(message as IRegConfirmationMessage);
    case MessageType.TOPICQUERY:
      return encodeTopicQueryMessage(message as ITopicQueryMessage);
  }
}

// TODO remove when rlp supports bigint encoding directly
function toBuffer(n: bigint): Buffer {
  let hex = n.toString(16);
  if (hex.length % 2 === 1) {
    hex = "0" + hex;
  }
  return Buffer.from(hex, "hex");
}

export function encodePingMessage(m: IPingMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.PING]),
    RLP.encode([
      toBuffer(m.id),
      toBuffer(m.enrSeq),
    ]),
  ]);
}

export function encodePongMessage(m: IPongMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.PONG]),
    RLP.encode([
      toBuffer(m.id),
      toBuffer(m.enrSeq),
      ip.toBuffer(m.recipientIp),
      m.recipientPort,
    ]),
  ]);
}

export function encodeFindNodeMessage(m: IFindNodeMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.FINDNODE]),
    RLP.encode([
      toBuffer(m.id),
      m.distance,
    ]),
  ]);
}

export function encodeNodesMessage(m: INodesMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.NODES]),
    RLP.encode([
      toBuffer(m.id),
      m.total,
      m.enrs.map(enr => enr.encode()),
    ]),
  ]);
}

export function encodeRegTopicMessage(m: IRegTopicMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.REGTOPIC]),
    RLP.encode([
      toBuffer(m.id),
      m.topic,
      m.enr.encode(),
      m.ticket,
    ]),
  ]);
}

export function encodeTicketMessage(m: ITicketMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.TICKET]),
    RLP.encode([
      toBuffer(m.id),
      m.ticket,
      m.waitTime,
    ]),
  ]);
}

export function encodeRegConfirmMessage(m: IRegConfirmationMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.REGCONFIRMATION]),
    RLP.encode([
      toBuffer(m.id),
      m.topic,
    ]),
  ]);
}

export function encodeTopicQueryMessage(m: ITopicQueryMessage): Buffer {
  return Buffer.concat([
    Buffer.from([MessageType.TOPICQUERY]),
    RLP.encode([
      toBuffer(m.id),
      m.topic,
    ]),
  ]);
}
