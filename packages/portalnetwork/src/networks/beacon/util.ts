import { padToEven } from '@ethereumjs/util'

import {
  BeaconNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRangeKey,
} from './types.js'

/**
 * Serializes a beacon network content key
 * @param contentType content type as defined by `BeaconNetworkContentType`
 * @param serializedKey the SSZ encoded key corresponding to the `BeaconNetworkContentType`
 * @returns the content key encoded as a hex string
 */
export const encodeBeaconContentKey = (
  contentType: BeaconNetworkContentType,
  serializedKey: Uint8Array,
) => {
  return Uint8Array.from([contentType, ...serializedKey])
}

/**
 * Decodes a Beacon Network content key into the SSZ type corresponding to the type of content
 * @param serializedKey the serialized content key for a piece of Beacon Light Client content
 * @returns the decoded key corresponding to the specific type of content
 */
export const decodeBeaconContentKey = (serializedKey: Uint8Array) => {
  const selector = serializedKey[0] as BeaconNetworkContentType
  const contentKeyBytes = serializedKey.slice(1)
  switch (selector) {
    case BeaconNetworkContentType.LightClientBootstrap:
      return LightClientBootstrapKey.deserialize(contentKeyBytes)
    case BeaconNetworkContentType.LightClientOptimisticUpdate:
      return LightClientOptimisticUpdateKey.deserialize(contentKeyBytes)
    case BeaconNetworkContentType.LightClientFinalityUpdate:
      return LightClientFinalityUpdateKey.deserialize(contentKeyBytes)
    case BeaconNetworkContentType.LightClientUpdatesByRange:
      return LightClientUpdatesByRangeKey.deserialize(contentKeyBytes)
    default:
      throw new Error(`unknown content type ${selector}`)
  }
}

export const computeLightClientKeyFromPeriod = (period: number) => {
  return (
    '0x' + BeaconNetworkContentType.LightClientUpdate.toString(16) + padToEven(period.toString(16))
  )
}
