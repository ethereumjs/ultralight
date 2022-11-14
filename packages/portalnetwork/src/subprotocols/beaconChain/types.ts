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

const Slot = new UintBigintType(64)
const Epoch = new UintBigintType(64)
const CommitteeIndex = new UintBigintType(64)
const ValidatorIndex = new UintBigintType(64)
const Gwei = new UintBigintType(64)
const GeneralizedIndex = new UintBigintType(64)
const Root = Bytes32
const Hash32 = Bytes32
const Version = Bytes4
const BLSPubKey = Bytes48
const BLSSignature = Bytes96
const DomainType = Bytes4
const Domain = Bytes32
// const SSZObject = new ContainerType()

/* ----------------- Constants ----------------- */

const ALTAIR_FORK_EPOCH = Epoch
const ALTAIR_FORK_VERSION = Version
const DOMAIN_SYNC_COMMITTEE = DomainType
const EPOCHS_PER_SYNC_COMMITTEE_PERIOD = 256 //  2**8
const GENESIS_FORK_VERSION = Version
const GENESIS_SLOT = Slot
const MIN_GENESIS_TIME = new UintBigintType(64)
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
  slot: Slot,
  proposer_index: ValidatorIndex,
  parent_root: Root,
  state_root: Root,
  body_root: Root,
})

const ForkData = new ContainerType({
  current_version: Version,
  genesis_validators_root: Root,
})

const SigningData = new ContainerType({
  object_root: Root,
  domain: Domain,
})

const SyncAggregate = new ContainerType({
  sync_committee_bits: new BitVectorType(SYNC_COMMITTEE_SIZE),
  sync_committee_signature: BLSSignature,
})

// const SyncCommittee = new ContainerType({
//     pubkeys: // idk
// })

// const LightClientBootstrap = new ContainerType({
//   // The requested beacon block header
//   header: BeaconBlockHeader,
//   // Current sync committee corresponding to `header`
//   current_sync_committee: SyncCommittee,
// })
