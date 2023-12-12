import { SignableENR, distance } from '@chainsafe/discv5'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { describe, expect, it } from 'vitest'

import { NetworkId, PortalNetwork, fromHexString, toHexString } from '../../../src/index.js'
import genesis from '../../../src/networks/state/mainnet.json'

import type { StateNetwork } from '../../../src/index.js'

describe('StateNetwork', async () => {
  const pk = await createSecp256k1PeerId()
  const enr1 = SignableENR.createFromPeerId(pk)

  const r = 4n
  const radius = 2n ** (256n - r) - 1n
  const p = 2n ** r

  const expected = Object.entries(genesis.alloc).filter(([addr, _]) => {
    const id = sha256(fromHexString(addr))
    return distance(toHexString(id).slice(2), enr1.nodeId) <= radius
  })
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

  it(`node with radius 2**${256n - r} - 1 should have about ${
    100n / p
  }% genesis accounts in trie [actual: ${
    (100 * stateNetwork.stateDB.accounts.size) / 8893
  }]`, async () => {
    expect(stateNetwork.stateDB.accounts.size).toEqual(expected.length)
  })
  const accounts = [...stateNetwork.stateDB.accounts]
  const stateRoot = stateNetwork.stateDB.stateRoots.values().next().value
  const balances: [string, bigint | undefined][] = await Promise.all(
    [...accounts].map(async (addr) => {
      const balance = await stateNetwork.stateDB.getBalance(addr, stateRoot)
      return [addr, balance]
    }),
  )

  expect(balances.length).toEqual(accounts.length)
  it(`should retrieve balances for all ${accounts.length} in-radius accounts`, () => {})

  it(`retrieved balances for ${balances.length} / ${accounts.length} in-range accounts`, async () => {
    for (const [addr, balance] of balances) {
      const expected = genesis.alloc[addr.slice(2)].balance
      expect(balance, `should get balance: ${expected} for ${addr}`).toEqual(BigInt(expected))
    }
  })
})
