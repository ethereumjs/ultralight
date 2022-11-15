import {
  ByteListType,
  ByteVectorType,
  ContainerType,
  ListCompositeType,
  UintBigintType,
  UnionType,
  BitVectorType,
} from '@chainsafe/ssz'

// todo: export

/* ----------------- Alliases ----------------- */
const Bytes4 = new ByteVectorType(4)
const Bytes32 = new ByteVectorType(32)
const Bytes48 = new ByteVectorType(48)
const Bytes96 = new ByteVectorType(96)
/* ----------------- Types ----------------- */

type Slot = bigint
const SlotType = new UintBigintType(8)

type Epoch = bigint
const EpochType = new UintBigintType(8)

type CommitteeIndex = bigint
const CommitteeIndexType = new UintBigintType(8)

type ValidatorIndex = bigint
const ValidatorIndexType = new UintBigintType(8)

type Gwei = bigint
const GweiType = new UintBigintType(8)

type GeneralizedIndex = bigint
const GeneralizedIndexType = new UintBigintType(8)

type Root = Uint8Array
const RootType = Bytes32

type Hash32 = Uint8Array
const Hash32Type = Bytes32

type Version = Uint8Array
const VersionType = Bytes4

type BLSPubKey = Uint8Array
const BLSPubKeyType = Bytes48

type BLSSignature = Uint8Array
const BLSSignatureType = Bytes96

type Domain = Uint8Array
const DomainType = Bytes32

/* ----------------- Constants ----------------- */

const ALTAIR_FORK_EPOCH = EpochType
const ALTAIR_FORK_VERSION = VersionType
const DOMAIN_SYNC_COMMITTEE = DomainType
const EPOCHS_PER_SYNC_COMMITTEE_PERIOD = 256 //  2**8
const GENESIS_FORK_VERSION = VersionType
const GENESIS_SLOT = SlotType
const MIN_GENESIS_TIME = new UintBigintType(8)
const MIN_SYNC_COMMITTEE_PARTICIPANTS = 1
const CURRENT_SYNC_COMMITTEE_INDEX = 54
const NEXT_SYNC_COMMITTEE_INDEX = 55
const FINALIZED_ROOT_INDEX = 105
const SECONDS_PER_SLOT = 12
const SLOTS_PER_EPOCH = 32 //  2**5
const SYNC_COMMITTEE_SIZE = 512
const SLOTS_PER_SYNC_PERIOD = SLOTS_PER_EPOCH * EPOCHS_PER_SYNC_COMMITTEE_PERIOD
const UPDATE_TIMEOUT = SLOTS_PER_SYNC_PERIOD

const BeaconBlockHeader = new ContainerType({
  slot: SlotType,
  proposerIndex: ValidatorIndexType,
  parentRoot: RootType,
  stateRoot: RootType,
  bodyRoot: RootType,
})

interface IBeaconBlockHeader {
  slot: bigint
  proposerIndex: bigint
  parentRoot: Uint8Array
  stateRoot: Uint8Array
  bodyRoot: Uint8Array
}

const ForkData = new ContainerType({
  currentVersion: VersionType,
  genesisValidatorsRoot: RootType,
})

interface IForkData {
  currentVersion: Uint8Array
  genesisValidatorsRoot: Uint8Array
}

const SigningData = new ContainerType({
  objectRoot: RootType,
  domain: DomainType,
})

interface ISigningData {
  objectRoot: Uint8Array
  domain: Uint8Array
}

// what is correct value for syncCommitteeBits?
const SyncAggregate = new ContainerType({
  syncCommitteeBits: new BitVectorType(SYNC_COMMITTEE_SIZE),
  syncCommitteeSignature: BLSSignatureType,
})

interface ISyncAggregate {
  syncCommitteeBits: Uint8Array
  syncCommitteeSignature: BLSSignature
}

// const SyncCommittee = new ContainerType({
//     pubkeys: // idk
// })

const LightClientBootstrap = new ContainerType({
  // The requested beacon block header
  header: BeaconBlockHeader,
  // Current sync committee corresponding to `header`
  // TODO: implement SyncCommittee type first
  currentSyncCommittee: SyncCommittee,
  currentSyncCommitteeBranch: new ByteVectorType(CURRENT_SYNC_COMMITTEE_INDEX),
})

interface ILightClientBootstrap {
  header: IBeaconBlockHeader
  currentSyncCommittee: Uint8Array
  currentSyncCommitteeBranch: Uint8Array
}

const LightClientUpdate = new ContainerType({
  attesterHeader: IBeaconBlockHeader,
})
