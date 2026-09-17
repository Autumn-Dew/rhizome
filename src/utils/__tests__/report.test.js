import { describe, it, expect } from 'vitest'
import {
  REPORT_TYPES,
  isReportType,
  getReportRangeStart,
  countPlaysSince,
  buildReportSongs,
  reportSubtitle,
  reportFilename,
  previousPeriodDate,
} from '@/utils/report'

describe('REPORT_TYPES', () => {
  it('包含四种类型且顺序为 日/周/月/年', () => {
    expect(REPORT_TYPES.map((t) => t.key)).toEqual(['daily', 'weekly', 'monthly', 'yearly'])
  })

  it('isReportType 正确识别', () => {
    expect(isReportType('daily')).toBe(true)
    expect(isReportType('yearly')).toBe(true)
    expect(isReportType('foo')).toBe(false)
  })
})

describe('getReportRangeStart', () => {
  // 2026-09-09 为周三；本周一为 2026-09-07
  const now = new Date(2026, 8, 9, 15, 30, 0)

  it('daily 为当天 0 点', () => {
    expect(getReportRangeStart('daily', now)).toBe(new Date(2026, 8, 9).getTime())
  })

  it('weekly 为本周一 0 点', () => {
    expect(getReportRangeStart('weekly', now)).toBe(new Date(2026, 8, 7).getTime())
  })

  it('monthly 为当月 1 号 0 点', () => {
    expect(getReportRangeStart('monthly', now)).toBe(new Date(2026, 8, 1).getTime())
  })

  it('yearly 为当年 1 月 1 日 0 点', () => {
    expect(getReportRangeStart('yearly', now)).toBe(new Date(2026, 0, 1).getTime())
  })
})

describe('countPlaysSince', () => {
  const from = new Date(2026, 8, 7).getTime() // 本周一
  const history = [
    { path: 'a.mp3', playAt: new Date(2026, 8, 8).getTime() },
    { path: 'a.mp3', playAt: new Date(2026, 8, 9).getTime() },
    { path: 'b.mp3', playAt: new Date(2026, 8, 6).getTime() }, // 范围外
    { path: 'c.mp3', playAt: 'bad' }, // 非法时间
    { playAt: new Date(2026, 8, 9).getTime() }, // 无 path
    null,
  ]

  it('按 path 聚合范围内播放次数，忽略范围外与非法项', () => {
    expect(countPlaysSince(history, from)).toEqual({ 'a.mp3': 2 })
  })
})

describe('buildReportSongs', () => {
  const songList = [
    { path: 'a.mp3', name: 'A' },
    { path: 'b.mp3', name: 'B' },
    { path: 'c.mp3', name: 'C' },
  ]

  it('过滤 0 次并按次数降序', () => {
    const countMap = { 'a.mp3': 3, 'b.mp3': 0, 'c.mp3': 5 }
    const songs = buildReportSongs(songList, countMap)
    expect(songs.map((s) => s.name)).toEqual(['C', 'A'])
    expect(songs[0].playCount).toBe(5)
  })
})

describe('reportFilename', () => {
  // 2026-09-09 为周三
  const now = new Date(2026, 8, 9)

  it('daily/monthly/yearly 文件名', () => {
    expect(reportFilename('daily', now)).toBe('rhizome-daily-20260909.png')
    expect(reportFilename('monthly', now)).toBe('rhizome-monthly-202609.png')
    expect(reportFilename('yearly', now)).toBe('rhizome-yearly-2026.png')
  })

  it('weekly 文件名以周一日期命名', () => {
    expect(reportFilename('weekly', now)).toBe('rhizome-weekly-20260907.png')
  })
})

describe('reportSubtitle', () => {
  const now = new Date(2026, 8, 9)

  it('各类型副标题', () => {
    expect(reportSubtitle('daily', now)).toBe('2026/09/09')
    expect(reportSubtitle('weekly', now)).toBe('9/7 - 9/13, 2026')
    expect(reportSubtitle('monthly', now)).toBe('2026年9月')
    expect(reportSubtitle('yearly', now)).toBe('2026年')
  })
})

describe('previousPeriodDate', () => {
  const now = new Date(2026, 8, 9) // 2026-09-09 周三

  it('daily 为昨天', () => {
    expect(previousPeriodDate('daily', now).getTime()).toBe(new Date(2026, 8, 8).getTime())
  })

  it('weekly 为 7 天前', () => {
    expect(previousPeriodDate('weekly', now).getTime()).toBe(new Date(2026, 8, 2).getTime())
  })

  it('monthly 为上月 1 号', () => {
    expect(previousPeriodDate('monthly', now).getTime()).toBe(new Date(2026, 7, 1).getTime())
  })

  it('yearly 为去年 1 月 1 日', () => {
    expect(previousPeriodDate('yearly', now).getTime()).toBe(new Date(2025, 0, 1).getTime())
  })
})
