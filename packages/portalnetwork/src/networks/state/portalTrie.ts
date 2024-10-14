import { MapDB, bytesToHex } from '@ethereumjs/util'

import type { DB, EncodingOpts } from '@ethereumjs/util'
import type { AbstractLevel } from 'abstract-level'

export class PortalTrieDB extends MapDB<string, string> implements DB<string, string> {
  db: AbstractLevel<string, string, string>
  temp: Map<string, string>
  constructor(db: AbstractLevel<string, string, string>) {
    super()
    this.db = db
    this.temp = new Map()
  }
  async put(key: string | Uint8Array, value: string) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    await this.db.put(key, value)
  }
  async get(key: string | Uint8Array, _opts?: EncodingOpts) {
    if (key instanceof Uint8Array) {
      key = bytesToHex(key)
    }
    try {
      const value = await this.db.get(key)
      return value
    } catch (e) {
      const found = this.temp.get(key)
      return found
    }
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
