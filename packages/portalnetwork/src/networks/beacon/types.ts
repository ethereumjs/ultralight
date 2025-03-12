import {
  ByteListType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
  VectorCompositeType,
} from '@chainsafe/ssz'
import { type ForkName } from '@lodestar/params'
import { ssz } from '@lodestar/types'

import { Bytes32Type } from '../types.js'

import type { BaseNetworkConfig } from '../types.js'

export interface BeaconChainNetworkConfig extends BaseNetworkConfig {
  trustedBlockRoot?: string
  sync?: SyncStrategy
}

export const MAX_REQUEST_LIGHT_CLIENT_UPDATES = 128

export const MIN_BOOTSTRAP_VOTES = 5

export enum BeaconNetworkContentType {
  LightClientBootstrap = 0x10,
  LightClientUpdatesByRange = 0x11,
  LightClientFinalityUpdate = 0x12,
  LightClientOptimisticUpdate = 0x13,
  HistoricalSummaries = 0x14,
  LightClientUpdate = 0x15, // (Added for convenience, not part of the Portal Network Spec)
}

export type LightClientForkName = Exclude<ForkName, 'phase0' | 'bellatrix'> // ForkName subset that excludes forks that have no light client changes

// TODO - figure out what a theoretical maximum byte size for a LightClientUpdate is (the `ByteListType`) in the below ssz list
export const LightClientUpdatesByRange = new ListCompositeType(new ByteListType(2 ** 18), 128)

export const LightClientBootstrapKey = new ContainerType(
  { blockHash: Bytes32Type },
  { typeName: 'LightClientBootstrapKey' },
)
export const LightClientUpdatesByRangeKey = new ContainerType({
  startPeriod: new UintBigintType(8),
  count: new UintBigintType(8),
})
export const LightClientFinalityUpdateKey = new ContainerType({
  finalitySlot: new UintBigintType(8),
})
export const LightClientOptimisticUpdateKey = new ContainerType({
  signatureSlot: new UintBigintType(8),
})

export const HistoricalSummariesKey = new ContainerType({ epoch: new UintBigintType(8) })

export const HistoricalSummariesStateProof = new VectorCompositeType(Bytes32Type, 5)

export const HistoricalSummariesWithProof = new ContainerType(
  {
    epoch: new UintBigintType(8),
    historicalSummaries: ssz.capella.BeaconState.fields.historicalSummaries,
    proof: HistoricalSummariesStateProof,
  },
  { typeName: 'HistoricalSummariesWithProof', jsonCase: 'eth2' },
)

export enum SyncStrategy {
  TrustedBlockRoot,
  PollNetwork,
}

export type HistoricalSummaries = Array<{
  blockSummaryRoot: Uint8Array
  stateSummaryRoot: Uint8Array
}>
