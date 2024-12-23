import type { ContentRequest } from "./ContentRequest.js";
import { Packet , PacketType } from "../Packets/index.js";
import type { Debugger } from "debug";

type RequestId = number

export class RequestManager {
    peerId: string
    requestMap: Record<RequestId, ContentRequest>
    logger: Debugger
    masterPacketQueue: Array<Packet<PacketType>>
    currentPacket: Packet<PacketType> | undefined

    constructor(peerId: string, logger: Debugger) {
        this.peerId = peerId
        this.requestMap = {}
        this.logger = logger.extend(`RequestManager`).extend(peerId.slice(0, 4))
        this.masterPacketQueue = []
        this.currentPacket = undefined
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
     * Adds a new uTP request to the peer's request manager.
     * @param connectionId connectionId from uTP initialization 
     * @param request new ContentRequest
     */
    async handleNewRequest(connectionId: number,request: ContentRequest) {
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
        if (this.masterPacketQueue.length === 0) {
            this.currentPacket = packet
            return this.processCurrentPacket()
        }
        if (packet.header.pType === PacketType.ST_SYN || packet.header.pType === PacketType.ST_RESET) {
            this.masterPacketQueue.unshift(packet)
        } else {
            this.masterPacketQueue.push(packet)
        }
        this.logger.extend('HANDLE_PACKET')(`Adding ${PacketType[packet.header.pType]} packet for request ${packet.header.connectionId} to packet queue (size: ${this.masterPacketQueue.length} packets)`)
        if (this.currentPacket === undefined) {
            this.currentPacket = this.masterPacketQueue.shift()
            await this.processCurrentPacket()
        }
    }

    async processCurrentPacket() {
        this.logger.extend('PROCESS_CURRENT_PACKET')(`Packet Queue Size: ${this.masterPacketQueue.length}`)
        if (this.currentPacket === undefined) {
            if (this.masterPacketQueue.length === 0) {
                this.logger.extend('PROCESS_CURRENT_PACKET')(`No packets to process`)
                return
            }
            this.currentPacket = this.masterPacketQueue.shift()
            await this.processCurrentPacket()
            return
        }
        this.logger.extend('PROCESS_CURRENT_PACKET')(`Processing ${PacketType[this.currentPacket.header.pType]} packet for request ${this.currentPacket.header.connectionId}`)
        const request = this.lookupRequest(this.currentPacket.header.connectionId)
        if (request === undefined) {
            this.logger.extend('PROCESS_CURRENT_PACKET')(`Request not found for current packet - connectionId: ${this.currentPacket.header.connectionId}`)
            this.currentPacket = this.masterPacketQueue.shift()
            await this.processCurrentPacket()
            return
        }
        await request.handleUtpPacket(this.currentPacket)
        this.currentPacket = this.masterPacketQueue.shift()
        await this.processCurrentPacket()
    }

    /**
     * Closes a uTP request and processes the next request in the queue.
     * @param connectionId connectionId of the request to close
     */
    async closeRequest(connectionId: number) {
        const request = this.lookupRequest(connectionId)
        if (request === undefined) {
            return
        }
        this.logger.extend('CLOSE_REQUEST')(`Closing request ${connectionId}`)
        delete this.requestMap[connectionId]
    }
    
    closeAllRequests() {
        this.logger.extend('CLOSE_REQUEST')(`Closing all requests for peer ${this.peerId}`)
        for (const id of Object.keys(this.requestMap)) {
            delete this.requestMap[Number(id)]
        }
        this.masterPacketQueue = []
    }


}

