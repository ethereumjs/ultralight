import { padToEven } from '@ethereumjs/util'

import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
} from './types.js'

/**
 * Serializes a beacon network content key
 * @param contentType content type as defined by `BeaconNetworkContentType`
 * @param serializedKey the SSZ encoded key corresponding to the `BeaconNetworkContentType`
 * @returns the content key encoded as a hex string
 */
export const getBeaconContentKey = (
  contentType: BeaconLightClientNetworkContentType,
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
  const selector = serializedKey[0] as BeaconLightClientNetworkContentType
  const contentKeyBytes = serializedKey.slice(1)
  switch (selector) {
    case BeaconLightClientNetworkContentType.LightClientBootstrap:
      return LightClientBootstrapKey.deserialize(contentKeyBytes)
    case BeaconLightClientNetworkContentType.LightClientOptimisticUpdate:
      return LightClientOptimisticUpdateKey.deserialize(contentKeyBytes)
    case BeaconLightClientNetworkContentType.LightClientFinalityUpdate:
      return LightClientFinalityUpdateKey.deserialize(contentKeyBytes)
    case BeaconLightClientNetworkContentType.LightClientUpdatesByRange:
      return LightClientUpdatesByRange.deserialize(contentKeyBytes)
    default:
      throw new Error(`unknown content type ${selector}`)
  }
}

export const computeLightClientKeyFromPeriod = (period: number) => {
  return (
    '0x' +
    BeaconLightClientNetworkContentType.LightClientUpdate.toString(16) +
    padToEven(period.toString(16))
  )
}
