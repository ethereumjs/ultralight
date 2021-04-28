import { EventEmitter } from "events";
import PeerId = require("peer-id");
import { Multiaddr } from "multiaddr";
import { randomBytes } from "libp2p-crypto";

import { Discv5, ENRInput } from "../service";
import { createNodeId, ENR } from "../enr";
import { IDiscv5Config } from "../config";
import { toBuffer } from "../util";

export interface IDiscv5DiscoveryInputOptions extends Partial<IDiscv5Config> {
  /**
   * Local ENR associated with the local libp2p peer id
   */
  enr: ENRInput;
  /**
   * The bind multiaddr for the discv5 UDP server
   *
   * NOTE: This MUST be a udp multiaddr
   */
  bindAddr: string;
  /**
   * Remote ENRs used to bootstrap the network
   */
  bootEnrs: ENRInput[];
  /**
   * Enable/disable discv5
   * Note: this option is handled within libp2p, not within discv5
   */
  enabled: boolean;
}

export interface IDiscv5DiscoveryOptions extends IDiscv5DiscoveryInputOptions {
  peerId: PeerId;
}

/**
 * Discv5Discovery is a libp2p peer-discovery compatable module
 */
export class Discv5Discovery extends EventEmitter {
  static tag = "discv5";

  public discv5: Discv5;
  private started: NodeJS.Timer | boolean;

  constructor(options: IDiscv5DiscoveryOptions) {
    super();
    this.discv5 = Discv5.create({
      enr: options.enr,
      peerId: options.peerId,
      multiaddr: new Multiaddr(options.bindAddr),
      config: options,
    });
    this.started = false;
    options.bootEnrs.forEach((bootEnr) => this.discv5.addEnr(bootEnr));
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    await this.discv5.start();
    this.discv5.on("discovered", this.handleEnr);
    setTimeout(() => this.findPeers(), 1);
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.discv5.off("discovered", this.handleEnr);
    await this.discv5.stop();
  }

  async findPeers(): Promise<void> {
    while (this.started) {
      // Search for random nodes
      // emit discovered on all finds
      const enrs = await this.discv5.findNode(createNodeId(toBuffer(randomBytes(32))));
      if (!this.started) {
        return;
      }
      for (const enr of enrs) {
        await this.handleEnr(enr);
      }
    }
  }

  handleEnr = async (enr: ENR): Promise<void> => {
    const multiaddrTCP = enr.getLocationMultiaddr("tcp");
    if (!multiaddrTCP) {
      return;
    }
    this.emit("peer", {
      id: await enr.peerId(),
      multiaddrs: [multiaddrTCP],
    });
  };
}
