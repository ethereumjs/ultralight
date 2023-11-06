import { createFromProtobuf, createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { ENR, SignableENR } from '@chainsafe/discv5'
import { ByteVectorType, fromHexString, toHexString } from '@chainsafe/ssz'
import { Account, Address, bigIntToBytes, bigIntToHex, equalsBytes } from '@ethereumjs/util'
import { AccessList } from '@ethereumjs/tx'
import { RLP } from '@ethereumjs/rlp'
import { Trie } from '@ethereumjs/trie'
import {
  AccountTrieProofType,
  ContractStorageTrieProofType,
  decodeStateNetworkContentKey,
  StateNetworkContentType,
} from 'portalnetwork'

type StateRoot = string
type StorageRoot = string
type AccountAddress = string

class testClient {
  nodeId: string
  stateRoots: Set<StateRoot>
  trieNodes: Set<string>
  accountTries: Map<StateRoot, Trie>
  storageTries: Map<StorageRoot, Trie>
  trieMap: Map<StateRoot, Map<AccountAddress, StorageRoot>>
  bytecode: Map<string, Uint8Array>
  accounts: Set<string>
  contracts: Set<string>
  db: Map<string, Uint8Array>
  contents: Map<string, any>
  constructor(nodeId: string) {
    this.nodeId = nodeId
    this.stateRoots = new Set()
    this.trieNodes = new Set()
    this.accountTries = new Map()
    this.storageTries = new Map()
    this.trieMap = new Map()
    this.bytecode = new Map()
    this.accounts = new Set()
    this.contracts = new Set()
    this.db = new Map()
    this.contents = new Map()
  }

  getContent = async (contentKey: Uint8Array) => {
    const decoded = decodeStateNetworkContentKey(contentKey)
    if ('codeHash' in decoded) {
      return this.getContractBytecode(toHexString(decoded.address))
    } else if ('slot' in decoded) {
      const data = await this.getContractStorage(
        toHexString(decoded.address),
        decoded.slot as bigint,
        toHexString(decoded.stateRoot),
      )
      if (!(data instanceof Uint8Array)) {
        return undefined
      }
      const proof = await this.getStorageProof(
        toHexString(decoded.address),
        decoded.slot as bigint,
        toHexString(decoded.stateRoot),
      )
      if (!proof) {
        return undefined
      }
      return ContractStorageTrieProofType.serialize({
        witnesses: proof!,
        data: data,
      })
    } else if ('stateRoot' in decoded) {
      const account = await this.getAccount(
        toHexString(decoded.address),
        toHexString(decoded.stateRoot),
      )
      if (!account) {
        return undefined
      }
      const { balance, nonce, codeHash, storageRoot } = Account.fromRlpSerializedAccount(account)
      const proof = await this.accountTries
        .get(toHexString(decoded.stateRoot))!
        .createProof(decoded.address)

      if (!proof) {
        return undefined
      }
      return AccountTrieProofType.serialize({
        witnesses: proof!,
        balance: balance,
        nonce: nonce,
        codeHash: codeHash,
        storageRoot: storageRoot,
      })
    }
  }

  compareContent = async (contentKey: Uint8Array) => {
    const decoded = decodeStateNetworkContentKey(contentKey)
    const content = await this.getContent(contentKey)
    const fromDB = this.db.get(toHexString(contentKey))
    if (fromDB === undefined) {
      if (!content === undefined) {
        throw new Error('CONTENT not found in DB or Locally')
      }
      throw new Error('content not found in DB')
    }
    if (fromDB.length === 0) {
      throw new Error('empty content found in db')
    }
    if (content === undefined) {
      throw new Error(
        `NOTFOUND/${Object.entries(this.contents.get(toHexString(contentKey))).join('/')}`,
      )
    }
    if (content.length === 0) {
      throw new Error('empty content found locally')
    }
    if (toHexString(content) === toHexString(fromDB)) {
      return true
    } else {
      switch (contentKey[0]) {
        case 0: {
          const data = AccountTrieProofType.deserialize(content)
          const stored = AccountTrieProofType.deserialize(fromDB)
          if (
            stored.balance === data.balance &&
            stored.nonce === data.nonce &&
            toHexString(stored.codeHash) === toHexString(data.codeHash) &&
            toHexString(stored.storageRoot) === toHexString(data.storageRoot)
          ) {
            throw new Error(`account trie proof mismatch`)
          } else {
            const storedData = [
              stored.balance,
              stored.nonce,
              toHexString(stored.codeHash),
              toHexString(stored.storageRoot),
            ]
            const dataData = [
              data.balance,
              data.nonce,
              toHexString(data.codeHash),
              toHexString(data.storageRoot),
            ]
            throw new Error(`mismatch/` + storedData.join('/') + '/' + dataData.join('/'))
          }
        }
        case 1: {
          const data = ContractStorageTrieProofType.deserialize(content)
          const stored = ContractStorageTrieProofType.deserialize(fromDB)
          if (toHexString(stored.data) === toHexString(data.data)) {
            throw new Error(`contract storage proof mismatch`)
          } else {
            throw new Error(`mismatch/` + toHexString(stored.data) + '/' + toHexString(data.data))
          }
        }
        case 2: {
          throw new Error(
            `contract bytecode mismatch ${toHexString(content).length} ?== ${
              toHexString(fromDB).length
            }`,
          )
        }
        default: {
          throw new Error(`Content Type ${contentKey[0]} NOT supported`)
        }
      }
    }
  }

  getAccount = async (address: string, stateRoot: StateRoot) => {
    const trie = this.accountTries.get(stateRoot)
    if (!trie) return undefined
    const value = await trie.get(fromHexString(address))
    return value
  }

  getContractStorage = async (address: string, slot: bigint, stateRoot: StateRoot) => {
    const contracts = this.trieMap.get(stateRoot)
    if (!contracts) return undefined
    const storageRoot = contracts.get(address)
    if (!storageRoot) return undefined
    const trie = this.storageTries.get(storageRoot)
    if (!trie) return undefined
    const key = bigIntToBytes(slot)
    const value = await trie.get(key)
    return value
  }

  getStorageProof = async (address: string, slot: bigint, stateRoot: StateRoot) => {
    const contracts = this.trieMap.get(stateRoot)
    if (!contracts) return undefined
    const storageRoot = contracts.get(address)
    if (!storageRoot) return undefined
    const trie = this.storageTries.get(storageRoot)
    if (!trie) return undefined
    const key = bigIntToBytes(slot)
    const value = await trie.createProof(key)
    return value
  }

  getContractBytecode = async (address: string): Promise<Uint8Array | undefined> => {
    const bytecode = this.bytecode.get(address)
    return bytecode
  }

  stats = () => {
    return {
      stateRoots: this.stateRoots.size,
      accounts: this.accounts.size,
      contracts: this.contracts.size,
      storageTries: this.storageTries.size,
      bytecode: this.bytecode.size,
      contents: this.db.size,
      totalBytes: this.bytes(),
      trieNodes: this.trieNodes.size,
      nodeBytes: this.tries(),
    }
  }

  bytes = () => {
    let bytes = 0
    for (const value of this.db.values()) {
      bytes += value.length
    }
    return bytes
  }

  tries = () => {
    let bytes = 0
    for (const value of this.trieNodes.values()) {
      bytes += fromHexString(value).length
    }
    return bytes
  }

  processAccountTrieProof = async (contentKey: Uint8Array, content: Uint8Array) => {
    this.db.set(toHexString(contentKey), content)
    const { address, stateRoot } = decodeStateNetworkContentKey(contentKey) as {
      address: Uint8Array
      stateRoot: Uint8Array
    }
    this.stateRoots.add(toHexString(stateRoot))
    this.accounts.add(toHexString(address))
    const trie =
      this.accountTries.get(toHexString(stateRoot)) ??
      new Trie({ root: stateRoot, useKeyHashing: true })
    const data = AccountTrieProofType.deserialize(content)
    for (const witness of data.witnesses) {
      await trie.database().put(trie['hash'](witness), witness)
      this.trieNodes.add(toHexString(witness))
    }
    const stored = await trie.get(address)
    const account = stored && Account.fromRlpSerializedAccount(stored)
    if (!stored) {
      throw new Error(`account not stored correctly: ${toHexString(address)}`)
    }
    for (const key of Object.keys(account!))
      this.contents.set(toHexString(contentKey), {
        balance: data.balance,
        nonce: data.nonce,
        codeHash: data.codeHash,
        storageRoot: data.storageRoot,
      })
    // const stored = await trie.get(address)
    // const account = stored && Account.fromRlpSerializedAccount(stored)
    this.accountTries.set(toHexString(stateRoot), trie)
    return this.stats()
  }
  processContractStorageProof = async (contentKey: Uint8Array, content: Uint8Array) => {
    this.db.set(toHexString(contentKey), content)
    const { address, slot, stateRoot } = decodeStateNetworkContentKey(contentKey) as {
      address: Uint8Array
      slot: bigint
      stateRoot: Uint8Array
    }
    this.stateRoots.add(toHexString(stateRoot))
    const { witnesses, data } = ContractStorageTrieProofType.deserialize(content)
    this.contents.set(toHexString(contentKey), { data })
    const root = witnesses.length > 0
    ? new Trie({ useKeyHashing: true })['hash'](witnesses[0])
    : new Trie({ useKeyHashing: true }).root()
    const trie = this.storageTries.get(toHexString(root)) ?? new Trie({ useKeyHashing: true })
    await trie.fromProof(witnesses)
    for (const witness of witnesses) {
      await trie.database().put(trie['hash'](witness), witness)
      this.trieNodes.add(toHexString(witness))
    }
    
    this.storageTries.set(toHexString(root), trie)
    this.contracts.add(toHexString(address))
    if (!this.trieMap.has(toHexString(stateRoot))) {
      this.trieMap.set(toHexString(stateRoot), new Map())
    }
    const map = this.trieMap.get(toHexString(stateRoot))!
    map.set(toHexString(address), toHexString(root))
    this.trieMap.set(toHexString(stateRoot), map)
    return this.stats()
  }
  processContractBytecode = async (contentKey: Uint8Array, content: Uint8Array) => {
    this.db.set(toHexString(contentKey), content)
    const { address, codeHash } = decodeStateNetworkContentKey(contentKey) as {
      address: Uint8Array
      codeHash: Uint8Array
    }
    this.contracts.add(toHexString(address))
    this.bytecode.set(toHexString(codeHash), content)
    return this.stats()
  }
}

export const testClients = async (num: number = 100): Promise<Record<string, testClient>> => {
  const enrs = await Promise.all(
    Array.from({ length: num }, async (_, i) => {
      const id = await createSecp256k1PeerId()
      const enr = SignableENR.createFromPeerId(id)
      const nodeId = '0x' + enr.nodeId
      return nodeId
    }),
  )
  const clients = enrs.map((nodeId) => [nodeId, new testClient(nodeId)])
  return Object.fromEntries(clients)
}
const setupNodes = async (num: number = 100) => {
  const enrs: [number, any][] = await Promise.all(
    Array.from({ length: num }, async (_, i) => {
      const id = await createSecp256k1PeerId()
      const enr = SignableENR.createFromPeerId(id)
      const nodeId = enr.nodeId
      const partition = Math.floor((parseInt('0x' + nodeId) / 2 ** 256) * 100)
      return [partition, { nodeId: nodeId, enr: enr.encodeTxt() }]
    }),
  )
  const nodeIds = enrs.sort((a, b) => a[0] - b[0])

  return nodeIds
}
