import type { ContentRequest } from "./ContentRequest.js";
import { Packet, PacketType, UtpSocketType } from "../Packets/index.js";
import type { Debugger } from "debug";
import type { Comparator } from "heap-js";
import { Heap } from "heap-js";
import { MAX_IN_FLIGHT_PACKETS, type RequestId } from "./types.js";

const packetComparator: Comparator<Packet<PacketType>> = (a: Packet<PacketType>, b: Packet<PacketType>) => {
    // If packets belong to the same connection, sort by sequence number (or ackNr for ST_STATE packets)
    if (a.header.connectionId === b.header.connectionId) {
        return a.header.pType === PacketType.ST_STATE ? a.header.ackNr - b.header.ackNr : a.header.seqNr - b.header.seqNr;
    }
    // Otherwise, sort by timestamp
    return a.header.timestampMicroseconds - b.header.timestampMicroseconds;
}
export class RequestManager {
    peerId: string
    requestMap: Record<RequestId, ContentRequest>
    logger: Debugger
    packetHeap: Heap<Packet<PacketType>>
    currentPacket: Packet<PacketType> | undefined

    constructor(peerId: string, logger: Debugger) {
        this.peerId = peerId
        this.requestMap = {}
        this.logger = logger.extend(`RequestManager`).extend(peerId.slice(0, 4))
        this.currentPacket = undefined
        this.packetHeap = new Heap(packetComparator)
    }

    /**
     *  Due to the variations in uTP configurations, the connectionId field in an incoming packet may be equal to, +1, or -1 of the corresponding requestId.
     *  This function will return the corresponding requestId for the given connectionId.
     * @param connectionId connectionId field from incoming packet header
     * @returns corresponding requestId
     */
    lookupRequest(connectionId: number): ContentRequest | undefined {
        return this.requestMap[connectionId] ?? this.requestMap[connectionId - 1] ?? this.requestMap[connectionId + 1]
    }

    /**
     * Finds the number of packets in the packet heap for a given request
     * @param connectionId connectionId of the request to get the packet count for
     * @returns the number of packets in the packet heap for a given request
     */
    getPacketCount(connectionId: number): number {
        return this.packetHeap.heapArray.filter((packet) => packet.header.connectionId === connectionId).length
    }

    /**
     * Removes all packets from the packet heap for a given request
     * @param connectionId connectionId of the request to remove packets for
     */
    removeRequestPackets(connectionId: number) {
        const comparator = (packet: Packet<PacketType>) => packet.header.connectionId === connectionId
        const packet = new Packet({
            header: {
                connectionId,
            } as any,
        })
        while (this.packetHeap.remove(packet, comparator)) {
            continue
        }
    }

    /**
     * Adds a new uTP request to the peer's request manager.
     * @param connectionId connectionId from uTP initialization 
     * @param request new ContentRequest
     */
    async handleNewRequest(connectionId: number, request: ContentRequest) {
        this.requestMap[connectionId] = request
        await request.init()
    }

    /**
     * Handles an incoming uTP packet.
     * @param packetBuffer buffer containing the incoming packet
     */
    async handlePacket(packetBuffer: Buffer) {
        const packet = Packet.fromBuffer(packetBuffer)
        const request = this.lookupRequest(packet.header.connectionId)
        if (request === undefined) {
            this.logger.extend('HANDLE_PACKET')(`Request not found for packet - connectionId: ${packet.header.connectionId}`)
            return
        }
        if (packet.header.pType === PacketType.ST_SYN || packet.header.pType === PacketType.ST_RESET) {
            await request.handleUtpPacket(packet)
            return
        } else {
            this.packetHeap.push(packet)
        }
        this.logger.extend('HANDLE_PACKET')(`Adding ${PacketType[packet.header.pType]} [${packet.header.pType === PacketType.ST_STATE ? packet.header.ackNr : packet.header.seqNr}] for Req:${packet.header.connectionId} to queue (size: ${this.packetHeap.size()} packets)`)
        if (this.currentPacket === undefined) {
            this.currentPacket = this.packetHeap.pop()
            await this.processCurrentPacket()
        }
    }

    async processCurrentPacket(): Promise<void> {
        this.logger.extend('PROCESS_CURRENT_PACKET')(`Packet Queue Size: ${this.packetHeap.size()}`)
        if (this.currentPacket === undefined) {
            if (this.packetHeap.size() === 0) {
                this.logger.extend('PROCESS_CURRENT_PACKET')(`No packets to process`)
                return
            }
            this.currentPacket = this.packetHeap.pop()
            await this.processCurrentPacket()
            return
        }
        this.logger.extend('PROCESS_CURRENT_PACKET')(`Processing ${PacketType[this.currentPacket.header.pType]} [${this.currentPacket.header.pType === PacketType.ST_STATE ? this.currentPacket.header.ackNr : this.currentPacket.header.seqNr}] for Req:${this.currentPacket.header.connectionId}`)
        const request = this.lookupRequest(this.currentPacket.header.connectionId)
        if (request === undefined) {
            this.logger.extend('PROCESS_CURRENT_PACKET')(`Request not found for current packet - connectionId: ${this.currentPacket.header.connectionId}`)
            this.currentPacket = this.packetHeap.pop()
            await this.processCurrentPacket()
            return
        }
        if (request.socket.type === UtpSocketType.READ && request.socket.reader !== undefined) {
            if (this.currentPacket.header.seqNr < request.socket.reader!.nextDataNr) {
                this.logger.extend('PROCESS_CURRENT_PACKET')(`Packet ${this.currentPacket.header.seqNr} already processed.`)
                this.currentPacket = this.packetHeap.pop()
                return this.processCurrentPacket()
            } else if (this.currentPacket.header.seqNr > request.socket.reader!.nextDataNr) {
                if (this.getPacketCount(this.currentPacket.header.connectionId) < MAX_IN_FLIGHT_PACKETS) {
                    // Requeue packet.  Optimistically assume expected packet has arrived out of order.
                    this.logger.extend('PROCESS_CURRENT_PACKET')(`Packet is ahead of current reader position - seqNr: ${this.currentPacket.header.seqNr} > ${request.socket.reader?.nextDataNr}.  Pushing packet back to heap.`)
                    this.packetHeap.push(this.currentPacket)
                    this.currentPacket = undefined
                    return
                } else {
                    // Treat expected packet as lost.  Process next packet (should trigger SELECTIVE_ACK)
                    this.logger.extend('PROCESS_CURRENT_PACKET')(`Packet is ahead of current reader position - seqNr: ${this.currentPacket.header.seqNr} > ${request.socket.reader?.nextDataNr}.  Treating expected packet as lost.`)
                }
            }
        }
        await request.handleUtpPacket(this.currentPacket)
        this.currentPacket = this.packetHeap.pop()
        await this.processCurrentPacket()
    }

    /**
     * Closes a uTP request and processes the next request in the queue.
     * @param connectionId connectionId of the request to close
     */
    closeRequest(connectionId: number) {
        const request = this.lookupRequest(connectionId)
        if (request === undefined) {
            return
        }
        this.logger.extend('CLOSE_REQUEST')(`Closing request ${connectionId}`)
        this.removeRequestPackets(connectionId)
        delete this.requestMap[connectionId]
    }

    closeAllRequests() {
        this.logger.extend('CLOSE_REQUEST')(`Closing all requests for peer ${this.peerId}`)
        for (const id of Object.keys(this.requestMap)) {
            this.closeRequest(Number(id))
        }
        this.packetHeap = new Heap(packetComparator)
    }


}

