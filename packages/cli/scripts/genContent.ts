import { distance } from '@chainsafe/discv5'
import { ExtensionNode, Trie, decodeNode } from '@ethereumjs/trie'
import { bytesToUnprefixedHex, padToEven } from '@ethereumjs/util'
import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  fromHexString,
  packNibbles,
  toHexString,
} from 'portalnetwork'
import { genesisStateTrie } from 'portalnetwork/src/networks/state/genesis.js'

import mainnet from '../../portalnetwork/src/networks/state/mainnet.json' assert { type: 'json' }

import type { LeafNode } from '@ethereumjs/trie'
import type { TAccountTrieNodeKey, TNibble } from 'portalnetwork'

export const genesisContent = async (
  trie: Trie,
): Promise<{
  leafNodeContent: [string, Uint8Array][]
  trieNodeContent: [string, Uint8Array][]
  nodePaths: Record<string, { nodeBytes: Uint8Array; nibbles: TNibble[] }>
}> => {
  const nodePaths: Record<string, { nodeBytes: Uint8Array; nibbles: TNibble[] }> = {}
  await trie.walkAllNodes(async (node, key) => {
    const nodeBytes = node.serialize()
    const node_hash = trie['hash'](nodeBytes)
    const nibbles = key.map((n) => n.toString(16)) as TNibble[]
    nodePaths[toHexString(node_hash)] = { nodeBytes, nibbles }
  })

  const proofs = await Promise.all(
    Object.keys(mainnet.alloc).map(async (add) => {
      const address = '0x' + padToEven(add)
      const leafproof = await trie.createProof(fromHexString(address))
      return { address, leafproof }
    }),
  )
  const leafProofs: [Uint8Array, { nibbles: string[]; proof: Uint8Array[] }][] = proofs.map(
    ({ address, leafproof }) => {
      const addressPath = bytesToUnprefixedHex(trie['hash'](fromHexString(address))).split('')
      const nodePath: string[] = []
      for (const p of leafproof.slice(0, -1)) {
        const node = decodeNode(p)
        if (node instanceof ExtensionNode) {
          nodePath.push(...addressPath.splice(0, node.keyLength()))
        } else {
          nodePath.push(addressPath.shift()!)
        }
      }
      const leafNode = decodeNode(leafproof[leafproof.length - 1]) as LeafNode
      if (addressPath.length !== leafNode.keyLength()) {
        throw new Error(`${addressPath.length} !== ${leafNode.keyLength()}`) // keyLength where keyLength is Uint8
      }
      const nodehash = trie['hash'](leafproof[leafproof.length - 1])
      return [nodehash, { nibbles: nodePath, proof: leafproof }]
    },
  )
  const allProofs: Record<string, { nibbles: TNibble[]; proof: Uint8Array[] }> = {}
  for (const [_, { proof }] of leafProofs) {
    for (const [idx, n] of proof.slice(0, -1).entries()) {
      const hash = toHexString(trie['hash'](n))
      if (hash in allProofs) continue
      const nodeProof = proof.slice(0, idx + 1)
      const nodeNibbles: TNibble[] = nodePaths[hash].nibbles
      allProofs[hash] = { nibbles: nodeNibbles, proof: nodeProof }
    }
  }
  const leafNodeContent: [string, Uint8Array][] = leafProofs.map(
    ([nodeHash, { nibbles, proof }]) => {
      const path = packNibbles(nibbles as TNibble[])
      const key: TAccountTrieNodeKey = {
        nodeHash,
        path,
      }
      const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
      const content = AccountTrieNodeOffer.serialize({
        blockHash: fromHexString(
          '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
        ),
        proof,
      })
      return [contentKey, content]
    },
  )
  const trieNodeContent: [string, Uint8Array][] = Object.entries(allProofs).map(
    ([nodeHash, { nibbles, proof }]) => {
      const path = packNibbles(nibbles as TNibble[])
      const key: TAccountTrieNodeKey = {
        nodeHash: fromHexString(nodeHash),
        path,
      }
      const contentKey = toHexString(AccountTrieNodeContentKey.encode(key))
      const content = AccountTrieNodeOffer.serialize({
        blockHash: fromHexString(
          '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
        ),
        proof,
      })
      return [contentKey, content]
    },
  )

  return { leafNodeContent, trieNodeContent, nodePaths }
}

export const sortedById = (
  {
    leafNodeContent,
    trieNodeContent,
  }: {
    leafNodeContent: [string, Uint8Array][]
    trieNodeContent: [string, Uint8Array][]
  },
  clients: { nodeId: string; radius: bigint }[],
): Record<string, { contentKey: string; content: Uint8Array }[]> => {
  const trieNodes: Record<string, { contentKey: string; content: Uint8Array }[]> =
    Object.fromEntries(clients.map(({ nodeId }) => [nodeId, []]))
  const allContent = [...leafNodeContent, ...trieNodeContent]
  for (const [contentKey, contentBytes] of allContent) {
    const contentId = new Trie({ useKeyHashing: true })['hash'](fromHexString(contentKey))
    for (const { nodeId, radius } of clients) {
      const d = distance(nodeId.slice(2), bytesToUnprefixedHex(contentId))
      if (d < radius) {
        const { proof } = AccountTrieNodeOffer.deserialize(contentBytes)
        const nodeContent = AccountTrieNodeRetrieval.serialize({
          node: proof[proof.length - 1],
        })
        trieNodes[nodeId].push({ contentKey, content: nodeContent })
      }
    }
  }
  return trieNodes
}

export const populateGenesisDB = async (
  trie: Trie,
  clients: { nodeId: string; radius: bigint }[],
): Promise<{
  statedbs: Record<string, Map<string, string>>
  sortedNodeHashByClient: Record<string, { contentKey: string; content: Uint8Array }[]>
}> => {
  const statedbs: Record<string, Map<string, string>> = Object.fromEntries(
    clients.map((client) => [client.nodeId, new Map()]),
  )
  const { leafNodeContent, trieNodeContent } = await genesisContent(trie)
  //   const nodeIdRadius = networks.map((n) => {
  //     return { nodeId: n.enr.nodeId, radius: n.nodeRadius }
  //   })
  const sortedNodeHashByClient = sortedById({ leafNodeContent, trieNodeContent }, clients)
  for (const [nodeId, contents] of Object.entries(sortedNodeHashByClient)) {
    const db = statedbs[nodeId]
    for (const { contentKey, content } of contents) {
      db.set(contentKey, toHexString(content))
    }
  }
  return { sortedNodeHashByClient, statedbs }
}

const main = async () => {
  const trie = await genesisStateTrie()
  console.log('trie', toHexString(trie.root()))
  const content = await genesisContent(trie)
  console.log('content', content.leafNodeContent.length)
}

main().catch(console.error)
