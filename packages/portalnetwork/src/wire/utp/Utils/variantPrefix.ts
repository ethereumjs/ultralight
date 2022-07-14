import * as leb from '@thi.ng/leb128'

/**
 * Takes and individual piece of content and adds a varint length prefex
 * @param content individual piece of content
 * @returns Uint8Array of leb128 prefix added to content
 */
export function attatchPrefix(content: Uint8Array): Uint8Array {
  const prefix = leb.encodeULEB128(content.length)
  return Uint8Array.from(Buffer.concat([prefix, content]))
}

/**
 * Takes an array of contents and combines them with leb128 compressed prefix separators
 * @param contents array of individual pieces of content
 * @returns the contents together with length prefix separators
 */
export function encodeWithVariantPrefix(contents: Uint8Array[]): Uint8Array {
  const packed: Uint8Array[] = contents.map((content) => {
    return attatchPrefix(content)
  })
  return Uint8Array.from(Buffer.concat(packed))
}

type length = number
type offset = number
type Prefix = { length: length; offset: offset }
export default Prefix
/**
 *
 * @param content Uint8Array that contains one or more pieces of prefixed content
 * @returns Prefix object with length and offset of content
 */
export function parsePrefix(content: Uint8Array): number[] {
  let i = 1
  let d: number[] = []
  let working = true
  while (working) {
    d = leb.decodeULEB128(content.subarray(0, i))
    if (d[1] === i) {
      working = false
    } else {
      i += 1
    }
  }
  return d
}

// Takes a Uint8Array of prefix/content pairs.
// Parse the bytes for the first prefix, and store the content bytes.
// Drop the prefix and content bytes, and repeat for the rest of the contents

/**
 *
 * @param _content Uint8Array containing at least one prefixed piece of content
 * @returns Array of separated contents with prefixes removed
 */
export function dropPrefixes(_content: Uint8Array): Uint8Array[] {
  let content: Uint8Array | null = _content
  const contents = []
  while (content) {
    const [length, offset] = parsePrefix(content)
    contents.push(content.subarray(offset, length + offset))
    if (content.length > offset + length) {
      try {
        content = content.subarray(length + offset)
      } catch {
        content = null
      }
    } else {
      content = null
    }
  }
  return contents
}
