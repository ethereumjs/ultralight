import { Block, BlockHeader } from '@ethereumjs/block'
import jayson, { HttpClient } from 'jayson/promise/index.js'
import {
  ENR,
  fromHexString,
  getContentId,
  getContentKey,
  ContentType,
  ProtocolId,
  toHexString,
} from 'portalnetwork'

const testBlocks = [
  Block.fromRLPSerializedBlock(
    Buffer.from(
      fromHexString(
        '0xf9028df90217a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0ac4ba3fe45d38b28e2af093024e112851a0f3c72bf1d02b306506e93cd39e26da068d722d467154a4570a7d759cd6b08792c4a1cb994261196b99735222b513bd9a00db8f50b32f1ec33d2546b4aa485defeae3a4e88d5f90fdcccadd6dff516e4b9b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd88252088455ee029798d783010102844765746887676f312e342e32856c696e7578a0ee8523229bf562950f30ad5a85be3fabc3f19926ee479826d54d4f5f2728c245880a0fb916fd59aad0f870f86e822d85850ba43b740083015f90947c5080988c6d91d090c23d54740f856c69450b29874b04c0f2616400801ba09aaf0e60d53dfb7c34ed51991bd350b8e021185ccc070b4264e209d16df5dc08a03565399bd97800b6d0e9959cd0920702039642b85b37a799391181e0610d6ba9c0'
      )
    ),
    { hardforkByBlockNumber: true }
  ),
  Block.fromRLPSerializedBlock(
    Buffer.from(
      fromHexString(
        '0xf9028ef90217a08faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0bd0eaff61d52c20e085cb7a7c60b312c792e0b141c5a00e50fd42f8ae1cfe51da09b763cefd23adf252ba87898f7cb8ccc06a4ebddc6be9032648fd55789d4c0b8a0cbb141d48d01bbbf96fb19adff38fb2a6c5e3de40843472a91067ef4f9eac09fb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605afdbcd75fd83030d42832fefd88252088455ee029f98d783010102844765746887676f312e342e32856c696e7578a04ddfa646f9a9ec8507af565631322186e2e06347586c9f137383d745ee8bf5958885808f6bbbb2a835f871f86f822d86850ba43b740083015f9094c197252baf4a4d2974eab91039594f789a8c207c88017a798d89731c00801ca0825c34f6ddfad0c9fe0e2aa75a3bff9bccc21e81a782fb2a454afb4ad4abac70a0106d3942a42839f74bbbf71b6ff8c5b11082af8b0ff2799cb9b8d14b7fcc9e11c0'
      )
    ),
    { hardforkByBlockNumber: true }
  ),
]

const { Client } = jayson

const recursiveFindContent = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 10; i++) {
    const ultralight = Client.http({ host: '127.0.0.1', port: 8545 + i })
    const ultralightENR = await ultralight.request('portal_historyNodeInfo', [])
    ultralights.push(ultralight)
    // console.log(ultralightENR)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
  }
  // GossipTest

  const headerKey = getContentKey(
    ContentType.BlockHeader,
    testBlocks[0].hash()
  )
  const header = testBlocks[0].header.serialize()
  const store = await ultralights[0].request('portal_historyStore', [
    headerKey,
    toHexString(header),
  ])
  store.result || console.log('store fail')
  for (const enr of enrs.slice(0, 9)) {
    const ping = await ultralights[9].request('portal_historyPing', [enr, '0x00'])
    if(!ping.result) {
        console.log('pingfail')
    }
  }

  const find = await ultralights[8].request('portal_historyRecursiveFindContent', [headerKey])
  console.log('RecursiveFindContent', Buffer.from(fromHexString(find.result)).equals(header) ? 'pass' : 'fail')
  if (find.result) {
    await ultralights[8].request('portal_historyStore', [headerKey, find.result])
  }
  const stored = await ultralights[8].request('portal_historyLocalContent', [headerKey])

  console.log('Store Retrieved Header', stored.result.data && Buffer.from(stored.result.data).equals(header) ? 'pass' :  'fail')
}

const main = async () => {
  await recursiveFindContent()
}

main()
