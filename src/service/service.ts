import {UDPTransportService} from "../transport";
import {MAGIC_LENGTH} from "../packet";
import {randomBytes} from "crypto";
import {SessionService} from "../session/service";
import {ENR} from "../enr";
import debug from "debug";

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
   */
  constructor(enr: ENR, port = 30303, networkInterface = "0.0.0.0", bootstrapURLs: string[] = []) {
    if (port < 1 || port > 65535) {
      throw `Invalid port number ${port}. It should be between 1 and 65535.`;
    }
    this.port = port;
    this.networkInterface = networkInterface;
    const magic = randomBytes(MAGIC_LENGTH);
    const udpTransport = new UDPTransportService({port: this.port, address: this.networkInterface}, magic);
    this.sessionService = new SessionService(enr, udpTransport);
    this.bootstrapURLs = bootstrapURLs;
  }

  /**
   * Add a peer to the nodes to consult for discovery.
   *
   * @param enr the new peer to consider for discovery
   */
  async addPeer(enr: ENR): Promise<void> {
    this.sessionService.addPeer(enr);
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
          this.sessionService.addPeer(peerENR);
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