import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
  UnionType,
  BitVectorType,
} from '@chainsafe/ssz'

/* ----------------- Alliases ----------------- */
const Bytes4 = new ByteVectorType(4)
const Bytes32 = new ByteVectorType(32)
const Bytes48 = new ByteVectorType(48)
const Bytes96 = new ByteVectorType(96)
/* ----------------- Types ----------------- */

export type Slot = bigint
export const SlotType = new UintBigintType(8)

export type Epoch = bigint
export const EpochType = new UintBigintType(8)

export type CommitteeIndex = bigint
export const CommitteeIndexType = new UintBigintType(8)

export type ValidatorIndex = bigint
export const ValidatorIndexType = new UintBigintType(8)

export type Gwei = bigint
export const GweiType = new UintBigintType(8)

export type GeneralizedIndex = bigint
export const GeneralizedIndexType = new UintBigintType(8)

export type Root = Uint8Array
export const RootType = Bytes32

export type Hash32 = Uint8Array
export const Hash32Type = Bytes32

export type Version = Uint8Array
export const VersionType = Bytes4

export type BLSPubKey = Uint8Array
export const BLSPubKeyType = Bytes48

export type BLSSignature = Uint8Array
export const BLSSignatureType = Bytes96

export type Domain = Uint8Array
export const DomainType = Bytes32

/* ----------------- Constants ----------------- */

export const ALTAIR_FORK_EPOCH = EpochType
export const ALTAIR_FORK_VERSION = VersionType
export const DOMAIN_SYNC_COMMITTEE = DomainType
export const EPOCHS_PER_SYNC_COMMITTEE_PERIOD = 256 //  2**8
export const GENESIS_FORK_VERSION = VersionType
export const GENESIS_SLOT = SlotType
export const MIN_GENESIS_TIME = new UintBigintType(8)
export const MIN_SYNC_COMMITTEE_PARTICIPANTS = 1
export const CURRENT_SYNC_COMMITTEE_INDEX = 54
export const NEXT_SYNC_COMMITTEE_INDEX = 55
export const FINALIZED_ROOT_INDEX = 105
export const SECONDS_PER_SLOT = 12
export const SLOTS_PER_EPOCH = 32 //  2**5
export const SYNC_COMMITTEE_SIZE = 512
export const SLOTS_PER_SYNC_PERIOD = SLOTS_PER_EPOCH * EPOCHS_PER_SYNC_COMMITTEE_PERIOD
export const UPDATE_TIMEOUT = SLOTS_PER_SYNC_PERIOD

export const BeaconBlockHeader = new ContainerType({
  slot: SlotType,
  proposerIndex: ValidatorIndexType,
  parentRoot: RootType,
  stateRoot: RootType,
  bodyRoot: RootType,
})

export interface IBeaconBlockHeader {
  slot: bigint
  proposerIndex: bigint
  parentRoot: Uint8Array
  stateRoot: Uint8Array
  bodyRoot: Uint8Array
}

export const ForkData = new ContainerType({
  currentVersion: VersionType,
  genesisValidatorsRoot: RootType,
})

export interface IForkData {
  currentVersion: Uint8Array
  genesisValidatorsRoot: Uint8Array
}

export const SigningData = new ContainerType({
  objectRoot: RootType,
  domain: DomainType,
})

export interface ISigningData {
  objectRoot: Uint8Array
  domain: Uint8Array
}

export const SyncAggregate = new ContainerType({
  syncCommitteeBits: new BitVectorType(SYNC_COMMITTEE_SIZE),
  syncCommitteeSignature: BLSSignatureType,
})

export interface ISyncAggregate {
  syncCommitteeBits: Uint8Array
  syncCommitteeSignature: BLSSignature
}

// currently outlining these types / containers for now

export const SyncCommittee = new ContainerType({
  pubkeys: new BitVectorType(SYNC_COMMITTEE_SIZE),
  aggregatePubkey: BLSPubKeyType,
})

export interface ISyncCommittee {
  pubkeys: IBeaconBlockHeader
  aggregatePubkey: BLSPubKey
}

export const LightClientBootstrap = new ContainerType({
  // The requested beacon block header
  header: BeaconBlockHeader,
  // Current sync committee corresponding to `header`
  currentSyncCommittee: SyncCommittee,
  currentSyncCommitteeBranch: new ByteVectorType(CURRENT_SYNC_COMMITTEE_INDEX),
})

export interface ILightClientBootstrap {
  header: IBeaconBlockHeader
  currentSyncCommittee: Uint8Array
  currentSyncCommitteeBranch: Uint8Array
}

// This is the data we request to stay synced.  We need an update every time the slot increments.  (Different updates occur depending on the situation)
export const LightClientUpdate = new ContainerType({
  // The beacon block header that is attested to by the sync committee
  attesterHeader: BeaconBlockHeader,
  // Next sync committee corresponding to the active header
  nextSyncCommittee: SyncCommittee,
  nextSyncCommitteeBranch: new ByteVectorType(NEXT_SYNC_COMMITTEE_INDEX),
  // The finalized beacon blexport ock header attested to by Merkle branch
  finalizedHeader: BeaconBlockHeader,
  finalityBranch: new ByteVectorType(FINALIZED_ROOT_INDEX),
  // Sync committee aggregate signature (sig for previous block)
  syncAggregate: SyncAggregate,
})

export interface ILightClientUpdate {
  attesterHeader: IBeaconBlockHeader
  nextSyncCommittee: ISyncCommittee
  nextSyncCommitteeBranch: Uint8Array
  finalizedHeader: IBeaconBlockHeader
  finalityBranch: Uint8Array
  syncAggregate: ISyncAggregate
}

export const LightClientFinalityUpdate = new ContainerType({
  // The beacon block header that is attested to by the sync committee
  attestedHeader: BeaconBlockHeader,
  // The finalized beacon block header attested to by Merkle branch
  finalizedHeader: BeaconBlockHeader,
  finalityBranch: new ByteVectorType(FINALIZED_ROOT_INDEX),
  // Sync committee aggregate signature
  syncAggregate: SyncAggregate,
})

export interface ILightClientFinalityUpdate {
  attestedHeader: IBeaconBlockHeader
  finalizedHeader: IBeaconBlockHeader
  finalityBranch: Uint8Array
  syncAggregate: ISyncAggregate
}

export const LightClientOptimisticUpdate = new ContainerType({
  // The beacon block header that is attested to by the sync committee
  attestedHeader: BeaconBlockHeader,
  // Sync committee aggregate signature
  syncAggregate: SyncAggregate,
})

export interface ILightClientOptimisticUpdate {
  attestedHeader: IBeaconBlockHeader
  syncAggregate: ISyncAggregate
}

export const LightClientStore = new ContainerType({
  // Header that is finalized
  finalized: BeaconBlockHeader,
  // Sync committees corresponding to the finalized header
  currentSyncCommittee: SyncCommittee,
  nextSyncCommittee: SyncCommittee,
  // Best available header to switch finalized head to if we see nothing else
  bestValidUpdate: LightClientUpdate,
  // Most recent available reasonably-safe header
  optimisticHeader: BeaconBlockHeader,
  previousMaxActiveParticipants: new UintBigintType(8),
  // Max number of active participants in a sync committee (used to calculate safety threshold)
  currentMaxActiveParticipants: new UintBigintType(8),
})

export interface ILightClientStore {
  finalized: IBeaconBlockHeader
  currentSyncCommittee: ISyncCommittee
  nextSyncCommittee: ISyncCommittee
  bestValidUpdate: ILightClientUpdate
  optimisticHeader: IBeaconBlockHeader
  previousMaxActiveParticipants: UintBigintType
  currentMaxActiveParticipants: UintBigintType
}
