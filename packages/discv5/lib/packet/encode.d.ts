/// <reference types="node" />
import { IHandshakeAuthdata, IHeader, IMessageAuthdata, IPacket, IWhoAreYouAuthdata } from "./types";
export declare function encodePacket(destId: string, packet: IPacket): Buffer;
export declare function encodeHeader(destId: string, maskingIv: Buffer, header: IHeader): Buffer;
export declare function decodePacket(srcId: string, data: Buffer): IPacket;
/**
 * Return the decoded header and the header as a buffer
 */
export declare function decodeHeader(srcId: string, maskingIv: Buffer, data: Buffer): [IHeader, Buffer];
export declare function encodeWhoAreYouAuthdata(authdata: IWhoAreYouAuthdata): Buffer;
export declare function encodeMessageAuthdata(authdata: IMessageAuthdata): Buffer;
export declare function encodeHandshakeAuthdata(authdata: IHandshakeAuthdata): Buffer;
export declare function decodeWhoAreYouAuthdata(data: Buffer): IWhoAreYouAuthdata;
export declare function decodeMessageAuthdata(data: Buffer): IMessageAuthdata;
export declare function decodeHandshakeAuthdata(data: Buffer): IHandshakeAuthdata;
/**
 * Encode Challenge Data given masking IV and header
 * Challenge data doubles as message authenticated data
 */
export declare function encodeChallengeData(maskingIv: Buffer, header: IHeader): Buffer;
