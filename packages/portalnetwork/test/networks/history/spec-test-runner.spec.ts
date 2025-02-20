import { describe, it } from 'vitest'
import yaml from 'js-yaml'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { PortalNetwork, decodeHistoryNetworkContentKey, getContentKey } from '../../../src/index.js'
import { hexToBytes } from '@ethereumjs/util'

describe('Spec Test Runner', () => {
  it('should run the spec tests', async () => {
    const specTests = yaml.load(
      readFileSync(
        resolve(
          __dirname,
          '../../../../portal-spec-tests/tests/mainnet/history/hive/test_data_collection_of_forks_blocks.yaml',
        ),
        'utf-8',
      ),
    )
    const client = await PortalNetwork.create({})
    const history = client.network()['0x500b']
    for (const { content_key, content_value } of specTests) {
      const key = hexToBytes(content_key)
      const value = hexToBytes(content_value)
      try {
        await history?.store(key, value)
        if (key[0] !== 0x03) {
          console.log(content_key, (await history?.get(key))?.slice(0, 20))
        } else {
          const blockNumber = decodeHistoryNetworkContentKey(key)
          const hash = history?.blockNumberToHash(blockNumber.keyOpt as bigint)
          const hashKey = getContentKey(0x00, hash!)
          console.log(content_key, (await history?.get(hashKey))?.slice(0, 20))
        }
      } catch (e) {
        console.log(e)
        console.log('couldnt find ', content_key)
      }
    }
  })
})

describe('spec tests', () => {
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

  it('should find and read all yaml files', () => {
    const testDir = resolve(__dirname, '../../../../portal-spec-tests/tests')
    const yamlFiles = getAllYamlFiles(testDir)

    for (const file of yamlFiles) {
      console.log(`Reading file: ${file}`)
      try {
        const content = yaml.load(readFileSync(file, 'utf-8'))
        console.log(`Content structure:`, JSON.stringify(content, null, 2))
      } catch (error) {
        console.error(`Error reading ${file}:`, error)
      }
    }
  })
})

describe('YAML File Scanner', () => {
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

  it.only('should organize and read yaml files by network type', () => {
    const testDir = resolve(__dirname, '../../../../portal-spec-tests/tests')
    const yamlFiles = getAllYamlFiles(testDir)

    const networkFiles = {
      history: {},
      state: {},
      beacon_chain: {},
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
    for (const file of Object.entries(networkFiles.history)) {
      console.log(file)
    }
  })
})
