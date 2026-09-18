// 自动歌单周期纯函数（周 / 月 / 年，三种相互独立）

export const PERIODS = ['weekly', 'monthly', 'yearly']

// 周期标识：weekly → 2026-W37（ISO 周）、monthly → 2026-09、yearly → 2026
export function getPeriodKey(period, now = new Date()) {
  const y = now.getFullYear()
  if (period === 'yearly') return `${y}`
  if (period === 'monthly') return `${y}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (period === 'weekly') {
    // ISO 周编号
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }
  return ''
}

// 周期起点（毫秒）：weekly=本周一 0 点、monthly=本月 1 号 0 点、yearly=本年 1 月 1 日 0 点
export function getPeriodRangeStart(period, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'yearly') { start.setMonth(0, 1); return start.getTime() }
  if (period === 'monthly') { start.setDate(1); return start.getTime() }
  if (period === 'weekly') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return start.getTime()
  }
  return start.getTime()
}

// 各周期的 localId 前缀与标题（三种相互独立）
export const PERIOD_META = {
  weekly:  { topPrefix: '__weekly_top__',  discPrefix: '__weekly_discovery__',  topTitle: '本周最爱', discTitle: '每周发现', topIntro: '本周听得最多的十首歌', discIntro: '还没听过的十首歌' },
  monthly: { topPrefix: '__monthly_top__', discPrefix: '__monthly_discovery__', topTitle: '本月最爱', discTitle: '每月发现', topIntro: '本月听得最多的十首歌', discIntro: '还没听过的十首歌' },
  yearly:  { topPrefix: '__yearly_top__',  discPrefix: '__yearly_discovery__',  topTitle: '年度最爱', discTitle: '年度发现', topIntro: '今年听得最多的十首歌', discIntro: '还没听过的十首歌' },
}
