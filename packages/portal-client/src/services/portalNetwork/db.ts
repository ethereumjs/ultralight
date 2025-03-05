import { BrowserLevel } from 'browser-level'
import { AbstractLevel } from 'abstract-level'

type PortalNetworkLevelType = AbstractLevel<string | Uint8Array, string, string>

export function createDatabase(
  name: string,
  options: {
    version?: number,
    prefix?: string,
    keyEncoding?: string,
    valueEncoding?: string
  } = {}
): PortalNetworkLevelType {

  const browserDb = new BrowserLevel(name, {
    prefix: options.prefix || '',
    version: options.version || 1,
  })
  
  return browserDb as unknown as PortalNetworkLevelType
}
