import { middleware } from '../validators.js'

import type { Debugger } from 'debug'
import type { PortalNetwork } from 'portalnetwork'

export class web3 {
  private _client: PortalNetwork
  private logger: Debugger

  constructor(client: PortalNetwork, logger: Debugger) {
    this._client = client
    this.logger = logger
    this.clientVersion = middleware(this.clientVersion.bind(this), 0, [])
  }
  /**
   * Returns client name and version
   * @param params an empty array
   */
  async clientVersion(_params: []): Promise<string> {
    return 'ultralight 0.0.1'
  }
}
