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
  type: MessageType.PING;
  id: RequestId;
  enrSeq: SequenceNumber;
}

export interface IPongMessage {
  type: MessageType.PONG;
  id: RequestId;
  enrSeq: SequenceNumber;
  recipientIp: string;
  recipientPort: number;
}

export interface IFindNodeMessage {
  type: MessageType.FINDNODE;
  id: RequestId;
  distance: number;
}

export interface INodesMessage {
  type: MessageType.NODES;
  id: RequestId;
  total: number;
  enrs: ENR[];
}

export interface IRegTopicMessage {
  type: MessageType.REGTOPIC;
  id: RequestId;
  topic: Buffer;
  enr: ENR;
  ticket: Buffer;
}

export interface ITicketMessage {
  type: MessageType.TICKET;
  id: RequestId;
  ticket: Buffer;
  waitTime: number;
}

export interface IRegConfirmationMessage {
  type: MessageType.REGCONFIRMATION;
  id: RequestId;
  topic: Buffer;
}

export interface ITopicQueryMessage {
  type: MessageType.TOPICQUERY;
  id: RequestId;
  topic: Buffer;
}
