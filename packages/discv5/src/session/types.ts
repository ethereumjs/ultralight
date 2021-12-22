import { Multiaddr } from "multiaddr";

import { NodeId, ENR } from "../enr";
import { IPacket } from "../packet";
import { RequestMessage, ResponseMessage } from "../message";
import { INodeAddress, NodeContact } from "./nodeInfo";

export type NodeAddressString = string;

export interface ISessionConfig {
  /**
   * The timeout for each UDP request
   * defined in milliseconds
   */
  requestTimeout: number;
  /**
   * The number of retries for each UDP request
   */
  requestRetries: number;
  /**
   * The session timeout for each node
   * defined in milliseconds
   */
  sessionTimeout: number;
  /**
   * The timeout for session establishment
   * defined in milliseconds
   */
  sessionEstablishTimeout: number;
  /**
   * The maximum number of established sessions to maintain
   */
  sessionCacheCapacity: number;
}

export enum RequestErrorType {
  /** The request timed out. */
  Timeout,
  /** The discovery service has not been started. */
  ServiceNotStarted,
  /** The request was sent to ourselves. */
  SelfRequest,
  /** An invalid ENR was provided. */
  InvalidENR,
  /** The remote's ENR was invalid. */
  InvalidRemoteENR,
  /** The remote returned an invalid packet. */
  InvalidRemotePacket,
  /** Failed attempting to encrypt the request. */
  Encryptionailed,
  /** The multiaddr provided is invalid */
  InvalidMultiaddr,
}

export interface IKeys {
  encryptionKey: Buffer;
  decryptionKey: Buffer;
}

/** How we connected to the node. */
export enum ConnectionDirection {
  /** The node contacted us. */
  Incoming,
  /** We contacted the node. */
  Outgoing,
}

/** A Challenge (WHOAREYOU) object used to handle and send WHOAREYOU requests. */
export interface IChallenge {
  /** The challenge data received from the node. */
  data: Buffer; // length 63
  /** The remote's ENR if we know it. We can receive a challenge from an unknown node. */
  remoteEnr?: ENR;
}

/** Node info */
export interface INodeInfo {
  /** The node id */
  nodeId: NodeId;
  /** The node multiaddr */
  socketAddr: Multiaddr;
  /** The node ENR */
  enr?: ENR;
  /** The time the last packet was received */
  lastPacketRcvd?: number;
  /** Whether the node is relevant, based on relevance filter */
  isRelevant?: boolean;
}

/**
 * A request to a node that we are waiting for a response
 */
export interface IRequestCall {
  contact: NodeContact;
  /**
   * The raw packet sent
   */
  packet: IPacket;
  /**
   * The unencrypted message. Required if we need to re-encrypt and re-send
   */
  request: RequestMessage;
  /** Handshakes attempted. */
  handshakeSent: boolean;
  /**
   * The number if times this request has been re-sent
   */
  retries: number;
  /**
   * If we receive a Nodes Response with a total greater than 1. This keeps track of the
   * remaining responses expected.
   */
  remainingResponses?: number;
  /**
   * Signifies if we are initiating the session with a random packet. This is only used to
   * determine the connection direction of the session.
   */
  initiatingSession: boolean;
}

export interface ISessionEvents {
  /**
   * A session has been established with a node
   */
  established: (enr: ENR, connectionDirection: ConnectionDirection) => void;
  /**
   * A Request was received
   */
  request: (nodeAddr: INodeAddress, request: RequestMessage) => void;
  /**
   * A Response was received
   */
  response: (nodeAddr: INodeAddress, response: ResponseMessage) => void;
  /**
   * A WHOAREYOU packet needs to be sent.
   * This requests the protocol layer to send back the highest known ENR.
   */
  whoAreYouRequest: (nodeAddr: INodeAddress, nonce: Buffer) => void;
  /**
   * An RPC request failed.
   */
  requestFailed: (requestId: bigint, error: RequestErrorType) => void;
}
