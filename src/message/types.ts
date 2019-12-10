import { SequenceNumber, ENR } from "../enr";

export type RequestId = bigint;

export enum MessageType {
  PING = 1,
  PONG = 2,
  FINDNODE = 3,
  NODES = 4,
  REGTOPIC = 5,
  TICKET = 6,
  REGCONFIRMATION = 7,
  TOPICQUERY = 8,
}

export type Message = RequestMessage | ResponseMessage;

export type RequestMessage =
  IPingMessage |
  IFindNodeMessage |
  IRegTopicMessage |
  ITopicQueryMessage;

export type ResponseMessage =
  IPongMessage |
  INodesMessage |
  ITicketMessage |
  IRegConfirmationMessage;

export interface IPingMessage {
  id: RequestId;
  enrSeq: SequenceNumber;
}

export interface IPongMessage {
  id: RequestId;
  enrSeq: SequenceNumber;
  recipientIp: string;
  recipientPort: number;
}

export interface IFindNodeMessage {
  id: RequestId;
  distance: number;
}

export interface INodesMessage {
  id: RequestId;
  total: number;
  enrs: ENR[];
}

export interface IRegTopicMessage {
  id: RequestId;
  topic: Buffer;
  enr: ENR;
  ticket: Buffer;
}

export interface ITicketMessage {
  id: RequestId;
  ticket: Buffer;
  waitTime: number;
}

export interface IRegConfirmationMessage {
  id: RequestId;
  topic: Buffer;
}

export interface ITopicQueryMessage {
  id: RequestId;
  topic: Buffer;
}
