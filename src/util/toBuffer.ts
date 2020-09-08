export function toBuffer(arr: Uint8Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.length);
}
