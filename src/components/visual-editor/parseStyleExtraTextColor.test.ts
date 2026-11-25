import { describe, expect, it } from 'vitest'
import { parseStyleExtraTextColor } from './parseStyleExtraTextColor'

describe('parseStyleExtraTextColor', () => {
  it('returns undefined when styleExtra is missing or empty', () => {
    expect(parseStyleExtraTextColor(undefined)).toBeUndefined()
    expect(parseStyleExtraTextColor('')).toBeUndefined()
  })

  it('reads an explicit color from styleExtra', () => {
    expect(parseStyleExtraTextColor('color:#fff')).toBe('#fff')
    expect(parseStyleExtraTextColor('stroke-width:2px,color:#112233')).toBe('#112233')
    expect(parseStyleExtraTextColor('color: rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)')
  })

  it('ignores transparent/none and non-color props', () => {
    expect(parseStyleExtraTextColor('color:transparent')).toBeUndefined()
    expect(parseStyleExtraTextColor('color:none')).toBeUndefined()
    expect(parseStyleExtraTextColor('stroke-width:2px,font-size:14px')).toBeUndefined()
  })
})
