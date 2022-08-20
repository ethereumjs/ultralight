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
}
