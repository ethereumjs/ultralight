import { describe, it } from 'vitest'
import yaml from 'js-yaml'
import { readFileSync } from 'fs'
import { resolve } from 'path'
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
