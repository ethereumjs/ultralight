import tape from 'tape'
import fs from 'fs'
import { DefaultStateManager } from '@ethereumjs/statemanager'
import { Address } from '@ethereumjs/util'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import {
  AccountTrieProofKeyType,
  AccountTrieProofType,
  StateRoot,
  StateDB,
  TrieLevel,
  mergeArrays,
} from '../../../src/subprotocols/state/index.js'

tape('TrieLevel', async (t) => {
  const trieLevel = new TrieLevel()

  t.test('constructor', async (st) => {
    st.ok(trieLevel, 'TrieLevel created')
    st.equal(trieLevel.status, 'opening', `TrieLevel status is opening`)
    await trieLevel.open(() => {
      st.equal(trieLevel.status, 'open', `TrieLevel status is open`)
      st.end()
    })
  })

  t.test('Put, Get, and Delete', async (st) => {
    const [key, val] = ['ultra', 'light']
    await trieLevel.put(Buffer.from(key), Buffer.from(val))
    const result = await trieLevel.get(Buffer.from(key))
    st.deepEqual(result?.toString(), val, `Put and Get`)
    await trieLevel.del(Buffer.from(key))
    const result2 = await trieLevel.get(Buffer.from(key))
    st.deepEqual(result2, null, `Delete`)
    const [key2, val2] = ['portal', 'network']
    await trieLevel.batch([
      { type: 'put', key: Buffer.from(key), value: Buffer.from(val) },
      { type: 'put', key: Buffer.from(key2), value: Buffer.from(val2) },
    ])
    const [result3, result4] = [
      (await trieLevel.get(Buffer.from(key)))?.toString(),
      (await trieLevel.get(Buffer.from(key2)))?.toString(),
    ]
    st.deepEqual([result3, result4], [val, val2], `Batch Put`)

    const size = await trieLevel.size()
    st.deepEqual(size, 23, `Size`)

    await trieLevel.batch([
      { type: 'del', key: Buffer.from(key) },
      { type: 'del', key: Buffer.from(key2) },
    ])
    const [result5, result6] = [
      (await trieLevel.get(Buffer.from(key)))?.toString(),
      (await trieLevel.get(Buffer.from(key2)))?.toString(),
    ]

    st.deepEqual([result5, result6], [undefined, undefined], `Batch Delete`)
    st.end()
  })

  t.test('close', async (st) => {
    const close = trieLevel.close(() =>
      st.equal(trieLevel.status, 'closed', `TrieLevel status is closed`)
    )
    st.equal(trieLevel.status, 'closing', `TrieLevel status is closing`)
    await close

    st.pass('yay')
    st.end()
  })
  t.end()
})

tape('StateDB', async (t) => {
  const state_root_1 = Buffer.from(
    fromHexString('0x6f62c5ebf7884e1fd59cf2c30c4faa5d23ab214de8ebe44dcee6eff8ed56e49b')
  )
  const state_root_2 = Buffer.from(
    fromHexString('0xf718359292d6da33ff45669f82565caba46d992d2de8caa1c4f7482250219d8b')
  )
  const stateDB = new StateDB()

  t.test('constuctor', (st) => {
    st.ok(stateDB, `StateDB created`)
    st.equal(stateDB.sublevels.size, 0, `StateDB sublevels is empty`)
    st.equal(stateDB.knownAddresses.size, 0, `StateDB knownAddresses is empty`)
    st.equal(stateDB.stateRootIndex.stateroots.size, 0, `StateDB stateRootIndex is empty`)
    st.end()
  })

  t.test('set, get, delete sublevel', (st) => {
    stateDB.sublevels.set(toHexString(state_root_1), new TrieLevel())
    const trie_db_0 = stateDB.sublevels.get(toHexString(state_root_1))
    st.ok(trie_db_0, `StateDB sublevels has state trieLevel`)
    st.ok(trie_db_0 instanceof TrieLevel, `StateDB sublevels has state trieLevel`)
    stateDB.sublevels.delete(toHexString(state_root_1))
    st.equal(
      stateDB.sublevels.get(toHexString(state_root_1)),
      undefined,
      `TrieLevel Deleted from StateDB`
    )
    st.end()
  })

  t.test('Sublevel Methods', async (st) => {
    const trie_db_1 = await stateDB.addRoot(state_root_1)
    st.equal(trie_db_1.status, 'open', `addRoot returns trieLevel with status: open`)

    const stored_trie_db_1 = await stateDB.getSublevel(state_root_1)
    st.equal(stored_trie_db_1.status, 'open', `getSublevel returns trieLevel with status: open`)

    const trie_1 = await stateDB.getStateTrie(state_root_1)

    st.deepEqual(trie_1.root(), state_root_1, `getStateTrie returns trie with root: state_root1`)

    await stateDB.addRoot(state_root_2)
    const trie_db_2 = await stateDB.getSublevel(state_root_2)
    st.equal(trie_db_2.status, 'open', `addRoot returns trieLevel with status: open`)

    const all_tries = await stateDB.getAllTries()
    st.equal(all_tries.length, 2, `getAllTries returns 2 tries`)

    st.deepEqual(
      [...stateDB.sublevels.keys()],
      [toHexString(state_root_1), toHexString(state_root_2)],
      `all state roots are stored in sublevels`
    )
    st.deepEqual(
      [all_tries[0].root(), all_tries[1].root()],
      [state_root_1, state_root_2],
      `getAllTries returns all Tries`
    )
    st.end()
  })
  t.pass('yay')
  t.end()
})

tape('StateDB Sorting', async (t) => {
  const allBlocks: { block: string; header: string; number: string; stateRoot: string }[] =
    JSON.parse(fs.readFileSync('test/subprotocols/state/statenet_blocks.json', 'ascii'))
  t.equal(allBlocks.length, 21, `allBlocks has 21 blocks`)
  const allStateRootsInOrder = allBlocks.map((b) => b.stateRoot)
  const allContent: Record<string, string> = JSON.parse(
    fs.readFileSync('test/subprotocols/state/statenet_content.json', 'ascii')
  )
  const stateDB = new StateDB()
  const accountRoots: Map<string, Set<StateRoot>> = new Map()
  for (const [key, value] of Object.entries(allContent)) {
    const contentKey = AccountTrieProofKeyType.deserialize(fromHexString(key))
    accountRoots.has(toHexString(contentKey.address))
      ? accountRoots.get(toHexString(contentKey.address))!.add(contentKey.stateRoot)
      : accountRoots.set(toHexString(contentKey.address), new Set([contentKey.stateRoot]))
    const content = AccountTrieProofType.deserialize(fromHexString(value))

    const trie = await stateDB.updateAccount(contentKey, content)
    const stored_trie = await stateDB.getStateTrie(trie.root())
    t.deepEqual(trie, stored_trie, `StateDB returns stored Trie`)
    const state = new DefaultStateManager({ trie: stored_trie })
    const account = await state.getAccount(Address.fromString(toHexString(contentKey.address)))
    t.ok(account, `Account exists`)
    t.equal(account?.nonce.toString(), content.nonce.toString(), `Account nonce stored in Trie`)
    t.equal(
      account.balance.toString(),
      content.balance.toString(),
      `Account balance stored in Trie`
    )
    t.equal(
      toHexString(account?.codeHash),
      toHexString(content.codeHash),
      `Account codeHash stored in Trie`
    )
    t.equal(
      toHexString(account.storageRoot),
      toHexString(content.storageRoot),
      `Account storageRoot stored in Trie`
    )
  }
  t.equal(stateDB.sublevels.size, 19, `StateDB sublevels has 19 roots`)

  const allTries = await stateDB.getAllTries()
  t.equal(allTries.length, 19, `StateDB has 19 tries`)

  t.equal(stateDB.knownAddresses.size, 118, `StateDB knownAddresses has 118 addresses`)
  t.equal(await stateDB.size(), 128426, `Size of stateDB is 128426 Bytes`)

  const _rootsByAddr: Map<string, string[]> = await stateDB.rootsByAddr()
  const rootsByAddr = Object.fromEntries(Object.entries(_rootsByAddr))
  t.deepEqual(
    Object.keys(rootsByAddr).length,
    118,
    `StateDB rootsByAccount lists roots for all account`
  )

  t.deepEqual(Object.keys(rootsByAddr), [...accountRoots.keys()], `Keys Match`)
  const expected = Object.fromEntries([...accountRoots.entries()].map(([k, v]) => [k, [...v]]))
  for (const addr of Object.keys(rootsByAddr)) {
    if (expected[addr]) {
      t.equal(
        Object.fromEntries(Object.entries(rootsByAddr))[addr].length,
        expected[addr].length,
        `rootsByAddr lists all roots for ${addr}`
      )
    }
  }
  const testIdx = 1
  const addrIdx = Object.keys(rootsByAddr)[testIdx]
  const rootsIdx = Object.values(rootsByAddr)[testIdx]
  const accountRecordIdx = await stateDB.getAccountRecord(addrIdx)

  t.equal(
    accountRecordIdx.address,
    addrIdx,
    `StateDB.getAccountRecord returns accountRecord for ${addrIdx}`
  )
  t.equal(
    Object.entries(accountRecordIdx.accounts).length,
    rootsIdx.length,
    `StateDB.getAccountRecord returns accountRecord with ${rootsIdx.length} stateRoots`
  )

  const sorted = stateDB.sortAccountRecord(accountRecordIdx)

  t.equal(sorted.address, addrIdx, `StateDB.sortAccountRecord returns accountRecord for ${addrIdx}`)
  t.ok(
    Object.keys(accountRecordIdx.accounts).every((k) => Object.keys(sorted.accounts).includes(k)),
    `StateDB.sortAccountRecord returns all stateRoots`
  )
  t.notDeepEqual(
    Object.keys(accountRecordIdx.accounts),
    Object.keys(sorted.accounts),
    `StateDB.sortAccountRecord returns stateRoots in sorted order`
  )

  const allAccountRecord = await stateDB.getAllAccountRecords()

  t.equal(allAccountRecord.length, 118, `StateDB.getAllAccountRecords returns all accountRecords`)

  t.equal(stateDB.stateRootIndex.stateroots.size, 19, `StateDB stateRootIndex has 19 vertices`)

  const stateRootOrder = await stateDB.getStateRootOrder()

  t.equal(stateRootOrder.length, 8, `StateRootIndex found 8 paths through stateRoots`)
  t.equal(stateRootOrder[0].length, 16, `StateRootIndex found paths of length 16`)
  t.ok(
    stateRootOrder.every((path) => path.length === 16),
    `StateRootIndex found paths of length 16`
  )

  let rootIdx = 0
  for (const [i, r] of mergeArrays(stateRootOrder).entries()) {
    if (r instanceof String) {
      if (allStateRootsInOrder.indexOf(r as string) >= rootIdx) {
        rootIdx = allStateRootsInOrder.indexOf(r as string)
      } else {
        t.fail(`StateRootIndex found paths out of order`)
      }
    } else if (r instanceof Array) {
      let _rootIdx = rootIdx
      for (const _r of r) {
        if (allStateRootsInOrder.indexOf(_r as string) >= _rootIdx) {
          _rootIdx = allStateRootsInOrder.indexOf(_r as string)
        }
        if (allStateRootsInOrder.indexOf(_r as string) <= rootIdx) {
          t.fail(`StateRootIndex found paths out of order`)
        }
      }
      rootIdx = _rootIdx
    }
  }
  t.pass('yay')
  t.end()
})
