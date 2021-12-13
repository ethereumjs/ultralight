export function toHex(buf: Buffer): string {
  return buf.toString("hex");
}

export function fromHex(str: string): Buffer {
  return Buffer.from(str, "hex");
}
