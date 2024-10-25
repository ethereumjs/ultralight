import { LeafNode, Trie } from '@ethereumjs/trie'
import {
  Account,
  bytesToHex,
  equalsBytes,
  hexToBytes,
  parseGethGenesisState,
} from '@ethereumjs/util'

import genesis from './mainnet.json' assert { type: 'json' }

import type { Proof, TrieNode } from '@ethereumjs/trie'
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
    await trie.put(hexToBytes(account[0]), account[1])
  }
  if (!equalsBytes(trie.root(), hexToBytes(genesis.genesisStateRoot))) {
    throw new Error('Invalid genesis state root')
  }
  return trie
}

export const generateAccountTrieProofs = async (): Promise<{
  nonLeafProofs: Record<string, { path: string[]; proof: Proof }>
  leafProofs: Record<string, { path: string[]; proof: Proof }>
}> => {
  const trie = await genesisStateTrie()
  const nodes: [TrieNode, number[]][] = []
  const leafNodes: [TrieNode, number[]][] = []
  await trie.walkAllNodes(async (node, key) => {
    node instanceof LeafNode ? leafNodes.push([node, key]) : nodes.push([node, key])
  })
  const leafProofs = await Promise.all(
    leafNodes.map(async ([node, path]) => {
      const nodeHash = trie['hash'](node.serialize())
      const proof = [
        ...(await trie.findPath(nodeHash)).stack.map((node) => node.serialize()),
        node.serialize(),
      ]
      return [bytesToHex(nodeHash), { path, proof }]
    }),
  )
  const proofs = await Promise.all(
    nodes.map(async ([node, path]) => {
      const nodeHash = trie['hash'](node.serialize())
      const nodePath = await trie.findPath(nodeHash)
      const proof = [...nodePath.stack.map((node) => node.serialize()), node.serialize()]
      const content = [bytesToHex(nodeHash), { path, proof }]
      return content
    }),
  )
  return {
    nonLeafProofs: Object.fromEntries(proofs),
    leafProofs: Object.fromEntries(leafProofs),
  }
}

export const mainnet = genesis
