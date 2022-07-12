export function attatchPrefix(content: Uint8Array) {
  const prefix = Uint8Array.from([])
  return Uint8Array.from(Buffer.concat([prefix, content]))
}

export function packWithVariantPrefix(contents: Uint8Array[]): Buffer {
  const packed: Uint8Array[] = contents.map((content, idx) => {
    return attatchPrefix(content)
  })
  return Buffer.concat(packed)
}
