// 听歌报告生成器 — 复用于手动生成和定时自动生成

/**
 * 生成听歌报告 PNG Blob
 * @param {Array} songs - 歌曲列表，每项需含 name/singer/playCount
 * @param {boolean} isDarkMode - 是否暗色主题
 * @param {string} title - 报告标题
 * @param {string} subtitle - 报告副标题
 * @param {number} topN - 展示前 N 首
 * @returns {Promise<Blob>}
 */
export async function generateReportBlob(songs, isDarkMode, title, subtitle, topN = 10) {
  const ranked = songs
    .map(s => ({ ...s, _count: s.playCount || s._count || 0 }))
    .filter(s => s._count > 0)
    .sort((a, b) => b._count - a._count)
    .slice(0, topN)

  if (!ranked.length) return null

  const bg = isDarkMode ? '#2c2c2c' : '#ffffff'
  const fg = isDarkMode ? '#ffffff' : '#000000'
  const sub = isDarkMode ? '#888888' : '#666666'
  const stripe = isDarkMode ? '#333333' : '#f0f0f0'

  const W = 600, itemH = 46
  const H = 72 + ranked.length * itemH + 24
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const col1 = 24, col2 = 64, col3 = 340, col4 = W - 24

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = fg; ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'
  ctx.fillText(title, col1, 32)
  ctx.fillStyle = sub; ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.fillText(subtitle, col1, 50)

  ctx.strokeStyle = fg; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(col1, 60); ctx.lineTo(col4, 60); ctx.stroke()

  const headY = 76
  ctx.fillStyle = sub; ctx.font = '10px monospace'
  ctx.fillText('#', col1, headY)
  ctx.fillText('TITLE', col2, headY)
  ctx.fillText('ARTIST', col3, headY)
  ctx.textAlign = 'right'; ctx.fillText('PLAYS', col4, headY); ctx.textAlign = 'left'

  ranked.forEach((s, i) => {
    const top = 90 + i * itemH
    const mid = top + itemH / 2 + 4
    if (i % 2 === 1) { ctx.fillStyle = stripe; ctx.fillRect(col1, top, W - col1 * 2, itemH) }
    ctx.fillStyle = i < 3 ? fg : sub
    ctx.font = 'bold 13px monospace'; ctx.fillText(String(i + 1), col1, mid)
    const name = s.name.length > 24 ? s.name.substring(0, 23) + '…' : s.name
    ctx.fillStyle = fg; ctx.font = '13px "Microsoft YaHei", sans-serif'
    ctx.fillText(name, col2, mid - 2)
    const art = (s.singer || '').length > 20 ? (s.singer || '').substring(0, 19) + '…' : (s.singer || '')
    ctx.fillStyle = sub; ctx.font = '12px "Microsoft YaHei", sans-serif'
    ctx.fillText(art, col3, mid - 2)
    ctx.fillStyle = fg; ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'right'; ctx.fillText(String(s._count), col4, mid); ctx.textAlign = 'left'
  })

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob)))
}

/**
 * 检查并生成定时报告（周报/月报/年报）
 */
export function checkScheduledReports(songs, isDarkMode) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon
  const dayOfMonth = now.getDate()
  const month = now.getMonth() // 0=Jan
  const year = now.getFullYear()

  const tasks = []

  // 周一 → 上周周报
  if (dayOfWeek === 1) {
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - 7)
    const lastSunday = new Date(now)
    lastSunday.setDate(now.getDate() - 1)
    const dateStr = `${lastMonday.getMonth() + 1}/${lastMonday.getDate()} - ${lastSunday.getMonth() + 1}/${lastSunday.getDate()}`
    tasks.push({
      title: 'Rhizome 周报',
      subtitle: `${dateStr}, ${year}`,
      filename: `rhizome-weekly-${year}-${String(month + 1).padStart(2, '0')}-W${Math.ceil(dayOfMonth / 7)}.png`
    })
  }

  // 每月 1 号 → 上月月报
  if (dayOfMonth === 1) {
    const lastMonth = month === 0 ? 11 : month - 1
    const lastMonthYear = month === 0 ? year - 1 : year
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    tasks.push({
      title: 'Rhizome 月报',
      subtitle: `${monthNames[lastMonth]}, ${lastMonthYear}`,
      filename: `rhizome-monthly-${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}.png`
    })
  }

  // 每年 1 月 1 号 → 上年年报
  if (month === 0 && dayOfMonth === 1) {
    tasks.push({
      title: 'Rhizome 年报',
      subtitle: `${year - 1} 年度`,
      filename: `rhizome-yearly-${year - 1}.png`
    })
  }

  return tasks.map(t => ({ ...t, songs, isDarkMode }))
}

/**
 * 获取报告保存路径
 */
export function getReportSavePath() {
  return localStorage.getItem('rhizome-report-path') || ''
}

export function setReportSavePath(p) {
  localStorage.setItem('rhizome-report-path', p)
}
