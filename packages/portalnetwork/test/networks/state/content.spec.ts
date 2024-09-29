import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { resolve } from 'path'
import { assert, describe, it } from 'vitest'

import {
  AccountTrieNodeContentKey,
  AccountTrieNodeOffer,
  AccountTrieNodeRetrieval,
  ContractCodeContentKey,
  ContractCodeOffer,
  ContractRetrieval,
  StateNetworkContentId,
  StorageTrieNodeContentKey,
  StorageTrieNodeOffer,
  hexToBytes,
  packNibbles,
  bytesToHex,
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
    const contentKey = AccountTrieNodeContentKey.encode({
      nodeHash: hexToBytes(keyData.node_hash),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
    assert.equal(keyData.content_key, bytesToHex(contentKey))
  })
  it('decodes a content key', () => {
    const decoded = AccountTrieNodeContentKey.decode(hexToBytes(keyData.content_key))
    assert.equal(bytesToHex(decoded.nodeHash), keyData.node_hash)
    assert.deepEqual(decoded, {
      nodeHash: hexToBytes(keyData.node_hash),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
  })
  it('creates the correct content id', () => {
    const contentId = StateNetworkContentId.fromKeyObj({
      nodeHash: hexToBytes(keyData.node_hash),
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
      blockHash: hexToBytes(nodeWithProofData.block_hash),
      proof: nodeWithProofData.proof.map((x) => hexToBytes(x)),
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
      node: hexToBytes(nodeData.trie_node),
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
    const addressHash = keccak256(hexToBytes(keyData.address))
    const contentKey = ContractCodeContentKey.encode({
      addressHash,
      codeHash: hexToBytes(keyData.code_hash),
    })
    assert.equal(keyData.content_key, bytesToHex(contentKey))
    const contentId = StateNetworkContentId.fromKeyObj({
      addressHash,
      codeHash: hexToBytes(keyData.code_hash),
    })
    assert.equal(keyData.content_id, bytesToHex(contentId))
  })
  it('decodes a content key', () => {
    const decoded = ContractCodeContentKey.decode(hexToBytes(keyData.content_key))
    assert.equal(
      bytesToHex(decoded.addressHash),
      bytesToHex(keccak256(hexToBytes(keyData.address))),
    )
    assert.deepEqual(decoded, {
      addressHash: keccak256(hexToBytes(keyData.address)),
      codeHash: hexToBytes(keyData.code_hash),
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
        hexToBytes(x),
      ),
      blockHash: hexToBytes(contractByteCodeWithProofData.block_hash),
      code: hexToBytes(contractByteCodeWithProofData.bytecode),
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
    const contentKey = StorageTrieNodeContentKey.encode({
      addressHash,
      nodeHash: hexToBytes(storageTrieNodeKeyData.node_hash),
      path: packNibbles(storageTrieNodeKeyData.path.map((x: number) => x.toString(16))),
    })
    assert.equal(storageTrieNodeKeyData.content_key, bytesToHex(contentKey))
  })
  it('finds a content id', () => {
    const contentId = StateNetworkContentId.fromKeyObj({
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
      accountProof: storageTrieNodeData.account_proof.map((x: string) => hexToBytes(x)),
      blockHash: hexToBytes(storageTrieNodeData.block_hash),
      storageProof: storageTrieNodeData.storage_proof.map((x: string) => hexToBytes(x)),
    })
    assert.equal(storageTrieNodeData.content_value, bytesToHex(serialized))
  })
})
