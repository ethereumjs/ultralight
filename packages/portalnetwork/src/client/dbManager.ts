import { AbstractBatchOperation, AbstractLevel } from 'abstract-level'
import { Debugger } from 'debug'
import { MemoryLevel } from 'memory-level'

export class DBManager {
  db: AbstractLevel<string, string>
  logger: Debugger
  currentSize: () => Promise<number>

  constructor(logger: Debugger, currentSize: () => Promise<number>, db?: AbstractLevel<string>) {
    //@ts-ignore Because level doesn't know how to get along with itself
    this.db = db ?? new MemoryLevel()
    this.logger = logger.extend('DB')
    this.currentSize = currentSize
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
    //@ts-ignore Because level doesn't know how to get along with itself
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
