import { bigIntToBuffer, bufferToBigInt, bufferToInt, intToBuffer } from '@ethereumjs/util'
import { RLP } from 'rlp'
import {
  IReceiptOpts,
  Log,
  PostByzantiumTxReceipt,
  PreByzantiumTxReceipt,
  rlpReceipt,
  TxReceiptType,
} from './types.js'

export class Receipt {
  cumulativeBlockGasUsed: bigint
  bitvector: Buffer
  logs: Log[]
  stateRoot?: Buffer
  status?: 0 | 1
  txType?: number

  constructor(opts: IReceiptOpts) {
    this.cumulativeBlockGasUsed = opts.cumulativeBlockGasUsed
    this.bitvector = opts.bitvector
    this.logs = opts.logs
    this.stateRoot = opts.stateRoot
    this.status = opts.status
    this.txType = opts.txType
  }
  encoded = (): Buffer => {
    const rlpReceipt: rlpReceipt = [
      this.stateRoot ?? intToBuffer(this.status!),
      bigIntToBuffer(this.cumulativeBlockGasUsed),
      this.logs,
    ]
    const receipt = Buffer.from(RLP.encode(rlpReceipt))
    if (this.txType) {
      const byte = Buffer.alloc(1)
      byte[0] = this.txType
      return Buffer.concat([byte, receipt])
    } else {
      return receipt
    }
  }

  rlpDecode = (receipt: Buffer): TxReceiptType => {
    const r = RLP.decode(Uint8Array.from(receipt)) as rlpReceipt
    const cumulativeBlockGasUsed = bufferToBigInt(r[1])
    const logs = RLP.decode(r[2])
    if (r[0].length === 32) {
      // Pre-Byzantium Receipt
      return {
        stateRoot: r[0],
        cumulativeBlockGasUsed,
        logs,
      } as PreByzantiumTxReceipt
    } else {
      // Post-Byzantium Receipt
      return {
        status: bufferToInt(r[0]),
        cumulativeBlockGasUsed,
        logs,
      } as PostByzantiumTxReceipt
    }
  }

  fromEncoded = (encoded: Buffer, type: boolean): Receipt => {
    const receipt = this.rlpDecode(encoded.subarray(1))
    if (type) {
      const type = encoded[0]
      return new Receipt({
        bitvector: receipt.bitvector,
        cumulativeBlockGasUsed: receipt.cumulativeBlockGasUsed,
        logs: receipt.logs,
        stateRoot: (receipt as any).stateRoot,
        status: (receipt as any).status,
        txType: type,
      })
    } else {
      return new Receipt({
        bitvector: receipt.bitvector,
        cumulativeBlockGasUsed: receipt.cumulativeBlockGasUsed,
        logs: receipt.logs,
        stateRoot: (receipt as any).stateRoot,
        status: (receipt as any).status,
      })
    }
  }
}
