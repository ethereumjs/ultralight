import { fromHexString } from '@chainsafe/ssz'
import { assert, describe, it } from 'vitest'

import { HistoryNetworkContentType, NetworkId, PortalNetwork } from '../../../src/index.js'

import type { HistoryNetwork } from '../../../src/index.js'

const headerWithProof =
  '0x080000001c020000f90211a0d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479405a56e2d52c817161883f50c441c3228cfe54d9fa0d67e4d450343046425ae4271474353857ab860dbc0a1dde64b41b5cd3a532bf3a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008503ff80000001821388808455ba422499476574682f76312e302e302f6c696e75782f676f312e342e32a0969b900de27b6ac6a67742365dd65f55a0526c41fd18e1b16f1a1215c2e66f5988539bd4979fef1ec401000080ff0700000000000000000000000000000000000000000000000000000023d6398abe4eba641e97a075b30780c12ebe18b24e83a9a9c7bdd94a910cf749bb6bb61aeab6bc5786067f7432bad790642b578881460279ad773a8191596c3087811c70634dbf2ea3abb7199cb5638713844db315d63467f40b5d38eeb884ddcb57866840a050f634417365e9515cd5e6826038ceb45659d85365cfcfceb7a6e9886aaff50b16b6af2bc3bde8b7e701b2cb5022ba49cac9d6c456834e692772b12acf7af78a8375b80ef177c9ad743a14ff0d4935f9ac105444fd57f802fed32495bab257b9585a149a7de4ac53eda7b6df7b9dac7f92325ba05eb1e6b588202048719c250620f4bfa71307470d6c835156db527294c6e6004f9de0c3595a7f1df43427c770506e7e3ca5d021f065544c6ba191d8ffc5fc0805b805d301c926c183ed9ec7e467b962e2304fa7945b6b18042dc2a53cb62b27b28af50fc06db5da2f83bd479f3719b9972fc723c69e4cd13877dcf7cc2a919a95cdf5d7805d9bd9a9f1fbf7a880d82ba9d7af9ed554ce01ea778db5d93d0665ca4fee11f4f873b0b1b58ff1337769b6ee458316030aeac65a5aab68d60fbf214bd44455f892260020000000000000000000000000000000000000000000000000000000000000'
const hash = '0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'
const headerWithProofkey = '0x0088e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6'

describe('BlockIndex', async () => {
  const ultralight = await PortalNetwork.create({
    supportedNetworks: [NetworkId.HistoryNetwork],
  })
  const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  await history.store(HistoryNetworkContentType.BlockHeader, hash, fromHexString(headerWithProof))
  const stored = await history.get(NetworkId.HistoryNetwork, headerWithProofkey)

  it('should store block header', () => {
    assert.equal(stored, headerWithProof)
  })
  it('should save block index', async () => {
    const numberHex = '0x' + BigInt(1).toString(16)
    const index = await history.blockIndex()
    assert.isTrue(index.has(numberHex))
    assert.equal(index.get(numberHex), hash)
  })
  it('should store blockIndex in DB', async () => {
    const expected = Array.from(await history.blockIndex())
    const stored = JSON.parse(await ultralight.db.db.get('block_index'))
    assert.deepEqual(stored, expected)
  })

  const ultralight2 = await PortalNetwork.create({
    supportedNetworks: [NetworkId.HistoryNetwork],
    db: ultralight.db.db,
  })
  const history2 = ultralight2.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  it('should start with blockIndex in DB', async () => {
    const expected = await history.blockIndex()
    const stored = await history2.blockIndex()
    assert.deepEqual(stored, expected)
  })
})
