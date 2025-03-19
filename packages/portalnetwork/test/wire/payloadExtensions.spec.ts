import { bytesToHex, hexToBytes, toAscii } from '@ethereumjs/util'
import { assert, describe, expect, it } from 'vitest'
import {
  decodeClientInfo,
  decodeExtensionPayload,
  decodeExtensionPayloadToJson,
  encodeClientInfo,
  encodeExtensionPayload,
} from '../../src/index.js'
describe('Client Info', () => {
  const testVectors = {
    object: {
      clientName: 'trin',
      clientVersionAndShortCommit: '0.1.1-2b00d730',
      operatingSystemAndCpuArchitecture: 'linux-x86_64',
      programmingLanguageAndVersion: 'rustc1.81.0',
    },
    string: 'trin/0.1.1-2b00d730/linux-x86_64/rustc1.81.0',
    hex: '0x7472696E2F302E312E312D32623030643733302F6C696E75782D7838365F36342F7275737463312E38312E30',
  }

  it('should encode client info hex', () => {
    const encoded = encodeClientInfo(testVectors.object)
    expect(bytesToHex(encoded).toLowerCase()).toEqual(testVectors.hex.toLowerCase())
  })

  it('should decode client info hex', () => {
    const decoded = decodeClientInfo(hexToBytes(testVectors.hex))
    assert.deepEqual(decoded, testVectors.object)
  })

  it('should equal client info string', () => {
    assert.equal(toAscii(testVectors.hex), testVectors.string)
  })
})

describe('encode/decode payload extensions', () => {
  const clientInfo = {
    clientName: 'trin',
    clientVersionAndShortCommit: '0.1.1-2b00d730',
    operatingSystemAndCpuArchitecture: 'linux-x86_64',
    programmingLanguageAndVersion: 'rustc1.81.0',
  }
  const radius = 100n
  it('should properly encode and decode radius', () => {
    const encodedPayload = encodeExtensionPayload(0, {
      ClientInfo: clientInfo,
      DataRadius: radius,
      Capabilities: [0],
    })
    const decodedPayload = decodeExtensionPayload(0, encodedPayload)
    assert.strictEqual((decodedPayload as any).DataRadius, 100n)
    assert.deepEqual(decodeExtensionPayloadToJson(0, encodedPayload), {
      ClientInfo: clientInfo,
      DataRadius: radius.toString(10),
      Capabilities: JSON.stringify([0]),
    })
  })
})
