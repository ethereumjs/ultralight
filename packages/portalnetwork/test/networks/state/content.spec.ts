import { fromHexString, toHexString } from '@chainsafe/ssz'
import { RLP } from '@ethereumjs/rlp'
import { Trie, decodeNode } from '@ethereumjs/trie'
import { Account, padToEven } from '@ethereumjs/util'
import { readFileSync } from 'fs'
import { assert, describe, expect, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  StorageTrieNodeContentKey,
  StorageTrieNodeOffer,
} from '../../../src/networks/state/index.js'

import type { LeafNode, TrieNode } from '@ethereumjs/trie'

describe('Account Trie Node Content Type', async () => {
  const genesisBlock = {
    stateRoot: '0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544',
    blockHash: '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
  }
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

interface ITrieNodeContent {
  contentKey: Uint8Array
  content: Uint8Array
}
interface IValueNodeContent extends ITrieNodeContent {
  address: string
  nodeHash: Uint8Array
  key: string
  value: string
}

interface IContent {
  address: string
  blockNumber: string
  blockHash: string
  stateRoot: string
  storageHash: string
  codeHash: string
  balance: string
  nonce: string
  storageProofs: { key: string; value: string; proof: string[] }[]
  accountProof: string[]
  valueNodeContents: IValueNodeContent[]
  trieNodeContents: ITrieNodeContent[]
}

describe('Storage Trie Node Content Type', async () => {
  const stored = readFileSync('./test/networks/state/testdata/sampleStorageContent.json', {
    encoding: 'utf8',
  })
  const storedContent: IContent = JSON.parse(stored)
  // console.log({ storedContent })
  const { address, stateRoot, storageHash, blockHash } = storedContent
  it('should load sample contents', async () => {
    expect(storedContent.valueNodeContents.length).toEqual(10)
    expect(storedContent.trieNodeContents.length).toEqual(46)
  })
  for (const c of storedContent.valueNodeContents) {
    const { contentKey, content, nodeHash, value } = c
    const decodedKey = StorageTrieNodeContentKey.decode(Uint8Array.from(Object.values(contentKey)))
    it('should decode content key', () => {
      expect(decodedKey).toBeDefined()
    })
    it('should decode to key obj', () => {
      expect(toHexString(decodedKey.address)).toEqual(address.toLowerCase())
      expect(toHexString(decodedKey.nodeHash)).toEqual(nodeHash)
    })
    const decodedContent = StorageTrieNodeOffer.deserialize(Uint8Array.from(Object.values(content)))
    it('should deserialize content', () => {
      expect(decodedContent).toBeDefined()
    })
    it('should contain blockhash', () => {
      expect(toHexString(decodedContent.blockHash)).toEqual(blockHash)
    })
    it('should contain storage proof', () => {
      expect(decodedContent.storageProof.length).toBeGreaterThan(0)
    })
    it('should contain storage trie root', () => {
      const storageRootNode = decodedContent.storageProof[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](storageRootNode)
      assert.deepEqual(nodeHash, fromHexString(storageHash))
    })
    it('should contain value trie node', () => {
      const valueNode = decodedContent.storageProof.slice(-1)[0]
      const node = decodeNode(valueNode) as LeafNode
      try {
        assert.deepEqual(RLP.decode(node.value()), fromHexString('0x' + padToEven(value.slice(2))))
      } catch (err: any) {
        throw new Error(`${err.message}\n${value}`)
      }
    })
    it('should contain expected trie node', () => {
      const expectedNode = decodedContent.storageProof.slice(-1)[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](expectedNode)
      assert.deepEqual(nodeHash, decodedKey.nodeHash)
    })
    it('should contain account proof', () => {
      expect(decodedContent.accountProof).toBeDefined()
      expect(decodedContent.accountProof.length).toBeGreaterThan(0)
    })
    it('account proof should contain state root node', () => {
      const stateRootNode = decodedContent.accountProof[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](stateRootNode)
      assert.deepEqual(nodeHash, fromHexString(stateRoot))
    })
    it('account proof should contain account trie node', () => {
      const accountTrieNode = decodedContent.accountProof.slice(-1)[0]
      const node = decodeNode(accountTrieNode)
      const accountRLP = node.value()!
      const account = Account.fromRlpSerializedAccount(accountRLP)
      assert.deepEqual(account.storageRoot, fromHexString(storageHash))
    })
  }
  for (const c of storedContent.trieNodeContents) {
    const { contentKey, content } = c
    const decodedKey = StorageTrieNodeContentKey.decode(Uint8Array.from(Object.values(contentKey)))
    const decodedContent = StorageTrieNodeOffer.deserialize(Uint8Array.from(Object.values(content)))
    it('should decode content key', () => {
      expect(decodedKey).toBeDefined()
    })
    it('should decode to key obj', () => {
      expect(toHexString(decodedKey.address)).toEqual(address.toLowerCase())
    })
    it('should deserialize content', () => {
      expect(decodedContent).toBeDefined()
    })
    it('should contain blockhash', () => {
      expect(toHexString(decodedContent.blockHash)).toEqual(blockHash)
    })
    it('should contain storage proof', () => {
      expect(decodedContent.storageProof.length).toBeGreaterThan(0)
    })
    it('should contain storage trie root', () => {
      const storageRootNode = decodedContent.storageProof[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](storageRootNode)
      assert.deepEqual(nodeHash, fromHexString(storageHash))
    })
    it('should contain expected trie node', () => {
      const expectedNode = decodedContent.storageProof.slice(-1)[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](expectedNode)
      assert.deepEqual(nodeHash, decodedKey.nodeHash)
    })
    it('should contain account proof', () => {
      expect(decodedContent.accountProof).toBeDefined()
      expect(decodedContent.accountProof.length).toBeGreaterThan(0)
    })
    it('account proof should contain state root node', () => {
      const stateRootNode = decodedContent.accountProof[0]
      const nodeHash = new Trie({ useKeyHashing: true })['hash'](stateRootNode)
      assert.deepEqual(nodeHash, fromHexString(stateRoot))
    })
    it('account proof should contain account trie node', () => {
      const accountTrieNode = decodedContent.accountProof.slice(-1)[0]
      const node = decodeNode(accountTrieNode)
      const accountRLP = node.value()!
      const account = Account.fromRlpSerializedAccount(accountRLP)
      assert.deepEqual(account.storageRoot, fromHexString(storageHash))
    })
  }

  it('should find expected values in sparse storage trie', async () => {
    const storageTrie = new Trie({ useKeyHashing: true, root: fromHexString(storageHash) })
    for (const { content } of storedContent.valueNodeContents) {
      const decodedContent = StorageTrieNodeOffer.deserialize(
        Uint8Array.from(Object.values(content)),
      )
      for (const bytes of decodedContent.storageProof) {
        await storageTrie.database().put(new Trie({ useKeyHashing: true })['hash'](bytes), bytes)
      }
    }
    storageTrie.root(fromHexString(storageHash))
    for (const { key, value } of storedContent.valueNodeContents) {
      const res = await storageTrie.get(fromHexString(key))
      if (res) {
        assert.deepEqual(fromHexString('0x' + padToEven(value.slice(2))), RLP.decode(res))
      } else {
        assert.equal(value, '0x')
      }
    }
  })
})

describe.skip('Contract Code Content Type', async () => {})
