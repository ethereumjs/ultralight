import { toHexString } from '@chainsafe/ssz'
import debug from 'debug'

import { PortalTrieDB } from './util.js'

import type { AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

export class StateDB {
  db: PortalTrieDB
  logger: Debugger | undefined
  blocks: Map<number, string>
  stateRoots: Map<string, string>
  constructor(db: AbstractLevel<string, string, string>, logger?: Debugger) {
    this.db = new PortalTrieDB(db)
    this.logger = logger ? logger.extend('StateDB') : debug('StateDB')
    this.stateRoots = new Map()
    this.blocks = new Map()
  }

  /**
   * Store content by content key
   * @param contentKey
   * @param content
   * @returns true if content is stored successfully
   */
  async storeContent(contentKey: Uint8Array, content: Uint8Array) {
    await this.db.put(toHexString(contentKey), content)
    return true
  }

  /**
   * Get content by content key
   * @param contentKey
   * @returns stored content or undefined
   */
  async getContent(contentKey: Uint8Array): Promise<string | undefined> {
    const dbKey = getDatabaseKey(contentKey)
  }
}
