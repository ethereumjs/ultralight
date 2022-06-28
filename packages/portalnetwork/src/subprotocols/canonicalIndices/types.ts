import {
  ByteVectorType,
  ContainerType,
  toHexString,
  UintNumberType,
  UnionType,
  VectorBasicType,
  VectorCompositeType,
} from '@chainsafe/ssz'
export enum CanonicalIndicesNetworkContentTypes {
  HashArrayRequest = 0,
  HashArrayContent = 1,
}

export type blockNumber = number
export type chainId = number
export const chainIdSSZ = new UintNumberType(2)

export type BlockHash = Uint8Array
export const BlockHashSSZ = new ByteVectorType(32)

export type HashArray = BlockHash[]
export const HashArraySSZ = new VectorCompositeType(BlockHashSSZ, 8192)
export type HashArraySerialized = Uint8Array

export type HashArrayProof = Uint8Array
export const HashArrayProofSSZ = new ByteVectorType(32)

export type HashArrayWithProof = { array: HashArray; proof: HashArrayProof }
export const HashArrayWithProofSSZ = new ContainerType({
  array: HashArraySSZ,
  proof: HashArrayProofSSZ,
})

export type IndexRange = blockNumber[]
export const IndexRangeSSZ = new UintNumberType(8)

export type HashArrayRequestKey = Uint8Array
export const HashArrayRequestKeySSZ = new VectorBasicType(IndexRangeSSZ, 8192)

export type HashArrayRequest = {
  chainId: chainId
  content: HashArrayRequestKey
}
export const HashArrayRequestSSZ = new ContainerType({
  chainId: chainIdSSZ,
  content: HashArrayRequestKeySSZ,
})

export type HashArrayContent = {
  chainId: chainId
  content: HashArraySerialized
}
export const HashArrayContentSSZ = new ContainerType({
  chainId: chainIdSSZ,
  content: HashArrayWithProofSSZ,
})

export type CanonicalIndicesNetworkContentType = HashArrayContent | HashArrayRequest

export type CanonicalIndicesNetworkContentKeyUnion = {
  selector: number
  value: CanonicalIndicesNetworkContentType
}
export const CanonicalIndicesNetworkContentKeyUnionType = new UnionType([
  HashArrayRequestSSZ,
  HashArrayContentSSZ,
])

export const HashArrayLookupKey = (slot: number): Uint8Array => {
  const array = [...new Array(8192).keys()].map((v, j) => {
    return slot * 8192 + v
  })
  return CanonicalIndicesNetworkContentKeyUnionType.serialize({
    selector: 0,
    value: {
      chainId: 1,
      content: array,
    },
  })
}

export const hashArrayWithProofMessage = (content: HashArrayWithProof) =>
  CanonicalIndicesNetworkContentKeyUnionType.serialize({
    selector: 1,
    value: { chainId: 1, content: content },
  })

// importable list of HashArray keys
const array = [...new Array(8192).keys()]
export const HashArrayRequestKeys: string[] = [...new Array(100).keys()].map((v, i) => {
  const arr = array.map((n) => {
    return n + i * 8192
  })
  return toHexString(HashArrayRequestKeySSZ.hashTreeRoot(arr))
})
