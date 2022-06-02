//eslint-disable-next-line implicit-dependencies/no-implicit
import { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import { Debugger } from 'debug'
const level = require('level-mem')

export class DBManager {
  db: AbstractLevel<string>
  logger: Debugger

  constructor(logger: Debugger, db?: AbstractLevel<string>) {
    this.db = db ?? level()
    this.logger = logger.extend('DB')
  }

  get(key: string) {
    return this.db.get(key)
  }

  put(key: string, val: string) {
    return this.db.put(key, val, (err: any) => {
      if (err) this.logger(`Error putting content in history DB: ${err.toString()}`)
    })
  }

  batch(ops: AbstractBatchOperation<string, string, string>[]) {
    //@ts-ignore
    return this.db.batch(ops)
  }

  del(key: string) {
    return this.db.del(key)
  }

  async close() {
    await this.db.removeAllListeners()
    await this.db.close()
  }
}
