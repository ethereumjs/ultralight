"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransportService = void 0;
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const multiaddr_1 = require("multiaddr");
const packet_1 = require("../packet");
const websocket_as_promised_1 = __importDefault(require("websocket-as-promised"));
const ip_codec_1 = __importDefault(require("@leichtgewicht/ip-codec"));
const log = debug_1.default("discv5:transport");
/**
 * This class is responsible for encoding outgoing Packets and decoding incoming Packets over Websockets
 */
class WebSocketTransportService extends events_1.EventEmitter {
    constructor(multiaddr, srcId, proxyAddress) {
        super();
        this.connections = {};
        this.handleIncoming = (data) => {
            const rinfoLength = parseInt(data.slice(0, 2).toString());
            const rinfo = JSON.parse(new TextDecoder().decode(data.slice(2, rinfoLength + 2)));
            const multiaddr = new multiaddr_1.Multiaddr(`/${rinfo.family === "IPv4" ? "ip4" : "ip6"}/${rinfo.address}/udp/${rinfo.port}`);
            const packetBuf = Buffer.from(data.slice(2 + rinfoLength));
            try {
                const packet = packet_1.decodePacket(this.srcId, packetBuf);
                this.emit("packet", multiaddr, packet);
            }
            catch (e) {
                this.emit("decodeError", e, multiaddr);
            }
        };
        const opts = multiaddr.toOptions();
        if (opts.transport !== "udp") {
            throw new Error("Local multiaddr must use udp");
        }
        this.multiaddr = multiaddr;
        this.srcId = srcId;
        this.socket = new websocket_as_promised_1.default(proxyAddress, {
            packMessage: (data) => data.buffer,
            unpackMessage: (data) => Buffer.from(data),
        });
    }
    async start() {
        await this.socket.open();
        this.socket.ws.binaryType = "arraybuffer";
        this.socket.onUnpackedMessage.addListener((msg) => {
            // Hack to drop public url reflection based messages from packet processing
            try {
                JSON.parse(msg);
                return;
            }
            catch {
                // eslint-disable-next-line no-empty
            }
            this.handleIncoming(msg);
        });
        this.socket.onMessage.addListener((msg) => {
            try {
                const { address, port } = JSON.parse(msg);
                this.multiaddr = new multiaddr_1.Multiaddr(`/ip4/${address}/udp/${port}`);
                this.emit("multiaddrUpdate", this.multiaddr);
                // eslint-disable-next-line no-empty
            }
            catch { }
        });
        this.socket.onClose.addListener(() => log("socket to proxy closed"));
    }
    async stop() {
        await this.socket.close();
    }
    async send(to, toId, packet) {
        // Send via websocket (i.e. in browser)
        const opts = to.toOptions();
        const encodedPacket = packet_1.encodePacket(toId, packet);
        const encodedAddress = ip_codec_1.default.encode(opts.host);
        const encodedPort = Buffer.from(opts.port.toString());
        const encodedMessage = new Uint8Array([
            ...Uint8Array.from(encodedAddress),
            ...Uint8Array.from(encodedPort),
            ...Uint8Array.from(encodedPacket),
        ]);
        this.socket.sendPacked(encodedMessage);
    }
}
exports.WebSocketTransportService = WebSocketTransportService;
