import { IOException } from "../../Utils/exceptions";
import { UtpReadListener } from "./UtpReadListener";
import { UtpPacketDTO } from "../../Packets/UtpPacketDTO";
import { UtpBlockableFuture } from "../congestionControl/UtpBlockableFuture";


export class UtpReadFuture extends UtpBlockableFuture {
    buffer: Buffer | null
    listener: UtpReadListener | null;
    
    constructor(buffer: Buffer) {
        super()
        this.buffer = buffer 
        this.listener = null
    }

    setListener(listener: UtpReadListener) {
        this.listener = listener
    }

    getBytesRead() {
        if (this.buffer != null) {
            return this.buffer.length
        }
    }

    finished(exp: IOException | null, buffer: Buffer) {
        
    }
}