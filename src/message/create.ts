import { randomBytes } from "bcrypto/lib/random";
import { toBigIntBE } from "bigint-buffer";

import {
  RequestId,
  IPingMessage,
  MessageType,
  IPongMessage,
  IFindNodeMessage,
  INodesMessage,
  ITalkReqMessage,
  ITalkRespMessage,
} from "./types";
import { SequenceNumber, ENR } from "../enr";

export function createRequestId(): RequestId {
  return toBigIntBE(randomBytes(8));
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

export function createFindNodeMessage(distances: number[]): IFindNodeMessage {
  return {
    type: MessageType.FINDNODE,
    id: createRequestId(),
    distances,
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

export function createTalkRequestMessage(request: string | Uint8Array, protocol: string | Uint8Array): ITalkReqMessage {
  return {
    type: MessageType.TALKREQ,
    id: createRequestId(),
    protocol: Buffer.from(protocol),
    request: Buffer.from(request),
  };
}
export function createTalkResponseMessage(requestId: RequestId, payload: Uint8Array): ITalkRespMessage {
  return {
    type: MessageType.TALKRESP,
    id: requestId,
    response: Buffer.from(payload),
  };
}
