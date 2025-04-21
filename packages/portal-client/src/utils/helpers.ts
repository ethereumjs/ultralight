import { CONFIG_DEFAULTS } from '@/utils/constants/config'
import type { ConfigId } from '@/utils/types'

/**
 * Get a configuration value from localStorage or fall back to the default value from CONFIG_DEFAULTS.
 * @param id - The configuration ID (e.g., ConfigId.UdpPort).
 * @returns The value from localStorage or the default value.
 */
export const getConfigValue = (id: ConfigId): string => {
  const config = CONFIG_DEFAULTS.find((config) => config.id === id)
  const localStorageKey = id.toLowerCase().replace(/_/g, '-')
  //@ts-ignore
  return localStorage.getItem(localStorageKey) ?? config.defaultValue
}

// async getEnr(params: [NodeId]): Promise<GetEnrResult> {
//   const [nodeId] = params
//   return this._client.discv5.findEnr(nodeId)?.encodeTxt() ?? ''
// }
