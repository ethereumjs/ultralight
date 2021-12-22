import { Multiaddr } from "multiaddr";
import { IPacket } from "../packet";
import { ITransportService, TransportEventEmitter } from "./types";
declare const WebSocketTransportService_base: new () => TransportEventEmitter;
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
export declare class WebSocketTransportService extends WebSocketTransportService_base implements ITransportService {
    multiaddr: Multiaddr;
    private socket;
    private srcId;
    private connections;
    constructor(multiaddr: Multiaddr, srcId: string, proxyAddress: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(to: Multiaddr, toId: string, packet: IPacket): Promise<void>;
    handleIncoming: (data: Uint8Array) => void;
}
export {};
