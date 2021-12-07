import { IOException } from "../../Utils/exceptions"
import { UtpBlockableFuture } from "../congestionControl/UtpBlockableFuture"


export abstract class UtpWriteFuture extends UtpBlockableFuture {
    bytesWritten: number | undefined
    constructor() {
        super()
        this.bytesWritten = undefined
    }
    
        getBytesSend(): number | undefined {
            return this.bytesWritten
        }
    }
    export class UtpWriteFutureImpl extends UtpWriteFuture {
        constructor() {
            super()
        }
        
        finished(exp: IOException, bytesWritten: number) {
            this.setBytesSend(bytesWritten);
            this.exception = exp;
            this.isDone = true;
            this.semaphore.release()
        }

        setBytesSend(position: number) {
            this.bytesWritten = position
        }
    
    }