import { readFileSync } from 'fs'
import { resolve } from 'path'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import yaml from 'js-yaml'
import { assert, describe, it } from 'vitest'

import {
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  ContractCodeOffer,
  ContractRetrieval,
  StorageTrieNodeOffer,
  decodeAccountTrieNodeContentKey,
  decodeContractCodeContentKey,
  encodeAccountTrieNodeContentKey,
  encodeContractCodeContentKey,
  encodeStorageTrieNodeContentKey,
  fromKeyObjToStateNetworkContentId,
  packNibbles,
} from '../../../src/index.js'

describe('Account Trie Node', async () => {
  interface AccountTrieNodeKeyData {
    path: number[]
    node_hash: string
    content_key: string
    content_id: string
  }
  interface AccountTrieNodeData {
    proof: string[]
    block_hash: string
    content_value: string
  }
  const keyData: AccountTrieNodeKeyData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/account_trie_node_key.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content key', () => {
    const contentKey = encodeAccountTrieNodeContentKey({
      nodeHash: hexToBytes(keyData.node_hash as `0x${string}`),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
    assert.equal(keyData.content_key, bytesToHex(contentKey))
  })
  it('decodes a content key', () => {
    const decoded = decodeAccountTrieNodeContentKey(
      hexToBytes(keyData.content_key as `0x${string}`),
    )
    assert.equal(bytesToHex(decoded.nodeHash), keyData.node_hash)
    assert.deepEqual(decoded, {
      nodeHash: hexToBytes(keyData.node_hash as `0x${string}`),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
  })
  it('creates the correct content id', () => {
    const contentId = fromKeyObjToStateNetworkContentId({
      nodeHash: hexToBytes(keyData.node_hash as `0x${string}`),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
    assert.equal(keyData.content_id, bytesToHex(contentId))
  })

  const nodeWithProofData: AccountTrieNodeData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/account_trie_node_with_proof.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content value', () => {
    const serialized = AccountTrieNodeOffer.serialize({
      blockHash: hexToBytes(nodeWithProofData.block_hash as `0x${string}`),
      proof: nodeWithProofData.proof.map((x) => hexToBytes(x as `0x${string}`)),
    })
    assert.equal(nodeWithProofData.content_value, bytesToHex(serialized))
  })
  const nodeData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/trie_node.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content value without proof', () => {
    const serialized = AccountTrieNodeRetrieval.serialize({
      node: hexToBytes(nodeData.trie_node as `0x${string}`),
    })
    assert.equal(nodeData.content_value, bytesToHex(serialized))
  })
})

describe('Contract ByteCode', async () => {
  interface ContractByteCodeKeyData {
    address: string
    code_hash: string
    content_key: string
    content_id: string
  }
  const keyData: ContractByteCodeKeyData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/contract_bytecode_key.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content key', () => {
    const addressHash = keccak256(hexToBytes(keyData.address as `0x${string}`))
    const contentKey = encodeContractCodeContentKey({
      addressHash,
      codeHash: hexToBytes(keyData.code_hash as `0x${string}`),
    })
    assert.equal(keyData.content_key, bytesToHex(contentKey))
    const contentId = fromKeyObjToStateNetworkContentId({
      addressHash,
      codeHash: hexToBytes(keyData.code_hash as `0x${string}`),
    })
    assert.equal(keyData.content_id, bytesToHex(contentId))
  })
  it('decodes a content key', () => {
    const decoded = decodeContractCodeContentKey(hexToBytes(keyData.content_key as `0x${string}`))
    assert.equal(
      bytesToHex(decoded.addressHash),
      bytesToHex(keccak256(hexToBytes(keyData.address as `0x${string}`))),
    )
    assert.deepEqual(decoded, {
      addressHash: keccak256(hexToBytes(keyData.address as `0x${string}`)),
      codeHash: hexToBytes(keyData.code_hash as `0x${string}`),
    })
  })
  const contractByteCodeWithProofData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/contract_bytecode_with_proof.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content value', () => {
    const serialized = ContractCodeOffer.serialize({
      accountProof: contractByteCodeWithProofData.account_proof.map((x: string) =>
        hexToBytes(x as `0x${string}`),
      ),
      blockHash: hexToBytes(contractByteCodeWithProofData.block_hash as `0x${string}`),
      code: hexToBytes(contractByteCodeWithProofData.bytecode as `0x${string}`),
    })
    assert.equal(contractByteCodeWithProofData.content_value, bytesToHex(serialized))
  })
  const contractByteCodeData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/contract_bytecode.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content value without proof', () => {
    const serialized = ContractRetrieval.serialize({
      code: hexToBytes(contractByteCodeData.bytecode),
    })
    assert.equal(contractByteCodeData.content_value, bytesToHex(serialized))
  })
})

describe('Storage Trie Node', async () => {
  const storageTrieNodeKeyData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/contract_storage_trie_node_key.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content key', () => {
    const addressHash = keccak256(hexToBytes(storageTrieNodeKeyData.address))
    const contentKey = encodeStorageTrieNodeContentKey({
      addressHash,
      nodeHash: hexToBytes(storageTrieNodeKeyData.node_hash),
      path: packNibbles(storageTrieNodeKeyData.path.map((x: number) => x.toString(16))),
    })
    assert.equal(storageTrieNodeKeyData.content_key, bytesToHex(contentKey))
  })
  it('finds a content id', () => {
    const contentId = fromKeyObjToStateNetworkContentId({
      addressHash: keccak256(hexToBytes(storageTrieNodeKeyData.address)),
      nodeHash: hexToBytes(storageTrieNodeKeyData.node_hash),
      path: packNibbles(storageTrieNodeKeyData.path.map((x: number) => x.toString(16))),
    })
    assert.equal(storageTrieNodeKeyData.content_id, bytesToHex(contentId))
  })
  const storageTrieNodeData = yaml.load(
    readFileSync(
      resolve(
        __dirname,
        '../../../../portal-spec-tests/tests/mainnet/state/serialization/contract_storage_trie_node_with_proof.yaml',
      ),
      {
        encoding: 'utf-8',
      },
    ),
  ) as any
  it('serializes a content value', () => {
    const serialized = StorageTrieNodeOffer.serialize({
      accountProof: storageTrieNodeData.account_proof.map((x: string) =>
        hexToBytes(x as `0x${string}`),
      ),
      blockHash: hexToBytes(storageTrieNodeData.block_hash as `0x${string}`),
      storageProof: storageTrieNodeData.storage_proof.map((x: string) =>
        hexToBytes(x as `0x${string}`),
      ),
    })
    assert.equal(storageTrieNodeData.content_value, bytesToHex(serialized))
  })
})
