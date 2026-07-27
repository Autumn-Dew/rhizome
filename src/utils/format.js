/**
 * 通用格式化工具
 */

/** 秒数 → mm:ss */
export function formatTime(sec) {
  if (!sec || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 秒数 → "X 小时 Y 分钟"（统计页用） */
export function formatDuration(sec) {
  if (!sec || sec < 0) return '0 分钟'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} 小时 ${m} 分钟`
  return `${m} 分钟`
}
