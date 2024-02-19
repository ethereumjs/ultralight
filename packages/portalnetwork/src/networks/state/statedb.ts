import debug from 'debug'

import { getDatabaseContent, getDatabaseKey, keyType, wrapDBContent } from './util.js'

import type { AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

export class StateDB {
  _db: AbstractLevel<string, string, string>
  logger: Debugger | undefined
  blocks: Map<number, string>
  stateRoots: Map<string, string>
  constructor(db: AbstractLevel<string, string, string>, logger?: Debugger) {
    this._db = db
    this.logger = logger ? logger.extend('StateDB') : debug('StateDB')
    this.stateRoots = new Map()
    this.blocks = new Map()
  }

  /**
   * Store content by content key
   * @param contentKey serialized state network content key
   * @param content serialized state network content type
   * @returns true if content is stored successfully
   */
  async storeContent(contentKey: Uint8Array, content: Uint8Array) {
    const dbKey = getDatabaseKey(contentKey)
    const dbContent = getDatabaseContent(keyType(contentKey), content)
    await this._db.put(dbKey, dbContent)
    return true
  }

  /**
   * Get database content by content key
   * @param contentKey serialized state network content key
   * @returns stored content (node or code) or undefined
   */
  async getContent(contentKey: Uint8Array): Promise<string | undefined> {
    const dbKey = getDatabaseKey(contentKey)
    const dbContent = await this._db.get(dbKey)
    if (dbContent === undefined) return dbContent
    const content = wrapDBContent(contentKey, dbContent)
    return content
  }
}
