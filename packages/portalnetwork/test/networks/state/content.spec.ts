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
  fromHexString,
  packNibbles,
  toHexString,
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
      nodeHash: fromHexString(keyData.node_hash),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
    assert.equal(keyData.content_key, toHexString(contentKey))
  })
  it('decodes a content key', () => {
    const decoded = AccountTrieNodeContentKey.decode(fromHexString(keyData.content_key))
    assert.equal(toHexString(decoded.nodeHash), keyData.node_hash)
    assert.deepEqual(decoded, {
      nodeHash: fromHexString(keyData.node_hash),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
  })
  it('creates the correct content id', () => {
    const contentId = StateNetworkContentId.fromKeyObj({
      nodeHash: fromHexString(keyData.node_hash),
      path: packNibbles(keyData.path.map((x) => x.toString(16))),
    })
    assert.equal(keyData.content_id, toHexString(contentId))
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
      blockHash: fromHexString(nodeWithProofData.block_hash),
      proof: nodeWithProofData.proof.map((x) => fromHexString(x)),
    })
    assert.equal(nodeWithProofData.content_value, toHexString(serialized))
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
      node: fromHexString(nodeData.trie_node),
    })
    assert.equal(nodeData.content_value, toHexString(serialized))
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
    const addressHash = keccak256(fromHexString(keyData.address))
    const contentKey = ContractCodeContentKey.encode({
      addressHash,
      codeHash: fromHexString(keyData.code_hash),
    })
    assert.equal(keyData.content_key, toHexString(contentKey))
    const contentId = StateNetworkContentId.fromKeyObj({
      addressHash,
      codeHash: fromHexString(keyData.code_hash),
    })
    assert.equal(keyData.content_id, toHexString(contentId))
  })
  it('decodes a content key', () => {
    const decoded = ContractCodeContentKey.decode(fromHexString(keyData.content_key))
    assert.equal(
      toHexString(decoded.addressHash),
      toHexString(keccak256(fromHexString(keyData.address))),
    )
    assert.deepEqual(decoded, {
      addressHash: keccak256(fromHexString(keyData.address)),
      codeHash: fromHexString(keyData.code_hash),
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
      accountProof: contractByteCodeWithProofData.account_proof.map((x) => fromHexString(x)),
      blockHash: fromHexString(contractByteCodeWithProofData.block_hash),
      code: fromHexString(contractByteCodeWithProofData.bytecode),
    })
    assert.equal(contractByteCodeWithProofData.content_value, toHexString(serialized))
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
      code: fromHexString(contractByteCodeData.bytecode),
    })
    assert.equal(contractByteCodeData.content_value, toHexString(serialized))
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
    const addressHash = keccak256(fromHexString(storageTrieNodeKeyData.address))
    const contentKey = StorageTrieNodeContentKey.encode({
      addressHash,
      nodeHash: fromHexString(storageTrieNodeKeyData.node_hash),
      path: packNibbles(storageTrieNodeKeyData.path.map((x) => x.toString(16))),
    })
    assert.equal(storageTrieNodeKeyData.content_key, toHexString(contentKey))
  })
  it('finds a content id', () => {
    const contentId = StateNetworkContentId.fromKeyObj({
      addressHash: keccak256(fromHexString(storageTrieNodeKeyData.address)),
      nodeHash: fromHexString(storageTrieNodeKeyData.node_hash),
      path: packNibbles(storageTrieNodeKeyData.path.map((x) => x.toString(16))),
    })
    assert.equal(storageTrieNodeKeyData.content_id, toHexString(contentId))
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
      accountProof: storageTrieNodeData.account_proof.map((x: string) => fromHexString(x)),
      blockHash: fromHexString(storageTrieNodeData.block_hash),
      storageProof: storageTrieNodeData.storage_proof.map((x: string) => fromHexString(x)),
    })
    assert.equal(storageTrieNodeData.content_value, toHexString(serialized))
  })
})
