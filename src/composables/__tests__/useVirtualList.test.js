import { describe, it, expect } from 'vitest'
import { computeRange } from '../useVirtualList'

describe('useVirtualList.computeRange', () => {
  const base = { itemHeight: 52, viewportHeight: 520, total: 1000, overscan: 8 }

  it('顶部：start=0，end 含视口+overscan', () => {
    const r = computeRange({ ...base, scrollTop: 0 })
    expect(r.start).toBe(0)
    // ceil(520/52)=10 + 8 overscan = 18
    expect(r.end).toBe(18)
    expect(r.offsetY).toBe(0)
    expect(r.totalHeight).toBe(52000)
  })

  it('中段：按滚动量偏移，offsetY = start*行高', () => {
    const r = computeRange({ ...base, scrollTop: 52 * 100 })
    expect(r.start).toBe(92) // 100-8
    expect(r.end).toBe(118)  // 100+10+8
    expect(r.offsetY).toBe(92 * 52)
  })

  it('底部：end 不超过 total', () => {
    const r = computeRange({ ...base, scrollTop: 52 * 1000 })
    expect(r.end).toBe(1000)
    expect(r.start).toBe(992)
  })

  it('空列表 / 非法行高安全返回', () => {
    expect(computeRange({ scrollTop: 0, viewportHeight: 500, itemHeight: 52, total: 0 })).toEqual({ start: 0, end: 0, offsetY: 0, totalHeight: 0 })
    expect(computeRange({ scrollTop: 0, viewportHeight: 500, itemHeight: 0, total: 10 }).end).toBe(0)
  })

  it('负滚动量按 0 处理', () => {
    const r = computeRange({ ...base, scrollTop: -50 })
    expect(r.start).toBe(0)
  })
})
