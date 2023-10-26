import jayson from 'jayson/promise/index.js'
import {  parentPort, workerData } from 'worker_threads'
import { Alchemy, Network } from 'alchemy-sdk'
import { fromHexString, toHexString } from '@chainsafe/ssz'
import {
  getStateNetworkContentKey,
  getStateNetworkContentId,
  StateNetworkContentType,
  AccountTrieProofType,
  ContractStorageTrieProofType,
  ContractStorageTrieKeyType,
  ContractByteCodeType,
  ContractByteCodeKeyType,
} from 'portalnetwork'
import { Address } from '@ethereumjs/util'
import { AccessList } from '@ethereumjs/tx'

const config = {
  apiKey: workerData.KEY,
  network: Network.ETH_MAINNET,
  url: `https://eth-mainnet.alchemyapi.io/v2/${workerData.KEY}`,
}
const alchemy = new Alchemy({
  ...config,
})

const db = new Map<string, Uint8Array>()

const remember = async (contentKey: Uint8Array, content: Uint8Array) => {
  db.set(toHexString(contentKey), content)
}

const store = async (contentKey: Uint8Array, content: Uint8Array) => {
  const client = jayson.Client.http({
    host: workerData.host,
    port: workerData.port,
  })
  const stored = await client.request('portal_stateStore', [
    toHexString(contentKey),
    toHexString(content),
  ])
  parentPort?.postMessage(`stored: ${stored.result}`)
}

const gossip = async (contentKey: Uint8Array, content: Uint8Array) => {
  const client = jayson.Client.http({
    host: workerData.host ?? 'localhost',
    port: workerData.port ?? 8545,
  })
  const stored = await client.request('portal_stateGossip', [
    toHexString(contentKey),
    toHexString(content),
  ])
  parentPort?.postMessage(`gossiped to: ${stored.result} nodes`)
}

const to_storage = {
  store,
  gossip,
  remember,
}

const toStorage = async (contentKey: Uint8Array, content: Uint8Array) => {
  const memory: 'store' | 'gossip' | 'remember' = workerData.memory ?? 'remember'
  const memoryFn = to_storage[memory]
  await memoryFn(contentKey, content)
}

const generateStateNetworkContent = async () => {
  const latest = workerData.latest
  const number = latest.result.number
  const stateroot = latest.result.stateRoot
  const receipts = await alchemy.core.getTransactionReceipts({ blockNumber: number })
  const block = await alchemy.core.getBlockWithTransactions(number)
  let totalCSP = 0
  let totalBytes_storage = 0
  const accessLists: AccessList[] = block.transactions
    .filter((x) => x.accessList && x.accessList.length > 0)
    .map((t) => t.accessList) as AccessList[]

  for (const accessList of accessLists) {
    for (const contract of accessList) {
      const { storageProof } = await alchemy.core.send('eth_getProof', [
        contract.address,
        contract.storageKeys,
        number,
      ])
      for (const p of storageProof) {
        const contentkey = ContractStorageTrieKeyType.serialize({
          address: fromHexString(
            contract.address.length % 2 === 0
              ? contract.address
              : '0x0' + contract.address.slice(2),
          ),
          slot: BigInt(p.key),
          stateRoot: fromHexString(stateroot),
        })
        const data = {
          data:
            p.value.length % 2 === 0
              ? fromHexString(p.value)
              : fromHexString('0x0' + p.value.slice(2)),
          witnesses: p.proof.map((x: string) => {
            return x.length % 2 === 0 ? fromHexString(x) : fromHexString('0x0' + x.slice(2))
          }),
        }
        const csp = ContractStorageTrieProofType.serialize(data)
        totalBytes_storage += csp.length
        totalCSP++
        toStorage(contentkey, csp)
      }
    }
  }

  const tos: any = []
  const froms = receipts.receipts!.map((x) => x.from)
  const total = [...new Set([...tos, ...froms])]
  const contracts = receipts.receipts!.filter((x) => x.contractAddress)
  let totalBytecode = 0
  let totalBytes_code = 0
  if (contracts.length > 0) {
    for (const c of contracts) {
      const accountProof = await alchemy.core.send('eth_getProof', [c.contractAddress, [], number])
      const accountProofContent = AccountTrieProofType.serialize({
        witnesses: accountProof.accountProof.map(fromHexString),
        nonce: BigInt(accountProof.nonce),
        balance: BigInt(accountProof.balance),
        storageRoot: fromHexString(accountProof.storageHash),
        codeHash: fromHexString(accountProof.codeHash),
      })
      const accountProofContentKey = getStateNetworkContentKey({
        contentType: StateNetworkContentType.AccountTrieProof,
        address: Address.fromString(c.contractAddress),
        stateRoot: fromHexString(stateroot),
      })
      toStorage(accountProofContentKey, accountProofContent)
      const codeHash = accountProof.codeHash
      const bytecode = await alchemy.core.getCode(c.contractAddress, number)
      const bytecodeContentkey = ContractByteCodeKeyType.serialize({
        address: fromHexString(c.contractAddress),
        codeHash: fromHexString(codeHash),
      })
      const contractBytecode = ContractByteCodeType.serialize(fromHexString(bytecode))
      totalBytes_code += contractBytecode.length
      totalBytecode++
      toStorage(bytecodeContentkey, contractBytecode)
    }
  }

  const proofs: any[] = []

  for (const [idx, add] of total.entries()) {
    if (add === null) {
      continue
    }
    parentPort?.postMessage(['getProof', idx + 1, total.length].join('/') + '\r')
    const proof = await alchemy.core.send('eth_getProof', [add, [], number])
    proofs.push(proof)
  }

  const accountsData: any = Object.fromEntries(
    proofs.map((x) => {
      return [
        x.address,
        {
          witnesses: x.accountProof.map(fromHexString),
          nonce: BigInt(x.nonce),
          balance: BigInt(x.balance),
          storageRoot: fromHexString(x.storageHash),
          codeHash: fromHexString(x.codeHash),
        },
      ]
    }),
  )
  let totalBytes_account = 0
  let totalATP = 0

  for (const add of Object.keys(accountsData)) {
    const content = AccountTrieProofType.serialize(accountsData[add])
    totalBytes_account += content.length
    totalATP++
    const contentKey = getStateNetworkContentKey({
      address: Address.fromString(add),
      stateRoot: fromHexString(stateroot),
      contentType: StateNetworkContentType.AccountTrieProof,
    })
    const contentId = getStateNetworkContentId({
      address: Address.fromString(add),
      contentType: StateNetworkContentType.AccountTrieProof,
    })
    return [add, { contentKey, contentId, content }]
  }

  const resultMsg2 = [
    'results',
    ...Object.entries({
      hash: latest.result.hash,
      stateroot,
      accountTrieProofs: totalATP,
      accountTrieProofs_bytes: `total: ${totalBytes_account} --  avg: ${
        totalBytes_account / totalATP
      }`,
      contractStorageProofs: totalCSP,
      contractStorageProofs_bytes: `total: ${totalBytes_storage} --  avg: ${
        totalBytes_storage / totalCSP
      }`,
      bytecode: totalBytes_code,
      bytecode_bytes: `total: ${totalBytes_code}, avg: ${totalBytes_code / totalBytecode}`,
      total_contents: totalATP + totalCSP + totalBytecode,
      total_bytes: totalBytes_account + totalBytes_storage + totalBytes_code,
    }),
  ].join('/')

  parentPort?.postMessage(resultMsg2 + '\r')

  return number
}

const blockNum = await generateStateNetworkContent()
parentPort?.postMessage(`Block ${blockNum} processed.`)
process.exit(0)
