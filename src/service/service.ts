import { randomBytes } from "crypto";
import debug from "debug";

import { UDPTransportService } from "../transport";
import { MAGIC_LENGTH } from "../packet";
import { SessionService } from "../session";
import { ENR } from "../enr";
import { IKeypair } from "../keypair";

const LOG = debug("discv5/service");



/**
 * User-facing service one can use to set up, start and use Discv5.
 *
 * The service exposes a number of user-facing operations that the user may refer to in their application:
 * * Adding a new static bootstrap peer
 * * Checking the properties of a specific peer
 * * Querying by topic
 *
 * Additionally, the service offers callbacks when peers are added to the peer table.
 *
 * The peer table storage is exposed explicity and may be adapted by users to change the logic of storing peers.
 */
export default class Service {

  started = false;
  networkInterface: string;
  port: number;
  sessionService: SessionService;
  bootstrapURLs: string[];

  /**
   * Default constructor.
   * @param enr the ENR record identifying the current node.
   * @param port the port to which the UDP transport binds.
   * @param networkInterface the network interface to which the UDP transport binds.
   * @param bootstrapURLs the initial peers the discovery service should attempt to connect to. Each peer is an ENR URI.
   * @param sessionService the service managing sessions underneath.
   */
  constructor(
    enr: ENR,
    port = 30303,
    networkInterface = "0.0.0.0",
    bootstrapURLs: string[] = [],
    sessionService: SessionService
  ) {

    if (port < 1 || port > 65535) {
      throw `Invalid port number ${port}. It should be between 1 and 65535.`;
    }
    this.port = port;
    this.networkInterface = networkInterface;
    this.sessionService = sessionService;
    this.bootstrapURLs = bootstrapURLs;
  }

  /**
   * Create a new discv5 service, creating a session service to serve connections to the network.
   *
   * @param enr the ENR record identifying the current node.
   * @param port the port to which the UDP transport binds.
   * @param networkInterface the network interface to which the UDP transport binds.
   * @param bootstrapURLs the initial peers the discovery service should attempt to connect to. Each peer is an ENR URI.
   */
  static create(
    enr: ENR,
    keypair: IKeypair,
    port = 30303,
    networkInterface = "0.0.0.0",
    bootstrapURLs: string[] = []
  ): Service {
    const magic = randomBytes(MAGIC_LENGTH);
    const udpTransport = new UDPTransportService({port: port, address: networkInterface}, magic);
    const sessionService = new SessionService(enr, keypair, udpTransport);
    return new Service(enr, port, networkInterface, bootstrapURLs, sessionService);
  }

  /**
   * Add a peer to the nodes to consult for discovery.
   *
   * @param enr the new peer to consider for discovery
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async addPeer(enr: ENR): Promise<void> {
  }

  /**
   * Starts the service and adds all initial bootstrap peers to be considered.
   */
  async start(): Promise<void> {
    if (!this.started) {
      await this.sessionService.start();
      for (const bootstrapURL of this.bootstrapURLs) {
        try {
          const peerENR = ENR.decodeTxt(bootstrapURL);
          this.addPeer(peerENR);
        } catch(e) {
          LOG.log("Ignoring invalid bootstrap ENR record %s: %s", bootstrapURL, e);
        }
      }
      this.started = true;
    }
  }

  /**
   * Stops the service, closing any underlying networking activity.
   */
  async stop(): Promise<void> {
    if (this.started) {
      await this.sessionService.close();
      this.started = false;
    }
  }
}
