import { InterruptedException, IOException } from "../../Utils/exceptions";
import Semaphore from "./Semaphore";

export class UtpBlockableFuture {
    isDone: boolean
    exception: IOException
    semaphore: Semaphore
    constructor() {
        this.isDone = false;
        this.exception = new InterruptedException()
        this.semaphore = new Semaphore(1)
        this.semaphore.acquire()
    }

    isSuccessfull() {
        return this.exception != null
    }

    block() {
        this.semaphore.acquire()
        this.semaphore.release()
    }

    getCause() {
        return this.exception
    }

    unBlock() {
        this.semaphore.release()
    }
}