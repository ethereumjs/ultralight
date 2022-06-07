import { BlockHeader } from '@ethereumjs/block'
import { Debugger } from 'debug'
import { ProtocolId } from '..'
import { PortalNetwork } from '../../client'
import { toHexString } from '../../util/discv5'
import { BaseProtocol } from '../protocol'

export class CanonicalIndicesProtocol extends BaseProtocol {
  logger: Debugger
  readonly protocolId: ProtocolId
  readonly protocolName: string
  sendFindContent: undefined
  private _blockIndex: string[]
  constructor(client: PortalNetwork) {
    super(client, 2n ** 256n)
    this.logger = client.logger.extend('canonicalIndices')
    this.protocolId = ProtocolId.CanonicalIndicesNetwork
    this.protocolName = 'Canonical Indices'
    this._blockIndex = []
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
        `Incremented block index to height: ${this._blockIndex.length} - Block Hash ${blockHash}`
      )
    }
    return updated
  }
}
