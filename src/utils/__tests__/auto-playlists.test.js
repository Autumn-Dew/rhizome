import { describe, it, expect } from 'vitest'
import { PERIODS, getPeriodKey, getPeriodRangeStart, PERIOD_META } from '@/utils/auto-playlists'

describe('PERIODS', () => {
  it('包含周/月/年三种且相互独立', () => {
    expect(PERIODS).toEqual(['weekly', 'monthly', 'yearly'])
    const prefixes = PERIODS.map(p => PERIOD_META[p].topPrefix)
    expect(new Set(prefixes).size).toBe(3)
  })
})

describe('getPeriodKey', () => {
  // 2026-09-09 为周三
  const now = new Date(2026, 8, 9)

  it('yearly → YYYY', () => {
    expect(getPeriodKey('yearly', now)).toBe('2026')
  })

  it('monthly → YYYY-MM', () => {
    expect(getPeriodKey('monthly', now)).toBe('2026-09')
  })

  it('weekly → YYYY-Www（ISO 周，两位数）', () => {
    expect(getPeriodKey('weekly', now)).toMatch(/^2026-W\d{2}$/)
  })

  it('同一周内不同日得到相同 weekly key', () => {
    expect(getPeriodKey('weekly', new Date(2026, 8, 7))).toBe(getPeriodKey('weekly', new Date(2026, 8, 13)))
  })
})

describe('getPeriodRangeStart', () => {
  const now = new Date(2026, 8, 9, 15, 30) // 周三 15:30

  it('weekly → 本周一 0 点', () => {
    expect(getPeriodRangeStart('weekly', now)).toBe(new Date(2026, 8, 7).getTime())
  })

  it('monthly → 本月 1 号 0 点', () => {
    expect(getPeriodRangeStart('monthly', now)).toBe(new Date(2026, 8, 1).getTime())
  })

  it('yearly → 本年 1 月 1 日 0 点', () => {
    expect(getPeriodRangeStart('yearly', now)).toBe(new Date(2026, 0, 1).getTime())
  })
})
