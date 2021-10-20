"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discv5Discovery = void 0;
const events_1 = require("events");
const multiaddr_1 = require("multiaddr");
const abort_controller_1 = require("@chainsafe/abort-controller");
const service_1 = require("../service");
// Default to 0ms between automatic searches
// 0ms is 'backwards compatible' with the prior behavior (always be searching)
// Furthere analysis should be done to determine a good number
const DEFAULT_SEARCH_INTERVAL_MS = 0;
/**
 * Discv5Discovery is a libp2p peer-discovery compatable module
 */
class Discv5Discovery extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.handleEnr = async (enr) => {
            const transport = this.discv5.bindAddress.toOptions().transport.includes("tcp") ? "tcp" : "udp";
            const multiaddr = enr.getLocationMultiaddr(transport);
            if (!multiaddr) {
                return;
            }
            this.emit("peer", {
                id: await enr.peerId(),
                multiaddrs: [multiaddr],
            });
        };
        this.discv5 = service_1.Discv5.create({
            enr: options.enr,
            peerId: options.peerId,
            multiaddr: new multiaddr_1.Multiaddr(options.bindAddr),
            config: options,
            metrics: options.metrics,
        });
        this.searchInterval = options.searchInterval ?? DEFAULT_SEARCH_INTERVAL_MS;
        this.started = false;
        this.controller = new abort_controller_1.AbortController();
        options.bootEnrs.forEach((bootEnr) => this.discv5.addEnr(bootEnr));
    }
    async start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.controller = new abort_controller_1.AbortController();
        await this.discv5.start();
        this.discv5.on("discovered", this.handleEnr);
        setTimeout(() => this.findPeers(), 1);
    }
    async stop() {
        if (!this.started) {
            return;
        }
        this.started = false;
        this.discv5.off("discovered", this.handleEnr);
        await this.discv5.stop();
        this.controller.abort();
    }
    async findPeers() {
        if (this.searchInterval === Infinity)
            return;
        while (this.started) {
            // Search for random nodes
            // emit discovered on all finds
            const enrs = await this.discv5.findRandomNode();
            if (!this.started) {
                return;
            }
            for (const enr of enrs) {
                await this.handleEnr(enr);
            }
            try {
                if (this.searchInterval === Infinity)
                    return;
                await sleep(this.searchInterval, this.controller.signal);
            }
            catch (e) {
                return;
            }
        }
    }
}
exports.Discv5Discovery = Discv5Discovery;
Discv5Discovery.tag = "discv5";
/**
 * Abortable sleep function. Cleans everything on all cases preventing leaks
 * On abort throws Error
 */
async function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted)
            return reject(new Error());
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        let onDone = () => { };
        const timeout = setTimeout(() => {
            onDone();
            resolve();
        }, ms);
        const onAbort = () => {
            onDone();
            reject(new Error());
        };
        signal.addEventListener("abort", onAbort);
        onDone = () => {
            clearTimeout(timeout);
            signal.removeEventListener("abort", onAbort);
        };
    });
}
