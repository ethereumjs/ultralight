import { ENR } from '@chainsafe/enr'
import { BitArray } from '@chainsafe/ssz'
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@ethereumjs/util'
import { assert, describe, it } from 'vitest'

import { ContentMessageType, MessageCodes, PortalWireMessageType } from '../../src/wire/types.js'

import {
  BasicRadius,
  ClientInfoAndCapabilities,
  ErrorPayload,
  HistoryRadius,
  PingPongPayloadExtensions,
  clientInfoStringToBytes,
} from '../../src/wire/index.js'

describe('ping pong message encoding', () => {
  it('should encode type 0 ping with client info', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      clientInfo: "trin/v0.1.1-b61fdc5c/linux-x86_64/rustc1.81.0",
      capabilities: [0, 1, 65535]
    }
    const payload = ClientInfoAndCapabilities.serialize({
      ClientInfo: clientInfoStringToBytes(params.clientInfo),
      DataRadius: params.dataRadius,
      Capabilities: params.capabilities,
    })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x00010000000000000000000e00000028000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff550000007472696e2f76302e312e312d62363166646335632f6c696e75782d7838365f36342f7275737463312e38312e3000000100ffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 0 ping without client info', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      clientInfo: "",
      capabilities: [0, 1, 65535]
    }
    const payload = ClientInfoAndCapabilities.serialize({
      ClientInfo: clientInfoStringToBytes(params.clientInfo),
      DataRadius: params.dataRadius,
      Capabilities: params.capabilities,
    })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x00010000000000000000000e00000028000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2800000000000100ffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 0 pong with client info', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      clientInfo: "trin/v0.1.1-b61fdc5c/linux-x86_64/rustc1.81.0",
      capabilities: [0, 1, 65535]
    }
    const payload = ClientInfoAndCapabilities.serialize({
      ClientInfo: clientInfoStringToBytes(params.clientInfo),
      DataRadius: params.dataRadius,
      Capabilities: params.capabilities,
    })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x01010000000000000000000e00000028000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff550000007472696e2f76302e312e312d62363166646335632f6c696e75782d7838365f36342f7275737463312e38312e3000000100ffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 0 pong without client info', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      clientInfo: "",
      capabilities: [0, 1, 65535]
    }
    const payload = ClientInfoAndCapabilities.serialize({
      ClientInfo: clientInfoStringToBytes(params.clientInfo),
      DataRadius: params.dataRadius,
      Capabilities: params.capabilities,
    })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.CLIENT_INFO_RADIUS_AND_CAPABILITIES,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x01010000000000000000000e00000028000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff2800000000000100ffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 1 ping', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
    }
    const payload = BasicRadius.serialize({ dataRadius: params.dataRadius })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.BASIC_RADIUS_PAYLOAD,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x00010000000000000001000e000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 1 pong', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
    }
    const payload = BasicRadius.serialize({ dataRadius: params.dataRadius })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.BASIC_RADIUS_PAYLOAD,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x01010000000000000001000e000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 2 ping', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      ephemeralHeaderCount: 4242
    }
    const payload = HistoryRadius.serialize({ dataRadius: params.dataRadius, ephemeralHeadersCount: params.ephemeralHeaderCount })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x00010000000000000002000e000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9210'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 2 pong', () => {
    const params = {
      enrSeq: BigInt(1),
      dataRadius: 2n ** 256n - 2n,
      ephemeralHeaderCount: 4242
    }
    const payload = HistoryRadius.serialize({ dataRadius: params.dataRadius, ephemeralHeadersCount: params.ephemeralHeaderCount })
    const pingMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.HISTORY_RADIUS_PAYLOAD,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x01010000000000000002000e000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9210'
    assert.equal(bytesToHex(pingMessage), expectedOutput, 'ping message encoded correctly')
  })
  it('should encode type 65535 pong', () => {
    const params = {
      enrSeq: BigInt(1),
      errorCode: 2,
      message: 'hello world'
    }
    const payload = ErrorPayload.serialize({ errorCode: params.errorCode, message: utf8ToBytes(params.message) })
    const pongMessage = PortalWireMessageType.serialize({
      selector: MessageCodes.PONG,
      value: {
        enrSeq: params.enrSeq,
        payloadType: PingPongPayloadExtensions.ERROR_RESPONSE,
        customPayload: payload,
      },
    })
    const expectedOutput = '0x010100000000000000ffff0e00000002000600000068656c6c6f20776f726c64'
    assert.equal(bytesToHex(pongMessage), expectedOutput, 'pong message encoded correctly')
  })
})

describe('message encoding should match test vectors', () => {
  // Validate PING/PONG message encoding
  const enrSeq = BigInt(1)
  const dataRadius = 2n ** 256n - 2n
  let payload: Uint8Array
  let testVector: string
  it('should encode PING message correctly', () => {
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.PING,
      value: {
        enrSeq,
        payloadType: PingPongPayloadExtensions.BASIC_RADIUS_PAYLOAD,
        customPayload: BasicRadius.serialize({ dataRadius }),
      },
    })
    testVector =
      '0x00010000000000000001000e000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    assert.equal(bytesToHex(payload), testVector, 'ping message encoded correctly')
  })

  // Validate FINDNODES message encoding
  const distances = Array.from([256, 255])

  it('should encode FINDNODES message correctly', () => {
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDNODES,
      value: { distances },
    })
    testVector = '0x02040000000001ff00'
    assert.equal(bytesToHex(payload), testVector, 'findNodes message encoded correctly')
  })

  it('should encode PONG message correctly', () => {
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.NODES,
      value: {
        total: 1,
        enrs: [],
      },
    })
    testVector = '0x030105000000'
    assert.equal(bytesToHex(payload), testVector, 'nodes message with no ENRs encoded correctly')
  })
  // Validate NODES message encoding
  const enr1 =
    'enr:-HW4QBzimRxkmT18hMKaAL3IcZF1UcfTMPyi3Q1pxwZZbcZVRI8DC5infUAB_UauARLOJtYTxaagKoGmIjzQxO2qUygBgmlkgnY0iXNlY3AyNTZrMaEDymNMrg1JrLQB2KTGtv6MVbcNEVv0AHacwUAPMljNMTg'
  const enr2 =
    'enr:-HW4QNfxw543Ypf4HXKXdYxkyzfcxcO-6p9X986WldfVpnVTQX1xlTnWrktEWUbeTZnmgOuAY_KUhbVV1Ft98WoYUBMBgmlkgnY0iXNlY3AyNTZrMaEDDiy3QkHAxPyOgWbxp5oF1bDdlYE6dLCUUp8xfVw50jU'
  const total = 1
  const enrs = [ENR.decodeTxt(enr1).encode(), ENR.decodeTxt(enr2).encode()]

  it('should encode NODES message correctly', () => {
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.NODES,
      value: {
        total,
        enrs,
      },
    })
    testVector =
      '0x030105000000080000007f000000f875b8401ce2991c64993d7c84c29a00bdc871917551c7d330fca2dd0d69c706596dc655448f030b98a77d4001fd46ae0112ce26d613c5a6a02a81a6223cd0c4edaa53280182696482763489736563703235366b31a103ca634cae0d49acb401d8a4c6b6fe8c55b70d115bf400769cc1400f3258cd3138f875b840d7f1c39e376297f81d7297758c64cb37dcc5c3beea9f57f7ce9695d7d5a67553417d719539d6ae4b445946de4d99e680eb8063f29485b555d45b7df16a1850130182696482763489736563703235366b31a1030e2cb74241c0c4fc8e8166f1a79a05d5b0dd95813a74b094529f317d5c39d235'
    assert.equal(bytesToHex(payload), testVector, 'nodes message with 2 ENRs encoded correctly')
  })

  // Validate FINDCONTENT message encoding
  const contentKey = hexToBytes('0x706f7274616c')

  it('should encode FINDCONTENT message correctly', () => {
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.FINDCONTENT,
      value: { contentKey },
    })
    testVector = '0x0404000000706f7274616c'
    assert.equal(bytesToHex(payload), testVector, 'find content message encoded correctly')

    // Validate CONTENT message encoding
    // TODO: Update CONTENT encoding to use PortalMessageWireType.serialize
  })
  let connectionId: Uint8Array

  it('should encode CONTENT message correctly', () => {
    connectionId = Uint8Array.from([0x01, 0x02])
    const contentMessagePayload = ContentMessageType.serialize({ selector: 0, value: connectionId })
    payload = concatBytes(Uint8Array.from([MessageCodes.CONTENT]), contentMessagePayload)
    testVector = '0x05000102'
    assert.equal(bytesToHex(payload), testVector, 'content message encodes correctly')
  })

  // Validate OFFER message encoding
  it('should encode OFFER message correctly', () => {
    const contentKeys = [hexToBytes('0x010203')]
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.OFFER,
      value: { contentKeys },
    })
    testVector = '0x060400000004000000010203'
    assert.equal(bytesToHex(payload), testVector, 'offer message encodes correctly')
  })

  // Validate ACCEPT message encoding
  it('should encode ACCEPT message correctly', () => {
    connectionId = Uint8Array.from([0x01, 0x02])
    const acceptMessageContentKeys: BitArray = BitArray.fromSingleBit(8, 0)
    payload = PortalWireMessageType.serialize({
      selector: MessageCodes.ACCEPT,
      value: {
        connectionId,
        contentKeys: acceptMessageContentKeys,
      },
    })
    testVector = '0x070102060000000101'
    assert.equal(bytesToHex(payload), testVector, 'accept message encodes correctly')
  })
})
