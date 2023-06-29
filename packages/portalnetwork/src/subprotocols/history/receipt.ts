import {
  bigIntToBytes,
  bytesToBigInt,
  bytesToInt,
  concatBytes,
  prefixedHexStringToBytes,
  intToBytes,
} from '@ethereumjs/util'
import { RLP } from '@ethereumjs/rlp'
import {
  IReceiptOpts,
  Log,
  PostByzantiumTxReceiptWithType,
  PreByzantiumTxReceiptWithType,
  rlpReceipt,
  TxReceiptType,
} from './types.js'
import { TxReceipt, PostByzantiumTxReceipt, PreByzantiumTxReceipt } from '@ethereumjs/vm'

export class Receipt {
  cumulativeBlockGasUsed: bigint
  bitvector: Uint8Array
  logs: Log[]
  stateRoot?: Uint8Array
  status?: 0 | 1
  txType?: number
  public static fromReceiptData(r: TxReceiptType): Receipt {
    return new Receipt(r)
  }

  public static fromEncodedReceipt(encoded: Uint8Array): Receipt {
    try {
      const receipt = RLP.decode(Uint8Array.from(encoded.subarray(1))) as rlpReceipt
      const type = encoded[0]
      return new Receipt({
        bitvector: receipt[2],
        cumulativeBlockGasUsed: bytesToBigInt(receipt[1]),
        logs: receipt[3],
        status: bytesToInt(receipt[0]) as 0 | 1,
        txType: type,
      })
    } catch {
      const receipt = RLP.decode(Uint8Array.from(encoded)) as rlpReceipt
      return new Receipt({
        bitvector: receipt[2],
        cumulativeBlockGasUsed: bytesToBigInt(receipt[1]),
        logs: receipt[3],
        status: bytesToInt(receipt[0]) as 0 | 1,
      })
    }
  }

  public static decodeReceiptBytes(encoded: Uint8Array): TxReceiptType {
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
  encoded = (): Uint8Array => {
    const rlpReceipt: rlpReceipt = [
      this.stateRoot ?? intToBytes(this.status!),
      bigIntToBytes(this.cumulativeBlockGasUsed),
      this.bitvector,
      this.logs,
    ]
    const receipt = RLP.encode(rlpReceipt)
    if (this.txType) {
      const byte = new Uint8Array(1)
      byte[0] = this.txType
      return concatBytes(byte, receipt)
    } else {
      return receipt
    }
  }

  public decoded = (): TxReceiptType => {
    if (this.txType) {
      if (this.stateRoot instanceof Uint8Array) {
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
      if (this.stateRoot instanceof Uint8Array) {
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
  const encoded = RLP.encode([
    (receipt as PreByzantiumTxReceipt).stateRoot ??
      ((receipt as PostByzantiumTxReceipt).status === 0
        ? new Uint8Array()
        : prefixedHexStringToBytes('01')),
    bigIntToBytes(receipt.cumulativeBlockGasUsed),
    receipt.bitvector,
    receipt.logs,
  ])

  if (txType === 0) {
    return encoded
  }

  // Serialize receipt according to EIP-2718:
  // `typed-receipt = tx-type || receipt-data`
  return concatBytes(intToBytes(txType), encoded)
}
