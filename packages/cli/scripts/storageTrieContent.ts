import { Trie } from '@ethereumjs/trie'
import { Alchemy, Network } from 'alchemy-sdk'
import { readFileSync, writeFileSync } from 'fs'
import {
  StorageTrieNodeContentKey,
  StorageTrieNodeOffer,
  fromHexString,
  tightlyPackNibbles,
  toHexString,
} from 'portalnetwork'

import type { AccessList } from '@ethereumjs/common'
import type { TNibble } from 'portalnetwork'

const main = async () => {
  const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_MAINNET,
    url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
  }

  const alchemy = new Alchemy({
    ...config,
  })
  const block = await alchemy.core.getBlockWithTransactions('latest')

  const _accessLists = block.transactions.map((tx) => {
    return tx.accessList
  })
  const accessLists: AccessList[] = _accessLists.filter((a) => a) as AccessList[]

  const maxLength = (
    accessLists.map((list) => {
      return [
        Math.max(
          ...list.map((c) => {
            return c.storageKeys.length
          }),
        ),
        list,
      ]
    }) as [number, AccessList][]
  ).sort(([a, _], [b, __]) => b - a)[0]

  const sampleAccessList = maxLength[1]
  const mostUpdates = sampleAccessList.sort(
    (a, b) => b.storageKeys.length - a.storageKeys.length,
  )[0]
  const sampleContract = mostUpdates
  const { address, storageKeys } = sampleContract
  const contractProof = await alchemy.core.send('eth_getProof', [
    address,
    storageKeys,
    '0x' + block.number.toString(16),
  ])
  const trie = new Trie({ useKeyHashing: true })
  const stateRoot = toHexString(trie['hash'](fromHexString(contractProof.accountProof[0])))
  const store = {
    blockNumber: block.number,
    blockHash: block.hash,
    stateRoot,
    address,
    storageKeys,
    contractProof,
  }
  writeFileSync('./data/contractProof.json', JSON.stringify(store, null, 2), {
    encoding: 'utf8',
  })
}

const mem = async () => {
  const stored = JSON.parse(readFileSync('./data/contractProof.json', { encoding: 'utf8' }))
  const contractProof: any = stored.contractProof
  console.log({
    blockNumber: stored.blockNumber,
    blockHash: stored.blockHash,
    address: stored.address,
    storageKeys: stored.storageKeys,
  })
  console.log(Object.keys(contractProof))
  console.log({ storage_root: stored.contractProof.storageHash })

  const proofNodes: Record<string, string> = {}
  const nodeProofs: Record<string, Array<string>> = {}
  const valueNodeProofs: Record<string, { key: string; value: string; proof: Array<string> }> = {}

  for (const sp of contractProof.storageProof) {
    const proof = sp.proof as string[]
    const curNode = proof.pop()!
    const curHash = toHexString(new Trie({ useKeyHashing: true })['hash'](fromHexString(curNode)))
    valueNodeProofs[curHash] = sp
    proofNodes[curHash] = curNode
    while (proof.length > 0) {
      const curProof = proof
      const curNode = proof.pop()!
      const curHash = toHexString(new Trie({ useKeyHashing: true })['hash'](fromHexString(curNode)))
      proofNodes[curHash] = curNode
      nodeProofs[curHash] = curProof
    }
  }

  const allNodes: [Uint8Array, Uint8Array][] = contractProof.storageProof
    .map(({ proof }: { proof: string[] }) => {
      return proof.map((n: string) => {
        const node = fromHexString(n)
        const nodeHash = new Trie({ useKeyHashing: true })['hash'](node)
        return [nodeHash, node]
      })
    })
    .flat()
  console.log({ proofNodes: Object.entries(proofNodes).length })
  const storageTrie = new Trie({ useKeyHashing: true })
  for (const [nodeHash, node] of Object.entries(proofNodes)) {
    await storageTrie.database().put(fromHexString(nodeHash), fromHexString(node))
  }
  const nodeKeys: Record<string, number[]> = {}
  const storageProof = fromHexString(stored.contractProof.storageHash)
  storageTrie.root(storageProof)
  console.log({ storageProof, trieRoot: toHexString(storageTrie.root()) })
  await storageTrie.walkAllNodes(async (node, key) => {
    const nodeHash = toHexString(storageTrie['hash'](node.serialize()))
    console.log(nodeHash, key)
    nodeKeys[nodeHash] = key
  })

  const valueNodeContents = Object.entries(valueNodeProofs).map(([cur, { key, value, proof }]) => {
    console.log({
      address: stored.address,
      nodeHash: fromHexString(cur),
      nibbles: nodeKeys[cur],
      path: tightlyPackNibbles(nodeKeys[cur] as TNibble[]),
    })
    const contentKey = StorageTrieNodeContentKey.encode({
      address: fromHexString(stored.address),
      nodeHash: fromHexString(cur),
      path: tightlyPackNibbles(nodeKeys[cur] as TNibble[]),
    })
    const content = StorageTrieNodeOffer.serialize({
      accountProof: stored.contractProof.accountProof.map((n: string) => fromHexString(n)),
      storageProof: proof.map((n: string) => fromHexString(n)),
      blockHash: fromHexString(stored.blockHash),
    })
    return {
      contentKey,
      content,
      address: stored.address,
      nodeHash: cur,
      key,
      value,
    }
  })
  const trieNodeContents = Object.entries(nodeProofs).map(([cur, proof]) => {
    const contentKey = StorageTrieNodeContentKey.encode({
      address: fromHexString(stored.address),
      nodeHash: fromHexString(cur),
      path: tightlyPackNibbles(nodeKeys[cur] as TNibble[]),
    })
    const content = StorageTrieNodeOffer.serialize({
      accountProof: stored.contractProof.accountProof.map((n: string) => fromHexString(n)),
      storageProof: proof.map((n: string) => fromHexString(n)),
      blockHash: fromHexString(stored.blockHash),
    })
    return {
      contentKey,
      content,
      address: stored.address,
      nodeHash: cur,
    }
  })

  //   console.log({
  //     nodeHashes: Object.keys(nodeProofs),
  //     valueNodeHashes: Object.keys(valueNodeProofs),
  //   })
  console.log('value_node_contents', valueNodeContents.length)
  console.log('value_node_hashes:', Object.keys(valueNodeProofs).length)
  console.log('node_contents', trieNodeContents.length)
  console.log('node_hashes:', Object.keys(nodeProofs).length)

  const toSave = {
    address: stored.address,
    blockNumber: stored.blockNumber,
    blockHash: stored.blockHash,
    stateRoot: stored.stateRoot,
    storageHash: stored.contractProof.storageHash,
    codeHash: stored.contractProof.codeHash,
    balance: stored.contractProof.balance,
    nonce: stored.contractProof.nonce,
    storageProofs: stored.contractProof.storageProof,
    accountProof: stored.contractProof.accountProof,
    valueNodeContents,
    trieNodeContents,
  }

  writeFileSync('./data/sampleStorageContent.json', JSON.stringify(toSave, null, 2), {
    encoding: 'utf8',
  })
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
  valueNodeContents: any
  trieNodeContents: any
}

const contentMem = async () => {
  const stored = readFileSync('./data/sampleStorageContent.json', { encoding: 'utf8' })
  const storedContent: IContent = JSON.parse(stored)
  console.log({ storedContent })
}

// main()
//   .then(async () => {
//     await mem()
//     console.log('done')
//   })
//   .catch((e) => console.error(e))

// mem()
//   .then(() => console.log('done'))
//   .catch((e) => console.error(e))

contentMem()
  .then(() => console.log('done'))
  .catch((e) => console.error(e))
