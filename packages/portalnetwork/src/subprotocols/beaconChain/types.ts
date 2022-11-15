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
const Slot = new UintBigintType(8)

type Epoch = bigint
const Epoch = new UintBigintType(8)

type CommitteeIndex = bigint 
const CommitteeIndex = new UintBigintType(8)

type ValidatorIndex = bigint 
const ValidatorIndex = new UintBigintType(8)

type Gwei = bigint
const Gwei = new UintBigintType(8)

type GeneralizedIndex = bigint
const GeneralizedIndex = new UintBigintType(8)

type Root = Uint8Array
const Root = Bytes32

type Hash32 = Uint8Array
const Hash32 = Bytes32

type Version = Uint8Array
const Version = Bytes4

type BLSPubKey = Uint8Array
const BLSPubKey = Bytes48

type BLSSignature = Uint8Array
const BLSSignature = Bytes96

type DomainType = Uint8Array
const DomainType = Bytes4

type Domain = Uint8Array
const Domain = Bytes32
// const SSZObject = new ContainerType()

/* ----------------- Constants ----------------- */

const ALTAIR_FORK_EPOCH = Epoch
const ALTAIR_FORK_VERSION = Version
const DOMAIN_SYNC_COMMITTEE = DomainType
const EPOCHS_PER_SYNC_COMMITTEE_PERIOD = 256 //  2**8
const GENESIS_FORK_VERSION = Version
const GENESIS_SLOT = Slot
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
  slot: Slot,
  proposerIndex: ValidatorIndex,
  parentRoot: Root,
  stateRoot: Root,
  bodyRoot: Root,
})

interface IBeaconBlockHeader {
  slot: bigint,
  proposerIndex: bigint,
  parentRoot: Uint8Array,
  stateRoot: Uint8Array,
  bodyRoot: Uint8Array,
}

const ForkData = new ContainerType({
  currentVersion: Version,
  genesisValidatorsRoot: Root,
})

interface IForkData {
  currentVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array,
}

const SigningData = new ContainerType({
  objectRoot: Root,
  domain: Domain,
})

interface SigningData {
  objectRoot: Uint8Array,
  domain: Uint8Array,
}

// what is correct value for syncCommitteeBits?
const SyncAggregate = new ContainerType({
  syncCommitteeBits: new BitVectorType(SYNC_COMMITTEE_SIZE),
  syncCommitteeSignature: BLSSignature,
})

interface SyncAggregate {

}

// const SyncCommittee = new ContainerType({
//     pubkeys: // idk
// })

// const LightClientBootstrap = new ContainerType({
//   // The requested beacon block header
//   header: BeaconBlockHeader,
//   // Current sync committee corresponding to `header`
//   current_sync_committee: SyncCommittee,
// })
