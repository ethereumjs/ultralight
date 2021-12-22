import { RequestId, IPingMessage, IPongMessage, IFindNodeMessage, INodesMessage, ITalkReqMessage, ITalkRespMessage } from "./types";
import { SequenceNumber, ENR } from "../enr";
export declare function createRequestId(): RequestId;
export declare function createPingMessage(enrSeq: SequenceNumber): IPingMessage;
export declare function createPongMessage(id: RequestId, enrSeq: SequenceNumber, recipientIp: string, recipientPort: number): IPongMessage;
export declare function createFindNodeMessage(distances: number[]): IFindNodeMessage;
export declare function createNodesMessage(id: RequestId, total: number, enrs: ENR[]): INodesMessage;
export declare function createTalkRequestMessage(request: string | Uint8Array, protocol: string | Uint8Array): ITalkReqMessage;
export declare function createTalkResponseMessage(requestId: RequestId, payload: Uint8Array): ITalkRespMessage;
