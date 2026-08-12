import { describe, expect, it } from 'vitest'
import { normaliseVerdict, verdictTone } from '../../src/core/verdict.js'
import { badgeFromResult } from '../../src/content/overlay.js'
import { TtlCache } from '../../src/background/cache.js'

describe('normaliseVerdict', () => {
  it('accepts the words the API uses', () => {
    expect(normaliseVerdict('allow')).toBe('ALLOW')
    expect(normaliseVerdict(' BLOCK ')).toBe('BLOCK')
    expect(normaliseVerdict('warning')).toBe('WARN')
  })

  it('falls back to UNKNOWN rather than guessing', () => {
    expect(normaliseVerdict('probably fine')).toBe('UNKNOWN')
    expect(normaliseVerdict(undefined)).toBe('UNKNOWN')
    expect(normaliseVerdict(42)).toBe('UNKNOWN')
    expect(verdictTone(normaliseVerdict('nonsense'))).toBe('neutral')
  })
})

describe('badgeFromResult', () => {
  it('summarises findings worst first', () => {
    const badge = badgeFromResult({
      verdict: 'BLOCK',
      finding_counts: { low: 4, critical: 1, high: 2, medium: 0 },
    })
    expect(badge.tone).toBe('danger')
    expect(badge.detail).toBe('1 critical, 2 high, 4 low')
  })

  it('says so when there is nothing to report', () => {
    expect(badgeFromResult({ verdict: 'ALLOW', finding_counts: {} }).detail).toBe('No findings')
  })
})

describe('TtlCache', () => {
  it('expires entries once the window passes', () => {
    let now = 1000
    const cache = new TtlCache<string>(500, 10, () => now)
    cache.set('a', 'one')
    expect(cache.get('a')).toBe('one')
    now = 1600
    expect(cache.get('a')).toBeNull()
  })

  it('drops the least recently used entry past the limit', () => {
    const cache = new TtlCache<string>(10_000, 2)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.get('a')
    cache.set('c', '3')
    expect(cache.get('b')).toBeNull()
    expect(cache.get('a')).toBe('1')
    expect(cache.size).toBe(2)
  })
})
