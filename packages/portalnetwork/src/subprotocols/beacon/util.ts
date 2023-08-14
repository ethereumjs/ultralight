import { BitArray, fromHexString, toHexString } from '@chainsafe/ssz'
import { BeaconLightClientNetworkContentType } from './types.js'

export const attestedHeaderFromJson = (data: any) => {
  return {
    slot: BigInt(data.beacon.slot),
    proposerIndex: BigInt(data.beacon.proposer_index),
    parentRoot: fromHexString(data.beacon.parent_root),
    stateRoot: fromHexString(data.beacon.state_root),
    bodyRoot: fromHexString(data.beacon.body_root),
  }
}

export const syncAggregateFromJson = (data: any) => {
  return {
    syncCommitteeBits: new BitArray(
      new Uint8Array(
        Array.from(BigInt(data.sync_committee_bits).toString(2)).map((el) => parseInt(el)),
      ),
      256, //  TODO: Fix this so Bitlength is equal to SYNC_COMMITTEE_SIZE - 512
    ),
    syncCommitteeSignature: fromHexString(data.sync_committee_signature),
  }
}

export const lightClientOptimisticUpdateFromJson = (data: any) => {
  return {
    attestedHeader: attestedHeaderFromJson(data.attested_header),
    syncAggregate: syncAggregateFromJson(data.sync_aggregate),
  }
}

/**
 * Serializes a beacon network content key
 * @param contentType content type as defined by `BeaconNetworkContentType`
 * @param serializedKey the SSZ encoded key corresponding to the `BeaconNetworkContentType`
 * @returns the content key encoded as a hex string
 */
export const getBeaconContentKey = (
  contentType: BeaconLightClientNetworkContentType,
  serializedKey: Uint8Array
) => {
  const prefix = Buffer.alloc(1, contentType)
  return toHexString(prefix) + toHexString(serializedKey).slice(2)
}
