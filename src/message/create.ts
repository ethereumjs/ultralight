import { randomBytes } from "bcrypto/lib/random";
import { toBigIntBE } from "bigint-buffer";

import { RequestId, IPingMessage, MessageType, IPongMessage, IFindNodeMessage, INodesMessage } from "./types";
import { SequenceNumber, ENR } from "../enr";


export function createRequestId(): RequestId {
  return toBigIntBE(randomBytes(64));
}

export function createPingMessage(enrSeq: SequenceNumber): IPingMessage {
  return {
    type: MessageType.PING,
    id: createRequestId(),
    enrSeq,
  };
}

export function createPongMessage(
  id: RequestId,
  enrSeq: SequenceNumber,
  recipientIp: string,
  recipientPort: number
): IPongMessage {
  return {
    type: MessageType.PONG,
    id,
    enrSeq,
    recipientIp,
    recipientPort,
  };
}

export function createFindNodeMessage(distance: number): IFindNodeMessage {
  return {
    type: MessageType.FINDNODE,
    id: createRequestId(),
    distance,
  };
}

export function createNodesMessage(id: RequestId, total: number, enrs: ENR[]): INodesMessage {
  return {
    type: MessageType.NODES,
    id,
    total,
    enrs,
  };
}
