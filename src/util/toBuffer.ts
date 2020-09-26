export function toBuffer(arr: Uint8Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.length);
}

// multiaddr 8.0.0 expects an Uint8Array with internal buffer starting at 0 offset
export function toNewUint8Array(buf: Uint8Array): Uint8Array {
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Uint8Array(arrayBuffer);
}
