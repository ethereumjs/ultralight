import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { bytesToHex, hexToBytes } from '@ethereumjs/util'
import yaml from 'js-yaml'
import { afterAll, beforeAll, describe, it } from 'vitest'
import type { HistoryNetwork } from '../../../src/index.js'
import {
  HistoricalRootsBlockProof,
  HistoricalSummariesBlockProof,
  HistoryNetworkContentType,
  createPortalNetwork,
  decodeHistoryNetworkContentKey,
  getContentKey,
  verifyPostCapellaHeaderProof,
  verifyPreCapellaHeaderProof,
} from '../../../src/index.js'
import { createChainForkConfig } from '@lodestar/config'
import type { BeaconBlock } from '@lodestar/types'
import { ssz } from '@lodestar/types'
import type { ForkName } from '@lodestar/params'
import {
  createBlockFromExecutionPayload,
  executionPayloadFromBeaconPayload,
} from '@ethereumjs/block'

describe('should run all spec tests', () => {
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

  const runHistorySerializedTestVectorTest = async (
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

  const runHistoryJsonTestVectorTest = async (
    fileName: string,
    testVector: any,
  ): Promise<true | string> => {
    try {
      // 1. Extract block number from filename
      const blockNumberMatch = fileName.match(/beacon_block_proof-(\d+)./)
      if (!blockNumberMatch) {
        throw new Error(`Could not extract block number from file name: ${fileName}`)
      }
      const blockNumber = blockNumberMatch[1]
      const forkMatch = fileName.match(
        /headers_with_proof\/block_proofs_([^/]+)\/beacon_block_proof/,
      )
      const hardfork = (forkMatch ? forkMatch[1] : null) as
        | ForkName.bellatrix
        | ForkName.capella
        | ForkName.deneb
      if (hardfork === null) {
        throw new Error(`Could not extract hardfork from file name: ${fileName}`)
      }
      // 2. Extract parent directory and construct beacon_data path
      const parentDirMatch = fileName.match(/(.*headers_with_proof)/)
      if (!parentDirMatch) {
        throw new Error(`Could not extract parent directory from file name: ${fileName}`)
      }
      const beaconDataPath = `${parentDirMatch[1]}/beacon_data/${blockNumber}`

      // 3. Load the appropriate files based on the beacon data path
      const blockSszPath = resolve(beaconDataPath, 'block.ssz')
      const blockSsz = readFileSync(blockSszPath)
      const beaconBlockData = ssz[hardfork].BeaconBlock.deserialize(blockSsz) as BeaconBlock<
        ForkName.bellatrix | ForkName.capella | ForkName.deneb
      >
      const executionPayload = executionPayloadFromBeaconPayload(
        ssz[hardfork].ExecutionPayload.toJson(beaconBlockData.body.executionPayload),
      )
      const executionHeader = (
        await createBlockFromExecutionPayload(executionPayload, {
          setHardfork: true,
        })
      ).header.serialize()
      const historicalBatchPath = resolve(beaconDataPath, 'historicalBatch.ssz')
      const beaconStatePath = resolve(beaconDataPath, 'beacon_state.ssz')

      // Determine the type of proof by checking which files exist
      const isPostCapella =
        ['deneb', 'capella'].includes(hardfork.toLowerCase()) ||
        (statSync(beaconStatePath, { throwIfNoEntry: false })?.isFile() ?? false)

      const isPreCapella = ['bellatrix', 'merge'].includes(hardfork.toLowerCase())

      const hasHistoricalBatch =
        isPreCapella ||
        (statSync(historicalBatchPath, { throwIfNoEntry: false })?.isFile() ?? false)

      // 4. Load the proof from test data
      if (isPostCapella) {
        // Post-Capella proof
        const proofData = testVector
        proofData.historicalSummariesProof = proofData.beacon_block_proof
        proofData.beaconBlockRoot = proofData.beacon_block_root
        proofData.beaconBlockProof = proofData.execution_block_proof
        const proof = HistoricalSummariesBlockProof.fromJson(proofData)

        // Load beacon state
        const stateBytes = readFileSync(beaconStatePath)
        const historicalSummaries =
          ssz.deneb.BeaconState.fields.historicalSummaries.deserialize(stateBytes)

        // 5. Verify the proof
        const forkConfig = createChainForkConfig({})

        if (verifyPostCapellaHeaderProof(proof, executionHeader, historicalSummaries, forkConfig)) {
          return true
        } else {
          return `Failed to verify post-Capella proof for ${fileName}`
        }
      } else if (hasHistoricalBatch) {
        // Pre-Capella (post-Merge) proof
        const proofData = testVector
        proofData.historicalRootsProof = proofData.beacon_block_proof
        proofData.beaconBlockRoot = proofData.beacon_block_root
        proofData.beaconBlockProof = proofData.execution_block_proof
        console.log(proofData)
        const proof = HistoricalRootsBlockProof.fromJson(proofData)

        // 5. Verify the proof
        if (verifyPreCapellaHeaderProof(proof, executionHeader)) {
          return true
        } else {
          return `Failed to verify pre-Capella proof for ${fileName}`
        }
      } else {
        // Unknown proof type
        return `Unknown proof type for ${fileName}`
      }
    } catch (error) {
      console.log(error)
      return `Error processing ${fileName}: ${error.message}`
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
      unknown: [] as string[],
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
    const client = await createPortalNetwork({})
    const history = client.network()['0x500b']!
    for (const testData of Object.entries(networkFiles.history)) {
      // Some test vectors are parsed into a tuple of [file name, [test vector]]
      if (Array.isArray(testData) && Array.isArray(testData[1])) {
        for (const vector of testData[1]) {
          if ('content_key' in vector && 'content_value' in vector) {
            const key = hexToBytes(vector.content_key)
            const value = hexToBytes(vector.content_value)
            const result = await runHistorySerializedTestVectorTest(history, key, value)
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
        const result = await runHistorySerializedTestVectorTest(history, key, value)
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
      } else if ('execution_block_header' in testData[1]) {
        const result = await runHistoryJsonTestVectorTest(testData[0], testData[1])
        if (result === true) {
          results.history.passed++
        } else {
          results.history.failed++
          results.history.errors.push(result)
        }
      } else {
        results.history.unknown.push(testData[0])
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
