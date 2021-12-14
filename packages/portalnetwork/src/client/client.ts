import { Discv5, ENR, IDiscv5CreateOptions, NodeId } from "@chainsafe/discv5";
import { ITalkReqMessage, ITalkRespMessage } from "@chainsafe/discv5/lib/message";
import { EventEmitter } from 'events'
import debug from 'debug'
import { fromHexString, toHexString } from "@chainsafe/ssz";
import { StateNetworkRoutingTable } from "..";
import { shortId } from "../util";
import { bufferToPacket, PacketType, randUint16, Uint8, UtpProtocol } from '../wire/utp'
import { StateNetworkCustomDataType, MessageCodes, SubNetworkIds, FindNodesMessage, NodesMessage, PortalWireMessageType, FindContentMessage, ContentMessageType, enrs, OfferMessage, AcceptMessage, PongMessage, ContentMessage, PingMessageType, PingMessage, PongMessageType } from "../wire";
import { PortalNetworkEventEmitter } from "./types";
import { PortalNetworkRoutingTable } from ".";

const _log = debug("portalnetwork")

type state = {
    [key: string]: Uint8Array
}

export class PortalNetwork extends (EventEmitter as { new(): PortalNetworkEventEmitter }) {
    client: Discv5;
    stateNetworkRoutingTable: StateNetworkRoutingTable;
    historyNetworkRoutingTable: PortalNetworkRoutingTable;
    uTP: UtpProtocol;
    // TODO: Replace with proper database once state network defined 
    stateNetworkState: state

    constructor(config: IDiscv5CreateOptions) {
        super();
        this.client = Discv5.create(config)
        this.stateNetworkRoutingTable = new StateNetworkRoutingTable(this.client.enr.nodeId, 5)
        this.historyNetworkRoutingTable = new PortalNetworkRoutingTable(this.client.enr.nodeId, 5);
        this.client.on("talkReqReceived", this.onTalkReq)
        this.client.on("talkRespReceived", this.onTalkResp)

        this.uTP = new UtpProtocol(this);
        this.stateNetworkState = {
            "01": Buffer.from('abc'),
            "02": Buffer.from('efg'),
            "03": new Uint8Array(2000).fill(1)
        }
    }

    log = (msg: any) => {
        _log(msg)
        typeof msg === 'string'
            ? this.emit("log", msg)
            : this.emit("log", `Payload: SSZ Union<${Object.entries(msg).map(([k, v]) => { return `${k}: ${v}` }).toString()}>`)
    }

    /**
     * Starts the portal network client
     */
    public start = async () => {
        await this.client.start()
    }

    /**
     * 
     * @param namespaces comma separated list of logging namespaces
     * defaults to "portalnetwork*, discv5:service, <uTP>*"
     */
    public enableLog = (namespaces: string = "portalnetwork*,discv5:service*,<uTP>*") => {
        debug.enable(namespaces)
    }

    /**
     * Sends a Portal Network Wire Protocol PING message to a specified node
     * @param dstId the nodeId of the peer to send a ping to
     * @param payload custom payload to be sent in PING message
     * @param networkId subnetwork ID
     * @returns the PING payload specified by the subnetwork or undefined
     */
    public sendPing = async (dstId: string, payload: Uint8Array, networkId: SubNetworkIds) => {
        const pingMsg = PortalWireMessageType.serialize({
            selector: MessageCodes.PING, value: {
                enrSeq: this.client.enr.seq,
                customPayload: payload
            }
        })
        try {
            this.log(`Sending PING to ${shortId(dstId)} for ${SubNetworkIds.StateNetworkId} subnetwork`)
            const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(pingMsg), networkId)
            if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.PONG) {
                this.log(`Received PONG from ${shortId(dstId)}`)
                const decoded = PortalWireMessageType.deserialize(res)
                const pongMessage = decoded.value as PongMessage
                this.updateSubnetworkRoutingTable(dstId, networkId, pongMessage.customPayload)
                return decoded.value as PongMessage
            }
        }
        catch (err: any) {
            this.log(`Error during PING request to ${shortId(dstId)}: ${err.toString()}`)
        }
    }

    /**
     * 
     * Sends a Portal Network FINDNODES request to a peer requesting other node ENRs
     * @param dstId node id of peer
     * @param distances distances as defined by subnetwork for node ENRs being requested
     * @param networkId subnetwork id for message being
     * @returns a `NodesMessage` or undefined
     */
    public sendFindNodes = async (dstId: string, distances: Uint16Array, networkId: SubNetworkIds) => {
        const findNodesMsg: FindNodesMessage = { distances: distances }
        const payload = PortalWireMessageType.serialize({ selector: MessageCodes.FINDNODES, value: findNodesMsg })
        try {
            this.log(`Sending FINDNODES to ${shortId(dstId)} for ${SubNetworkIds.StateNetworkId} subnetwork`)
            const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
            if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.NODES) {
                this.log(`Received NODES from ${shortId(dstId)}`);
                const decoded = PortalWireMessageType.deserialize(res).value as NodesMessage;
                if (decoded) {
                    this.log(`Received ${decoded.total} ENRs from ${shortId(dstId)}`);
                    decoded.enrs.forEach((enr) => this.log(ENR.decode(Buffer.from(enr)).nodeId))
                }
                return decoded;
            }
        }
        catch (err: any) {
            this.log(`Error sending FINDNODES to ${shortId(dstId)} - ${err.message}`)
        }
    }


    /**
     * 
     * @param dstId node id of peer
     * @param key content key defined by the subnetwork spec
     * @param networkId subnetwork ID on which content is being sought
     * @returns the value of the FOUNDCONTENT response or undefined
     */
    public sendFindContent = async (dstId: string, key: Uint8Array, networkId: SubNetworkIds) => {
        const findContentMsg: FindContentMessage = { contentKey: key };
        const payload = PortalWireMessageType.serialize({ selector: MessageCodes.FINDCONTENT, value: findContentMsg });
        this.log(`Sending FINDCONTENT to ${shortId(dstId)} for ${SubNetworkIds.StateNetworkId} subnetwork`)
        const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
        if (parseInt(res.slice(0, 1).toString('hex')) === MessageCodes.CONTENT) {
            this.log(`Received FOUNDCONTENT from ${shortId(dstId)}`);
            // TODO: Switch this to use PortalWireMessageType.deserialize if type inference can be worked out
            const decoded = ContentMessageType.deserialize(res.slice(1))
            switch (decoded.selector) {
                case 0:
                    const id = Buffer.from(decoded.value as Uint8Array).readUInt16BE(0)
                    this.log(`received Connection ID ${id}`);
                    this.sendUtpStreamRequest(dstId, id)
                    break;
                case 1: this.log(`received content ${Buffer.from(decoded.value as Uint8Array).toString()}`); break;
                case 2: {
                    this.log(`received ${decoded.value.length} ENRs`);
                    decoded.value.forEach((enr) => this.log(`Node ID: ${ENR.decode(Buffer.from(decoded.value[0] as Uint8Array)).nodeId}`))
                    break;
                };
            }
            return decoded.value
        }
    }

    /**
     * 
     * @param dstId node ID of a peer
     * @param contentKeys content keys being offered as specified by the subnetwork
     * @param networkId network ID of subnetwork being used
     */
    public sendOffer = async (dstId: string, contentKeys: Uint8Array[], networkId: SubNetworkIds) => {
        const offerMsg: OfferMessage = {
            contentKeys
        }
        const payload = PortalWireMessageType.serialize({ selector: MessageCodes.OFFER, value: offerMsg })
        const res = await this.sendPortalNetworkMessage(dstId, Buffer.from(payload), networkId)
        const decoded = PortalWireMessageType.deserialize(res);
        if (decoded.selector === MessageCodes.ACCEPT) {
            this.log(`Received ACCEPT message from ${shortId(dstId)}`);
            this.log(decoded.value);
            let id = randUint16()
            // TODO: Add code to initiate uTP streams with serving of requested content
            await this.sendUtpStreamRequest(dstId, id)
        }
    }

    public sendUtpStreamRequest = async (dstId: string, id: number) => {
        // Initiate a uTP stream request with a SYN packet
        await this.uTP.initiateConnectionRequest(dstId, id)
    }

    private sendPong = async (srcId: string, reqId: bigint) => {
        const customPayload = StateNetworkCustomDataType.serialize({ dataRadius: BigInt(1) })
        const payload = {
            enrSeq: this.client.enr.seq,
            customPayload: customPayload
        }
        const pongMsg = PortalWireMessageType.serialize({
            selector: MessageCodes.PONG,
            value: payload
        })
        this.client.sendTalkResp(srcId, reqId, Buffer.from(pongMsg))
    }

    private onTalkReq = async (srcId: string, sourceId: ENR | null, message: ITalkReqMessage) => {
        switch (toHexString(message.protocol)) {
            case SubNetworkIds.StateNetworkId: this.log(`Received State Subnetwork request`); break;
            case SubNetworkIds.HistoryNetworkId: this.log(`Received History Subnetwork request`); break;
            case SubNetworkIds.UTPNetworkId: this.log(`Received uTP packet`); this.handleUTPStreamRequest(srcId, message.id, message.request); return;
            default: this.log(`Received TALKREQ message on unsupported protocol ${toHexString(message.protocol)}`); return;

        }

        const messageType = message.request[0];
        this.log(`TALKREQUEST message received from ${srcId}`)
        switch (messageType) {
            case MessageCodes.PING: this.handlePing(srcId, message); break;
            case MessageCodes.PONG: this.log(`PONG message not expected in TALKREQ`); break;
            case MessageCodes.FINDNODES: this.handleFindNodes(srcId, message); break;
            case MessageCodes.NODES: this.log(`NODES message not expected in TALKREQ`); break;
            case MessageCodes.FINDCONTENT: this.handleFindContent(srcId, message); break;
            case MessageCodes.CONTENT: this.handleContent(srcId, message); break;
            case MessageCodes.OFFER: this.handleOffer(srcId, message); break;
            case MessageCodes.ACCEPT: this.log(`ACCEPT message not expected in TALKREQ`); break;
            default: this.log(`Unrecognized message type received`)
        }
    }

    private onTalkResp = (srcId: string, sourceId: ENR | null, message: ITalkRespMessage) => {
        this.log(`TALKRESPONSE message received from ${srcId}, ${message.toString()}`)
    }

    handleContent(srcId: string, message: ITalkReqMessage) {
        let decoded = PortalWireMessageType.deserialize(message.request)
        let payload = decoded.value as ContentMessage
        let packet = payload.content as Uint8Array
        this.handleUTPStreamRequest(srcId, message.id, Buffer.from(packet))
    }

    private handlePing = (srcId: string, message: ITalkReqMessage) => {
        // Check to see if node is already in corresponding network routing table and add if not
        const decoded = PortalWireMessageType.deserialize(message.request);
        const pingMessage = decoded.value as PingMessage;
        this.updateSubnetworkRoutingTable(srcId, toHexString(message.protocol) as SubNetworkIds, pingMessage.customPayload)
        this.sendPong(srcId, message.id);
    }

    private handleFindNodes = (srcId: string, message: ITalkReqMessage) => {
        const decoded = PortalWireMessageType.deserialize(message.request)
        this.log(`Received FINDNODES request from ${shortId(srcId)}`)
        this.log(decoded)
        const payload = decoded.value as FindNodesMessage;
        if (payload.distances.length > 0) {
            let nodesPayload: NodesMessage = {
                total: 0,
                enrs: []
            };
            // Send the client's ENR if a node at distance 0 is requested
            if (typeof payload.distances.find((res) => res === 0) === 'number')
                nodesPayload = {
                    total: 1,
                    enrs: [this.client.enr.encode()]
                }
            // TODO: Return known nodes in State Network DHT at specified distances
            const encodedPayload = PortalWireMessageType.serialize({ selector: MessageCodes.NODES, value: nodesPayload })
            this.client.sendTalkResp(srcId, message.id, encodedPayload);
        } else {
            this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
        }

    }

    private handleOffer = async (srcId: string, message: ITalkReqMessage) => {
        const decoded = PortalWireMessageType.deserialize(message.request)
        this.log(`Received OFFER request from ${shortId(srcId)}`)
        this.log(decoded)
        const msg = decoded.value as OfferMessage;
        if (msg.contentKeys.length > 0) {
            await this.sendAccept(srcId, message)
        } else {
            this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
        }
    }

    private sendAccept = async (srcId: string, message: ITalkReqMessage) => {
        let id = randUint16()
        const connectionId = await this.uTP.initiateConnectionRequest(srcId, id).then((res) => { return this.uTP.sockets[srcId].sndConnectionId });
        const payload: AcceptMessage = {
            connectionId: new Uint8Array(2).fill(connectionId),
            contentKeys: [true]
        }
        const encodedPayload = PortalWireMessageType.serialize({ selector: MessageCodes.ACCEPT, value: payload });
        this.client.sendTalkResp(srcId, message.id, Buffer.from(encodedPayload))


    }

    private handleFindContent = async (srcId: string, message: ITalkReqMessage) => {
        const decoded = PortalWireMessageType.deserialize(message.request)
        this.log(`Received FINDCONTENT request from ${shortId(srcId)}`)
        this.log(decoded)
        const decodedContentMessage = decoded.value as FindContentMessage

        //Check to see if value in locally maintained state network state
        const contentKey = Buffer.from(decodedContentMessage.contentKey).toString('hex')
        const value = this.stateNetworkState[contentKey]

        if (!value) {
            this.client.sendTalkResp(srcId, message.id, Buffer.from([]))
        } else if (value && value.length < 1200) {
            // TODO Replace 1200 with a global constant for MAX PACKET size
            this.log('Found value for requested content' + Buffer.from(decodedContentMessage.contentKey).toString('hex') + value.slice(0, 10) + `...`)
            const payload = ContentMessageType.serialize({ selector: 1, value: value })
            this.client.sendTalkResp(srcId, message.id, Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)]))
        } else {
            this.log('Found value for requested content.  Larger than 1 packet.  uTP stream needed.' + Buffer.from(decodedContentMessage.contentKey).toString('hex') + value.slice(0, 10) + `...`)
            this.uTP.contents[srcId] = value
            this.log(`Generating Random Connection Id...`)
            const _id = randUint16();
            const idBuffer = Buffer.alloc(2)
            idBuffer.writeUInt16BE(_id, 0)
            const id = Uint8Array.from(idBuffer)
            this.log(`Sending FOUND_CONTENT message with CONNECTION ID: ${_id}`)

            const payload = ContentMessageType.serialize({ selector: 0, value: id })
            this.client.sendTalkResp(srcId, message.id,
                Buffer.concat([Buffer.from([MessageCodes.CONTENT]), Buffer.from(payload)]))
        }


    }


    // private handleContent = async (srcId: string, message: Italk)

    private handleUTPStreamRequest = async (srcId: string, msgId: bigint, packetBuffer: Buffer) => {

        const packet = bufferToPacket(packetBuffer)
        switch (packet.header.pType) {

            case PacketType.ST_SYN: await this.uTP.handleIncomingConnectionRequest(packet, srcId, msgId); break;
            case PacketType.ST_DATA: await this.uTP.handleIncomingData(packet, srcId, msgId); break;
            case PacketType.ST_STATE: await this.uTP.handleAck(packet, srcId, msgId); break;
            case PacketType.ST_RESET: this.log('got RESET packet'); break;
            case PacketType.ST_FIN: const content = await this.uTP.handleFin(packet, srcId, msgId);
                _log('Got this content', content); break;
        }
    }

    /**
     * 
     * @param srcId nodeId of peer being updated in subnetwork routing table
     * @param networkId subnetwork Id of routing table being updated
     * @param customPayload payload of the PING/PONG message being decoded
     */
    private updateSubnetworkRoutingTable = (srcId: NodeId, networkId: SubNetworkIds, customPayload?: any) => {
        switch (networkId) {
            case SubNetworkIds.StateNetworkId: {
                if (!customPayload) {
                    this.stateNetworkRoutingTable.removeById(srcId);
                    this.stateNetworkRoutingTable.removeFromRadiusMap(srcId)
                    this.log(`removed ${srcId} from State Network Routing Table`)
                    return
                }
                const enr = this.client.getKadValue(srcId);
                this.log(`adding ${srcId} to stateNetwork routing table`)
                if (enr) {
                    this.stateNetworkRoutingTable.add(enr);
                    const decodedPayload = StateNetworkCustomDataType.deserialize(Uint8Array.from(customPayload))
                    this.stateNetworkRoutingTable.updateRadius(srcId, decodedPayload.dataRadius)
                }
                return;
            }
            case SubNetworkIds.HistoryNetworkId: {
                if (!customPayload) {
                    this.historyNetworkRoutingTable.removeById(srcId);
                    this.historyNetworkRoutingTable.removeFromRadiusMap(srcId)
                    this.log(`removed ${srcId} from History Network Routing Table`)
                    return
                }
                const enr = this.client.getKadValue(srcId);
                this.log(`adding ${srcId} to historyNetwork routing table`)
                if (enr) {
                    this.historyNetworkRoutingTable.add(enr);
                    const decodedPayload = StateNetworkCustomDataType.deserialize(Uint8Array.from(customPayload))
                    this.historyNetworkRoutingTable.updateRadius(srcId, decodedPayload.dataRadius)
                }
                return;
            }
        }
    }

    /**
     * 
     * @param dstId `NodeId` of message recipient
     * @param payload `Buffer` serialized payload of message
     * @param networkId Subnetwork ID of Subnetwork message is being sent on
     * @returns response from `dstId` as `Buffer` or null `Buffer`
     */
    private sendPortalNetworkMessage = async (dstId: NodeId, payload: Buffer, networkId: SubNetworkIds): Promise<Buffer> => {
        try {
            const res = await this.client.sendTalkReq(dstId, payload, fromHexString(networkId))
            return res
        } catch (err: any) {
            this.log(`Error sending TALKREQ message: ${err.message}`)
            this.updateSubnetworkRoutingTable(dstId, networkId)
            return Buffer.from([0])
        }
    }
}

