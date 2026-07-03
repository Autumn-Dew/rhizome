// 听歌报告生成器 — Canvas 2D，3x 分辨率，黑白极简风
import { K_REPORT_PATH } from '@/constants/storage-keys'

const SCALE = 3

export async function generateReportBlob(songs, isDarkMode, title, subtitle, topN = 10) {
  const ranked = songs
    .map(s => ({ ...s, _count: s.playCount || s._count || 0 }))
    .filter(s => s._count > 0)
    .sort((a, b) => b._count - a._count)
    .slice(0, topN)
  if (!ranked.length) return null

  const bg     = isDarkMode ? '#2c2c2c' : '#ffffff'
  const cardBg = isDarkMode ? '#333333' : '#f8f8f8'
  const fg     = isDarkMode ? '#ffffff' : '#000000'
  const border = isDarkMode ? '#ffffff' : '#000000'
  const sub    = isDarkMode ? '#999999' : '#666666'

  const W = 640, pad = 24
  const headerH = 96
  const itemH = 40

  // 计算总高度
  let logicalH = 24 + headerH + 16
  logicalH += ranked.length * itemH + 44 // 列表卡片含表头
  logicalH += 40 // 底部

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = logicalH * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  const FONT = '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif'

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, logicalH)
  let y = 24

  // ── 头部卡片 ──
  ctx.fillStyle = cardBg
  ctx.fillRect(pad, y, W - pad * 2, headerH)
  ctx.strokeStyle = border; ctx.lineWidth = 2
  ctx.strokeRect(pad, y, W - pad * 2, headerH)

  ctx.fillStyle = fg; ctx.font = `bold 22px ${FONT}`
  ctx.fillText(title, pad + 20, y + 38)
  ctx.fillStyle = sub; ctx.font = `13px ${FONT}`
  ctx.fillText(subtitle, pad + 20, y + 60)

  const totalPlays = ranked.reduce((s, r) => s + r._count, 0)
  ctx.textAlign = 'right'
  ctx.fillStyle = fg; ctx.font = `bold 26px ${FONT}`
  ctx.fillText(String(totalPlays), W - pad - 20, y + 42)
  ctx.fillStyle = sub; ctx.font = `11px ${FONT}`
  ctx.fillText('\u603b\u64ad\u653e\u6b21\u6570', W - pad - 20, y + 62)
  ctx.textAlign = 'left'
  y += headerH + 16

  // ── 列表卡片 ──
  const listH = ranked.length * itemH + 44
  ctx.fillStyle = cardBg
  ctx.fillRect(pad, y, W - pad * 2, listH)
  ctx.strokeStyle = border; ctx.lineWidth = 2
  ctx.strokeRect(pad, y, W - pad * 2, listH)

  const lx = pad + 16; let ly = y + 28
  ctx.fillStyle = sub; ctx.font = `10px monospace`
  ctx.fillText('#', lx, ly)
  ctx.fillText('TITLE', lx + 28, ly)
  ctx.textAlign = 'right'
  ctx.fillText('PLAYS', W - pad - 16, ly)
  ctx.textAlign = 'left'

  ctx.strokeStyle = isDarkMode ? '#555' : '#d0d0d0'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(lx, ly + 6); ctx.lineTo(W - pad - 16, ly + 6); ctx.stroke()

  ly += 14
  ranked.forEach((s, i) => {
    const rowY = ly + i * itemH + 10

    ctx.fillStyle = sub; ctx.font = `12px monospace`
    ctx.fillText(String(i + 1), lx, rowY)

    const nm = s.name.length > 20 ? s.name.substring(0, 19) + '\u2026' : s.name
    ctx.fillStyle = fg; ctx.font = `13px ${FONT}`
    ctx.fillText(nm, lx + 28, rowY - 1)

    const art = (s.singer || '').length > 16 ? (s.singer || '').substring(0, 15) + '\u2026' : (s.singer || '')
    ctx.fillStyle = sub; ctx.font = `11px ${FONT}`
    ctx.fillText(art, lx + 28, rowY + 14)

    ctx.fillStyle = fg; ctx.font = `bold 12px monospace`
    ctx.textAlign = 'right'
    ctx.fillText(String(s._count), W - pad - 16, rowY)
    ctx.textAlign = 'left'
  })
  y += listH + 16

  // ── 底部 ──
  y += 8
  ctx.fillStyle = sub; ctx.font = `10px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(`Rhizome \u00b7 ${new Date().toLocaleDateString('zh-CN')}`, W / 2, y)
  ctx.textAlign = 'left'

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

export function checkScheduledReports(songs, isDarkMode) {
  const now = new Date()
  const d = now.getDay(), dm = now.getDate(), m = now.getMonth(), y = now.getFullYear()
  const tasks = []
  if (d === 1) {
    const lm = new Date(now); lm.setDate(now.getDate() - 7)
    const ls = new Date(now); ls.setDate(now.getDate() - 1)
    tasks.push({ title: 'Rhizome \u5468\u62a5', subtitle: `${lm.getMonth() + 1}/${lm.getDate()} - ${ls.getMonth() + 1}/${ls.getDate()}, ${y}`,
      filename: `rhizome-weekly-${y}-${String(m + 1).padStart(2, '0')}-W${Math.ceil(dm / 7)}.png` })
  }
  if (dm === 1) {
    const mn = ['1\u6708','2\u6708','3\u6708','4\u6708','5\u6708','6\u6708','7\u6708','8\u6708','9\u6708','10\u6708','11\u6708','12\u6708']
    const lm = m === 0 ? 11 : m - 1, lmy = m === 0 ? y - 1 : y
    tasks.push({ title: 'Rhizome \u6708\u62a5', subtitle: `${mn[lm]}, ${lmy}`, filename: `rhizome-monthly-${lmy}-${String(lm + 1).padStart(2, '0')}.png` })
  }
  if (m === 0 && dm === 1) {
    tasks.push({ title: 'Rhizome \u5e74\u62a5', subtitle: `${y - 1} \u5e74\u5ea6`, filename: `rhizome-yearly-${y - 1}.png` })
  }
  return tasks.map(t => ({ ...t, songs, isDarkMode }))
}

export function getReportSavePath() { return localStorage.getItem(K_REPORT_PATH) || '' }
export function setReportSavePath(p) { localStorage.setItem(K_REPORT_PATH, p) }
