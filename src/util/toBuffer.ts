export function toBuffer(arr: Uint8Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.length);
}

// multiaddr 8.0.0 expects an Uint8Array with internal buffer starting at 0 offset
export function toNewUint8Array(buf: Uint8Array): Uint8Array {
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Uint8Array(arrayBuffer);
}

export function numberToBuffer(value: number, length: number): Buffer {
  const res = Buffer.alloc(length);
  res.writeUIntBE(value, 0, length);
  return res;
}

export function bufferToNumber(buffer: Buffer, length: number, offset = 0): number {
  return buffer.readUIntBE(offset, length);
}
