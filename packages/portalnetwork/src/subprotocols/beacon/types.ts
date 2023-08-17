import { ByteListType, ContainerType, ListCompositeType, UintBigintType } from '@chainsafe/ssz'
import { ForkName } from '@lodestar/params'
import { Bytes32Type } from '../types.js'

export const MainnetGenesisValidatorsRoot =
  '0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95'

export const MAX_REQUEST_LIGHT_CLIENT_UPDATES = 128

export enum BeaconLightClientNetworkContentType {
  LightClientBootstrap = 0,
  LightClientUpdatesByRange = 1,
  LightClientFinalityUpdate = 2,
  LightClientOptimisticUpdate = 3,
}

export enum Forks {
  altair = ForkName.altair,
  capella = ForkName.capella,
  deneb = ForkName.deneb,
}

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
export const LightClientFinalityUpdateKey = new ContainerType({ zero: new UintBigintType(8) })
export const LightClientOptimisticUpdateKey = new ContainerType({ zero: new UintBigintType(8) })
