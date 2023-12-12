import { distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Trie } from '@ethereumjs/trie'
import { Account, parseGethGenesisState } from '@ethereumjs/util'
import { sha256 } from 'ethereum-cryptography/sha256.js'

import genesis from './mainnet.json' assert { type: 'json' }

import type { StateNetwork } from './state'
import type { AccountState } from '@ethereumjs/util'

const genesisAccounts = () => {
  const parsed = parseGethGenesisState(genesis)
  const gState = parsed as Record<string, AccountState>
  const accounts: [string, Uint8Array][] = Object.entries(gState).map(([address, [balance]]) => {
    return [
      address,
      Account.fromAccountData({
        balance: BigInt(balance),
      }).serialize(),
    ]
  })
  return accounts
}

export const genesisStateTrie = async () => {
  const trie = new Trie({ useKeyHashing: true })
  for (const account of genesisAccounts()) {
    await trie.put(fromHexString(account[0]), account[1])
  }
  return trie
}

export const inRadiusAccounts = async (nodeId: string, radius: bigint): Promise<string[]> => {
  const distances: Map<bigint, string> = new Map()
  const accounts: string[] = []
  for (const account of genesisAccounts()) {
    const d = distance(nodeId, toHexString(sha256(fromHexString(account[0]))).slice(2))
    if (d <= radius) {
      accounts.push(account[0])
    }
    distances.set(d, account[0])
  }
  return accounts
}

export const inRadiusGenesisTrie = async (nodeId: string, radius: bigint) => {
  const trie = await genesisStateTrie()
  const inRadius = await inRadiusAccounts(nodeId, radius)
  const proofs = (
    await Promise.all(
      inRadius.map(async (address) => {
        return trie.createProof(fromHexString(address))
      }),
    )
  ).flat()

  const partialTrie = new Trie({ useKeyHashing: true, root: trie.root() })
  for (const node of proofs) {
    const hash = trie['hash'](node)
    await partialTrie.database().put(hash, node)
  }
  return partialTrie
}

export const genesisDBEntries = async (
  nodeId: string = '0x' + '00'.repeat(32),
  radius: bigint,
): Promise<[string, Uint8Array][]> => {
  const partialTrie = await inRadiusGenesisTrie(nodeId, radius)
  const db = (partialTrie.database().db as any)._database
  const entries = [...db.entries()] as [string, Uint8Array][]
  return entries
}

export async function genesisTrie(state: StateNetwork) {
  return genesisDBEntries(state.enr.nodeId, state['nodeRadius'])
}
