// import { Worker,  } from 'worker_threads';
import cluster, {Worker} from 'cluster'

export abstract class UtpReadListener {
    byteBuffer: Buffer | null
    createExtraThread: boolean
    currentThread: Worker | undefined

    constructor() {
        this.byteBuffer = null
        this.createExtraThread = false
        this.currentThread = undefined
    }

    abstract actionAfterReading(): void

    abstract getThreadName(): string
    
    setByteBuffer(buffer: Buffer) {
        this.byteBuffer = buffer
    }

    setCreateExtraThread(bool: boolean) {
        this.createExtraThread = bool
    }

    run(): void {
        this.currentThread = cluster.worker
        this.actionAfterReading();
          }

    

}