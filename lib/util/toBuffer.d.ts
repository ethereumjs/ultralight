/// <reference types="node" />
export declare function toBuffer(arr: Uint8Array): Buffer;
export declare function toNewUint8Array(buf: Uint8Array): Uint8Array;
export declare function numberToBuffer(value: number, length: number): Buffer;
export declare function bufferToNumber(buffer: Buffer, length: number, offset?: number): number;
