/* eslint-disable @typescript-eslint/no-unused-vars */
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { Trie } from '@ethereumjs/trie'
import { Account, equalsBytes, padToEven } from '@ethereumjs/util'
import jayson from 'jayson/promise/index.js'
import { AccountTrieNodeContentKey, AccountTrieNodeOffer, packNibbles } from 'portalnetwork'
import { genesisStateTrie, mainnet } from 'portalnetwork/src/networks/state/genesis.js'
// import {
//   connectNetwork,
//   // genesisContent,
//   getClients,
//   populateGenesisDB,
//   protoBufs,
// } from 'portalnetwork/test/integration/util.js'

import { genesisContent, populateGenesisDB } from './genContent.js'

import type { HttpClient } from 'jayson/promise/index.js'

const { Client } = jayson

/**
 * start devnet with 5 clients with preset node_ids
 * npx ts-node --esm scripts/devnet.ts --numNodes=5 --port=8545 --networks=state --pks=./scripts/genesisTestPk.txt --radius=254
 */

const testClients = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const ultralight = Client.http({ host: '192.168.86.29', port: 8545 + i })
    const ultralightENR = await ultralight.request('discv5_nodeInfo', [])
    ultralights.push(ultralight)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
  }
  const expected = [
    '0x7f25da43800c127e14bf9b2e7e489a21a5604102ff1a08d9770cef66cb385348',
    '0x868e660cff788cc2b3730c3950268f3174fb1ed6358a45903de1b324aeaa93c9',
    '0xcce2eafc5d16a580c82fc87c31a04a915a11274df2cfa3da0f05ee6093988ef0',
    '0x10802e629d0780024809d28265358a98f81869d762ee2d6f9c63abb3c229876a',
    '0x1232872dc0e5742157536251fca0455a9a1cfab967623731b2555e56d9bca65d',
  ]

  console.log(nodeIds)
  console.log(JSON.stringify(nodeIds) === JSON.stringify(expected))
  const trie = await genesisStateTrie()
  const result = await genesisContent(trie)

  // it('should have proofs for all accounts', async () => {
  //   expect(result.leafNodeContent.length).toEqual(Object.keys(mainnet.alloc).length)
  // })
  console.log(
    result.leafNodeContent.length === Object.keys(mainnet.alloc).length,
    'should have proofs for all accounts',
  )

  const t = new Trie({ useKeyHashing: true })
  const valid = {
    blockHash: 0,
    nodeHash: 0,
    rootHash: 0,
  }
  const invalid = {
    blockHash: 0,
    nodeHash: 0,
    rootHash: 0,
  }
  for (const leaf of result.leafNodeContent) {
    const [key, value] = leaf
    const contentKey = AccountTrieNodeContentKey.decode(fromHexString(key))
    const deserialized = AccountTrieNodeOffer.deserialize(value)
    const r = t['hash'](deserialized.proof[0])
    const l = t['hash'](deserialized.proof[deserialized.proof.length - 1])
    if (
      toHexString(deserialized.blockHash) ===
      '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'
    ) {
      valid.blockHash++
    } else {
      invalid.blockHash++
    }
    if (equalsBytes(contentKey.nodeHash, l)) {
      valid.nodeHash++
    } else {
      invalid.nodeHash++
    }
    if (
      equalsBytes(
        r,
        fromHexString('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'),
      )
    ) {
      valid.rootHash++
    } else {
      invalid.rootHash++
    }
    for (const p of deserialized.proof) {
      await t.database().put(t['hash'](p), p)
    }
  }
  console.log({ valid, invalid })
  // it('should have valid proofs for all accounts', async () => {
  //   expect(valid).toEqual(8893)
  // })
  // it('should have no invalid proofs for all accounts', async () => {
  //   expect(invalid).toEqual(0)
  // })
  t.root(fromHexString('0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544'))
  let fails = 0
  let pass = 0
  for await (const [add, bal] of Object.entries(mainnet.alloc)) {
    const address = '0x' + padToEven(add)
    const accountVal = await t.get(fromHexString(address))
    try {
      const account = Account.fromRlpSerializedAccount(accountVal!)
      // console.log(account, bal)
      // expect(account.balance).toEqual(BigInt(bal.balance))
      if (account.balance === BigInt(bal.balance)) {
        pass++
      } else {
        fails++
      }
    } catch (err: any) {
      fails++
    }
  }
  // it('should never fail', () => {
  //   expect(fails).toBe(0)
  // })
  // it('should all pass', () => {
  //   expect(pass).toBe(8893)
  // })
  console.log({
    pass,
    fails,
  })
}

const testDBs = async () => {
  const ultralights: HttpClient[] = []
  const enrs: string[] = []
  const nodeIds: string[] = []
  const radius = 2n ** 254n
  const clients: { enr: string; nodeId: string; radius: bigint; rpc: HttpClient }[] = []
  for (let i = 0; i < 5; i++) {
    const ultralight = Client.http({ host: '192.168.86.29', port: 8545 + i })
    const ultralightENR = await ultralight.request('discv5_nodeInfo', [])
    ultralights.push(ultralight)
    enrs.push(ultralightENR.result.enr)
    nodeIds.push(ultralightENR.result.nodeId)
    clients.push({
      enr: ultralightENR.result.enr,
      nodeId: ultralightENR.result.nodeId,
      radius,
      rpc: ultralight,
    })
  }
  const expected = [
    '0x7f25da43800c127e14bf9b2e7e489a21a5604102ff1a08d9770cef66cb385348',
    '0x868e660cff788cc2b3730c3950268f3174fb1ed6358a45903de1b324aeaa93c9',
    '0xcce2eafc5d16a580c82fc87c31a04a915a11274df2cfa3da0f05ee6093988ef0',
    '0x10802e629d0780024809d28265358a98f81869d762ee2d6f9c63abb3c229876a',
    '0x1232872dc0e5742157536251fca0455a9a1cfab967623731b2555e56d9bca65d',
  ]

  console.log(nodeIds)
  console.log(JSON.stringify(nodeIds) === JSON.stringify(expected))
  const trie = await genesisStateTrie()

  const { sortedNodeHashByClient, statedbs } = await populateGenesisDB(trie, clients)
  const allKeys = new Set(
    Object.values(statedbs)
      .map((db) => {
        return [...db.keys()]
      })
      .flat(),
  )
  console.log('all keys:', allKeys.size)
  console.log('statedbs:')
  for (const [k, db] of Object.entries(statedbs)) {
    console.log(k, db.size)
  }
  const hasRoot = Object.entries(sortedNodeHashByClient)
    .filter(([_, contents]) =>
      contents
        .map(({ contentKey }) =>
          toHexString(AccountTrieNodeContentKey.decode(fromHexString(contentKey)).nodeHash),
        )
        .includes(toHexString(trie.root())),
    )
    .map(([nodeId, _]) => nodeId)
  console.log('trie root', toHexString(trie.root()))
  console.log('rootnode stored in', hasRoot.length)
  const found = Object.fromEntries(clients.map(({ nodeId }) => [nodeId, { pass: 0, fail: 0 }]))
  for (const client of clients) {
    const db = statedbs[client.nodeId]
    console.log(client.nodeId, 'db size: ', db.size)
    for await (const [key, value] of db.entries()) {
      await client.rpc.request('portal_stateStore', [key, value])
    }
  }
  // for (const client of clients) {
  //   const db = statedbs[client.nodeId]
  //   for await (const [key, value] of db.entries()) {
  //     const res = await client.rpc.request('portal_stateLocalContent', [key])
  //     if (res.result === value) {
  //       found[client.nodeId].pass++
  //     } else {
  //       found[client.nodeId].fail++
  //     }
  //   }
  //   console.log('found', found[client.nodeId])
  // }
  // it('should store root in some clients', () => {
  //   expect(hasRoot.length).toBeGreaterThan(0)
  //   expect(hasRoot.length).toBeLessThanOrEqual(clients.length)
  // })
  for (const [idx, client] of clients.entries()) {
    for (const [_idx, _client] of clients.slice(idx + 1).entries()) {
      const pong = await client.rpc.request('portal_statePing', [_client.enr])
      console.log(`client ${idx} pinged client ${idx + _idx + 1}`, pong.result)
    }
  }
  for (const client of clients) {
    const rootKey = AccountTrieNodeContentKey.encode({
      nodeHash: trie.root(),
      path: packNibbles([]),
    })
    const retrieveRoot = await client.rpc.request('portal_stateRecursiveFindContent', [
      toHexString(rootKey),
    ])
    console.log(retrieveRoot.result)
  }
}

// const testB = async () => {
//   const { clients, networks } = await getClients(3022)
//   const trie = await genesisStateTrie()
//   const sortedNodeHashByClient = await populateGenesisDB(trie, networks)
//   const hasRoot = Object.entries(sortedNodeHashByClient)
//     .filter(([_, nodeHashes]) =>
//       nodeHashes.map((h) => toHexString(h)).includes(toHexString(trie.root())),
//     )
//     .map(([nodeId, _]) => nodeId)
//   // it('should store root in some clients', () => {
//   //   expect(hasRoot.length).toBeGreaterThan(0)
//   //   expect(hasRoot.length).toBeLessThanOrEqual(clients.length)
//   // })

//   const storedTrieNodes = Object.entries(sortedNodeHashByClient)
//     .map(([_, trieNodes]) => {
//       return trieNodes.map((node) => toHexString(node))
//     })
//     .flat()
//   const uniqueStoredTrieNodes = Array.from(new Set(storedTrieNodes))
//   // it('should distribute all nodes', () => {
//   //   expect(uniqueStoredTrieNodes.length).toEqual(12356)
//   // })

//   await connectNetwork(networks, clients)
//   await new Promise((r) => setTimeout(r, 1000))

//   const storedKeys: Record<string, string[]> = {}

//   for (const network of networks) {
//     storedKeys[network.enr.nodeId] = []
//     const dbKeys = network.stateDB.db.db.keys()
//     for await (const key of dbKeys) {
//       storedKeys[network.enr.nodeId].push(key)
//     }
//   }

//   const allKeys = Object.values(storedKeys).flat()
//   const uniqueKeys = Array.from(new Set(allKeys))

//   // it(`should store ${allKeys.length} keys in network`, () => {
//   //   expect(allKeys.length).toBeGreaterThan(0)
//   // })
//   // it(`Should store 12356 unique keys`, () => {
//   //   expect(uniqueKeys.length).toEqual(12356)
//   // })
//   for (let i = 0; i < 20; i++) {
//     const testClient = networks[i % networks.length]
//     const testAddress = Object.keys(mainnet.alloc)[Math.floor(Math.random() * 8893)]
//     const found = await testClient.getAccount('0x' + testAddress, trie.root())
//     const foundAccount = Account.fromRlpSerializedAccount(found!)
//     // it(`client {${i % networks.length}} should find account balance for addr: ${testAddress.slice(
//     //   0,
//     //   8,
//     // )}...`, async () => {
//     //   expect(foundAccount.balance).toBeGreaterThan(0n)
//     //   assert.deepEqual(
//     //     foundAccount.balance,
//     //     BigInt(mainnet.alloc[testAddress].balance),
//     //     'account data found',
//     //   )
//     // })
//     const emptyTemp = [...testClient.stateDB.db.temp.keys()]
//     // it('should empty temp node map', () => {
//     //   expect(emptyTemp.length).toEqual(0)
//     // })
//   }
// }

// testClients()
//   .then(() => console.log('done'))
//   .catch((err: any) => console.log('err', err.message))

testDBs()
  .then(() => console.log('done'))
  .catch((err: any) => console.log('err', err.message))
