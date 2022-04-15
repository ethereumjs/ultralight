import { EventEmitter } from "events";
import debug, { Debugger } from "debug";
import { randomBytes } from "libp2p-crypto";
import { Multiaddr } from "multiaddr";
import PeerId from "peer-id";

import { ITransportService, UDPTransportService } from "../transport";
import { MAX_PACKET_SIZE } from "../packet";
import { ConnectionDirection, RequestErrorType, SessionService } from "../session";
import { ENR, NodeId, MAX_RECORD_SIZE, createNodeId } from "../enr";
import { IKeypair, createKeypairFromPeerId, createPeerIdFromKeypair } from "../keypair";
import { EntryStatus, InsertResult, KademliaRoutingTable, log2Distance, Lookup, UpdateResult } from "../kademlia";
import {
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
  ITalkReqMessage,
  ITalkRespMessage,
  createTalkRequestMessage,
  createTalkResponseMessage,
  RequestId,
} from "../message";
import { Discv5EventEmitter, ENRInput, IActiveRequest, IDiscv5Metrics, INodesResponse } from "./types";
import { AddrVotes } from "./addrVotes";
import { toBuffer } from "../util";
import { IDiscv5Config, defaultConfig } from "../config";
import { createNodeContact, getNodeAddress, getNodeId, INodeAddress, NodeContact } from "../session/nodeInfo";
import { BufferCallback, ConnectionStatus, ConnectionStatusType } from ".";

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
  metrics?: IDiscv5Metrics;
  transport?: ITransportService;
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

  private log: Debugger;

  /**
   * Session service that establishes sessions with peers
   */
  private sessionService: SessionService;

  /**
   * Storage of the ENR record for each node
   *
   * BOUNDED: bounded by bucket count + size
   */
  private kbuckets: KademliaRoutingTable;

  /**
   * All the iterative lookups we are currently performing with their ID
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   */
  private activeLookups: Map<number, Lookup>;

  /**
   * RPC requests that have been sent and are awaiting a response.
   * Some requests are linked to a lookup (spanning multiple req/resp trips)
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   */
  private activeRequests: Map<bigint, IActiveRequest>;

  /**
   * Tracks responses received across NODES responses.
   *
   * UNBOUNDED: consumer data, responsibility of the app layer to bound
   */
  private activeNodesResponses: Map<bigint, INodesResponse>;

  /**
   * List of peers we have established sessions with and an interval id
   * the interval handler pings the associated node
   *
   * BOUNDED: bounded by kad table size
   */
  private connectedPeers: Map<NodeId, NodeJS.Timer>;

  /**
   * Id for the next lookup that we start
   */
  private nextLookupId: number;

  /**
   * A map of votes that nodes have made about our external IP address
   *
   * BOUNDED
   */
  private addrVotes: AddrVotes;

  private metrics?: IDiscv5Metrics;

  /**
   * Default constructor.
   * @param sessionService the service managing sessions underneath.
   */
  constructor(config: IDiscv5Config, sessionService: SessionService, metrics?: IDiscv5Metrics) {
    super();
    this.config = config;
    this.sessionService = sessionService;
    this.kbuckets = new KademliaRoutingTable(this.sessionService.enr.nodeId);
    this.activeLookups = new Map();
    this.activeRequests = new Map();
    this.activeNodesResponses = new Map();
    this.connectedPeers = new Map();
    this.nextLookupId = 1;
    this.addrVotes = new AddrVotes(config.addrVotesToUpdateEnr);
    if (metrics) {
      this.metrics = metrics;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const discv5 = this;
      metrics.kadTableSize.collect = () => metrics.kadTableSize.set(discv5.kbuckets.size);
      metrics.connectedPeerCount.collect = () => metrics.connectedPeerCount.set(discv5.connectedPeers.size);
      metrics.activeSessionCount.collect = () => metrics.activeSessionCount.set(discv5.sessionService.sessionsSize());
      metrics.lookupCount.collect = () => metrics.lookupCount.set(this.nextLookupId - 1);
    }
    this.log = debug(this.enr.nodeId.slice(0, 5)).extend("discv5:service");
  }

  /**
   * Convenience method to create a new discv5 service.
   *
   * @param enr the ENR record identifying the current node.
   * @param peerId the PeerId with the keypair that identifies the enr
   * @param multiaddr The multiaddr which contains the the network interface and port to which the UDP server binds
   */
  public static create({ enr, peerId, multiaddr, config = {}, metrics, transport }: IDiscv5CreateOptions): Discv5 {
    const fullConfig = { ...defaultConfig, ...config };
    const decodedEnr = typeof enr === "string" ? ENR.decodeTxt(enr) : enr;
    const sessionService = new SessionService(
      fullConfig,
      decodedEnr,
      createKeypairFromPeerId(peerId),
      transport ?? new UDPTransportService(multiaddr, decodedEnr.nodeId)
    );
    return new Discv5(fullConfig, sessionService, metrics);
  }

  /**
   * Starts the service and adds all initial bootstrap peers to be considered.
   */
  public async start(): Promise<void> {
    if (this.started) {
      this.log("Starting discv5 service failed -- already started");
      return;
    }
    this.log(`Starting discv5 service with node id ${this.enr.nodeId}`);
    this.kbuckets.on("pendingEviction", this.onPendingEviction);
    this.kbuckets.on("appliedEviction", this.onAppliedEviction);
    this.sessionService.on("established", this.onEstablished);
    this.sessionService.on("request", this.handleRpcRequest);
    this.sessionService.on("response", this.handleRpcResponse);
    this.sessionService.on("whoAreYouRequest", this.handleWhoAreYouRequest);
    this.sessionService.on("requestFailed", this.rpcFailure);
    await this.sessionService.start();
    this.started = true;
  }

  /**
   * Stops the service, closing any underlying networking activity.
   */
  public async stop(): Promise<void> {
    if (!this.started) {
      this.log("Stopping discv5 service -- already stopped");
      return;
    }
    this.log("Stopping discv5 service");
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
    this.sessionService.off("request", this.handleRpcRequest);
    this.sessionService.off("response", this.handleRpcResponse);
    this.sessionService.off("whoAreYouRequest", this.handleWhoAreYouRequest);
    this.sessionService.off("requestFailed", this.rpcFailure);
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
      decodedEnr.encode();
    } catch (e) {
      this.log("Unable to add enr: %o", enr);
      return;
    }
    if (this.kbuckets.insertOrUpdate(decodedEnr, EntryStatus.Disconnected) === InsertResult.Inserted) {
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

  public async findRandomNode(): Promise<ENR[]> {
    return await this.findNode(createNodeId(toBuffer(randomBytes(32))));
  }

  /**
   * Starts an iterative FIND_NODE lookup
   */
  public async findNode(target: NodeId): Promise<ENR[]> {
    const lookupId = this.nextLookupId;
    this.log("Starting a new lookup. Id: %d", lookupId);
    if (this.nextLookupId >= 2 ** 32) {
      this.nextLookupId = 1;
    } else {
      this.nextLookupId += 1;
    }

    const knownClosestPeers = this.kbuckets.nearest(target, 16).map((enr) => enr.nodeId);
    const lookup = new Lookup(this.config, target, knownClosestPeers);
    this.activeLookups.set(lookupId, lookup);
    return await new Promise((resolve) => {
      lookup.on("peer", (peer: NodeId) => this.sendLookup(lookupId, peer, lookup.createRpcRequest(peer)));
      lookup.on("finished", (closest: NodeId[]) => {
        this.log("Lookup Id: %d finished, %d total found", lookupId, closest.length);
        resolve(closest.map((nodeId) => this.findEnr(nodeId) as ENR).filter((enr) => enr));
        this.activeLookups.delete(lookupId);
      });

      // This will trigger "peer" events, eventually leading to a "finished" event
      lookup.start();
    });
  }

  /**
   * Broadcast TALKREQ message to all nodes in routing table and returns response
   */
  public async broadcastTalkReq(payload: Buffer, protocol: string | Uint8Array): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
      const request = createTalkRequestMessage(payload, protocol);
      const callback = (err: RequestErrorType | null, res: Buffer | null): void => {
        if (err) {
          return reject(err);
        }
        if (res) {
          resolve(res);
        }
      };

      /** Broadcast request to all peers in the routing table */
      for (const node of this.kadValues()) {
        this.sendRpcRequest({
          contact: createNodeContact(node),
          request,
          callback,
        });
      }
    });
  }
  /**
   * Send TALKREQ message to dstId and returns response
   */
  public async sendTalkReq(
    dstId: string,
    payload: Buffer,
    protocol: string | Uint8Array,
    remoteEnr?: ENR
  ): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
      const enr = remoteEnr ?? this.findEnr(dstId);
      if (!enr) {
        this.log("Talkreq requested an unknown ENR, node: %s", dstId);
        return;
      }

      this.sendRpcRequest({
        contact: createNodeContact(enr),
        request: createTalkRequestMessage(payload, protocol),
        callback: (err: RequestErrorType | null, res: Buffer | null): void => {
          if (err !== null) {
            reject(err);
            return;
          }
          resolve(res as Buffer);
        },
      });
    });
  }

  /**
   * Send TALKRESP message to requesting node
   */
  public async sendTalkResp(srcId: NodeId, requestId: RequestId, payload: Uint8Array, remoteEnr?: ENR): Promise<void> {
    const msg = createTalkResponseMessage(requestId, payload);
    const enr = remoteEnr ?? this.findEnr(srcId);
    const addr = enr?.getLocationMultiaddr("udp");
    if (enr && addr) {
      this.log(`Sending TALKRESP message to node ${enr.id}`);
      try {
        this.sessionService.sendResponse({ nodeId: srcId, socketAddr: addr }, msg);
        this.metrics?.sentMessageCount.inc({ type: MessageType[MessageType.TALKRESP] });
      } catch (e) {
        this.log("Failed to send a TALKRESP response. Error: %s", (e as Error).message);
      }
    } else {
      if (!addr && enr) {
        this.log(`No ip + udp port found for node ${srcId}`);
      } else {
        this.log(`Node ${srcId} not found`);
      }
    }
  }

  /**
   * Hack to get debug logs to work in browser
   */
  public enableLogs(): void {
    debug.enable("discv5*");
  }

  /**
   * Sends a PING request to a node
   */
  private sendPing(enr: ENR): void {
    this.sendRpcRequest({ contact: createNodeContact(enr), request: createPingMessage(this.enr.seq) });
  }

  /**
   * Ping all peers connected in the routing table
   */
  private pingConnectedPeers(): void {
    for (const entry of this.kbuckets.rawValues()) {
      if (entry.status === EntryStatus.Connected) {
        this.sendPing(entry.value);
      }
    }
  }

  /**
   * Request an external node's ENR
   */
  private requestEnr(contact: NodeContact, callback?: (err: RequestErrorType | null, res: ENR | null) => void): void {
    this.sendRpcRequest({ request: createFindNodeMessage([0]), contact, callback });
  }

  /**
   * Constructs and sends a request to the session service given a target and lookup peer
   */
  private sendLookup(lookupId: number, peer: NodeId, request: RequestMessage): void {
    const enr = this.findEnr(peer);
    if (!enr || !enr.getLocationMultiaddr("udp")) {
      this.log("Lookup %s requested an unknown ENR or ENR w/o UDP", lookupId);
      this.activeLookups.get(lookupId)?.onFailure(peer);
      return;
    }

    this.sendRpcRequest({
      contact: createNodeContact(enr),
      request,
      lookupId,
    });
  }

  /**
   * Sends generic RPC requests.
   * Each request gets added to known outputs, awaiting a response
   *
   * Returns true if the request was sent successfully
   */
  private sendRpcRequest(activeRequest: IActiveRequest): void {
    this.activeRequests.set(activeRequest.request.id, activeRequest);

    const nodeAddr = getNodeAddress(activeRequest.contact);
    this.log("Sending %s to node: %o", MessageType[activeRequest.request.type], nodeAddr);
    try {
      this.sessionService.sendRequest(activeRequest.contact, activeRequest.request);
      this.metrics?.sentMessageCount.inc({ type: MessageType[activeRequest.request.type] });
    } catch (e) {
      this.activeRequests.delete(activeRequest.request.id);
      this.log("Error sending RPC to node: %o, :Error: %s", nodeAddr, (e as Error).message);
    }
  }

  /**
   * Update the conection status of a node in the routing table.
   * This tracks whether or not we should be pinging peers.
   * Disconnected peers are removed from the queue and
   * newly added peers to the routing table are added to the queue.
   */
  private connectionUpdated(nodeId: NodeId, newStatus: ConnectionStatus): void {
    switch (newStatus.type) {
      case ConnectionStatusType.Connected: {
        // attempt to update or insert the new ENR.
        switch (this.kbuckets.insertOrUpdate(newStatus.enr, EntryStatus.Connected)) {
          case InsertResult.Inserted: {
            // We added this peer to the table
            this.log("New connected node added to routing table: %s", nodeId);
            clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
            this.connectedPeers.set(
              nodeId,
              setInterval(() => {
                // If the node is in the routing table, keep pinging
                if (this.kbuckets.getValue(nodeId)) {
                  this.sendPing(newStatus.enr);
                } else {
                  clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
                  this.connectedPeers.delete(nodeId);
                }
              }, this.config.pingInterval)
            );
            this.emit("enrAdded", newStatus.enr);
            break;
          }

          case InsertResult.UpdatedAndPromoted:
          case InsertResult.StatusUpdatedAndPromoted: {
            // The node was promoted
            this.log("Node promoted to connected: %s", nodeId);
            clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
            this.connectedPeers.set(
              nodeId,
              setInterval(() => {
                // If the node is in the routing table, keep pinging
                if (this.kbuckets.getValue(nodeId)) {
                  this.sendPing(newStatus.enr);
                } else {
                  clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
                  this.connectedPeers.delete(nodeId);
                }
              }, this.config.pingInterval)
            );
            break;
          }

          case InsertResult.FailedBucketFull:
          case InsertResult.FailedInvalidSelfUpdate:
            this.log("Could not insert node: %s", nodeId);
            clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
            this.connectedPeers.delete(nodeId);
            break;
        }
        break;
      }

      case ConnectionStatusType.PongReceived: {
        switch (this.kbuckets.update(newStatus.enr, EntryStatus.Connected)) {
          case UpdateResult.FailedBucketFull:
          case UpdateResult.FailedKeyNonExistant: {
            this.log("Could not update ENR from pong. Node: %s", nodeId);
            clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
            this.connectedPeers.delete(nodeId);
            break;
          }
        }
        break;
      }

      case ConnectionStatusType.Disconnected: {
        // If the node has disconnected, remove any ping timer for the node.
        switch (this.kbuckets.updateStatus(nodeId, EntryStatus.Disconnected)) {
          case UpdateResult.FailedBucketFull:
          case UpdateResult.FailedKeyNonExistant: {
            this.log("Could not update node to disconnected, Node: %s", nodeId);
            break;
          }
          default: {
            this.log("Node set to disconnected: %s", nodeId);
            break;
          }
        }
        clearInterval(this.connectedPeers.get(nodeId) as NodeJS.Timeout);
        this.connectedPeers.delete(nodeId);
        break;
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

  /**
   * Processes discovered peers from a query
   */
  private discovered(srcId: NodeId, enrs: ENR[], lookupId?: number): void {
    const localId = this.enr.nodeId;
    const others: ENR[] = [];
    for (const enr of enrs) {
      if (enr.nodeId === localId) {
        continue;
      }

      // send the discovered event
      //if (this.config.reportDiscoveredPeers)
      this.emit("discovered", enr);

      // ignore peers that don't pass the table filter
      // if (this.config.tableFilter(enr)) {}

      // If any of the discovered nodes are in the routing table,
      // and there contains an older ENR, update it.
      const entry = this.kbuckets.getWithPending(enr.nodeId);
      if (entry) {
        if (entry.value.seq < enr.seq) {
          switch (this.kbuckets.update(enr)) {
            case UpdateResult.FailedBucketFull:
            case UpdateResult.FailedKeyNonExistant: {
              clearInterval(this.connectedPeers.get(enr.nodeId) as NodeJS.Timeout);
              this.connectedPeers.delete(enr.nodeId);
              this.log("Failed to update discovered ENR. Node: %s", enr.nodeId);
              continue;
            }
          }
        }
      }

      others.push(enr);
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
        this.log("%d peers found for lookup Id: %d, Node: %s", others.length, lookupId, srcId);
        lookup.onSuccess(
          srcId,
          others.map((enr) => enr.nodeId)
        );
      }
    }
  }

  // process kad updates

  private onPendingEviction = (enr: ENR): void => {
    this.sendPing(enr);
  };

  private onAppliedEviction = (inserted: ENR, evicted?: ENR): void => {
    this.emit("enrAdded", inserted, evicted);
  };

  // process events from the session service

  private onEstablished = (enr: ENR, direction: ConnectionDirection): void => {
    // Ignore sessions with non-contactable ENRs
    if (!enr.getLocationMultiaddr("udp")) {
      return;
    }

    const nodeId = enr.nodeId;
    this.log("Session established with Node: %s, Direction: %s", nodeId, ConnectionDirection[direction]);
    this.connectionUpdated(nodeId, { type: ConnectionStatusType.Connected, enr, direction });
    this.emit("sessionEstablished", nodeId);
  };

  private handleWhoAreYouRequest = (nodeAddr: INodeAddress, nonce: Buffer): void => {
    // Check what our latest known ENR is for this node
    const enr = this.findEnr(nodeAddr.nodeId) ?? null;
    if (enr) {
      this.log("Received WHOAREYOU, Node known, Node: %o", nodeAddr);
    } else {
      this.log("Received WHOAREYOU, Node unknown, requesting ENR. Node: %o", nodeAddr);
    }
    this.sessionService.sendChallenge(nodeAddr, nonce, enr);
  };

  // handle rpc request

  /**
   * Processes an RPC request from a peer.
   *
   * Requests respond to the received socket address, rather than the IP of the known ENR.
   */
  private handleRpcRequest = (nodeAddr: INodeAddress, request: RequestMessage): void => {
    this.metrics?.rcvdMessageCount.inc({ type: MessageType[request.type] });
    switch (request.type) {
      case MessageType.PING:
        return this.handlePing(nodeAddr, request as IPingMessage);
      case MessageType.FINDNODE:
        return this.handleFindNode(nodeAddr, request as IFindNodeMessage);
      case MessageType.TALKREQ:
        return this.handleTalkReq(nodeAddr, request as ITalkReqMessage);
      default:
        this.log("Received request which is unimplemented");
        // TODO Implement all RPC methods
        return;
    }
  };

  private handlePing(nodeAddr: INodeAddress, message: IPingMessage): void {
    // check if we need to update the known ENR
    const entry = this.kbuckets.getWithPending(nodeAddr.nodeId);
    if (entry) {
      if (entry.value.seq < message.enrSeq) {
        this.requestEnr(createNodeContact(entry.value));
      }
    }

    // build the Pong response
    this.log("Sending PONG response to node: %o", nodeAddr);
    try {
      const srcOpts = nodeAddr.socketAddr.toOptions();
      this.sessionService.sendResponse(
        nodeAddr,
        createPongMessage(message.id, this.enr.seq, srcOpts.host, srcOpts.port)
      );
      this.metrics?.sentMessageCount.inc({ type: MessageType[MessageType.PONG] });
    } catch (e) {
      this.log("Failed to send Pong. Error %s", (e as Error).message);
    }
  }

  /**
   * Sends a NODES response, given a list of found ENRs.
   * This function splits the nodes up into multiple responses to ensure the response stays below
   * the maximum packet size
   */
  private handleFindNode(nodeAddr: INodeAddress, message: IFindNodeMessage): void {
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
      this.log("Sending empty NODES response to %o", nodeAddr);
      try {
        this.sessionService.sendResponse(nodeAddr, createNodesMessage(id, 0, nodes));
        this.metrics?.sentMessageCount.inc({ type: MessageType[MessageType.NODES] });
      } catch (e) {
        this.log("Failed to send a NODES response. Error: %s", (e as Error).message);
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
    this.log("Sending %d NODES responses to %o", total, nodeAddr);
    for (let i = 0; i < nodes.length; i += nodesPerPacket) {
      const _nodes = nodes.slice(i, i + nodesPerPacket);
      try {
        this.sessionService.sendResponse(nodeAddr, createNodesMessage(id, total, _nodes));
        this.metrics?.sentMessageCount.inc({ type: MessageType[MessageType.NODES] });
      } catch (e) {
        this.log("Failed to send a NODES response. Error: %s", (e as Error).message);
      }
    }
  }

  private handleTalkReq = (nodeAddr: INodeAddress, message: ITalkReqMessage): void => {
    this.log("Received TALKREQ message from Node: %o", nodeAddr);
    this.emit("talkReqReceived", nodeAddr, this.findEnr(nodeAddr.nodeId) ?? null, message);
  };

  // handle rpc response

  /**
   * Processes an RPC response from a peer.
   */
  private handleRpcResponse = (nodeAddr: INodeAddress, response: ResponseMessage): void => {
    this.metrics?.rcvdMessageCount.inc({ type: MessageType[response.type] });

    // verify we know of the rpc id

    const activeRequest = this.activeRequests.get(response.id);
    if (!activeRequest) {
      this.log("Received an RPC response which doesn't match a request. Id: &s", response.id);
      return;
    }
    this.activeRequests.delete(response.id);

    // Check that the responder matches the expected request
    const requestNodeAddr = getNodeAddress(activeRequest.contact);
    if (requestNodeAddr.nodeId !== nodeAddr.nodeId || !requestNodeAddr.socketAddr.equals(nodeAddr.socketAddr)) {
      this.log(
        "Received a response from an unexpected address. Expected %o, received %o, request id: %s",
        requestNodeAddr,
        nodeAddr,
        response.id
      );
      return;
    }

    // Check that the response type matches the request
    if (!requestMatchesResponse(activeRequest.request, response)) {
      this.log("Node gave an incorrect response type. Ignoring response from: %o", nodeAddr);
      return;
    }

    switch (response.type) {
      case MessageType.PONG:
        return this.handlePong(nodeAddr, activeRequest, response as IPongMessage);
      case MessageType.NODES:
        return this.handleNodes(nodeAddr, activeRequest, response as INodesMessage);
      case MessageType.TALKRESP:
        return this.handleTalkResp(
          nodeAddr,
          activeRequest as IActiveRequest<ITalkReqMessage, BufferCallback>,
          response as ITalkRespMessage
        );
      default:
        // TODO Implement all RPC methods
        return;
    }
  };

  private handlePong(nodeAddr: INodeAddress, activeRequest: IActiveRequest, message: IPongMessage): void {
    this.log("Received a PONG response from %o", nodeAddr);

    if (this.config.enrUpdate) {
      const winningVote = this.addrVotes.addVote(nodeAddr.nodeId, message);
      const currentAddr = this.enr.getLocationMultiaddr("udp");
      if (winningVote && (!currentAddr || winningVote.multiaddrStr !== currentAddr.toString())) {
        this.log("Local ENR (IP & UDP) updated: %s", winningVote.multiaddrStr);
        const votedAddr = new Multiaddr(winningVote.multiaddrStr);
        this.enr.setLocationMultiaddr(votedAddr);
        this.emit("multiaddrUpdated", votedAddr);

        // publish update to all connected peers
        this.pingConnectedPeers();
      }
    }

    // Check if we need to request a new ENR
    const enr = this.findEnr(nodeAddr.nodeId);
    if (enr) {
      if (enr.seq < message.enrSeq) {
        this.log("Requesting an ENR update from node: %o", nodeAddr);
        this.sendRpcRequest({
          contact: activeRequest.contact,
          request: createFindNodeMessage([0]),
        });
      }
      this.connectionUpdated(nodeAddr.nodeId, { type: ConnectionStatusType.PongReceived, enr });
    }
  }

  private handleNodes(nodeAddr: INodeAddress, activeRequest: IActiveRequest, message: INodesMessage): void {
    const { request, lookupId } = activeRequest as { request: IFindNodeMessage; lookupId: number };
    // Currently a maximum of 16 peers can be returned.
    // Datagrams have a max size of 1280 and ENRs have a max size of 300 bytes.
    // There should be no more than 5 responses to return 16 peers
    if (message.total > 5) {
      this.log("NODES response has a total larger than 5, nodes will be truncated");
    }

    // Filter out any nodes that are not of the correct distance
    // TODO: if a swarm peer reputation is built,
    // downvote the peer if all peers do not have the correct distance
    const distancesRequested = request.distances;
    message.enrs = message.enrs.filter((enr) => distancesRequested.includes(log2Distance(enr.nodeId, nodeAddr.nodeId)));

    // handle the case that there is more than one response
    if (message.total > 1) {
      const currentResponse = this.activeNodesResponses.get(message.id) || { count: 1, enrs: [] };
      this.activeNodesResponses.delete(message.id);
      this.log(
        "NODES response: %d of %d received, length: %d",
        currentResponse.count,
        message.total,
        message.enrs.length
      );
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
    this.log(
      "Received NODES response of length: %d, total: %d, from node: %o",
      message.enrs.length,
      message.total,
      nodeAddr
    );

    this.activeNodesResponses.delete(message.id);

    this.discovered(nodeAddr.nodeId, message.enrs, lookupId);
  }

  private handleTalkResp = (
    nodeAddr: INodeAddress,
    activeRequest: IActiveRequest<ITalkReqMessage, BufferCallback>,
    message: ITalkRespMessage
  ): void => {
    this.log("Received TALKRESP message from Node: %o", nodeAddr);
    this.emit("talkRespReceived", nodeAddr, this.findEnr(nodeAddr.nodeId) ?? null, message);
    if (activeRequest.callback) {
      activeRequest.callback(null, message.response);
    }
  };

  /**
   * A session could not be established or an RPC request timed out
   */
  private rpcFailure = (rpcId: bigint, error: RequestErrorType): void => {
    this.log("RPC error, removing request. Reason: %s, id %s", RequestErrorType[error], rpcId);
    const req = this.activeRequests.get(rpcId);
    if (!req) {
      return;
    }
    const { request, contact, lookupId, callback } = req;
    this.activeRequests.delete(request.id);

    // If this is initiated by the user, return an error on the callback.
    if (callback) {
      callback(error, null);
    }

    const nodeId = getNodeId(contact);
    // If a failed FindNodes Request, ensure we haven't partially received responses.
    // If so, process the partially found nodes
    if (request.type === MessageType.FINDNODE) {
      const nodesResponse = this.activeNodesResponses.get(request.id);
      if (nodesResponse) {
        this.activeNodesResponses.delete(request.id);

        if (nodesResponse.enrs.length) {
          this.log("NODES response failed, but was partially processed from Node: %s", nodeId);
          // If its a query, mark it as a success, to process the partial collection of its peers
          this.discovered(nodeId, nodesResponse.enrs, lookupId);
        }
      } else {
        // There was no partially downloaded nodes, inform the lookup of the failure if its part of a query
        const lookup = this.activeLookups.get(lookupId as number);
        if (lookup) {
          lookup.onFailure(nodeId);
        } else {
          this.log("Failed %s request: %O for node: %s", MessageType[request.type], request, nodeId);
        }
      }
    } else {
      // for all other requests, if any are lookups, mark them as failures.
      const lookup = this.activeLookups.get(lookupId as number);
      if (lookup) {
        lookup.onFailure(nodeId);
      } else {
        this.log("Failed %s request: %O for node: %s", MessageType[request.type], request, nodeId);
      }
    }

    // report the node as being disconnected
    this.connectionUpdated(nodeId, { type: ConnectionStatusType.Disconnected });
    this.emit("sessionEnded", nodeId);
  };
}
