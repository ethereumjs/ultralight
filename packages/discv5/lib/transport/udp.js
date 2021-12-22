"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UDPTransportService = void 0;
const dgram = __importStar(require("dgram"));
const events_1 = require("events");
const multiaddr_1 = require("multiaddr");
const packet_1 = require("../packet");
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over UDP
 */
class UDPTransportService extends events_1.EventEmitter {
    constructor(multiaddr, srcId) {
        super();
        this.handleIncoming = (data, rinfo) => {
            const multiaddr = new multiaddr_1.Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/udp/${rinfo.port}`);
            try {
                const packet = packet_1.decodePacket(this.srcId, data);
                this.emit("packet", multiaddr, packet);
            }
            catch (e) {
                this.emit("decodeError", e, multiaddr);
            }
        };
        const opts = multiaddr.toOptions();
        if (opts.transport !== "udp") {
            throw new Error("Local multiaddr must use UDP");
        }
        this.multiaddr = multiaddr;
        this.srcId = srcId;
    }
    async start() {
        const opts = this.multiaddr.toOptions();
        this.socket = dgram.createSocket({
            recvBufferSize: 16 * packet_1.MAX_PACKET_SIZE,
            sendBufferSize: packet_1.MAX_PACKET_SIZE,
            type: opts.family === 4 ? "udp4" : "udp6",
        });
        this.socket.on("message", this.handleIncoming);
        return new Promise((resolve) => this.socket.bind(opts.port, opts.host, resolve));
    }
    async stop() {
        this.socket.off("message", this.handleIncoming);
        return new Promise((resolve) => this.socket.close(resolve));
    }
    async send(to, toId, packet) {
        const nodeAddr = to.toOptions();
        return new Promise((resolve) => this.socket.send(packet_1.encodePacket(toId, packet), nodeAddr.port, nodeAddr.host, () => resolve()));
    }
}
exports.UDPTransportService = UDPTransportService;
