// 播放记录报告：时间范围与统计纯函数（供手动生成与启动自动生成复用）
import { K_PLAY_HISTORY_FULL, K_REPORT_PATH, K_REPORT_GENERATED } from '@/constants/storage-keys'

// 报告类型元数据（顺序即设置页展示顺序）
export const REPORT_TYPES = [
  { key: 'daily', label: '日报', title: 'Rhizome 日报' },
  { key: 'weekly', label: '周报', title: 'Rhizome 周报' },
  { key: 'monthly', label: '月报', title: 'Rhizome 月报' },
  { key: 'yearly', label: '年报', title: 'Rhizome 年报' },
]

const REPORT_TYPE_KEYS = REPORT_TYPES.map((t) => t.key)

export function isReportType(key) {
  return REPORT_TYPE_KEYS.includes(key)
}

// 计算某类型报告的时间范围起点（毫秒时间戳）：
// daily → 当天 0 点；weekly → 本周一 0 点；monthly → 本月 1 号 0 点；yearly → 本年 1 月 1 日 0 点
export function getReportRangeStart(type, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (type === 'daily') return start.getTime()
  if (type === 'weekly') {
    const day = start.getDay() || 7 // 周一=1 ... 周日=7
    start.setDate(start.getDate() - day + 1)
    return start.getTime()
  }
  if (type === 'monthly') {
    start.setDate(1)
    return start.getTime()
  }
  if (type === 'yearly') {
    start.setMonth(0)
    start.setDate(1)
    return start.getTime()
  }
  return 0
}

// 统计 playAt >= from 的播放记录，按 path 聚合次数
export function countPlaysSince(history, from) {
  const map = {}
  for (const h of history || []) {
    if (!h || typeof h.playAt !== 'number' || h.playAt < from) continue
    if (!h.path) continue
    map[h.path] = (map[h.path] || 0) + 1
  }
  return map
}

// 由歌曲列表 + 播放次数映射构建报告歌曲列表（过滤 0 次，按次数降序）
export function buildReportSongs(songList, countMap) {
  return (songList || [])
    .map((s) => ({ ...s, playCount: countMap[s.path] || 0 }))
    .filter((s) => s.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
}

// 报告副标题（描述覆盖的时间范围）
export function reportSubtitle(type, now = new Date()) {
  if (type === 'daily') {
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  }
  if (type === 'weekly') {
    const start = new Date(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}, ${now.getFullYear()}`
  }
  if (type === 'monthly') {
    return `${now.getFullYear()}年${now.getMonth() + 1}月`
  }
  if (type === 'yearly') {
    return `${now.getFullYear()}年`
  }
  return ''
}

// 报告文件名（同一周期同名，重复生成会覆盖）
export function reportFilename(type, now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  if (type === 'daily') return `rhizome-daily-${y}${m}${d}.png`
  if (type === 'weekly') {
    const start = new Date(now)
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return `rhizome-weekly-${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}.png`
  }
  if (type === 'monthly') return `rhizome-monthly-${y}${m}.png`
  if (type === 'yearly') return `rhizome-yearly-${y}.png`
  return `rhizome-report-${Date.now()}.png`
}

// 读取全量播放历史（带 playAt 时间戳，最多 10000 条）
export function getPlayHistory() {
  try {
    return JSON.parse(localStorage.getItem(K_PLAY_HISTORY_FULL) || '[]')
  } catch {
    return []
  }
}

export function getReportSavePath() { return localStorage.getItem(K_REPORT_PATH) || '' }
export function setReportSavePath(p) { localStorage.setItem(K_REPORT_PATH, p) }

// ── 已生成报告状态（用于启动时补历史遗漏） ──
export function getGeneratedReports() {
  try { return JSON.parse(localStorage.getItem(K_REPORT_GENERATED) || '{}') } catch { return {} }
}

export function isReportGenerated(filename) {
  return !!getGeneratedReports()[filename]
}

export function markReportGenerated(filename) {
  try {
    const m = getGeneratedReports()
    m[filename] = Date.now()
    localStorage.setItem(K_REPORT_GENERATED, JSON.stringify(m))
  } catch {}
}

// 上一周期的代表日期（用于补遗漏：daily=昨天、weekly=上周、monthly=上月、yearly=去年）
export function previousPeriodDate(type, now = new Date()) {
  const d = new Date(now)
  if (type === 'daily') return new Date(d.getTime() - 86400000)
  if (type === 'weekly') return new Date(d.getTime() - 7 * 86400000)
  if (type === 'monthly') return new Date(d.getFullYear(), d.getMonth() - 1, 1)
  if (type === 'yearly') return new Date(d.getFullYear() - 1, 0, 1)
  return new Date(0)
}
