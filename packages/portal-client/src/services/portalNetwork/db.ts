import { keys } from '@libp2p/crypto'
import { BrowserLevel } from 'browser-level'
import { PRIVATE_KEY_DB_KEY } from './types'

export function createDatabase(
  name: string,
  options: {
    version?: number
    prefix?: string
    keyEncoding?: string
    valueEncoding?: string
  } = {},
) {
  const browserDb = new BrowserLevel(name, {
    prefix: options.prefix ?? '',
    version: options.version ?? 1,
    keyEncoding: 'utf8',
    valueEncoding: 'utf8',
  })

  const enhancedDb = browserDb as any
  enhancedDb.nextTick = (fn: Function) => setTimeout(fn, 0)

  enhancedDb.getPrivateKey = async function () {
    try {
      const storedKeyData = await this.get(PRIVATE_KEY_DB_KEY)
      if (storedKeyData !== undefined) {
        const keyBytes = Uint8Array.from(Buffer.from(storedKeyData, 'hex'))
        return keys.privateKeyFromRaw(keyBytes)
      }
    } catch (e) {
      console.log('No existing private key found in DB', e)
    }
    return null
  }

  enhancedDb.savePrivateKey = async function (privateKey: any) {
    try {
      const rawBytes = privateKey.raw
      await this.put(PRIVATE_KEY_DB_KEY, Buffer.from(rawBytes).toString('hex'))
    } catch (e) {
      console.error('Failed to save private key to DB:', e)
    }
  }

  return enhancedDb
}
