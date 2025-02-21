import { assert, describe, it } from 'vitest'
import yaml from 'js-yaml'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import type { HistoryNetwork } from '../../../src/index.js'
import { PortalNetwork, decodeHistoryNetworkContentKey, getContentKey } from '../../../src/index.js'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'

describe('should run all spec tests', () => {
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
      await history?.store(contentKey, contentValue)
      if (contentKey[0] !== 0x03) {
        const retrieved = await history?.get(contentKey)
        if (retrieved === bytesToHex(contentValue)) {
          return true
        } else {
          return false
        }
      } else {
        const blockNumber = decodeHistoryNetworkContentKey(contentKey)
        const hash = history?.blockNumberToHash(blockNumber.keyOpt as bigint)
        const hashKey = getContentKey(0x00, hash!)
        const retrieved = await history?.get(hashKey)
        if (retrieved === bytesToHex(contentValue)) {
          return true
        } else {
          return false
        }
      }
    } catch (e) {
      if ('message' in e) {
        return e
      } else {
        return false
      }
    }
  }
  it('should run all formatted spec tests', async () => {
    const testDir = resolve(__dirname, '../../../../portal-spec-tests/tests')
    const yamlFiles = getAllYamlFiles(testDir)

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
    for (const file of yamlFiles) {
      try {
        const content = yaml.load(readFileSync(file, 'utf-8'))
        // Determine which network the file belongs to
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
    const client = await PortalNetwork.create({})
    const history = client.network()['0x500b']!
    for (const testData of Object.entries(networkFiles.history)) {
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
              if (typeof result !== 'boolean') {
                results.history.errors.push(
                  `Key: ${bytesToHex(key)} in file ${testData[0]} -- Error: ${result}`,
                )
              }
            }
          }
        }
      } else if ('content_key' in testData[1] && 'content_value' in testData[1]) {
        const key = hexToBytes(testData[1].content_key)
        const value = hexToBytes(testData[1].content_value)
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
    console.log('--------------------------------')
    console.log('History Results')
    console.log('--------------------------------')
    console.log(results.history)
    console.log('--------------------------------')
    assert.equal(results.history.passed, 19)
  })
})
