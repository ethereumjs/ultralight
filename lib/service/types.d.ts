/// <reference types="node" />
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
     * A TALKREQ message was received.
     *
     * The message object is returned.
     */
    talkReqReceived: (srcId: NodeId, enr: ENR | null, message: ITalkReqMessage) => void;
    /**
     * A TALKRESP message was received.
     *
     * The message object is returned.
     */
    talkRespReceived: (srcId: NodeId, enr: ENR | null, message: ITalkRespMessage) => void;
}
export declare type Discv5EventEmitter = StrictEventEmitter<EventEmitter, IDiscv5Events>;
export interface INodesResponse {
    count: number;
    enrs: ENR[];
}
export interface IActiveRequest {
    request: RequestMessage;
    dstId: NodeId;
    lookupId?: number;
}
export declare type ENRInput = ENR | string;
declare type Labels<T extends string> = Partial<Record<T, string | number>>;
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
export {};
