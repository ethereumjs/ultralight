import { BrowserLevel } from 'browser-level'

export function createDatabase(
  name: string,
  options: {
    version?: number,
    prefix?: string,
    keyEncoding?: string,
    valueEncoding?: string
  } = {}
) {
  const browserDb = new BrowserLevel(name, {
    prefix: options.prefix || '',
    version: options.version || 1,
    keyEncoding: 'utf8',
    valueEncoding: 'utf8'
  })
  
  const enhancedDb = browserDb as any
  enhancedDb.nextTick = (fn: Function) => setTimeout(fn, 0)
  
  return enhancedDb
}
