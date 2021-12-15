import { Packet, _UTPSocket } from "../..";

export default class Reader {
    packets: Packet[]
    inOrder: Packet[]
    reading: boolean
    gotFinPacket: boolean
    socket: _UTPSocket
    nextSeqNr: number
    constructor(socket: _UTPSocket) {
        this.socket = socket
        this.packets = [];
        this.inOrder = [];
        this.reading = true;
        this.gotFinPacket = false;
        this.nextSeqNr = 1;
    }

    addPacket(packet: Packet) {
        this.packets.push(packet);
    }

    notEmpty() {
        return this.packets.length > 0
    }

    compile(): Uint8Array {
        let compiled = new Uint8Array();
        this.inOrder.forEach((packet) => {
            compiled.set(packet.payload, compiled.length)
        })
        return compiled
    };

    run(): Uint8Array {
        while (this.reading) {
            while (this.notEmpty()) {
                let packet = this.packets.shift() as Packet
                if (packet?.header.seqNr === this.nextSeqNr) {
                    this.inOrder.push(packet)
                } else {
                    this.packets.push(packet)
                }
            }
            this.reading=false
        }
        return this.compile();
    }
}