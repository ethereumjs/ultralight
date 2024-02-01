import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Blockchain } from '@ethereumjs/blockchain'
import { Common } from '@ethereumjs/common'
import { LeafNode, Trie } from '@ethereumjs/trie'
import { Account, parseGethGenesisState } from '@ethereumjs/util'
import { readFileSync, writeFileSync } from 'fs'
import { AccountTrieNodeContentKey, AccountTrieNodeOffer, tightlyPackNibbles } from 'portalnetwork'

import genesis from '../data/mainnet.json' assert { type: 'json' }

import type { Proof, TrieNode } from '@ethereumjs/trie'
import type { AccountState } from '@ethereumjs/util'
import type { TAccountTrieNodeKey, TNibble } from 'portalnetwork'

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
  const root = toHexString(trie.root())
  if (root !== genesis.genesisStateRoot) {
    throw new Error('Invalid genesis state root')
  }
  console.log('Valid genesis state root:', root)
  return trie
}

export const generateAccountTrieProofs = async (
  trie: Trie,
): Promise<{
  nonLeafProofs: Record<string, { path: string[]; proof: Proof }>
  leafProofs: Record<string, { path: string[]; proof: Proof }>
}> => {
  const nodes: [TrieNode, number[]][] = []
  const leafNodes: [TrieNode, number[]][] = []
  await trie.walkAllNodes(async (node, key) => {
    node instanceof LeafNode ? leafNodes.push([node, key]) : nodes.push([node, key])
    if (toHexString(trie['hash'](node.serialize())) === genesis.genesisStateRoot) {
      console.log(`ROOT NODE WALKING`)
      console.log({ nodes, leafNodes })
    }
  })
  const leafProofs = await Promise.all(
    leafNodes.map(async ([node, path]) => {
      const nodeHash = trie['hash'](node.serialize())
      const proof = (await trie.findPath(nodeHash)).stack.map((node) => node.serialize())
      return [toHexString(nodeHash), { path, proof }]
    }),
  )
  const proofs = await Promise.all(
    nodes.map(async ([node, path]) => {
      const nodeHash = trie['hash'](node.serialize())
      const nodePath = await trie.findPath(nodeHash)
      const proof = nodePath.stack.map((node) => node.serialize())
      const content = [toHexString(nodeHash), { path, proof }]
      // console.log(content)
      if (toHexString(nodeHash) === genesis.genesisStateRoot) {
        console.log('GENESIS PROOF:', content)
      }
      return content
    }),
  )
  console.log('Created Node Proofs', {
    leafProofs: leafProofs.length,
    nonLeafProofs: proofs.length,
  })
  return {
    nonLeafProofs: Object.fromEntries(proofs),
    leafProofs: Object.fromEntries(leafProofs),
  }
}

const _index = async () => {
  const common = new Common({ chain: 'mainnet' })
  const blockchain = await Blockchain.create({
    common,
  })
  const genesisBlock = blockchain.genesisBlock
  const trie = await genesisStateTrie()
  const { nonLeafProofs, leafProofs } = await generateAccountTrieProofs(trie)
  const leafNodeContent: [string, Uint8Array][] = Object.keys(leafProofs).map((nodeHash) => {
    const path = tightlyPackNibbles(leafProofs[nodeHash].path as TNibble[])
    const key: TAccountTrieNodeKey = {
      nodeHash: fromHexString(nodeHash),
      path,
    }
    const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
    const content = AccountTrieNodeOffer.serialize({
      blockHash: genesisBlock.hash(),
      proof: leafProofs[nodeHash].proof,
    })
    return [contentKey, content]
  })
  const trieNodeContent: [string, Uint8Array][] = Object.keys(nonLeafProofs).map((nodeHash) => {
    try {
      const path = tightlyPackNibbles(nonLeafProofs[nodeHash].path as TNibble[])
      const key: TAccountTrieNodeKey = {
        nodeHash: fromHexString(nodeHash),
        path,
      }
      const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
      const content = AccountTrieNodeOffer.serialize({
        blockHash: genesisBlock.hash(),
        proof: nonLeafProofs[nodeHash].proof,
      })
      return [contentKey, content]
    } catch (err: any) {
      throw new Error(`${err.message}\nnodeHash: ${nodeHash}`)
    }
  })
  console.log({
    leafNodeContent: leafNodeContent.length,
    trieNodeContent: trieNodeContent.length,
  })
  writeFileSync(
    './data/genesisContent.json',
    JSON.stringify({ genesisBlock, leafNodeContent, trieNodeContent }),
  )
}

// index()
//   .then(() => {
//     process.exit(0)
//   })
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })

const fromMem = async () => {
  const data = readFileSync('./data/genesisContent.json', { encoding: 'utf-8' })
  const {
    genesisBlock,
    leafNodeContent,
    trieNodeContent,
  }: {
    genesisBlock: any
    leafNodeContent: [string, Uint8Array][]
    trieNodeContent: [string, Uint8Array][]
  } = JSON.parse(data)
  console.log({
    genesisBlock,
    leafNodeContent: leafNodeContent.length,
    trieNodeContent: trieNodeContent.length,
  })
}

fromMem()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
