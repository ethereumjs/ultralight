import { describe, it, assert, test } from 'vitest'
import {
  HistoryProtocol,
  PortalNetwork,
  ProtocolId,
  StateProtocol,
  addRLPSerializedBlock,
  fromHexString,
  reassembleBlock,
  toHexString,
} from '../../src'
import block0_meta from './state/testdata/block-0x11a86a9-meta.json'
import block0_db from './state/testdata/block-0x11a86a9-db.json'
import block1_meta from './state/testdata/block-0x11a86aa-meta.json'
import block1_db from './state/testdata/block-0x11a86aa-db.json'
import block2_meta from './state/testdata/block-0x11a86ab-meta.json'
import block2_db from './state/testdata/block-0x11a86ab-db.json'
import testBlockData from './state/testdata/testblocks.json'
import { Block } from '@ethereumjs/block'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { StateDB } from '../../src/subprotocols/state/statedb.js'

describe('shared accounts', async () => {
  for (const account0 of block0_meta.accounts) {
    if (block1_meta.accounts.includes(account0)) {
      // it(`should have account ${account0} in block 0 and block 1`, async () => {
      //   assert.equal(true, true)
      // })
      if (block2_meta.accounts.includes(account0)) {
        it(`${account0}`, async () => {
          assert.equal(true, true)
        })
      }
    }
  }
})

describe('ethGetBalance using HistoryProtocol and StateProtocol', async () => {
  const ultralight = await PortalNetwork.create({
    supportedProtocols: [ProtocolId.HistoryNetwork, ProtocolId.StateNetwork],
  })
  const history = ultralight.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
  const state = ultralight.protocols.get(ProtocolId.StateNetwork) as StateProtocol

  it('should instantiate with history and state networks active', async () => {
    assert.isDefined(history)
    assert.isDefined(state)
  })

  for (const blockNumber of Object.keys(testBlockData)) {
    const block = Block.fromRPC(testBlockData[blockNumber], undefined, {
      setHardfork: true,
    })
    await addRLPSerializedBlock(toHexString(block.serialize()), toHexString(block.hash()), history)
    const stored = await history.ETH.getBlockByNumber(BigInt(blockNumber), true)
    it(`should store block ${blockNumber}`, async () => {
      assert.isDefined(stored)
    })
  }
  // const database = new StateDB()
  const blocksMeta = [block0_meta, block1_meta, block2_meta]
  for await (const [idx, block] of [block0_db, block1_db, block2_db].entries()) {
    const contentKeys = Object.keys(block)
    const s = 0
    it(`should store ${contentKeys.length} pieces of content by key (block: ${blocksMeta[idx].blockNumber})`, async () => {
      for await (const key of contentKeys) {
        const storing = await state.stateDB.storeContent(
          fromHexString(key),
          fromHexString(block[key]),
        )
        assert.isTrue(storing)
      }
    })
  }

  const stateRoots = [block0_meta.stateroot, block1_meta.stateroot, block2_meta.stateroot]
  it('should have account info', async () => {
    let nonce = 0n
    for (const stateRoot of stateRoots) {
      const account0 = await state.stateDB.getAccount(
        '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
        stateRoot,
      )
      assert.isDefined(account0)
      assert.isTrue(account0!.nonce > nonce)
      nonce = account0!.nonce
    }
  })
  it('should serve eth_getBalance', async () => {
    const balance0 = await ultralight.ETH.ethGetBalance(
      '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
      BigInt(block0_meta.blockNumber),
    )
    const balance1 = await ultralight.ETH.ethGetBalance(
      '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
      BigInt(block1_meta.blockNumber),
    )
    const balance2 = await ultralight.ETH.ethGetBalance(
      '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
      BigInt(block2_meta.blockNumber),
    )
    assert.equal(balance0, 164619190316350082359n)
    assert.equal(balance1, 164604985544259798048n)
    assert.equal(balance2, 164573254234858175798n)
  })
})
