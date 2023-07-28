import { ForkName } from '@lodestar/params'

export const MainnetGenesisValidatorsRoot = '0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95'
export enum BeaconLightClientNetworkContentType {
  LightClientBootstrap = 0,
  LightClientUpdatesByRange = 1,
  LightClientFinalityUpdate = 2,
  LightClientOptimisticUpdate = 3,
}

export enum Forks {
  altair = ForkName.altair,
  capella = ForkName.capella,
  deneb = ForkName.deneb
}