import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { resolve } from 'path'
import { assert, describe, it } from 'vitest'

import { AccountTrieNodeContentKey, AccountTrieNodeKey } from '../../../src/index.js'
describe('account trie node', () => {
  it('should decode account trie nodes and keys', () => {
    const testVector: { content_key: string; content_value: string; node_hash: string } = yaml.load(
      readFileSync(
        resolve(
          __dirname,
          '../../../../portal-spec-tests/tests/mainnet/history/receipts/14764013.yaml',
        ),
        {
          encoding: 'utf-8',
        },
      ),
    ) as any
    assert.equal(
      bytesToHex(AccountTrieNodeContentKey.decode(hexToBytes(testVector.content_key)).nodeHash),
      testVector.node_hash,
    )
  })
})
