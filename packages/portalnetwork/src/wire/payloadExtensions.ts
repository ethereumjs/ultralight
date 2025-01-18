import { ByteListType, ContainerType, ListBasicType, UintBigintType, UintNumberType } from "@chainsafe/ssz";
import { bytesToHex, fromAscii, hexToBytes, toAscii } from "@ethereumjs/util";
import { PingPongPayloadType } from "./types.js";





/**
 * A standard extension is an extension which all nodes on the network MUST support. 
 */
enum StandardExtensions {
    CLIENT_INFO_RADIUS_AND_CAPABILITIES = 0,
    ERROR_RESPONSE = 65535
}

/**
 * Non standard extensions are extensions in which you can't assume all other clients support.
 * To use a non standard extension: Portal clients first send a Type 0 Payload packet, then upgrade to use their desired non standard extensions.
 */
enum NonStandardExtensions {
    BASIC_RADIUS_PAYLOAD = 1,
    HISTORY_RADIUS_PAYLOAD = 2,
}

export const PingPongPayloadExtensions = {
    ...StandardExtensions,
    ...NonStandardExtensions
}


export interface IClientInfo {
    clientName: string;
    clientVersionAndShortCommit: string;
    operatingSystemAndCpuArchitecture: string;
    programmingLanguageAndVersion: string;
}

export const MAX_CLIENT_INFO_BYTE_LENGTH = 200

export function clientInfoStringToBytes(clientInfo: string): Uint8Array {
    return hexToBytes(fromAscii(clientInfo))
}
/**
 * Encode Client info as ASCII hex encoded string.
 * @param clientInfo 
 * @returns 
 */
export function encodeClientInfo(clientInfo: IClientInfo): Uint8Array {
    const clientInfoBytes = clientInfoStringToBytes(Object.values(clientInfo).join("/"))
    if (clientInfoBytes.length > MAX_CLIENT_INFO_BYTE_LENGTH) {
        throw new Error(`Client info is too long: ${clientInfoBytes.length} > ${MAX_CLIENT_INFO_BYTE_LENGTH}`)
    }
    return clientInfoBytes
}

export function decodeClientInfo(clientInfo: Uint8Array): IClientInfo {
    const [clientName, clientVersionAndShortCommit, operatingSystemAndCpuArchitecture, programmingLanguageAndVersion] = toAscii(bytesToHex(clientInfo)).split("/");
    return {
        clientName,
        clientVersionAndShortCommit,
        operatingSystemAndCpuArchitecture,
        programmingLanguageAndVersion
    };
}


export const ClientInfo = new ByteListType(MAX_CLIENT_INFO_BYTE_LENGTH)



/**
 * Type 0: Client Info and Capabilities
 * 
 * clientInfo: ASCII hex encoded string
 * capabilities: list of capabilities
 */

export const MAX_CAPABILITIES_LENGTH = 400

export const Capabilities = new ListBasicType(PingPongPayloadType, MAX_CAPABILITIES_LENGTH)

export const DataRadius = new UintBigintType(32)

export const ClientInfoAndCapabilities = new ContainerType({
    ClientInfo,
    DataRadius,
    Capabilities
})

/**
 * Type 0 Ping/Pong Payload
 */
export type CapabilitiesPayload = {
    type: 0,
    payload: ReturnType<typeof ClientInfoAndCapabilities.serialize>
}

/**
 * Type 1: Basic Radius Payload
 * A basic Ping/Pong payload which only contains the node's radius.
 */

export const BasicRadius = new ContainerType({
    dataRadius: new UintBigintType(32)
})

/**
 * Type 1 Ping/Pong Payload
 */
export type BasicRadiusPayload = {
    type: 1,
    payload: ReturnType<typeof BasicRadius.serialize>
}

/**
 * Type 2: History Radius Payload
 * A specialized radius payload for the history network which contains field for how many ephemeral headers the node holds.
 */

export const HistoryRadius = new ContainerType({
    dataRadius: new UintBigintType(32),
    ephemeralHeadersCount: new UintNumberType(2)
})

export type HistoryRadiusPayload = {
    type: 2,
    payload: ReturnType<typeof HistoryRadius.serialize>
}

/**
 * type 65535: Error Response
 * If the ping receiver can't handle the ping for any reason the pong should return an error payload
 */

export const MAX_ERROR_BYTE_LENGTH = 300

export const ErrorPayloadMessage = new ByteListType(MAX_ERROR_BYTE_LENGTH)
export const ErrorPayloadCode = new UintNumberType(2)


export const ErrorPayload = new ContainerType({
    errorCode: ErrorPayloadCode,
    message: ErrorPayloadMessage
})

export type ErrorResponsePayload = {
    type: 65535,
    payload: ReturnType<typeof ErrorPayload.serialize>
}

export enum PingPongErrorCodes {
    EXTENSION_NOT_SUPPORTED = 0,
    REQUESTED_DATA_NOT_FOUND = 1,
    FAILED_TO_DECODE_PAYLOAD = 2,
    SYSTEM_ERROR = 3,
}

export const PingPongCustomPayload = {
    [PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES]: ClientInfoAndCapabilities,
    [PingPongPayloadExtensions.BASIC_RADIUS_PAYLOAD]: BasicRadius,
    [PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD]: HistoryRadius,
    [PingPongPayloadExtensions.ERROR_RESPONSE]: ErrorPayload
}