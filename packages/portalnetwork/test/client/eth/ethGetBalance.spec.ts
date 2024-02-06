// import { Block } from '@ethereumjs/block'
import { describe } from 'vitest'

// import {
//   NetworkId,
//   PortalNetwork,
//   addRLPSerializedBlock,
//   fromHexString,
//   toHexString,
// } from '../../../src/index.js'

// import type { HistoryNetwork, StateNetwork } from '../../../src'

describe.skip('ethGetBalance using HistoryNetwork and StateNetwork', async () => {
  // const ultralight = await PortalNetwork.create({
  //   supportedNetworks: [NetworkId.HistoryNetwork, NetworkId.StateNetwork],
  // })
  // const history = ultralight.networks.get(NetworkId.HistoryNetwork) as HistoryNetwork
  // const state = ultralight.networks.get(NetworkId.StateNetwork) as StateNetwork
  // for (const blockNumber of Object.keys(testBlockData)) {
  //   const block = Block.fromRPC(testBlockData[blockNumber], undefined, {
  //     setHardfork: true,
  //   })
  //   await addRLPSerializedBlock(toHexString(block.serialize()), toHexString(block.hash()), history)
  //   const stored = await ultralight.ETH.getBlockByNumber(BigInt(blockNumber), true)
  //   it(`should store block ${blockNumber}`, async () => {
  //     assert.isDefined(stored)
  //   })
  // }
  // const database = new StateDB()
  // const blocksMeta = [block0_meta, block1_meta, block2_meta]
  // for await (const [idx, block] of [block0_db, block1_db, block2_db].entries()) {
  //   const contentKeys = Object.keys(block)
  //   it(`should store ${contentKeys.length} pieces of content by key (block: ${blocksMeta[idx].blockNumber})`, async () => {
  //     for await (const key of contentKeys) {
  //       const keyBytes = fromHexString(key)
  //       const storing = await state.stateDB.storeContent(keyBytes, fromHexString(block[key]))
  //       assert.isTrue(storing)
  //     }
  //   })
  // }
  // const stateRoots = [block0_meta.stateroot, block1_meta.stateroot, block2_meta.stateroot]
  // it('should have account info', async () => {
  //   let nonce = 0n
  //   for (const stateRoot of stateRoots) {
  //     const account0 = await state.stateDB.getAccount(
  //       '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
  //       stateRoot,
  //     )
  //     assert.isDefined(account0)
  //     assert.isTrue(account0!.nonce > nonce)
  //     nonce = account0!.nonce
  //   }
  // })
  // it('should serve eth_getBalance', async () => {
  //   const balance0 = await ultralight.ETH.ethGetBalance(
  //     '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
  //     BigInt(block0_meta.blockNumber),
  //   )
  //   const balance1 = await ultralight.ETH.ethGetBalance(
  //     '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
  //     BigInt(block1_meta.blockNumber),
  //   )
  //   const balance2 = await ultralight.ETH.ethGetBalance(
  //     '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13',
  //     BigInt(block2_meta.blockNumber),
  //   )
  //   assert.equal(balance0, 164619190316350082359n)
  //   assert.equal(balance1, 164604985544259798048n)
  //   assert.equal(balance2, 164573254234858175798n)
  // })
})
