import { MapDB, bytesToHex, bytesToUnprefixedHex, hexToBytes } from '@ethereumjs/util'
import debug from 'debug'

import { AccountTrieNodeRetrieval } from './types.js'

import type { DB, EncodingOpts } from '@ethereumjs/util'
import type { AbstractLevel } from 'abstract-level'
import type { Debugger } from 'debug'

export class PortalTrieDB extends MapDB<string, string> implements DB<string, string> {
  db: AbstractLevel<string, string, string>
  temp: Map<string, string>
  local: Map<string, string>
  logger: Debugger
  constructor(db: AbstractLevel<string, string, string>, logger?: Debugger) {
    super()
    this.db = db
    this.local = new Map()
    this.temp = new Map()
    this.logger = logger ? logger.extend('PortalTrieDB') : debug('PortalTrieDB')
  }
  async put(key: string | Uint8Array, value: string) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    await this.db.put(key, value)
  }
  async get(key: string | Uint8Array, _opts?: EncodingOpts) {
    if (key instanceof Uint8Array) {
      key = bytesToUnprefixedHex(key)
    }
    this.logger.extend('GET')(key)
    if (this.local.has(key)) {
      this.logger.extend('GET')(
        `${key.slice(0, 6)}... found in local keys: ${this.local.get(key)?.slice(0, 6)}...`,
      )
      try {
        const dbKey = this.local.get(key)!
        const value = await this.db.get(dbKey)
        this.logger.extend('GET')(
          `${key.slice(0, 6)}...found in DB with key ${dbKey.slice(0, 6)}...: (${value.length} bytes)`,
        )
        const { node } = AccountTrieNodeRetrieval.deserialize(hexToBytes(value))
        return bytesToUnprefixedHex(node)
      } catch (e) {
        this.logger.extend('GET')(`${key.slice(0, 6)}...not found in DB... looking in temp`)
      }
    }
    const found = this.temp.get(key)
    this.logger.extend('GET')(
      `${key.slice(0, 6)}${found === undefined ? ' not' : ''} found in temp${found === undefined ? '' : `: (${found?.length} bytes)`}`,
    )
    return found
  }
  async del(key: string | Uint8Array) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    await this.db.del(key)
  }
  async keys() {
    const keys = await this.db.keys().all()
    return keys
  }
  tempKeys() {
    return this.temp.keys()
  }
}
