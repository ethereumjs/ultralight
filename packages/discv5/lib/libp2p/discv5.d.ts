/// <reference types="node" />
import { EventEmitter } from "events";
import PeerId from "peer-id";
import { Discv5, ENRInput, IDiscv5Metrics } from "../service";
import { ENR } from "../enr";
import { IDiscv5Config } from "../config";
export interface IDiscv5DiscoveryInputOptions extends Partial<IDiscv5Config> {
    /**
     * Local ENR associated with the local libp2p peer id
     */
    enr: ENRInput;
    /**
     * The bind multiaddr for the discv5 UDP server
     *
     * NOTE: This MUST be a udp multiaddr
     */
    bindAddr: string;
    /**
     * Remote ENRs used to bootstrap the network
     */
    bootEnrs: ENRInput[];
    /**
     * Amount of time in milliseconds to wait between lookups
     *
     * Set to Infinity to disable automatic lookups entirely
     *
     * Default value is 0 (no wait)
     */
    searchInterval?: number;
    /**
     * Optional metrics
     */
    metrics?: IDiscv5Metrics;
    /**
     * Enable/disable discv5
     * Note: this option is handled within libp2p, not within discv5
     */
    enabled: boolean;
}
export interface IDiscv5DiscoveryOptions extends IDiscv5DiscoveryInputOptions {
    peerId: PeerId;
}
/**
 * Discv5Discovery is a libp2p peer-discovery compatable module
 */
export declare class Discv5Discovery extends EventEmitter {
    static tag: string;
    discv5: Discv5;
    searchInterval: number;
    private started;
    private controller;
    constructor(options: IDiscv5DiscoveryOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    findPeers(): Promise<void>;
    handleEnr: (enr: ENR) => Promise<void>;
}
