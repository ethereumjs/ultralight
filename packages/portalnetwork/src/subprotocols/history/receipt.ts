import {
  bigIntToBuffer,
  bufArrToArr,
  bufferToBigInt,
  bufferToInt,
  intToBuffer,
} from '@ethereumjs/util'
import { RLP } from '@ethereumjs/rlp'
import {
  IReceiptOpts,
  Log,
  PostByzantiumTxReceipt,
  PostByzantiumTxReceiptWithType,
  PreByzantiumTxReceipt,
  PreByzantiumTxReceiptWithType,
  rlpReceipt,
  TxReceipt,
  TxReceiptType,
} from './types.js'

export class Receipt {
  cumulativeBlockGasUsed: bigint
  bitvector: Buffer
  logs: Log[]
  stateRoot?: Buffer
  status?: 0 | 1
  txType?: number
  public static fromReceiptData(r: TxReceiptType): Receipt {
    return new Receipt(r)
  }

  public static fromEncodedReceipt(encoded: Buffer): Receipt {
    try {
      const receipt = RLP.decode(Uint8Array.from(encoded.subarray(1))) as rlpReceipt
      const type = encoded[0]
      return new Receipt({
        bitvector: receipt[2],
        cumulativeBlockGasUsed: bufferToBigInt(receipt[1]),
        logs: receipt[3],
        status: bufferToInt(receipt[0]) as 0 | 1,
        txType: type,
      })
    } catch {
      const receipt = RLP.decode(Uint8Array.from(encoded)) as rlpReceipt
      return new Receipt({
        bitvector: receipt[2],
        cumulativeBlockGasUsed: bufferToBigInt(receipt[1]),
        logs: receipt[3],
        status: bufferToInt(receipt[0]) as 0 | 1,
      })
    }
  }

  public static decodeReceiptBuffer(encoded: Buffer): TxReceiptType {
    return this.fromEncodedReceipt(encoded).decoded()
  }

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
      this.bitvector,
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

  public decoded = (): TxReceiptType => {
    if (this.txType) {
      if (Buffer.isBuffer(this.stateRoot)) {
        return {
          cumulativeBlockGasUsed: this.cumulativeBlockGasUsed,
          bitvector: this.bitvector,
          logs: this.logs,
          stateRoot: this.stateRoot!,
          txType: this.txType,
        } as PreByzantiumTxReceiptWithType
      } else {
        return {
          status: this.status!,
          cumulativeBlockGasUsed: this.cumulativeBlockGasUsed,
          bitvector: this.bitvector,
          logs: this.logs,
          txType: this.txType,
        } as PostByzantiumTxReceiptWithType
      }
    } else {
      if (Buffer.isBuffer(this.stateRoot)) {
        return {
          stateRoot: this.stateRoot!,
          cumulativeBlockGasUsed: this.cumulativeBlockGasUsed,
          bitvector: this.bitvector,
          logs: this.logs,
        } as PreByzantiumTxReceipt
      } else {
        return {
          status: this.status!,
          cumulativeBlockGasUsed: this.cumulativeBlockGasUsed,
          bitvector: this.bitvector,
          logs: this.logs,
        } as PostByzantiumTxReceipt
      }
    }
  }
}

export function encodeReceipt(receipt: TxReceipt, txType: number) {
  const encoded = Buffer.from(
    RLP.encode(
      bufArrToArr([
        (receipt as PreByzantiumTxReceipt).stateRoot ??
          ((receipt as PostByzantiumTxReceipt).status === 0
            ? Buffer.from([])
            : Buffer.from('01', 'hex')),
        bigIntToBuffer(receipt.cumulativeBlockGasUsed),
        receipt.bitvector,
        receipt.logs,
      ])
    )
  )

  if (txType === 0) {
    return encoded
  }

  // Serialize receipt according to EIP-2718:
  // `typed-receipt = tx-type || receipt-data`
  return Buffer.concat([intToBuffer(txType), encoded])
}
