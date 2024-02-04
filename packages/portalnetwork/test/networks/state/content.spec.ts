import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Trie, decodeNode } from '@ethereumjs/trie'
import { readFileSync } from 'fs'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
} from '../../../src/networks/state/index.js'

import type { TrieNode } from '@ethereumjs/trie'

const genesisBlock = {
  stateRoot: '0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544',
  blockHash: '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
}

describe('Account Trie Node Content Type', async () => {
  const _accountNodeSamples: [string, Uint8Array][] = JSON.parse(
    readFileSync('./test/networks/state/testdata/accountNodeSamples.json', {
      encoding: 'utf-8',
    }),
  )
  const samples = Object.fromEntries(
    _accountNodeSamples.map(([k, v]) => {
      return [k, Uint8Array.from(Object.values(v))]
    }),
  )

  const decoded = Object.entries(samples).map(([k, v]) => {
    const key = AccountTrieNodeContentKey.decode(fromHexString(k))
    const des = AccountTrieNodeOffer.deserialize(v)
    return {
      nodeHash: toHexString(key.nodeHash),
      path: key.path,
      blockHash: toHexString(des.blockHash),
      proof: des.proof.map((node) => decodeNode(node)),
    }
  })

  const sampleTrie = new Trie({ useKeyHashing: true })
  const allNodes = decoded
    .map((sample) => {
      return sample.proof.map((node) => toHexString(node.serialize()))
    })
    .flat()
  const uniqueNodes = Array.from(new Set(allNodes))
  const trieNodes: [Uint8Array, Uint8Array][] = uniqueNodes.map((bytes) => {
    const rlp = fromHexString(bytes)
    const nodeHash = sampleTrie['hash'](rlp)
    return [nodeHash, rlp]
  })
  for (const [hash, rlp] of trieNodes) {
    await sampleTrie.database().put(hash, rlp)
  }
  sampleTrie.root(fromHexString(genesisBlock.stateRoot))

  const addrs: string[] = [
    '0xae34861d342253194ffc6652dfde51ab44cad3fe',
    '0xe6115b13f9795f7e956502d5074567dab945ce6b',
  ]

  const found: [number[], TrieNode][] = []
  await sampleTrie.walkAllNodes(async (node, key) => {
    found.push([key, node])
  })
  it('should find all nodes', () => {
    expect(found.length).toEqual(uniqueNodes.length)
  })

  it('should import samples', () => {
    expect(_accountNodeSamples.length).toEqual(6)
  })
  for (const sample of decoded) {
    it('should have genesis blockHash', () => {
      expect(sample.blockHash).toEqual(genesisBlock.blockHash)
    })
    it('first node in proof should be rootnode', () => {
      expect(new Trie({ useKeyHashing: true })['hash'](sample.proof[0].serialize()))
    })
    it('last node in proof should be target node', () => {
      expect(sampleTrie['hash'](sample.proof[sample.proof.length - 1].serialize()))
    })
  }
  for (const [i, { proof }] of decoded.slice(-2).entries()) {
    const _proof = await sampleTrie.createProof(fromHexString(addrs[i]))
    it('trie should produce same proof as sample content', () => {
      assert.equal(_proof.length, proof.length)
      assert.deepEqual(
        _proof,
        proof.map((n) => n.serialize()),
      )
    })
  }
})

describe.skip('Storage Trie Node Content Type', async () => {})

describe.skip('Contract Code Content Type', async () => {})
