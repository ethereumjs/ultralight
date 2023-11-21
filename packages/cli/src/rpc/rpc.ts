import debug from 'debug'

import { INTERNAL_ERROR } from './error-code.js'
import * as modules from './modules/index.js'

import type { Debugger } from 'debug'
import type { PortalNetwork } from 'portalnetwork'

export class RPCManager {
  public _client: PortalNetwork
  private logger: Debugger

  /**
   * Returns all methods in a module
   */
  static getMethodNames(mod: Object): string[] {
    const methodNames = Object.getOwnPropertyNames((mod as any).prototype).filter(
      (methodName: string) => methodName !== 'constructor',
    )
    return methodNames
  }

  // private _methods: { [key: string]: Function } = {
  //   discv5_nodeInfo: async () => {
  //     this.logger('discv5_nodeInfo request received')
  //     return 'Ultralight-CLI: v0.0.1'
  //   },
  // }

  /**
   * Returns bound methods for modules concat with underscore `_`
   */
  private methods() {
    const methods: { [key: string]: Function } = {}
    const mods = ['beacon', 'eth', 'portal', 'discv5', 'ultralight', 'web3']
    for (const modName of mods) {
      const mod = new (modules as any)[modName](this._client, this.logger)
      const rpcMethods = RPCManager.getMethodNames((modules as any)[modName])
      for (const methodName of rpcMethods) {
        const concatedMethodName = `${modName.toLowerCase()}_${methodName}`
        methods[concatedMethodName] = mod[methodName].bind((...params: any[]) => {
          try {
            mod(...params)
          } catch (error: any) {
            throw {
              code: INTERNAL_ERROR,
              message: error.message ?? error,
            }
          }
        })
      }
    }

    this.logger(`RPC Initialized ${Object.keys(methods).join(', ')}`)
    return methods
  }
  private _methods: { [key: string]: Function }

  constructor(client: PortalNetwork) {
    this._client = client
    this.logger = debug(this._client.discv5.enr.nodeId.slice(0, 5)).extend('ultralight:RPC')
    this._methods = this.methods()
  }

  public getMethods() {
    return this._methods
  }
}
