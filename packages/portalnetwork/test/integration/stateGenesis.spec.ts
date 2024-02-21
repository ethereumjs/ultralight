import { SignableENR, distance } from '@chainsafe/discv5'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { ExtensionNode, Trie, decodeNode } from '@ethereumjs/trie'
import { Account, bytesToUnprefixedHex, padToEven } from '@ethereumjs/util'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  NetworkId,
  PortalNetwork,
  TransportLayer,
  tightlyPackNibbles,
} from '../../src/index.js'
import { genesisStateTrie, mainnet } from '../../src/networks/state/genesis.js'

import type { StateNetwork, TAccountTrieNodeKey, TNibble } from '../../src/index.js'
import type { StateDB } from '../../src/networks/state/statedb.js'
import type { LeafNode } from '@ethereumjs/trie'

const genesisContent = async (
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
    const nibbles = key as TNibble[]
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
      const path = tightlyPackNibbles(nibbles as TNibble[])
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
      const path = tightlyPackNibbles(nibbles as TNibble[])
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

const sortedById = (
  {
    leafNodeContent,
    trieNodeContent,
  }: {
    leafNodeContent: [string, Uint8Array][]
    trieNodeContent: [string, Uint8Array][]
  },
  clients: { nodeId: string; radius: bigint }[],
): Record<string, Uint8Array[]> => {
  const trieNodes: Record<string, Uint8Array[]> = Object.fromEntries(
    clients.map(({ nodeId }) => [nodeId, []]),
  )
  const allContent = [...leafNodeContent, ...trieNodeContent]
  for (const [contentKey] of allContent) {
    const contentId = new Trie({ useKeyHashing: true })['hash'](fromHexString(contentKey))
    for (const { nodeId, radius } of clients) {
      const d = distance(nodeId, bytesToUnprefixedHex(contentId))
      if (d < radius) {
        const { nodeHash } = AccountTrieNodeContentKey.decode(fromHexString(contentKey))
        trieNodes[nodeId].push(nodeHash)
      }
    }
  }
  return trieNodes
}

const populateGenesisDB = async (trie: Trie, networks: StateNetwork[]) => {
  const statedbs: Record<string, StateDB> = Object.fromEntries(
    networks.map((network) => [network.enr.nodeId, network.stateDB]),
  )
  const { leafNodeContent, trieNodeContent, nodePaths } = await genesisContent(trie)
  const nodeIdRadius = networks.map((n) => {
    return { nodeId: n.enr.nodeId, radius: n.nodeRadius }
  })
  const sortedNodeHashByClient = sortedById({ leafNodeContent, trieNodeContent }, nodeIdRadius)
  for (const [nodeId, nodeHashes] of Object.entries(sortedNodeHashByClient)) {
    const db = statedbs[nodeId].db
    for (const nodeHash of nodeHashes) {
      await db.put(
        bytesToUnprefixedHex(nodeHash),
        bytesToUnprefixedHex(nodePaths[toHexString(nodeHash)].nodeBytes),
      )
    }
  }
  return sortedNodeHashByClient
}
const connectNetwork = async (networks: StateNetwork[], clients: PortalNetwork[]) => {
  for (const [idx, network] of networks.entries()) {
    const pong1 = await network.sendPing(clients[(idx + 1) % clients.length].discv5.enr.toENR())
    const pong2 = await network.sendPing(clients[(idx + 2) % clients.length].discv5.enr.toENR())
    it(`client ${idx} connects to network`, async () => {
      expect(pong1).toBeDefined()
      expect(pong2).toBeDefined()
      let storedEnr = networks[(idx + 1) % clients.length].routingTable.getWithPending(
        network.enr.nodeId,
      )
      assert.equal(
        storedEnr?.value.nodeId,
        network.enr.nodeId,
        'found another node that supports state network',
      )
      storedEnr = networks[(idx + 2) % clients.length].routingTable.getWithPending(
        network.enr.nodeId,
      )
      assert.equal(
        storedEnr?.value.nodeId,
        network.enr.nodeId,
        'found another node that supports state network',
      )
    })
  }
}

describe('genesisContent', async () => {
  const trie = await genesisStateTrie()
  const result = await genesisContent(trie)
  it('should have proofs for all accounts', async () => {
    expect(result.leafNodeContent.length).toEqual(Object.keys(mainnet.alloc).length)
  })
  const t = new Trie({ useKeyHashing: true })
  let valid = 0
  let invalid = 0
  for (const leaf of result.leafNodeContent) {
    const [key, value] = leaf
    const contentKey = AccountTrieNodeContentKey.decode(fromHexString(key))
    const deserialized = AccountTrieNodeOffer.deserialize(value)
    const r = t['hash'](deserialized.proof[0])
    const l = t['hash'](deserialized.proof[deserialized.proof.length - 1])
    try {
      assert.deepEqual(
        deserialized.blockHash,
        fromHexString('0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'),
      )
      assert.deepEqual(contentKey.nodeHash, l)
      assert.deepEqual(
        r,
        fromHexString('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'),
      )
      valid++
    } catch {
      invalid++
    }
    for (const p of deserialized.proof) {
      await t.database().put(t['hash'](p), p)
    }
  }
  it('should have valid proofs for all accounts', async () => {
    expect(valid).toEqual(8893)
  })
  it('should have no invalid proofs for all accounts', async () => {
    expect(invalid).toEqual(0)
  })
  t.root(fromHexString('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'))
  let fails = 0
  let pass = 0
  for await (const [add, bal] of Object.entries(mainnet.alloc)) {
    const address = '0x' + padToEven(add)
    const accountVal = await t.get(fromHexString(address))
    try {
      const account = Account.fromRlpSerializedAccount(accountVal!)
      expect(account.balance).toEqual(BigInt(bal.balance))
      pass++
    } catch (err: any) {
      fails++
    }
  }
  it('should never fail', () => {
    expect(fails).toBe(0)
  })
  it('should all pass', () => {
    expect(pass).toBe(8893)
  })
})

