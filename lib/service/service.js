"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discv5 = void 0;
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const libp2p_crypto_1 = require("libp2p-crypto");
const multiaddr_1 = require("multiaddr");
const isIp = require("is-ip");
const transport_1 = require("../transport");
const transport_2 = require("../transport");
const packet_1 = require("../packet");
const session_1 = require("../session");
const enr_1 = require("../enr");
const keypair_1 = require("../keypair");
const kademlia_1 = require("../kademlia");
const message_1 = require("../message");
const addrVotes_1 = require("./addrVotes");
const util_1 = require("../util");
const config_1 = require("../config");
const log = debug_1.default("discv5:service");
/**
 * User-facing service one can use to set up, start and use Discv5.
 *
 * The service exposes a number of user-facing operations that the user may refer to in their application:
 * * Adding a new static peers
 * * Checking the properties of a specific peer
 * * Performing a lookup for a peer
 *
 * Additionally, the service offers events when peers are added to the peer table or discovered via lookup.
 */
class Discv5 extends events_1.EventEmitter {
    /**
     * Default constructor.
     * @param sessionService the service managing sessions underneath.
     */
    constructor(config, sessionService, metrics) {
        super();
        this.started = false;
        // process kad updates
        this.onPendingEviction = (enr) => {
            this.sendPing(enr.nodeId);
        };
        this.onAppliedEviction = (inserted, evicted) => {
            this.emit("enrAdded", inserted, evicted);
        };
        // process events from the session service
        this.onEstablished = (enr) => {
            const nodeId = enr.nodeId;
            this.connectionUpdated(nodeId, enr, kademlia_1.EntryStatus.Connected);
            // send an initial ping and start the ping interval
            this.sendPing(nodeId);
            this.connectedPeers.set(nodeId, setInterval(() => this.sendPing(nodeId), this.config.pingInterval));
        };
        this.onMessage = (srcId, src, message) => {
            this.metrics?.rcvdMessageCount.inc({ type: message_1.MessageType[message.type] });
            switch (message.type) {
                case message_1.MessageType.PING:
                    return this.onPing(srcId, src, message);
                case message_1.MessageType.PONG:
                    return this.onPong(srcId, src, message);
                case message_1.MessageType.FINDNODE:
                    return this.onFindNode(srcId, src, message);
                case message_1.MessageType.NODES:
                    return this.onNodes(srcId, src, message);
                case message_1.MessageType.TALKREQ:
                    return this.onTalkReq(srcId, src, message);
                case message_1.MessageType.TALKRESP:
                    return this.onTalkResp(srcId, src, message);
                default:
                    // TODO Implement all RPC methods
                    return;
            }
        };
        this.onWhoAreYouRequest = (srcId, src, nonce) => {
            // Check what our latest known ENR is for this node
            const enr = this.findEnr(srcId);
            if (enr) {
                this.sessionService.sendWhoAreYou(src, srcId, enr.seq, enr, nonce);
            }
            else {
                log("Node unknown, requesting ENR. Node: %s; Token: %s", srcId, nonce.toString("hex"));
                this.sessionService.sendWhoAreYou(src, srcId, 0n, null, nonce);
            }
        };
        this.onTalkReq = (srcId, src, message) => {
            log("Received TALKREQ message from Node: %s", srcId);
            let sourceId = this.findEnr(srcId);
            if (!sourceId) {
                sourceId = null;
            }
            this.emit("talkReqReceived", srcId, sourceId, message);
        };
        this.onTalkResp = (srcId, src, message) => {
            log("Received response from Node: %s", srcId);
            let sourceId = this.findEnr(srcId);
            if (!sourceId) {
                sourceId = null;
            }
            this.emit("talkRespReceived", srcId, sourceId, message);
        };
        this.onActiveRequestFailed = (activeRequest) => {
            const { request, dstId, lookupId } = activeRequest;
            this.activeRequests.delete(request.id);
            // If a failed FindNodes Request, ensure we haven't partially received responses.
            // If so, process the partially found nodes
            if (request.type === message_1.MessageType.FINDNODE) {
                const nodesResponse = this.activeNodesResponses.get(request.id);
                if (nodesResponse) {
                    this.activeNodesResponses.delete(request.id);
                    log("FINDNODE request failed, but was partially processed from Node: %s", dstId);
                    // If its a query, mark it as a success, to process the partial collection of its peers
                    this.discovered(dstId, nodesResponse.enrs, lookupId);
                }
                else {
                    // There was no partially downloaded nodes, inform the lookup of the failure if its part of a query
                    const lookup = this.activeLookups.get(lookupId);
                    if (lookup) {
                        lookup.onFailure(dstId);
                    }
                    else {
                        log("Failed request: %O for node: %s", request, dstId);
                    }
                }
            }
        };
        /**
         * A session could not be established or an RPC request timed out
         */
        this.onRequestFailed = (srcId, rpcId) => {
            const req = this.activeRequests.get(rpcId);
            if (req) {
                this.onActiveRequestFailed(req);
            }
            // report the node as being disconnected
            this.connectionUpdated(srcId, undefined, kademlia_1.EntryStatus.Disconnected);
            clearInterval(this.connectedPeers.get(srcId));
            this.connectedPeers.delete(srcId);
        };
        this.config = config;
        this.sessionService = sessionService;
        this.kbuckets = new kademlia_1.KademliaRoutingTable(this.sessionService.enr.nodeId, 16);
        this.activeLookups = new Map();
        this.activeRequests = new util_1.TimeoutMap(this.config.requestTimeout, (requestId, activeRequest) => this.onActiveRequestFailed(activeRequest));
        this.activeNodesResponses = new Map();
        this.connectedPeers = new Map();
        this.nextLookupId = 1;
        this.addrVotes = new addrVotes_1.AddrVotes();
        if (metrics) {
            this.metrics = metrics;
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const discv5 = this;
            metrics.kadTableSize.collect = () => metrics.kadTableSize.set(discv5.kbuckets.size);
            metrics.connectedPeerCount.collect = () => metrics.connectedPeerCount.set(discv5.connectedPeers.size);
            metrics.activeSessionCount.collect = () => metrics.activeSessionCount.set(discv5.sessionService.sessionsSize());
            metrics.lookupCount.collect = () => metrics.lookupCount.set(this.nextLookupId - 1);
        }
    }
    /**
     * Convenience method to create a new discv5 service.
     *
     * @param enr the ENR record identifying the current node.
     * @param peerId the PeerId with the keypair that identifies the enr
     * @param multiaddr The multiaddr which contains the the network interface and port to which the UDP server binds
     */
    static create({ enr, peerId, multiaddr, config = {}, transport = "udp", metrics, proxyAddress = "", }) {
        const fullConfig = { ...config_1.defaultConfig, ...config };
        const decodedEnr = typeof enr === "string" ? enr_1.ENR.decodeTxt(enr) : enr;
        const transportLayer = transport === "udp"
            ? new transport_1.UDPTransportService(multiaddr, decodedEnr.nodeId)
            : new transport_2.WebSocketTransportService(multiaddr, decodedEnr.nodeId, proxyAddress);
        const sessionService = new session_1.SessionService(fullConfig, decodedEnr, keypair_1.createKeypairFromPeerId(peerId), transportLayer);
        return new Discv5(fullConfig, sessionService, metrics);
    }
    /**
     * Starts the service and adds all initial bootstrap peers to be considered.
     */
    async start() {
        if (this.started) {
            log("Starting discv5 service failed -- already started");
            return;
        }
        log(`Starting discv5 service with node id ${this.enr.nodeId}`);
        this.kbuckets.on("pendingEviction", this.onPendingEviction);
        this.kbuckets.on("appliedEviction", this.onAppliedEviction);
        this.sessionService.on("established", this.onEstablished);
        this.sessionService.on("message", this.onMessage);
        this.sessionService.on("whoAreYouRequest", this.onWhoAreYouRequest);
        this.sessionService.on("requestFailed", this.onRequestFailed);
        this.sessionService.transport.on("multiaddrUpdate", (addr) => {
            this.enr.setLocationMultiaddr(addr);
            log("Updated ENR based on public multiaddr to", this.enr.encodeTxt(this.keypair.privateKey));
        });
        await this.sessionService.start();
        this.started = true;
    }
    /**
     * Stops the service, closing any underlying networking activity.
     */
    async stop() {
        if (!this.started) {
            log("Stopping discv5 service -- already stopped");
            return;
        }
        log("Stopping discv5 service");
        this.kbuckets.off("pendingEviction", this.onPendingEviction);
        this.kbuckets.off("appliedEviction", this.onAppliedEviction);
        this.kbuckets.clear();
        this.activeLookups.forEach((lookup) => lookup.stop());
        this.activeLookups.clear();
        this.nextLookupId = 1;
        this.activeRequests.clear();
        this.activeNodesResponses.clear();
        this.addrVotes.clear();
        this.connectedPeers.forEach((intervalId) => clearInterval(intervalId));
        this.connectedPeers.clear();
        this.sessionService.off("established", this.onEstablished);
        this.sessionService.off("message", this.onMessage);
        this.sessionService.off("whoAreYouRequest", this.onWhoAreYouRequest);
        this.sessionService.off("requestFailed", this.onRequestFailed);
        await this.sessionService.stop();
        this.started = false;
    }
    isStarted() {
        return this.started;
    }
    /**
     * Adds a known ENR of a peer participating in Discv5 to the routing table.
     *
     * This allows pre-populating the kademlia routing table with known addresses,
     * so that they can be used immediately in following DHT operations involving one of these peers,
     * without having to dial them upfront.
     */
    addEnr(enr) {
        let decodedEnr;
        try {
            decodedEnr = typeof enr === "string" ? enr_1.ENR.decodeTxt(enr) : enr;
        }
        catch (e) {
            log("Unable to add enr: %o", enr);
            return;
        }
        if (this.kbuckets.getWithPending(decodedEnr.nodeId)) {
            this.kbuckets.updateValue(decodedEnr);
        }
        else if (this.kbuckets.add(decodedEnr, kademlia_1.EntryStatus.Disconnected)) {
            this.emit("enrAdded", decodedEnr);
        }
    }
    get bindAddress() {
        return this.sessionService.transport.multiaddr;
    }
    get keypair() {
        return this.sessionService.keypair;
    }
    peerId() {
        return keypair_1.createPeerIdFromKeypair(this.keypair);
    }
    get enr() {
        return this.sessionService.enr;
    }
    get connectedPeerCount() {
        return this.connectedPeers.size;
    }
    getKadValue(nodeId) {
        return this.kbuckets.getValue(nodeId);
    }
    /**
     * Return all ENRs of nodes currently contained in buckets of the kad routing table
     */
    kadValues() {
        return this.kbuckets.values();
    }
    async findRandomNode() {
        return await this.findNode(enr_1.createNodeId(util_1.toBuffer(libp2p_crypto_1.randomBytes(32))));
    }
    /**
     * Starts an iterative FIND_NODE lookup
     */
    async findNode(target) {
        const lookupId = this.nextLookupId;
        log("Starting a new lookup. Id: %d", lookupId);
        if (this.nextLookupId >= 2 ** 32) {
            this.nextLookupId = 1;
        }
        else {
            this.nextLookupId += 1;
        }
        const knownClosestPeers = this.kbuckets.nearest(target, 16).map((enr) => enr.nodeId);
        const lookup = new kademlia_1.Lookup(this.config, target, 3, knownClosestPeers);
        this.activeLookups.set(lookupId, lookup);
        return await new Promise((resolve) => {
            lookup.on("peer", (peer) => this.sendLookup(lookupId, target, peer));
            lookup.on("finished", (closest) => {
                log("Lookup Id: %d finished, %d total found", lookupId, closest.length);
                resolve(closest.map((nodeId) => this.findEnr(nodeId)).filter((enr) => enr));
                this.activeLookups.delete(lookupId);
            });
            // This will trigger "peer" events, eventually leading to a "finished" event
            lookup.start();
        });
    }
    /**
     * Broadcast TALKREQ message to all nodes in routing table and returns response
     */
    async broadcastTalkReq(payload, protocol, timeout = 1000) {
        return await new Promise((resolve, reject) => {
            const listenerId = this.listeners("talkRespReceived").length;
            const msg = message_1.createTalkRequestMessage(payload, protocol);
            const responseTimeout = setTimeout(() => {
                try {
                    const listener = this.listeners("talkRespReceived")[listenerId];
                    this.removeListener("talkRespReceived", listener);
                }
                catch {
                    // Just catching any error if listener is already removed
                }
                reject("Request timed out");
            }, timeout);
            this.on("talkRespReceived", (srcId, enr, res) => {
                const listener = this.listeners("talkRespReceived")[listenerId];
                if (res.id === msg.id) {
                    clearTimeout(responseTimeout);
                    resolve(res.response);
                    this.removeListener("talkRespReceived", listener);
                }
            });
            for (const node of this.kadValues()) {
                const sendStatus = this.sendRequest(node.nodeId, msg);
                if (!sendStatus) {
                    log(`Failed to send TALKREQ message to node ${node.nodeId}`);
                }
                else {
                    log(`Sent TALKREQ message to node ${node.nodeId}`);
                }
            }
        });
    }
    /**
     * Send TALKREQ message to dstId and returns response
     */
    async sendTalkReq(dstId, payload, protocol, timeout = 1000) {
        return await new Promise((resolve, reject) => {
            const listenerId = this.listeners("talkRespReceived").length;
            const msg = message_1.createTalkRequestMessage(payload, protocol);
            const responseTimeout = setTimeout(() => {
                try {
                    const listener = this.listeners("talkRespReceived")[listenerId];
                    this.removeListener("talkRespReceived", listener);
                }
                catch {
                    // Just catching any error if listener is already removed
                }
                reject("Request timed out");
            }, timeout);
            this.on("talkRespReceived", (srcId, enr, res) => {
                const listener = this.listeners("talkRespReceived")[listenerId];
                if (res.id === msg.id) {
                    clearTimeout(responseTimeout);
                    resolve(res.response);
                    this.removeListener("talkRespReceived", listener);
                }
            });
            const sendStatus = this.sendRequest(dstId, msg);
            if (!sendStatus) {
                log(`Failed to send TALKREQ message to node ${dstId}`);
            }
            else {
                log(`Sent TALKREQ message to node ${dstId}`);
            }
        });
    }
    /**
     * Send TALKRESP message to requesting node
     */
    async sendTalkResp(srcId, requestId, payload) {
        const msg = message_1.createTalkResponseMessage(requestId, payload);
        const enr = this.getKadValue(srcId);
        //const transport = this.sessionService.transport instanceof WebSocketTransportService ? "tcp" : "udp";
        const transport = "udp";
        const addr = await enr?.getFullMultiaddr(transport);
        if (enr && addr) {
            log(`Sending TALKRESP message to node ${enr.id}`);
            try {
                this.sessionService.sendResponse(addr, srcId, msg);
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.TALKRESP] });
            }
            catch (e) {
                log("Failed to send a TALKRESP response. Error: %s", e.message);
            }
        }
        else {
            if (!addr && enr) {
                log(`No ip + udp port found for node ${srcId}`);
            }
            else {
                log(`Node ${srcId} not found`);
            }
        }
    }
    enableLogs() {
        debug_1.default.enable("discv5*");
    }
    /**
     * Sends a PING request to a node
     */
    sendPing(nodeId) {
        log("Sending PING to %s", nodeId);
        this.sendRequest(nodeId, message_1.createPingMessage(this.enr.seq));
    }
    pingConnectedPeers() {
        for (const id of this.connectedPeers.keys()) {
            this.sendPing(id);
        }
    }
    /**
     * Request an external node's ENR
     *
     * This logic doesn't fit into a standard request, we likely don't know the ENR,
     * and would like to send this as a response, with request logic built in.
     */
    requestEnr(nodeId, src) {
        try {
            log("Sending ENR request to node: %s", nodeId);
            const message = message_1.createFindNodeMessage([0]);
            this.sessionService.sendRequestUnknownEnr(src, nodeId, message);
            this.activeRequests.set(message.id, { request: message, dstId: nodeId });
            this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message.type] });
        }
        catch (e) {
            log("Requesting ENR failed. Error: %s", e.message);
        }
    }
    /**
     * Constructs and sends a request to the session service given a target and lookup peer
     */
    sendLookup(lookupId, target, peer) {
        const peerId = peer.nodeId;
        const distance = kademlia_1.findNodeLog2Distance(target, peer);
        // send request if distance is not 0
        let succeeded = Boolean(distance);
        if (succeeded) {
            log("Sending lookup. Id: %d, Iteration: %d, Node: %s", lookupId, peer.iteration, peerId);
            succeeded = this.sendRequest(peer.nodeId, message_1.createFindNodeMessage([distance]), lookupId);
        }
        // request errored (or request was not possible)
        if (!succeeded) {
            const lookup = this.activeLookups.get(lookupId);
            if (lookup) {
                lookup.onFailure(peer.nodeId);
            }
        }
    }
    /**
     * Sends generic RPC requests.
     * Each request gets added to known outputs, awaiting a response
     *
     * Returns true if the request was sent successfully
     */
    sendRequest(nodeId, req, lookupId) {
        const dstEnr = this.findEnr(nodeId);
        if (!dstEnr) {
            log("Request not sent. Failed to find an ENR for node: %s", nodeId);
        }
        else {
            try {
                this.sessionService.sendRequest(dstEnr, req);
                this.activeRequests.set(req.id, { request: req, dstId: nodeId, lookupId });
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[req.type] });
                return true;
            }
            catch (e) {
                log("Sending request to node: %s failed: error: %s", nodeId, e.message);
            }
        }
        return false;
    }
    /**
     * Update the conection status of a node in the routing table
     */
    connectionUpdated(nodeId, enr, newStatus) {
        if (this.kbuckets.getWithPending(nodeId)) {
            if (enr) {
                this.kbuckets.update(enr, newStatus);
            }
            else {
                this.kbuckets.updateStatus(nodeId, newStatus);
            }
        }
        else if (newStatus === kademlia_1.EntryStatus.Connected && enr) {
            if (this.kbuckets.add(enr, newStatus)) {
                this.emit("enrAdded", enr);
            }
        }
    }
    /**
     * Returns an ENR if one is known for the given NodeId
     *
     * This includes ENRs from any ongoing lookups not yet in the kad table
     */
    findEnr(nodeId) {
        // check if we know this node id in our routing table
        const enr = this.kbuckets.getValue(nodeId);
        if (enr) {
            return enr;
        }
        // Check the untrusted addresses for ongoing lookups
        for (const lookup of this.activeLookups.values()) {
            const enr = lookup.untrustedEnrs[nodeId];
            if (enr) {
                return enr;
            }
        }
        return undefined;
    }
    retrieveRequest(srcId, message) {
        // verify we know of the rpcId
        const activeRequest = this.activeRequests.get(message.id);
        if (!activeRequest) {
            log("Received an RPC response which doesn't match a request");
            return;
        }
        this.activeRequests.delete(message.id);
        if (!message_1.requestMatchesResponse(activeRequest.request, message)) {
            log("Node gave an incorrect response type. Ignoring response from node: %s", srcId);
            return;
        }
        return activeRequest;
    }
    discovered(srcId, enrs, lookupId) {
        const localId = this.enr.nodeId;
        const others = enrs.filter((enr) => enr.nodeId !== localId);
        for (const enr of others) {
            // If any of the discovered nodes are in the routing table, and there contains an older ENR, update it
            const entry = this.kbuckets.getWithPending(enr.nodeId);
            if (entry) {
                if (entry.value.seq < enr.seq) {
                    this.kbuckets.updateValue(enr);
                    this.sessionService.updateEnr(enr);
                }
            }
            else {
                // The service may have an untrusted session.
                // Update the service, which will inform this protocol if a session
                // is established or not.
                this.sessionService.updateEnr(enr);
            }
            this.emit("discovered", enr);
        }
        // If this is part of a lookup, update the lookup
        if (lookupId) {
            const lookup = this.activeLookups.get(lookupId);
            if (lookup) {
                for (const enr of others) {
                    const enrNodeId = enr.nodeId;
                    if (!lookup.untrustedEnrs[enrNodeId]) {
                        lookup.untrustedEnrs[enrNodeId] = enr;
                    }
                }
                log("%d peers found for lookup Id: %d, Node: %s", others.length, lookupId, srcId);
                lookup.onSuccess(srcId, others.map((enr) => enr.nodeId));
            }
        }
    }
    onPing(srcId, src, message) {
        // check if we need to update the known ENR
        const entry = this.kbuckets.getWithPending(srcId);
        if (entry) {
            if (entry.value.seq < message.enrSeq) {
                this.requestEnr(srcId, src);
            }
        }
        else {
            this.requestEnr(srcId, src);
        }
        // build the Pong response
        log("Sending PONG response to node: %s", srcId);
        try {
            const srcOpts = src.toOptions();
            this.sessionService.sendResponse(src, srcId, message_1.createPongMessage(message.id, this.enr.seq, srcOpts.host, srcOpts.port));
            this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.PONG] });
        }
        catch (e) {
            log("Failed to send Pong. Error %s", e.message);
        }
    }
    onPong(srcId, src, message) {
        if (!this.retrieveRequest(srcId, message)) {
            return;
        }
        if (this.config.enrUpdate) {
            this.addrVotes.addVote(srcId, new multiaddr_1.Multiaddr(`/${isIp.v4(message.recipientIp) ? "ip4" : "ip6"}/${message.recipientIp}/udp/${message.recipientPort}`));
            const currentAddr = this.enr.getLocationMultiaddr("udp");
            const votedAddr = this.addrVotes.best(currentAddr);
            if ((currentAddr && votedAddr && !votedAddr.equals(currentAddr)) || (!currentAddr && votedAddr)) {
                log("Local ENR (IP & UDP) updated: %s", votedAddr);
                this.enr.setLocationMultiaddr(votedAddr);
                this.emit("multiaddrUpdated", votedAddr);
            }
        }
        // Check if we need to request a new ENR
        const enr = this.findEnr(srcId);
        if (enr) {
            if (enr.seq < message.enrSeq) {
                log("Requesting an ENR update from node: %s", srcId);
                this.sendRequest(srcId, message_1.createFindNodeMessage([0]));
            }
            this.connectionUpdated(srcId, undefined, kademlia_1.EntryStatus.Connected);
        }
    }
    /**
     * Sends a NODES response, given a list of found ENRs.
     * This function splits the nodes up into multiple responses to ensure the response stays below
     * the maximum packet size
     */
    onFindNode(srcId, src, message) {
        const { id, distances } = message;
        let nodes = [];
        distances.forEach((distance) => {
            // if the distance is 0, send our local ENR
            if (distance === 0) {
                this.enr.encodeToValues(this.keypair.privateKey);
                nodes.push(this.enr);
            }
            else {
                nodes.push(...this.kbuckets.valuesOfDistance(distance));
            }
        });
        nodes = nodes.slice(0, 15);
        if (nodes.length === 0) {
            log("Sending empty NODES response to %s", srcId);
            try {
                this.sessionService.sendResponse(src, srcId, message_1.createNodesMessage(id, 0, nodes));
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.NODES] });
            }
            catch (e) {
                log("Failed to send a NODES response. Error: %s", e.message);
            }
            return;
        }
        // Repsonses assume that a session is established.
        // Thus, on top of the encoded ENRs the packet should be a regular message.
        // A regular message has a tag (32 bytes), an authTag (12 bytes)
        // and the NODES response has an ID (8 bytes) and a total (8 bytes).
        // The encryption adds the HMAC (16 bytes) and can be at most 16 bytes larger
        // So, the total empty packet size can be at most 92
        const nodesPerPacket = Math.floor((packet_1.MAX_PACKET_SIZE - 92) / enr_1.MAX_RECORD_SIZE);
        const total = Math.ceil(nodes.length / nodesPerPacket);
        log("Sending %d NODES responses to %s", total, srcId);
        for (let i = 0; i < nodes.length; i += nodesPerPacket) {
            const _nodes = nodes.slice(i, i + nodesPerPacket);
            try {
                this.sessionService.sendResponse(src, srcId, message_1.createNodesMessage(id, total, _nodes));
                this.metrics?.sentMessageCount.inc({ type: message_1.MessageType[message_1.MessageType.NODES] });
            }
            catch (e) {
                log("Failed to send a NODES response. Error: %s", e.message);
            }
        }
    }
    onNodes(srcId, src, message) {
        const activeRequest = this.retrieveRequest(srcId, message);
        if (!activeRequest) {
            return;
        }
        const { request, lookupId } = activeRequest;
        // Currently a maximum of 16 peers can be returned.
        // Datagrams have a max size of 1280 and ENRs have a max size of 300 bytes.
        // There should be no more than 5 responses to return 16 peers
        if (message.total > 5) {
            log("NODES response has a total larger than 5, nodes will be truncated");
        }
        // Filter out any nodes that are not of the correct distance
        // TODO: if a swarm peer reputation is built,
        // downvote the peer if all peers do not have the correct distance
        const distancesRequested = request.distances;
        message.enrs = message.enrs.filter((enr) => distancesRequested.includes(kademlia_1.log2Distance(enr.nodeId, srcId)));
        // handle the case that there is more than one response
        if (message.total > 1) {
            const currentResponse = this.activeNodesResponses.get(message.id) || { count: 1, enrs: [] };
            this.activeNodesResponses.delete(message.id);
            log("NODES response: %d of %d received, length: %d", currentResponse.count, message.total, message.enrs.length);
            // If there are more requests coming, store the nodes and wait for another response
            if (currentResponse.count < 5 && currentResponse.count < message.total) {
                currentResponse.count += 1;
                currentResponse.enrs.push(...message.enrs);
                this.activeRequests.set(message.id, activeRequest);
                this.activeNodesResponses.set(message.id, currentResponse);
                return;
            }
            // Have received all the Nodes responses we are willing to accept
            message.enrs.push(...currentResponse.enrs);
        }
        log("Received NODES response of length: %d, total: %d, from node: %s", message.enrs.length, message.total, srcId);
        this.activeNodesResponses.delete(message.id);
        this.discovered(srcId, message.enrs, lookupId);
    }
}
exports.Discv5 = Discv5;
