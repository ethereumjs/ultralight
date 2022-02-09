import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";

import { ENR, NodeId } from "../enr";
import { ITalkReqMessage, ITalkRespMessage, RequestMessage } from "../message";
import { INodeAddress, NodeContact } from "../session/nodeInfo";
import { ConnectionDirection, RequestErrorType } from "../session";

export interface IDiscv5Events {
  /**
   * A node has been discovered from a FINDNODES request.
   *
   * The ENR of the node is returned.
   */
  discovered: (enr: ENR) => void;
  /**
   * A new ENR was added to the routing table
   */
  enrAdded: (enr: ENR, replaced?: ENR) => void;
  /**
   * Our local ENR IP address has been updated
   */
  multiaddrUpdated: (addr: Multiaddr) => void;
  /**
   * A TALKREQ message was received.
   *
   * The message object is returned.
   */
  talkReqReceived: (nodeAddr: INodeAddress, enr: ENR | null, message: ITalkReqMessage) => void;
  /**
   * A TALKRESP message was received.
   *
   * The message object is returned.
   */
  talkRespReceived: (nodeAddr: INodeAddress, enr: ENR | null, message: ITalkRespMessage) => void;

  /**
   * A session is established with a connected peer
   */
  sessionEstablished: (nodeId: NodeId) => void;

  /**
   * A session is terminated with a connected peer
   */
  sessionEnded: (nodeId: NodeId) => void;
}

export type Discv5EventEmitter = StrictEventEmitter<EventEmitter, IDiscv5Events>;

/**
 * For multiple responses to a FINDNODES request,
 * this keeps track of the request count and the nodes that have been received.
 */
export interface INodesResponse {
  /**
   * The response count.
   */
  count: number;
  /**
   * The filtered nodes that have been received.
   */
  enrs: ENR[];
}

/**
 * Active RPC request awaiting a response
 */
export interface IActiveRequest<T extends RequestMessage = RequestMessage, U extends Callback = Callback> {
  /**
   * The address the request was sent to.
   */
  contact: NodeContact;
  /**
   * The request that was sent.
   */
  request: T;
  /**
   * The lookup ID if the request was related to a lookup
   */
  lookupId?: number;
  /**
   * Callback if this request was from a user level request.
   */
  callback?: U;
}

export type BufferCallback = (err: RequestErrorType | null, res: Buffer | null) => void;
export type ENRCallback = (err: RequestErrorType | null, res: ENR | null) => void;
export type Callback = BufferCallback | ENRCallback;

export type CallbackResponseType = Buffer | ENR;

export enum ConnectionStatusType {
  Connected,
  PongReceived,
  Disconnected,
}

export type ConnectionStatus =
  | {
    type: ConnectionStatusType.Connected;
    enr: ENR;
    direction: ConnectionDirection;
  }
  | {
    type: ConnectionStatusType.PongReceived;
    enr: ENR;
  }
  | {
    type: ConnectionStatusType.Disconnected;
  };

export type ENRInput = ENR | string;

// Metrics

type Labels<T extends string> = Partial<Record<T, string | number>>;
interface IGauge<T extends string = string> {
  inc(value?: number): void;
  inc(labels: Labels<T>, value?: number): void;
  set(value: number): void;
  set(labels: Labels<T>, value: number): void;
  collect(): void;
}

export interface IDiscv5Metrics {
  /** Total size of the kad table */
  kadTableSize: IGauge;
  /** Total number of active sessions */
  activeSessionCount: IGauge;
  /** Total number of connected peers */
  connectedPeerCount: IGauge;
  /** Total number of attempted lookups */
  lookupCount: IGauge;

  /** Total number messages sent by message type */
  sentMessageCount: IGauge<"type">;
  /** Total number messages received by message type */
  rcvdMessageCount: IGauge<"type">;
}
