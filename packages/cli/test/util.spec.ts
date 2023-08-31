import { describe, it, assert } from 'vitest'
import {
  extractBase64URLCharsFromEnr,
  hasValidBase64URLChars,
  hasValidEnrPrefix,
} from '../src/util.js'
import { Enr } from '../src/rpc/schema/types.js'

describe('portal network cli test utils', () => {
  const enr: Enr =
    'enr:-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k'

  const badEnrPrefix: Enr = 'ren:-'
  it('hasValidEnrPrefix', () => {
    assert.equal(hasValidEnrPrefix(enr), true, 'detected valid ENR prefix correctly')
    assert.equal(hasValidEnrPrefix(badEnrPrefix), false, 'detected invalid ENR prefix correctly')
  })

  const expectedExtractedBase64URLChars =
    '-IS4QFV_wTNknw7qiCGAbHf6LxB-xPQCktyrCEZX-b-7PikMOIKkBg-frHRBkfwhI3XaYo_T-HxBYmOOQGNwThkBBHYDgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k'
  it('extractBase64URLCharsFromEnr', () => {
    assert.equal(
      extractBase64URLCharsFromEnr(enr),
      expectedExtractedBase64URLChars,
      'extracted base64URL correctly',
    )
  })

  const badEnr: Enr = 'enr:=+/'
  it('hasValidBase64URLChars', () => {
    assert.equal(hasValidBase64URLChars(enr), true, 'detected valid base64URL correctly')
    assert.equal(hasValidBase64URLChars(badEnr), false, 'detected invalid base64URL correctly')
  })
})
