import { ByteVectorType, ContainerType, NumberUintType, Union, UnionType } from '@chainsafe/ssz'

/**
 * @property chainId - integer representing the chain ID (e.g. Ethereum Mainnet is 1)
 * @property blockHash - byte representation of the hex encoded block hash
 *
 */
export type HistoryNetworkContentKey = {
  chainId: number
  blockHash: Uint8Array
}

export const BlockHeaderType = new ContainerType({
  fields: {
    chainId: new NumberUintType({ byteLength: 2 }),
    blockHash: new ByteVectorType({ length: 32 }),
  },
})

export const BlockBodyType = BlockHeaderType

export const ReceiptType = BlockHeaderType

export const HistoryNetworkContentKeyUnionType = new UnionType<Union<HistoryNetworkContentKey>>({
  types: [BlockHeaderType, BlockBodyType, ReceiptType],
})

export enum HistoryNetworkContentTypes {
  BlockHeader = 0,
  BlockBody = 1,
  Receipt = 2,
}
