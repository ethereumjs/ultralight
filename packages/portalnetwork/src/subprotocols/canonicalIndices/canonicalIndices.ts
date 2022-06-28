import { BlockHeader } from '@ethereumjs/block'
import { Debugger } from 'debug'
import { ProtocolId } from '..'
import { PortalNetwork } from '../../client'
import { toHexString } from '../../util/discv5'
import { ContentLookup } from '../contentLookup'
import { HistoryProtocol } from '../history/history'
import { BaseProtocol } from '../protocol'
import {
  CanonicalIndicesNetworkContentKeyUnionType,
  HashArrayContentSSZ,
  HashArrayLookupKey,
  HashArrayRequest,
  HashArrayRequestKeys,
  HashArrayWithProofSSZ,
} from './types'
import { fromHexString } from '@chainsafe/ssz'

export class CanonicalIndicesProtocol extends BaseProtocol {
  logger: Debugger
  readonly protocolId: ProtocolId
  readonly protocolName: string
  sendFindContent: undefined
  public _blockIndex: (string | undefined)[]
  public _rootsList: Uint8Array[]
  constructor(client: PortalNetwork) {
    super(client, 2n ** 256n)
    this.logger = client.logger.extend('canonicalIndices')
    this.protocolId = ProtocolId.CanonicalIndicesNetwork
    this.protocolName = 'Canonical Indices'
    this._blockIndex = []
    this._rootsList = []
  }

  /**
   *
   * @param blockNumber block number to retrieve hash for
   * @returns blockhash or else undefined
   */
  public blockHash = (blockNumber: number) => {
    if (blockNumber >= this._blockIndex.length || blockNumber < 0) {
      return
    }
    return this._blockIndex[blockNumber - 1]
  }

  /**
   * Dummy function for now - update if any async initialization required in future
   */
  public init = () => {
    return new Promise<void>((resolve) => resolve())
  }

  /**
   *
   * @param header header to be added to canonical index
   * @returns true if header was next valid header, false otherwise
   */
  public incrementBlockIndex = (header: BlockHeader) => {
    const blockHash = toHexString(Uint8Array.from(header.hash()))
    let updated = false
    if (
      header.number.toNumber() === 1 &&
      toHexString(Uint8Array.from(header.parentHash)) ===
        '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'
    ) {
      // Check for genesis block hash
      this._blockIndex.push(blockHash)
      updated = true
    } else if (
      header.number.toNumber() === this._blockIndex.length + 1 &&
      toHexString(Uint8Array.from(header.parentHash)) ===
        this._blockIndex[this._blockIndex.length - 1]
    ) {
      this._blockIndex.push(blockHash)
      updated = true
    }
    if (updated) {
      this.logger(
        `Incremented block index to height: ${
          this._blockIndex.length
        } - Block Hash ${blockHash.slice(0, 10)}...`
      )
    }
    return updated
  }

  public batchUpdate = (blockHashes: string[], newHeight: number) => {
    if (newHeight <= 8192) {
      return
    }
    const newIndex = new Array(newHeight)
    newIndex.fill('0')
    this._blockIndex.forEach((value, idx) => {
      newIndex[idx] = value
    })
    blockHashes.forEach((blockHash, idx) => {
      const i = newIndex.length - blockHashes.length + idx
      newIndex[i] = blockHash
    })
    this._blockIndex = newIndex
    this.logger('New Block-Index height:', this._blockIndex.length)
    this.logger('Searching network for hash lists')
    this.backFillByEpoch()
    // this.logger('Backfilling Block Index starting from', newHeight - blockHashes.length)
    // this.backFill(newHeight - blockHashes.length, blockHashes[0])
  }

  public rootsUpdate = (newList: Uint8Array[]) => {
    if (newList.length > this._rootsList.length) {
      // this._rootsList.forEach((root, idx) => {
      //   if (toHexString(root) !== toHexString(newList[idx])) {
      //     throw new Error('Discrepency is Epoch Hash Lists')
      //   }
      // })
      this._rootsList = newList.map((root) => {
        return root
      })
      this.backFillByEpoch()
    }
  }

  public storeEpoch = async (hashArray: Uint8Array[], proof: Uint8Array, slot: number) => {
    const key: Uint8Array = HashArrayLookupKey(slot)
    const value: Uint8Array = HashArrayContentSSZ.serialize({
      chainId: 1,
      content: {
        array: hashArray,
        proof: proof,
      },
    })
    this.client.db.put(toHexString(key), toHexString(value))
    this.logger('Storing HashArray with contentKey: ', toHexString(key))
  }

  updateIndexFromHashArray = (serialized: Uint8Array, slot: number): void => {
    const hashArrayWith = HashArrayWithProofSSZ.deserialize(serialized)
    const array = hashArrayWith.array
    const proof = hashArrayWith.proof
    const history: HistoryProtocol = this.client.protocols.get(
      ProtocolId.HistoryNetwork
    ) as HistoryProtocol
    if (history) {
      const historical = [...history.accumulator.historicalEpochs.values()]
      if (historical.length > Math.floor(8192 / slot))
        if (toHexString(historical[slot]) !== toHexString(proof)) {
          return
        }
    }
    array.forEach((value, idx) => {
      const index = slot * 8192 + idx
      this._blockIndex[index] = toHexString(value)
    })
  }

  public retrieveHashArrayFromRequestKey = async (requestKey: Uint8Array) => {
    const deserialized = CanonicalIndicesNetworkContentKeyUnionType.deserialize(requestKey)
    const value: HashArrayRequest = deserialized.value as unknown as HashArrayRequest
    const key = value.content
    const hashArrayContent = HashArrayWithProofSSZ.deserialize(
      fromHexString(await this.client.db.get(toHexString(key)))
    )
    return hashArrayContent
  }

  public backFillByEpoch = async () => {
    const roots = []
    for (let i = 0; i < this._rootsList.length; i++) {
      if (this._blockIndex.slice(i * 8192, i * 8192 + 8191).includes('0')) {
        roots.push(this._rootsList[i])
      }
    }

    const indexHeight: number = this._blockIndex.indexOf('0')
    const unindexed: number = indexHeight === 0 ? 0 : Math.floor(indexHeight / 8192)
    const isoEpochs: Uint8Array[] = this._rootsList
    isoEpochs.forEach(async (epoch, idx) => {
      if (idx >= unindexed) {
        this.logger(
          `Beginning lookup for HashArray for Blocks ${idx * 8192} through ${idx * 8192 + 8191}`
        )
        const contentKey = HashArrayRequestKeys[idx]
        const lookup = new ContentLookup(this, fromHexString(contentKey))
        const _hashArray = (await lookup.startLookup()) as Uint8Array
        if (_hashArray) {
          const hashArrayContent = HashArrayContentSSZ.deserialize(_hashArray)
          if (toHexString(epoch) !== toHexString(hashArrayContent.content.proof)) {
            return
          }
          hashArrayContent.content.array.forEach((hash, i) => {
            const index = idx * 8192 + i
            if (this._blockIndex[index] === '0') {
              this._blockIndex[index] = toHexString(hash)
            } else if (this._blockIndex[index] !== toHexString(hash)) {
              this.logger(
                `Mismatched Block Hash for block: `,
                index,
                ' Had: ',
                this._blockIndex[index],
                'Received: ',
                toHexString(hash)
              )
            }
          })
          const indexed = this._blockIndex.filter((n) => n !== '0')
          this.logger(`${indexed.length} / ${this._blockIndex.length} blocks indexed.`)
        } else {
          this.logger('HashArray lookup failed')
        }
      }
    })
  }
  public backFillGetBlock = async (blockNumber: number, blockHash: string) => {
    const history = this.client.protocols.get(ProtocolId.HistoryNetwork) as HistoryProtocol
    const block = await history.getBlockByHash(blockHash, false)
    if (block) {
      const number = block.header.number.toNumber()
      if (number !== blockNumber) {
        this.logger('Numbers do not match')
      }
      const hash = toHexString(block.hash())
      this._blockIndex[number] = hash
      this.logger('Block', number, 'Indexed by Number')
      if (number > 1) {
        await this.backFillGetBlock(number - 1, toHexString(block.header.parentHash))
      } else {
        return
      }
    }
    return
  }
}
