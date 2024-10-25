import { bytesToHex, hexToBytes } from '@chainsafe/ssz'
import { Block } from '@ethereumjs/block'
import { BranchNode, Trie } from '@ethereumjs/trie'
import { Account, bytesToUnprefixedHex, padToEven } from '@ethereumjs/util'
import { assert, describe, expect, it } from 'vitest'

import { AccountTrieNodeContentKey, AccountTrieNodeOffer, packNibbles } from '../../src/index.js'
import { genesisStateTrie, mainnet } from '../../src/networks/state/genesis.js'

import rawBlocks from './testdata/rawBlocks.json'
import { connectNetwork, genesisContent, getClients, getVM, populateGenesisDB } from './util.js'

import type { TNibble } from '../../src/index.js'
import type { LeafNode } from '@ethereumjs/trie'

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
    const contentKey = AccountTrieNodeContentKey.decode(hexToBytes(key))
    const deserialized = AccountTrieNodeOffer.deserialize(value)
    const r = t['hash'](deserialized.proof[0])
    const l = t['hash'](deserialized.proof[deserialized.proof.length - 1])
    try {
      assert.deepEqual(
        deserialized.blockHash,
        hexToBytes('0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'),
      )
      assert.deepEqual(contentKey.nodeHash, l)
      assert.deepEqual(
        r,
        hexToBytes('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'),
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
  t.root(hexToBytes('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'))
  let fails = 0
  let pass = 0
  for await (const [add, bal] of Object.entries(mainnet.alloc)) {
    const address = '0x' + padToEven(add)
    const accountVal = await t.get(hexToBytes(address))
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

describe('genesisDevnet', async () => {
  const { clients, networks } = await getClients(3022)
  const trie = await genesisStateTrie()
  const sortedNodeHashByClient = await populateGenesisDB(trie, networks)
  const hasRoot = Object.entries(sortedNodeHashByClient)
    .filter(([_, nodeHashes]) =>
      nodeHashes.map((h) => bytesToHex(h)).includes(bytesToHex(trie.root())),
    )
    .map(([nodeId, _]) => nodeId)
  it('should store root in some clients', () => {
    expect(hasRoot.length).toBeGreaterThan(0)
    expect(hasRoot.length).toBeLessThanOrEqual(clients.length)
  })

  const storedTrieNodes = Object.entries(sortedNodeHashByClient)
    .map(([_, trieNodes]) => {
      return trieNodes.map((node) => bytesToHex(node))
    })
    .flat()
  const uniqueStoredTrieNodes = Array.from(new Set(storedTrieNodes))
  it('should distribute all nodes', () => {
    expect(uniqueStoredTrieNodes.length).toEqual(12356)
  })

  await connectNetwork(networks, clients)
  await new Promise((r) => setTimeout(r, 1000))

  const storedKeys: Record<string, string[]> = {}

  for (const network of networks) {
    storedKeys[network.enr.nodeId] = []
    const dbKeys = network.stateDB.db.db.keys()
    for await (const key of dbKeys) {
      storedKeys[network.enr.nodeId].push(key)
    }
  }

  const allKeys = Object.values(storedKeys).flat()
  const uniqueKeys = Array.from(new Set(allKeys))

  it(`should store ${allKeys.length} keys in network`, () => {
    expect(allKeys.length).toBeGreaterThan(0)
  })
  it(`Should store 12356 unique keys`, () => {
    expect(uniqueKeys.length).toEqual(12356)
  })
  for (let i = 0; i < 20; i++) {
    const testClient = networks[i % networks.length]
    const testAddress = Object.keys(mainnet.alloc)[Math.floor(Math.random() * 8893)]
    const found = await testClient.getAccount('0x' + testAddress, trie.root())
    const foundAccount = Account.fromRlpSerializedAccount(found!)
    it(`client {${i % networks.length}} should find account balance for addr: ${testAddress.slice(
      0,
      8,
    )}...`, async () => {
      expect(foundAccount.balance).toBeGreaterThan(0n)
      assert.deepEqual(
        foundAccount.balance,
        // @ts-ignore disregard string index type complaints since we can't easily configure a giant list of addresses as a type
        BigInt(mainnet.alloc[testAddress].balance),
        'account data found',
      )
    })
    const emptyTemp = [...testClient.stateDB.db.temp.keys()]
    it('should empty temp node map', () => {
      expect(emptyTemp.length).toEqual(0)
    })
  }
})
describe('execute Block 1', async () => {
  const { networks, clients } = await getClients(3028)
  const trie = await genesisStateTrie()
  const sortedNodeHashByClient = await populateGenesisDB(trie, networks)
  const hasRoot = Object.entries(sortedNodeHashByClient)
    .filter(([_, nodeHashes]) =>
      nodeHashes.map((h) => bytesToHex(h)).includes(bytesToHex(trie.root())),
    )
    .map(([nodeId, _]) => nodeId)
  it('should store root in some clients', () => {
    expect(hasRoot.length).toBeGreaterThan(0)
    expect(hasRoot.length).toBeLessThanOrEqual(clients.length)
  })

  const storedTrieNodes = Object.entries(sortedNodeHashByClient)
    .map(([_, trieNodes]) => {
      return trieNodes.map((node) => bytesToHex(node))
    })
    .flat()
  const uniqueStoredTrieNodes = Array.from(new Set(storedTrieNodes))
  it('should distribute all nodes', () => {
    expect(uniqueStoredTrieNodes.length).toEqual(12356)
  })

  await connectNetwork(networks, clients)
  await new Promise((r) => setTimeout(r, 1000))
  const vm = await getVM()
  const stateroot = await vm.stateManager.getStateRoot()
  it('should start VM with genesis state', () => {
    assert.deepEqual(stateroot, trie.root(), 'genesis state is loaded')
  })

  const block1raw = rawBlocks.block1raw
  const block = Block.fromRLPSerializedBlock(hexToBytes(block1raw), { setHardfork: true })

  const runResult = await vm.runBlock({
    block,
  })

  it('should run block', () => {
    assert.deepEqual(
      runResult.stateRoot,
      block.header.stateRoot,
      'successfully updates state from block',
    )
  })
  const _portalRunResult = await networks[0].runBlock(stateroot, block, {
    block,
  })
  it('should match gas used ' + runResult.gasUsed, async () => {
    expect(runResult.gasUsed).toEqual(_portalRunResult.gasUsed)
  })
  it('should match', () => {
    assert.deepEqual(runResult.receiptsRoot, _portalRunResult.receiptsRoot)
    assert.equal(runResult.results.length, _portalRunResult.results.length)
  })
  const minerAddress = block.header.coinbase
  const minerAccount = new Account()
  const minerReward = BigInt('0x4563918244f40000')
  const niblingReward = minerReward / BigInt(32)
  const totalNiblingReward = niblingReward * BigInt(0)
  const reward = minerReward + totalNiblingReward
  minerAccount.balance += reward
  const findMinerPath = await networks[0].findPath(stateroot, minerAddress.toString())
  it('should find path for not existant address', () => {
    expect(findMinerPath.node).toBeNull()
    expect(findMinerPath.stack.length).toBeGreaterThan(0)
    expect(findMinerPath.remaining.length).toBeGreaterThan(0)
  })
  const prooftrie = new Trie({ useKeyHashing: true })
  await prooftrie.fromProof(findMinerPath.stack.map((n) => n.serialize()))
  prooftrie.root(stateroot)

  await prooftrie.put(minerAddress.bytes, minerAccount.serialize())

  it('should calculate new state root', async () => {
    assert.equal(
      bytesToHex(prooftrie.root()),
      bytesToHex(block.header.stateRoot),
      'successfully updates state from block',
    )
  })
  const minerPath = prooftrie['hash'](minerAddress.bytes)
  const newNodes = await prooftrie.findPath(minerPath)
  let consumed = 0
  for (const s of newNodes.stack.slice(0, -1)) {
    consumed += s instanceof BranchNode ? 1 : s.keyLength()
  }
  const minerNibbles = bytesToUnprefixedHex(minerPath).slice(0, consumed).split('')
  it('should find all new nodes', () => {
    expect(newNodes.node).toBeDefined()
    expect(newNodes.remaining.length).toEqual(0)
    expect(newNodes.stack.length).toEqual(4)
    expect((<LeafNode>newNodes.node).keyLength()).toEqual(64 - consumed)
  })
  const newLeafKey = AccountTrieNodeContentKey.encode({
    nodeHash: prooftrie['hash'](newNodes.node!.serialize()),
    path: packNibbles(minerNibbles as TNibble[]),
  })
  const newLeafOffer = AccountTrieNodeOffer.serialize({
    blockHash: block.hash(),
    proof: newNodes.stack.map((n) => n.serialize()),
  })
  await networks[0].gossipContent(newLeafKey, newLeafOffer)
  await new Promise((res) => setTimeout(res, 1000))
  const retrievedAccount = await networks[Math.floor(Math.random() * networks.length)].getAccount(
    minerAddress.toString(),
    block.header.stateRoot,
  )
  it('should retrive miner balance after leafnode gossip update', () => {
    const retrievedMiner = Account.fromRlpSerializedAccount(retrievedAccount!)
    expect(retrievedMiner.balance).toEqual(reward)
  })
})
