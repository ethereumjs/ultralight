/* eslint-disable no-console */
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import { readFileSync, readdirSync, statSync } from 'fs'
import yaml from 'js-yaml'
import { join, resolve } from 'path'
import { afterAll, beforeAll, describe, it } from 'vitest'
import type { HistoryNetwork } from '../../../src/index.js'
import {
  HistoryNetworkContentType,
  PortalNetwork,
  decodeHistoryNetworkContentKey,
  getContentKey,
} from '../../../src/index.js'

describe.skip('should run all spec tests', () => {
  // This retrieves all the yaml files from the spec tests directory
  const getAllYamlFiles = (dir: string): string[] => {
    const files: string[] = []
    const items = readdirSync(dir)

    for (const item of items) {
      const fullPath = join(dir, item)
      if (statSync(fullPath).isDirectory()) {
        files.push(...getAllYamlFiles(fullPath))
      } else if (item.endsWith('.yaml') || item.endsWith('.yml')) {
        files.push(fullPath)
      }
    }

    return files
  }

  const runHistoryTest = async (
    history: HistoryNetwork,
    contentKey: Uint8Array,
    contentValue: Uint8Array,
  ) => {
    try {
      // Store the content.  `store` parses the content key, deserializes per the content type,
      // and then validates the content
      await history?.store(contentKey, contentValue)
      if (contentKey[0] !== HistoryNetworkContentType.BlockHeaderByNumber) {
        // BlockHeaderByNumber requires a conversion to blockhash since we store headers by blockhash in the db
        const retrieved = await history?.get(contentKey)
        if (retrieved === bytesToHex(contentValue)) {
          return true
        } else {
          return false
        }
      } else {
        const blockNumber = decodeHistoryNetworkContentKey(contentKey)
        const hash = history?.blockNumberToHash(blockNumber.keyOpt as bigint)
        const hashKey = getContentKey(HistoryNetworkContentType.BlockHeader, hash!)
        const retrieved = await history?.get(hashKey)
        if (retrieved === bytesToHex(contentValue)) {
          return true
        } else {
          return false
        }
      }
    } catch (e) {
      if ('message' in e) {
        // If we get an error, return it for triage
        return e
      } else {
        return false
      }
    }
  }

  const networkFiles = {
    history: {},
    state: {},
    beacon_chain: {},
  }

  const results = {
    history: {
      passed: 0,
      failed: 0,
      errors: [] as string[],
    },
    state: {
      passed: 0,
      failed: 0,
      errors: [] as string[],
    },
    beacon_chain: {
      passed: 0,
      failed: 0,
      errors: [] as string[],
    },
  }

  let yamlFiles: string[] = []
  beforeAll(() => {
    // Parses all yaml files into JSON objects
    const testDir = resolve(__dirname, '../../../../portal-spec-tests/tests')
    yamlFiles = getAllYamlFiles(testDir)

    for (const file of yamlFiles) {
      try {
        const content = yaml.load(readFileSync(file, 'utf-8'))
        // Split test suites up by network
        if (file.includes('/history/')) {
          networkFiles.history[file] = content
        } else if (file.includes('/state/')) {
          networkFiles.state[file] = content
        } else if (file.includes('/beacon_chain/')) {
          networkFiles.beacon_chain[file] = content
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error)
      }
    }
  })
  it('should run all serialized history spec tests', async () => {
    // This test inspects all the `history` test inputs and runs all the ones
    // with serialized content keys and values
    // The basic idea of the test is can we deserialize the content, store it,
    // and then retrieve it using the original content key
    const client = await PortalNetwork.create({})
    const history = client.network()['0x500b']!
    for (const testData of Object.entries(networkFiles.history)) {
      // Some test vectors are parsed into a tuple of [file name, [test vector]]
      if (Array.isArray(testData) && Array.isArray(testData[1])) {
        for (const vector of testData[1]) {
          if ('content_key' in vector && 'content_value' in vector) {
            const key = hexToBytes(vector.content_key)
            const value = hexToBytes(vector.content_value)
            const result = await runHistoryTest(history, key, value)
            if (result === true) {
              results.history.passed++
            } else {
              results.history.failed++
              results.history.errors.push(
                `Key: ${bytesToHex(key)} in file ${testData[0]} -- Error: ${result ?? 'no error reported'}`,
              )
            }
          }
        }
      } else if (
        Array.isArray(testData) &&
        'content_key' in testData[1] &&
        'content_value' in testData[1]
      ) {
        // Some tests are stored as a tuple of [file name, test vector]
        const key = hexToBytes(testData[1].content_key as string) // Content key is stored as a hex string
        const value = hexToBytes(testData[1].content_value as string) // Content value is stored as a hex string
        const result = await runHistoryTest(history, key, value)
        if (result === true) {
          results.history.passed++
        } else {
          results.history.failed++
          if (typeof result !== 'boolean') {
            results.history.errors.push(
              `Key: ${bytesToHex(key)} in file ${testData[0]} -- ${result}`,
            )
          }
        }
      }
    }
  })
  afterAll(() => {
    console.log('--------------------------------')
    console.log('History Results')
    console.log('--------------------------------')
    console.log(results.history)
    console.log('--------------------------------')
  })
})
