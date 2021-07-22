import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";

import { ENR, NodeId } from "../enr";
import { ITalkReqMessage, ITalkRespMessage, RequestMessage } from "../message";

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
   * A TALKREQ message was received. Messages
   *
   * The message object is returned.
   */
  talkReqReceived: (srcId: NodeId, message: ITalkReqMessage) => void;
  /**
   * A TALKREQ message was received.
   *
   * The message object is returned.
   */
  talkRespReceived: (srcId: NodeId, message: ITalkRespMessage) => void;
}

export type Discv5EventEmitter = StrictEventEmitter<EventEmitter, IDiscv5Events>;

export interface INodesResponse {
  count: number;
  enrs: ENR[];
}

export interface IActiveRequest {
  request: RequestMessage;
  dstId: NodeId;
  lookupId?: number;
}

export type ENRInput = ENR | string;
