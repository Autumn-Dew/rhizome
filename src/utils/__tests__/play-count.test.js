import { describe, it, expect } from 'vitest'
import { playCountTierColor } from '@/utils/play-count'

describe('playCountTierColor', () => {
  it('小于 10 返回 null（不显示）', () => {
    expect(playCountTierColor(0)).toBeNull()
    expect(playCountTierColor(9)).toBeNull()
  })

  it('非法值返回 null', () => {
    expect(playCountTierColor(undefined)).toBeNull()
    expect(playCountTierColor(null)).toBeNull()
    expect(playCountTierColor('abc')).toBeNull()
  })

  it('10 起按档位递增', () => {
    expect(playCountTierColor(10)).toBe('#2D625E')
    expect(playCountTierColor(50)).toBe('#1C8A4E')
    expect(playCountTierColor(100)).toBe('#464288')
    expect(playCountTierColor(200)).toBe('#B6A2D1')
    expect(playCountTierColor(400)).toBe('#6E1852')
    expect(playCountTierColor(800)).toBe('#CE3B47')
    expect(playCountTierColor(1600)).toBe('#FF3018')
    expect(playCountTierColor(3200)).toBe('#8BFDE8')
  })

  it('档位边界值取高档', () => {
    expect(playCountTierColor(49)).toBe('#2D625E')
    expect(playCountTierColor(99)).toBe('#1C8A4E')
    expect(playCountTierColor(9999)).toBe('#8BFDE8')
  })
})
