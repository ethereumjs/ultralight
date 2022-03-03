import tape from 'tape'
import {
  ContentMessageType,
  MessageCodes,
  PortalWireMessageType,
  PingPongCustomDataType,
  UtpContentListType,
} from '../../src/wire/types'
import { ENR } from '@chainsafe/discv5'
import { fromHexString, List } from '@chainsafe/ssz'
import * as rlp from 'rlp'
import { Block } from '@ethereumjs/block'

tape('message encoding should match test vectors', (t) => {
  // Validate PING/PONG message encoding
  const enrSeq = BigInt(1)
  const dataRadius = 2n ** 256n - 2n
  const customPayload = PingPongCustomDataType.serialize({ radius: dataRadius })
  let payload = PortalWireMessageType.serialize({
    selector: MessageCodes.PING,
    value: {
      enrSeq: enrSeq,
      customPayload: customPayload,
    },
  })
  let testVector =
    '0001000000000000000c000000feffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  t.isEqual(Buffer.from(payload).toString('hex'), testVector, 'ping message encoded correctly')

  // Validate FINDNODES message encoding
  const distances = Uint16Array.from([256, 255])
  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.FINDNODES,
    value: { distances },
  })
  testVector = '02040000000001ff00'
  t.isEqual(Buffer.from(payload).toString('hex'), testVector, 'findNodes message encoded correctly')

  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.NODES,
    value: {
      total: 1,
      enrs: [],
    },
  })
  testVector = '030105000000'
  t.isEqual(
    Buffer.from(payload).toString('hex'),
    testVector,
    'nodes message with no ENRs encoded correctly'
  )

  // Validate NODES message encoding
  const enr1 =
    'enr:-HW4QBzimRxkmT18hMKaAL3IcZF1UcfTMPyi3Q1pxwZZbcZVRI8DC5infUAB_UauARLOJtYTxaagKoGmIjzQxO2qUygBgmlkgnY0iXNlY3AyNTZrMaEDymNMrg1JrLQB2KTGtv6MVbcNEVv0AHacwUAPMljNMTg'
  const enr2 =
    'enr:-HW4QNfxw543Ypf4HXKXdYxkyzfcxcO-6p9X986WldfVpnVTQX1xlTnWrktEWUbeTZnmgOuAY_KUhbVV1Ft98WoYUBMBgmlkgnY0iXNlY3AyNTZrMaEDDiy3QkHAxPyOgWbxp5oF1bDdlYE6dLCUUp8xfVw50jU'
  const total = 1
  const enrs = [ENR.decodeTxt(enr1).encode(), ENR.decodeTxt(enr2).encode()]

  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.NODES,
    value: {
      total: total,
      enrs: enrs,
    },
  })
  testVector =
    '030105000000080000007f000000f875b8401ce2991c64993d7c84c29a00bdc871917551c7d330fca2dd0d69c706596dc655448f030b98a77d4001fd46ae0112ce26d613c5a6a02a81a6223cd0c4edaa53280182696482763489736563703235366b31a103ca634cae0d49acb401d8a4c6b6fe8c55b70d115bf400769cc1400f3258cd3138f875b840d7f1c39e376297f81d7297758c64cb37dcc5c3beea9f57f7ce9695d7d5a67553417d719539d6ae4b445946de4d99e680eb8063f29485b555d45b7df16a1850130182696482763489736563703235366b31a1030e2cb74241c0c4fc8e8166f1a79a05d5b0dd95813a74b094529f317d5c39d235'
  t.isEqual(
    Buffer.from(payload).toString('hex'),
    testVector,
    'nodes message with 2 ENRs encoded correctly'
  )

  // Validate FINDCONTENT message encoding
  const contentKey = fromHexString('0x706f7274616c')
  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.FINDCONTENT,
    value: { contentKey: contentKey },
  })
  testVector = '0404000000706f7274616c'
  t.isEqual(
    Buffer.from(payload).toString('hex'),
    testVector,
    'find content message encoded correctly'
  )

  // Validate CONTENT message encoding
  // TODO: Update CONTENT encoding to use PortalMessageWireType.serialize
  let connectionId = Uint8Array.from([0x01, 0x02])
  const contentMessagePayload = ContentMessageType.serialize({ selector: 0, value: connectionId })
  payload = Buffer.concat([Buffer.from([MessageCodes.CONTENT]), contentMessagePayload])
  testVector = '05000102'
  t.isEqual(Buffer.from(payload).toString('hex'), testVector, 'content message encodes correctly')

  // Validate OFFER message encoding
  const contentKeys = [fromHexString('0x010203')]
  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.OFFER,
    value: { contentKeys: contentKeys },
  })
  testVector = '060400000004000000010203'
  t.isEqual(Buffer.from(payload).toString('hex'), testVector, 'offer message encodes correctly')

  // Validate ACCEPT message encoding
  connectionId = Uint8Array.from([0x01, 0x02])
  const acceptMessageContentKeys: List<Boolean> = [
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]
  payload = PortalWireMessageType.serialize({
    selector: MessageCodes.ACCEPT,
    value: {
      connectionId: connectionId,
      contentKeys: acceptMessageContentKeys,
    },
  })
  testVector = '070102060000000101'
  t.isEqual(Buffer.from(payload).toString('hex'), testVector, 'accept message encodes correctly')
  t.end()
})

tape('UtpListType', (t) => {
  const block1 = fromHexString(
    '0xf9028df90217a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0ac4ba3fe45d38b28e2af093024e112851a0f3c72bf1d02b306506e93cd39e26da068d722d467154a4570a7d759cd6b08792c4a1cb994261196b99735222b513bd9a00db8f50b32f1ec33d2546b4aa485defeae3a4e88d5f90fdcccadd6dff516e4b9b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd88252088455ee029798d783010102844765746887676f312e342e32856c696e7578a0ee8523229bf562950f30ad5a85be3fabc3f19926ee479826d54d4f5f2728c245880a0fb916fd59aad0f870f86e822d85850ba43b740083015f90947c5080988c6d91d090c23d54740f856c69450b29874b04c0f2616400801ba09aaf0e60d53dfb7c34ed51991bd350b8e021185ccc070b4264e209d16df5dc08a03565399bd97800b6d0e9959cd0920702039642b85b37a799391181e0610d6ba9c0'
  )
  const block2 = fromHexString(
    '0xf9028ef90217a08faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0bd0eaff61d52c20e085cb7a7c60b312c792e0b141c5a00e50fd42f8ae1cfe51da09b763cefd23adf252ba87898f7cb8ccc06a4ebddc6be9032648fd55789d4c0b8a0cbb141d48d01bbbf96fb19adff38fb2a6c5e3de40843472a91067ef4f9eac09fb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605afdbcd75fd83030d42832fefd88252088455ee029f98d783010102844765746887676f312e342e32856c696e7578a04ddfa646f9a9ec8507af565631322186e2e06347586c9f137383d745ee8bf5958885808f6bbbb2a835f871f86f822d86850ba43b740083015f9094c197252baf4a4d2974eab91039594f789a8c207c88017a798d89731c00801ca0825c34f6ddfad0c9fe0e2aa75a3bff9bccc21e81a782fb2a454afb4ad4abac70a0106d3942a42839f74bbbf71b6ff8c5b11082af8b0ff2799cb9b8d14b7fcc9e11c0'
  )
  const utpContent = UtpContentListType.serialize({
    contentItems: [block1, block2],
  })
  const decodedBlocks = UtpContentListType.deserialize(utpContent)
  t.ok(
    Block.fromRLPSerializedBlock(Buffer.from(decodedBlocks.contentItems[0])).header.number.toString(
      'hex'
    ) === '30d41',
    'should decode block 1'
  )
  t.ok(
    Block.fromRLPSerializedBlock(Buffer.from(decodedBlocks.contentItems[1])).header.number.toString(
      'hex'
    ) === '30d42',
    'should decode block 2'
  )
  t.end()
})
