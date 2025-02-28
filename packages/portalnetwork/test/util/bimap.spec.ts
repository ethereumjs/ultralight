import { describe, expect, it } from 'vitest'
import { BiMap } from '../../src/index.js'

describe('BiMap', () => {
  it('should be able to set, get, and delete values', () => {
    const bimap = new BiMap()
    bimap.set(1, 'a')
    bimap.set(2, 'b')
    bimap.set(3, 'c')
    expect(bimap.getByKey(1)).toBe('a')
    expect(bimap.getByKey(2)).toBe('b')
    expect(bimap.getByKey(3)).toBe('c')
    expect(bimap.getByValue('a')).toBe(1)
    expect(bimap.getByValue('b')).toBe(2)
    expect(bimap.getByValue('c')).toBe(3)
    bimap.delete(2)
    expect(bimap.getByKey(2)).toBeUndefined()
    expect(bimap.getByValue('b')).toBeUndefined()
    bimap.delete(1)
    expect(bimap.getByKey(1)).toBeUndefined()
    expect(bimap.getByValue('a')).toBeUndefined()
    expect(bimap.size).toBe(1)
  })
})
