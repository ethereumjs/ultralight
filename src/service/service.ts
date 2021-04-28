import { EventEmitter } from "events";
import debug from "debug";
import { Multiaddr } from "multiaddr";
import isIp = require("is-ip");
import PeerId = require("peer-id");

import { UDPTransportService } from "../transport";
import { MAX_PACKET_SIZE } from "../packet";
import { SessionService } from "../session";
import { ENR, NodeId, MAX_RECORD_SIZE } from "../enr";
import { IKeypair, createKeypairFromPeerId, createPeerIdFromKeypair } from "../keypair";
import {
  EntryStatus,
  KademliaRoutingTable,
  log2Distance,
  ILookupPeer,
  findNodeLog2Distance,
  Lookup,
} from "../kademlia";
import {
  Message,
  RequestMessage,
  ResponseMessage,
  createPingMessage,
  createFindNodeMessage,
  createNodesMessage,
  MessageType,
  IFindNodeMessage,
  INodesMessage,
  IPongMessage,
  IPingMessage,
  requestMatchesResponse,
  createPongMessage,
} from "../message";
import { Discv5EventEmitter, ENRInput, IActiveRequest, INodesResponse } from "./types";
import { AddrVotes } from "./addrVotes";
import { TimeoutMap } from "../util";
import { IDiscv5Config, defaultConfig } from "../config";

const log = debug("discv5:service");

/**
 * Discovery v5 is a protocol designed for encrypted peer discovery and topic advertisement. Each peer/node
 * on the network is identified via its ENR (Ethereum Name Record) which is essentially a signed key-value
 * store containing the node's public key and optionally IP address and port.
 *
 * Discv5 employs a kademlia-like routing table to store and manage discovered peers and topics.
 * The protocol allows for external IP discovery in NAT environments through regular PING/PONGs with
 * discovered nodes.
 * Nodes return the external IP address that they have received and a simple majority is chosen as our external
 * IP address.
 *
 * This section contains protocol-level logic. In particular it manages the routing table of known ENRs, topic
 * registration/advertisement and performs lookups
 */

export interface IDiscv5CreateOptions {
  enr: ENRInput;
  peerId: PeerId;
  multiaddr: Multiaddr;
  config?: Partial<IDiscv5Config>;
}

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
export class Discv5 extends (EventEmitter as { new (): Discv5EventEmitter }) {
  /**
   * Configuration
   */
  private config: IDiscv5Config;

  private started = false;
  /**
   * Session service that establishes sessions with peers
   */
  private sessionService: SessionService;
  /**
   * Storage of the ENR record for each node
   */
  private kbuckets: KademliaRoutingTable;
  /**
   * All the iterative lookups we are currently performing with their ID
   */
  private activeLookups: Map<number, Lookup>;

  /**
   * RPC requests that have been sent and are awaiting a response.
   * Some requests are linked to a lookup (spanning multiple req/resp trips)
   */
  private activeRequests: TimeoutMap<bigint, IActiveRequest>;

  /**
   * Tracks responses received across NODES responses.
   */
  private activeNodesResponses: Map<bigint, INodesResponse>;

  /**
   * List of peers we have established sessions with and an interval id
   * the interval handler pings the associated node
   */
  private connectedPeers: Map<NodeId, NodeJS.Timer>;

  /**
   * Id for the next lookup that we start
   */
  private nextLookupId: number;
  /**
   * A map of votes that nodes have made about our external IP address
   */
  private addrVotes: AddrVotes;

  /**
   * Default constructor.
   * @param sessionService the service managing sessions underneath.
   */
  constructor(config: IDiscv5Config, sessionService: SessionService) {
    super();
    this.config = config;
    this.sessionService = sessionService;
    this.kbuckets = new KademliaRoutingTable(this.sessionService.enr.nodeId, 16);
    this.activeLookups = new Map();
    this.activeRequests = new TimeoutMap(this.config.requestTimeout, (requestId, activeRequest) =>
      this.onActiveRequestFailed(activeRequest)
    );
    this.activeNodesResponses = new Map();
    this.connectedPeers = new Map();
    this.nextLookupId = 1;
    this.addrVotes = new AddrVotes();
  }

  /**
   * Convenience method to create a new discv5 service.
   *
   * @param enr the ENR record identifying the current node.
   * @param peerId the PeerId with the keypair that identifies the enr
   * @param multiaddr The multiaddr which contains the the network interface and port to which the UDP server binds
   */
  public static create({ enr, peerId, multiaddr, config = {} }: IDiscv5CreateOptions): Discv5 {
    const fullConfig = { ...defaultConfig, ...config };
    const decodedEnr = typeof enr === "string" ? ENR.decodeTxt(enr) : enr;
    const udpTransport = new UDPTransportService(multiaddr, decodedEnr.nodeId);
    const sessionService = new SessionService(fullConfig, decodedEnr, createKeypairFromPeerId(peerId), udpTransport);
    return new Discv5(fullConfig, sessionService);
  }

  /**
   * Starts the service and adds all initial bootstrap peers to be considered.
   */
  public async start(): Promise<void> {
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
    await this.sessionService.start();
    this.started = true;
  }

  /**
   * Stops the service, closing any underlying networking activity.
   */
  public async stop(): Promise<void> {
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

  public isStarted(): boolean {
    return this.started;
  }

  /**
   * Adds a known ENR of a peer participating in Discv5 to the routing table.
   *
   * This allows pre-populating the kademlia routing table with known addresses,
   * so that they can be used immediately in following DHT operations involving one of these peers,
   * without having to dial them upfront.
   */
  public addEnr(enr: ENRInput): void {
    let decodedEnr: ENR;
    try {
      decodedEnr = typeof enr === "string" ? ENR.decodeTxt(enr) : enr;
    } catch (e) {
      log("Unable to add enr: %o", enr);
      return;
    }
    if (this.kbuckets.getWithPending(decodedEnr.nodeId)) {
      this.kbuckets.updateValue(decodedEnr);
    } else if (this.kbuckets.add(decodedEnr, EntryStatus.Disconnected)) {
      this.emit("enrAdded", decodedEnr);
    }
  }

  public get bindAddress(): Multiaddr {
    return this.sessionService.transport.multiaddr;
  }

  public get keypair(): IKeypair {
    return this.sessionService.keypair;
  }

  public peerId(): Promise<PeerId> {
    return createPeerIdFromKeypair(this.keypair);
  }

  public get enr(): ENR {
    return this.sessionService.enr;
  }

  public get connectedPeerCount(): number {
    return this.connectedPeers.size;
  }

  public getKadValue(nodeId: NodeId): ENR | undefined {
    return this.kbuckets.getValue(nodeId);
  }

  /**
   * Return all ENRs of nodes currently contained in buckets of the kad routing table
   */
  public kadValues(): ENR[] {
    return this.kbuckets.values();
  }

  /**
   * Starts an iterative FIND_NODE lookup
   */
  public async findNode(target: NodeId): Promise<ENR[]> {
    const lookupId = this.nextLookupId;
    log("Starting a new lookup. Id: %d", lookupId);
    if (this.nextLookupId >= 2 ** 32) {
      this.nextLookupId = 1;
    } else {
      this.nextLookupId += 1;
    }

    const knownClosestPeers = this.kbuckets.nearest(target, 16).map((enr) => enr.nodeId);
    const lookup = new Lookup(this.config, target, 3, knownClosestPeers);
    this.activeLookups.set(lookupId, lookup);
    return await new Promise((resolve) => {
      lookup.on("peer", (peer: ILookupPeer) => this.sendLookup(lookupId, target, peer));
      lookup.on("finished", (closest: NodeId[]) => {
        log("Lookup Id: %d finished, %d total found", lookupId, closest.length);
        resolve(closest.map((nodeId) => this.findEnr(nodeId) as ENR).filter((enr) => enr));
        this.activeLookups.delete(lookupId);
      });

      // This will trigger "peer" events, eventually leading to a "finished" event
      lookup.start();
    });
  }

  /**
   * Sends a PING request to a node
   */
  private sendPing(nodeId: NodeId): void {
    log("Sending PING to %s", nodeId);
    this.sendRequest(nodeId, createPingMessage(this.enr.seq));
  }

  private pingConnectedPeers(): void {
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
  private requestEnr(nodeId: NodeId, src: Multiaddr): void {
    try {
      log("Sending ENR request to node: %s", nodeId);
      const message = createFindNodeMessage([0]);
      this.sessionService.sendRequestUnknownEnr(src, nodeId, message);
      this.activeRequests.set(message.id, { request: message, dstId: nodeId });
    } catch (e) {
      log("Requesting ENR failed. Error: %s", e.message);
    }
  }

  /**
   * Constructs and sends a request to the session service given a target and lookup peer
   */
  private sendLookup(lookupId: number, target: NodeId, peer: ILookupPeer): void {
    const peerId = peer.nodeId;
    const distance = findNodeLog2Distance(target, peer);
    // send request if distance is not 0
    let succeeded = Boolean(distance);
    if (succeeded) {
      log("Sending lookup. Id: %d, Iteration: %d, Node: %s", lookupId, peer.iteration, peerId);
      succeeded = this.sendRequest(peer.nodeId, createFindNodeMessage([distance]), lookupId);
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
  private sendRequest(nodeId: NodeId, req: RequestMessage, lookupId?: number): boolean {
    const dstEnr = this.findEnr(nodeId);
    if (!dstEnr) {
      log("Request not sent. Failed to find an ENR for node: %s", nodeId);
    } else {
      try {
        this.sessionService.sendRequest(dstEnr, req);
        this.activeRequests.set(req.id, { request: req, dstId: nodeId, lookupId });
        return true;
      } catch (e) {
        log("Sending request to node: %s failed: error: %s", nodeId, e.message);
      }
    }
    return false;
  }

  /**
   * Update the conection status of a node in the routing table
   */
  private connectionUpdated(nodeId: NodeId, enr: ENR | undefined, newStatus: EntryStatus): void {
    if (this.kbuckets.getWithPending(nodeId)) {
      if (enr) {
        this.kbuckets.update(enr, newStatus);
      } else {
        this.kbuckets.updateStatus(nodeId, newStatus);
      }
    } else if (newStatus === EntryStatus.Connected && enr) {
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
  private findEnr(nodeId: NodeId): ENR | undefined {
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

  private retrieveRequest(srcId: NodeId, message: ResponseMessage): IActiveRequest | undefined {
    // verify we know of the rpcId
    const activeRequest = this.activeRequests.get(message.id);
    if (!activeRequest) {
      log("Received an RPC response which doesn't match a request");
      return;
    }
    this.activeRequests.delete(message.id);
    if (!requestMatchesResponse(activeRequest.request, message)) {
      log("Node gave an incorrect response type. Ignoring response from node: %s", srcId);
      return;
    }
    return activeRequest;
  }

  private discovered(srcId: NodeId, enrs: ENR[], lookupId?: number): void {
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
      } else {
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
        lookup.onSuccess(
          srcId,
          others.map((enr) => enr.nodeId)
        );
      }
    }
  }

  // process kad updates

  private onPendingEviction = (enr: ENR): void => {
    this.sendPing(enr.nodeId);
  };

  private onAppliedEviction = (inserted: ENR, evicted?: ENR): void => {
    this.emit("enrAdded", inserted, evicted);
  };

  // process events from the session service

  private onEstablished = (enr: ENR): void => {
    const nodeId = enr.nodeId;
    this.connectionUpdated(nodeId, enr, EntryStatus.Connected);
    // send an initial ping and start the ping interval
    this.sendPing(nodeId);
    this.connectedPeers.set(
      nodeId,
      setInterval(() => this.sendPing(nodeId), this.config.pingInterval)
    );
  };

  private onMessage = (srcId: NodeId, src: Multiaddr, message: Message): void => {
    switch (message.type) {
      case MessageType.PING:
        return this.onPing(srcId, src, message as IPingMessage);
      case MessageType.PONG:
        return this.onPong(srcId, src, message as IPongMessage);
      case MessageType.FINDNODE:
        return this.onFindNode(srcId, src, message as IFindNodeMessage);
      case MessageType.NODES:
        return this.onNodes(srcId, src, message as INodesMessage);
      default:
        // TODO Implement all RPC methods
        return;
    }
  };

  private onPing(srcId: NodeId, src: Multiaddr, message: IPingMessage): void {
    // check if we need to update the known ENR
    const entry = this.kbuckets.getWithPending(srcId);
    if (entry) {
      if (entry.value.seq < message.enrSeq) {
        this.requestEnr(srcId, src);
      }
    } else {
      this.requestEnr(srcId, src);
    }
    // build the Pong response
    log("Sending PONG response to node: %s", srcId);
    try {
      const srcOpts = src.toOptions();
      this.sessionService.sendResponse(
        src,
        srcId,
        createPongMessage(message.id, this.enr.seq, srcOpts.host, srcOpts.port)
      );
    } catch (e) {
      log("Failed to send Pong. Error %s", e.message);
    }
  }

  private onPong(srcId: NodeId, src: Multiaddr, message: IPongMessage): void {
    if (!this.retrieveRequest(srcId, message)) {
      return;
    }
    if (this.config.enrUpdate) {
      this.addrVotes.addVote(
        srcId,
        new Multiaddr(
          `/${isIp.v4(message.recipientIp) ? "ip4" : "ip6"}/${message.recipientIp}/udp/${message.recipientPort}`
        )
      );
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
        this.sendRequest(srcId, createFindNodeMessage([0]));
      }
      this.connectionUpdated(srcId, undefined, EntryStatus.Connected);
    }
  }

  /**
   * Sends a NODES response, given a list of found ENRs.
   * This function splits the nodes up into multiple responses to ensure the response stays below
   * the maximum packet size
   */
  private onFindNode(srcId: NodeId, src: Multiaddr, message: IFindNodeMessage): void {
    const { id, distances } = message;
    let nodes: ENR[] = [];
    distances.forEach((distance) => {
      // if the distance is 0, send our local ENR
      if (distance === 0) {
        this.enr.encodeToValues(this.keypair.privateKey);
        nodes.push(this.enr);
      } else {
        nodes.push(...this.kbuckets.valuesOfDistance(distance));
      }
    });
    nodes = nodes.slice(0, 15);
    if (nodes.length === 0) {
      log("Sending empty NODES response to %s", srcId);
      try {
        this.sessionService.sendResponse(src, srcId, createNodesMessage(id, 0, nodes));
      } catch (e) {
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
    const nodesPerPacket = Math.floor((MAX_PACKET_SIZE - 92) / MAX_RECORD_SIZE);
    const total = Math.ceil(nodes.length / nodesPerPacket);
    log("Sending %d NODES responses to %s", total, srcId);
    for (let i = 0; i < nodes.length; i += nodesPerPacket) {
      const _nodes = nodes.slice(i, i + nodesPerPacket);
      try {
        this.sessionService.sendResponse(src, srcId, createNodesMessage(id, total, _nodes));
      } catch (e) {
        log("Failed to send a NODES response. Error: %s", e.message);
      }
    }
  }

  private onNodes(srcId: NodeId, src: Multiaddr, message: INodesMessage): void {
    const activeRequest = this.retrieveRequest(srcId, message);
    if (!activeRequest) {
      return;
    }
    const { request, lookupId } = activeRequest as { request: IFindNodeMessage; lookupId: number };
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
    message.enrs = message.enrs.filter((enr) => distancesRequested.includes(log2Distance(enr.nodeId, srcId)));

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

  private onWhoAreYouRequest = (srcId: NodeId, src: Multiaddr, nonce: Buffer): void => {
    // Check what our latest known ENR is for this node
    const enr = this.findEnr(srcId);
    if (enr) {
      this.sessionService.sendWhoAreYou(src, srcId, enr.seq, enr, nonce);
    } else {
      log("Node unknown, requesting ENR. Node: %s", srcId);
      this.sessionService.sendWhoAreYou(src, srcId, 0n, null, nonce);
    }
  };

  private onActiveRequestFailed = (activeRequest: IActiveRequest): void => {
    const { request, dstId, lookupId } = activeRequest;
    this.activeRequests.delete(request.id);
    // If a failed FindNodes Request, ensure we haven't partially received responses.
    // If so, process the partially found nodes
    if (request.type === MessageType.FINDNODE) {
      const nodesResponse = this.activeNodesResponses.get(request.id);
      if (nodesResponse) {
        this.activeNodesResponses.delete(request.id);
        log("FINDNODE request failed, but was partially processed from Node: %s", dstId);
        // If its a query, mark it as a success, to process the partial collection of its peers
        this.discovered(dstId, nodesResponse.enrs, lookupId);
      } else {
        // There was no partially downloaded nodes, inform the lookup of the failure if its part of a query
        const lookup = this.activeLookups.get(lookupId as number);
        if (lookup) {
          lookup.onFailure(dstId);
        } else {
          log("Failed request: %O for node: %s", request, dstId);
        }
      }
    }
  };

  /**
   * A session could not be established or an RPC request timed out
   */
  private onRequestFailed = (srcId: NodeId, rpcId: bigint): void => {
    const req = this.activeRequests.get(rpcId);
    if (req) {
      this.onActiveRequestFailed(req);
    }
    // report the node as being disconnected
    this.connectionUpdated(srcId, undefined, EntryStatus.Disconnected);
    clearInterval(this.connectedPeers.get(srcId) as NodeJS.Timer);
    this.connectedPeers.delete(srcId);
  };
}
