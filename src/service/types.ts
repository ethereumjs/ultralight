import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { Multiaddr } from "multiaddr";

import { ENR, NodeId } from "../enr";
import { RequestMessage } from "../message";

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
