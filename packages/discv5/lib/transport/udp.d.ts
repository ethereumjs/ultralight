/// <reference types="node" />
import { Multiaddr } from "multiaddr";
import { IPacket } from "../packet";
import { IRemoteInfo, ITransportService, TransportEventEmitter } from "./types";
declare const UDPTransportService_base: new () => TransportEventEmitter;
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
export declare class UDPTransportService extends UDPTransportService_base implements ITransportService {
    multiaddr: Multiaddr;
    private socket;
    private srcId;
    constructor(multiaddr: Multiaddr, srcId: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(to: Multiaddr, toId: string, packet: IPacket): Promise<void>;
    handleIncoming: (data: Buffer, rinfo: IRemoteInfo) => void;
}
export {};
