import * as RLP from '@ethereumjs/rlp'
import { bytesToHex, bytesToUtf8 } from '@ethereumjs/util'
import base64url from 'base64url'
import SuperJSON from 'superjson'

type Decoded = Uint8Array | RLP.NestedUint8Array

export function decodeFromValues(decoded: Decoded) {
  if (!Array.isArray(decoded)) {
    throw new Error('Decoded ENR must be an array')
  }
  if (decoded.length % 2 !== 0) {
    throw new Error('Decoded ENR must have an even number of elements')
  }
  const [signature, seq] = decoded
  if (!signature || Array.isArray(signature)) {
    throw new Error('Decoded ENR invalid signature: must be a byte array')
  }
  if (!seq || Array.isArray(seq)) {
    throw new Error('Decoded ENR invalid sequence number: must be a byte array')
  }
  const kvs = new Map()
  const signed = [seq]
  for (let i = 2; i < decoded.length; i += 2) {
    const k = decoded[i]
    const v = decoded[i + 1]
    kvs.set(bytesToUtf8(<Uint8Array>k), v)
    signed.push(<Uint8Array>k, <Uint8Array>v)
  }

  const values = {
    kvs: Object.fromEntries([...kvs.entries()]),
    seq: bytesToHex(seq),
    signature: bytesToHex(signature),
  }
  console.log(values)
  return values
}
export function decode(encoded: Uint8Array) {
  console.log('encoded', encoded)
  const decoded = RLP.decode(encoded)
  console.log('decoded', decoded)
  return decodeFromValues(decoded)
}
export function txtToBuf(encoded: string) {
  if (!encoded.startsWith('enr:')) {
    throw new Error("string encoded ENR must start with 'enr:'")
  }
  const binString = atob(
    encoded.slice(4).replace(/\s+/g, '').replace(/\-/g, '+').replace(/\_/g, '/'),
  )
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!)
}
export function decodeTxt(encoded: string) {
  return decode(txtToBuf(encoded))
}
