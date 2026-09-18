import { describe, it, expect } from 'vitest'
import { sortItems, applyPathOrder, compareNames, SORT_FIELDS } from '@/utils/sort'

describe('SORT_FIELDS', () => {
  it('包含 默认/名称/播放次数/播放时间，默认在首位', () => {
    expect(SORT_FIELDS).toEqual(['default', 'name', 'plays', 'recent'])
  })
})

describe('compareNames — 多语言优先顺序（英文 → 中文 → 日语）', () => {
  it('英文排在中文前', () => {
    expect(compareNames('Apple', '苹果')).toBeLessThan(0)
  })

  it('中文排在日语前', () => {
    expect(compareNames('苹果', 'りんご')).toBeLessThan(0)
  })

  it('英文排在日语前', () => {
    expect(compareNames('Apple', 'りんご')).toBeLessThan(0)
  })

  it('英文组内按 en 比较', () => {
    expect(compareNames('Apple', 'Banana')).toBeLessThan(0)
  })

  it('数字随英文组', () => {
    expect(compareNames('1 song', 'Apple')).toBeLessThan(0)
  })

  it('整体排序：英文 → 中文 → 日语', () => {
    const arr = ['りんご', '苹果', 'Banana', 'あお', 'Apple']
    expect([...arr].sort(compareNames)).toEqual(['Apple', 'Banana', '苹果', 'あお', 'りんご'])
  })
})

describe('sortItems', () => {
  it('按名称多语言升序', () => {
    const items = [{ n: 'りんご' }, { n: '苹果' }, { n: 'Apple' }]
    expect(sortItems(items, (x) => x.n, 'asc').map((x) => x.n)).toEqual(['Apple', '苹果', 'りんご'])
  })

  it('按数值降序', () => {
    const items = [{ v: 1 }, { v: 3 }, { v: 2 }]
    expect(sortItems(items, (x) => x.v, 'desc').map((x) => x.v)).toEqual([3, 2, 1])
  })

  it('不修改原数组', () => {
    const items = [{ v: 2 }, { v: 1 }]
    const r = sortItems(items, (x) => x.v)
    expect(items.map((x) => x.v)).toEqual([2, 1])
    expect(r.map((x) => x.v)).toEqual([1, 2])
  })
})

describe('applyPathOrder', () => {
  it('按给定 path 顺序重排', () => {
    const items = [{ path: 'a' }, { path: 'b' }, { path: 'c' }]
    expect(applyPathOrder(items, ['c', 'a', 'b']).map((x) => x.path)).toEqual(['c', 'a', 'b'])
  })

  it('未列出的排末尾并保持原序', () => {
    const items = [{ path: 'a' }, { path: 'b' }, { path: 'c' }, { path: 'd' }]
    expect(applyPathOrder(items, ['c']).map((x) => x.path)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('空顺序或空数组返回原顺序副本', () => {
    const items = [{ path: 'a' }, { path: 'b' }]
    expect(applyPathOrder(items, []).map((x) => x.path)).toEqual(['a', 'b'])
    expect(applyPathOrder(items, null).map((x) => x.path)).toEqual(['a', 'b'])
  })
})
