import { SignableENR } from '@chainsafe/discv5'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { describe, expect, it } from 'vitest'

import { NetworkId, PortalNetwork } from '../../../src/index.js'
import genesis from '../../../src/networks/state/mainnet.json'

import type { StateNetwork } from '../../../src/index.js'

describe('StateNetwork', async () => {
  const pk = await createSecp256k1PeerId()
  const enr1 = SignableENR.createFromPeerId(pk)

  const r = 4n
  const radius = 2n ** (256n - r)
  const p = 2n ** r
  const radiusP = 100n / p
  const min = Math.floor(8893 / Number(p))

  const ultralight = await PortalNetwork.create({
    config: {
      enr: enr1,
      peerId: pk,
    },
    radius,
    supportedNetworks: [NetworkId.StateNetwork],
  })

  const stateNetwork = ultralight.networks.get(NetworkId.StateNetwork) as StateNetwork
  await stateNetwork.initGenesis()

  it(`node with radius 2**${256n - r} should have about ${
    radiusP * 2n
  }% genesis accounts in trie`, async () => {
    expect(stateNetwork.stateDB.accounts.size).toBeGreaterThanOrEqual(min * 0.9 * 2)
    expect(stateNetwork.stateDB.accounts.size).toBeLessThanOrEqual(min * 1.1 * 2)
  })
  const accounts = [...stateNetwork.stateDB.accounts]
  const stateRoot = stateNetwork.stateDB.stateRoots.values().next().value
  const balances: [string, bigint | undefined][] = await Promise.all(
    [...accounts].map(async (addr) => {
      const balance = await stateNetwork.stateDB.getBalance(addr, stateRoot)
      return [addr, balance]
    }),
  )

  it(`should retrieve balances for all ${accounts.length} in-radius accounts`, () => {
    expect(balances.length).toEqual(accounts.length)
  })

  it(`retrieved balances for in-range accounts`, async () => {
    for (const [addr, balance] of balances) {
      const expected = genesis.alloc[addr.slice(2)].balance
      expect(balance, `should get balance: ${expected} for ${addr}`).toEqual(BigInt(expected))
    }
  })
})
