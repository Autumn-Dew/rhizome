<template>
  <div class="music-timeline" :class="[themeClass, { entered }]">
    <!-- 页头：与其他页面统一 -->
    <div class="tl-header">
      <div class="tl-header-row">
        <div>
          <h2>音乐时间线</h2>
          <p class="tl-desc">每次播放记录为一个站点</p>
        </div>
        <button class="tl-back-btn" @click="goBack" title="返回播放历史">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          <span>返回</span>
        </button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="tl-toolbar">
      <button class="tl-nav-btn" @click="goPrev" title="上一段">←</button>
      <button v-for="v in views" :key="v.key" class="tl-view-btn" :class="{ active: view === v.key }" @click="setView(v.key)">{{ v.label }}</button>
      <button class="tl-nav-btn" @click="goNext" title="下一段">→</button>
      <span class="tl-hint">← 滚轮缩放 · 拖拽平移 →</span>
    </div>

    <div class="tl-canvas-wrap">
      <canvas ref="tlCanvas" class="tl-canvas"
        @wheel.prevent="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @click="onClick"></canvas>
      <div class="tl-zoom">
        <span class="tl-zoom-label">{{ zoomLevel }}×</span>
        <input type="range" class="tl-zoom-slider" min="1" :max="maxZoom" :value="zoomLevel" @input="onZoomSlider" />
      </div>
    </div>

    <!-- hover 时底部浮层显示歌曲信息 -->
    <div class="tl-hover-bar" :class="{ visible: !!hoveredSong }">
      <div class="tl-hover-cover" v-if="hoveredSong && hoveredSong.coverUrl">
        <img :src="hoveredSong.coverUrl" alt="" />
      </div>
      <div class="tl-hover-cover" v-else>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
      </div>
      <div class="tl-hover-info">
        <div class="tl-hover-name">{{ hoveredSong?.name || '未知歌曲' }}</div>
        <div class="tl-hover-artist">{{ hoveredSong?.singer || '' }}</div>
      </div>
      <div class="tl-hover-time">{{ hoveredTime }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlayerStore } from '@/stores/playerStore'

const router = useRouter()
const { themeClass } = useGlobalTheme()
const localMusicStore = useLocalMusicStore()
const playerStore = usePlayerStore()

const tlCanvas = ref(null)
const view = ref('day')
const hasData = ref(false)
const entered = ref(false)
const hoveredSong = ref(null)
const hoveredTime = ref('')
const zoomLevel = ref(1)
const maxZoom = ref(20)
const views = [
  { key: 'day', label: '天' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
  { key: 'all', label: '全部' },
]

let rawData = []
let songMap = {}
let songPlayCount = {}  // path → 总播放次数
let viewStart = 0
let viewEnd = 0
let viewOrigStart = 0
let viewOrigEnd = 0
let viewCenter = 0     // 缩放中心点
let dragging = false
let dragStartX = 0
let dragStartView = 0
let hoveredIdx = -1
let tooltipTimeout = null

function goBack() { router.back() }

function loadData() {
  try { rawData = JSON.parse(localStorage.getItem('playHistoryFull') || '[]') }
  catch { rawData = [] }
  rawData.sort((a, b) => a.playAt - b.playAt)
  hasData.value = rawData.length > 0
  songMap = {}
  for (const s of localMusicStore.songList) songMap[s.path] = s
  // 统合每首歌全量播放次数
  songPlayCount = {}
  for (const d of rawData) songPlayCount[d.path] = (songPlayCount[d.path] || 0) + 1
}

const summaryText = computed(() => {
  if (!rawData.length) return '暂无播放记录'
  const unique = new Set(rawData.map(d => d.path))
  const totalSec = rawData.reduce((a, d) => a + (d.duration || 0), 0)
  const h = Math.floor(totalSec / 3600)
  const first = rawData[0]; const last = rawData[rawData.length - 1]
  const y0 = first ? new Date(first.playAt).getFullYear() : ''
  const y1 = last ? new Date(last.playAt).getFullYear() : ''
  const yr = y0 === y1 ? `${y0} 年` : `${y0}–${y1} 年`
  return `${yr} 共 ${rawData.length} 次播放 · ${unique.size} 首歌 · ${h} 小时`
})

function calcView() {
  const now = Date.now(); const D = 86400000
  const d = new Date()
  switch (view.value) {
    case 'day':
      d.setHours(0,0,0,0); viewStart = d.getTime()
      viewEnd = viewStart + 86400000; break
    case 'week': {
      const dow = d.getDay(); const mon = dow === 0 ? 6 : dow - 1
      d.setDate(d.getDate() - mon); d.setHours(0,0,0,0)
      viewStart = d.getTime(); viewEnd = now; break
    }
    case 'month':
      d.setDate(1); d.setHours(0,0,0,0)
      viewStart = d.getTime(); viewEnd = now; break
    case 'year':
      d.setMonth(0); d.setDate(1); d.setHours(0,0,0,0)
      viewStart = d.getTime(); viewEnd = now; break
    case 'all': {
      if (!rawData.length) { viewStart = now - D * 30; viewEnd = now; break }
      const all = rawData.map(d => d.playAt)
      viewStart = Math.min(...all) - D * 2; viewEnd = Math.max(...all) + D * 2; break
    }
    default: return
  }
  viewOrigStart = viewStart
  viewOrigEnd = viewEnd
  viewCenter = (viewStart + viewEnd) / 2
  zoomLevel.value = 1
}

function applyZoom() {
  const origRange = viewOrigEnd - viewOrigStart
  const half = origRange / (2 * zoomLevel.value)
  viewStart = Math.max(viewOrigStart, viewCenter - half)
  viewEnd   = Math.min(viewOrigEnd,   viewCenter + half)
}

function onZoomSlider(e) {
  zoomLevel.value = Number(e.target.value)
  applyZoom()
  draw()
}

function goPrev() {
  const range = viewOrigEnd - viewOrigStart
  viewStart = viewOrigStart - range
  viewEnd   = viewOrigEnd   - range
  viewOrigStart = viewStart
  viewOrigEnd   = viewEnd
  viewCenter = (viewStart + viewEnd) / 2
  zoomLevel.value = 1
  view.value = 'custom'; draw()
}

function goNext() {
  if (viewOrigEnd >= Date.now() - 60000) return
  const range = viewOrigEnd - viewOrigStart
  viewStart = viewOrigStart + range
  viewEnd   = Math.min(viewOrigEnd + range, Date.now())
  viewOrigStart = viewStart
  viewOrigEnd   = viewEnd
  viewCenter = (viewStart + viewEnd) / 2
  zoomLevel.value = 1
  view.value = 'custom'; draw()
}

function setView(k) { view.value = k; calcView(); draw() }

// 根据时间范围计算合适的刻度间隔（毫秒）
function calcTickInterval(rangeMs) {
  const H = 3600000; const D = 86400000
  if (rangeMs <= 2*H)       return 10*60000   // ≤2h → 10分钟
  if (rangeMs <= 6*H)       return 30*60000   // ≤6h → 30分钟
  if (rangeMs <= 24*H)      return H           // ≤24h → 1小时
  if (rangeMs <= 3*D)       return 6*H         // ≤3天 → 6小时
  if (rangeMs <= 14*D)      return D           // ≤14天 → 1天
  if (rangeMs <= 60*D)      return 7*D         // ≤60天 → 1周
  if (rangeMs <= 365*D)     return 30*D        // ≤1年 → 1月
  return 90*D                                  // >1年 → 3个月
}

function draw() {
  const canvas = tlCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  if (w <= 0 || h <= 0) return
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr)

  const cs = getComputedStyle(document.documentElement)
  const textColor = cs.getPropertyValue('--text-primary').trim() || '#fff'
  const borderColor = cs.getPropertyValue('--border-color').trim() || '#fff'
  const hoverBg = cs.getPropertyValue('--btn-hover-bg').trim() || '#fff'

  ctx.clearRect(0, 0, w, h)

  const range = viewEnd - viewStart
  if (range <= 0) return

  const padX = 72
  const padTop = 28
  const padBottom = 28
  const sqSize = 14
  const rowCount = 3  // 固定三行
  const actualRowH = (h - padTop - padBottom) / rowCount
  const segRange = range / rowCount

  // ── 逐行绘制 ──
  for (let row = 0; row < rowCount; row++) {
    const segStart = viewStart + row * segRange
    const segEnd = segStart + segRange
    const rowY = padTop + row * actualRowH + actualRowH * 0.5
    const leftToRight = row % 2 === 0

    // 本行内的数据
    const rowData = rawData.filter(d => d.playAt >= segStart && d.playAt < segEnd)

    // ── 水平线段 ──
    const x1 = padX
    const x2 = w - padX
    ctx.strokeStyle = borderColor; ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x1, rowY)
    ctx.lineTo(x2, rowY)
    ctx.stroke()

    // ── 行首尾延伸提示 ──
    const extLen = 48
    if (row === 0) {
      // 第一行：左端延伸
      ctx.globalAlpha = 0.25
      ctx.beginPath(); ctx.moveTo(x1 - extLen, rowY); ctx.lineTo(x1, rowY); ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (row === rowCount - 1) {
      // 最后一行：右端延伸
      ctx.globalAlpha = 0.25
      ctx.beginPath(); ctx.moveTo(x2, rowY); ctx.lineTo(x2 + extLen, rowY); ctx.stroke()
      ctx.globalAlpha = 1
    }

    // ── 行间连接竖线 ──
    if (row < rowCount - 1) {
      const nextRowY = padTop + (row + 1) * actualRowH + actualRowH * 0.5
      const connX = leftToRight ? x2 : x1
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(connX, rowY)
      ctx.lineTo(connX, nextRowY)
      ctx.stroke()
    }

    // ── 时间标签（行首/行尾） ──
    ctx.fillStyle = textColor; ctx.font = '12px monospace'
    const sd = new Date(segStart); const ed = new Date(segEnd)
    let startLabel, endLabel
    if (view.value === 'day') {
      startLabel = `${String(sd.getHours()).padStart(2,'0')}:00`
      endLabel   = `${String(ed.getHours()).padStart(2,'0')}:00`
    } else {
      startLabel = `${sd.getMonth()+1}/${sd.getDate()}`
      endLabel   = `${ed.getMonth()+1}/${ed.getDate()}`
    }
    ctx.textAlign = leftToRight ? 'left' : 'right'
    ctx.globalAlpha = 0.5
    ctx.fillText(startLabel, leftToRight ? x1 + 6 : x2 - 6, rowY - 14)
    ctx.fillText(endLabel,   leftToRight ? x2 - 6 : x1 + 6, rowY - 14)
    ctx.globalAlpha = 1

    // ── 时间基准刻度 ──
    const tickInterval = calcTickInterval(segRange)
    if (tickInterval > 0) {
      // 对齐到刻度边界
      let tickTs = Math.ceil(segStart / tickInterval) * tickInterval
      while (tickTs < segEnd) {
        const frac = (tickTs - segStart) / segRange
        if (frac >= 0 && frac <= 1) {
          const tx = leftToRight ? x1 + frac * (x2 - x1) : x2 - frac * (x2 - x1)
          ctx.strokeStyle = borderColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.25
          ctx.beginPath(); ctx.moveTo(tx, rowY - 5); ctx.lineTo(tx, rowY + 5); ctx.stroke()
          // 刻度标签
          const td = new Date(tickTs)
          let tickLabel
          if (segRange <= 3600000)           tickLabel = `${String(td.getMinutes()).padStart(2,'0')}m`
          else if (segRange <= 86400000)     tickLabel = `${String(td.getHours()).padStart(2,'0')}:00`
          else if (segRange <= 7*86400000)   tickLabel = `${td.getMonth()+1}/${td.getDate()}`
          else if (segRange <= 60*86400000)  tickLabel = `${td.getMonth()+1}/${td.getDate()}`
          else                               tickLabel = `${td.getMonth()+1}月`
          ctx.fillStyle = textColor; ctx.font = '9px monospace'; ctx.textAlign = 'center'
          ctx.globalAlpha = 0.35
          ctx.fillText(tickLabel, tx, rowY + (leftToRight ? 15 : -15))
        }
        tickTs += tickInterval
      }
    }
    ctx.globalAlpha = 1

    // ── 站点 ──
    if (!rowData.length) continue
    // 聚合
    const maxStations = Math.max(3, Math.floor((w - padX * 2) / 60))
    let stations
    if (rowData.length <= maxStations) {
      stations = rowData.map(d => ({
        ts: d.playAt, events: [d], count: 1,
        hot: false,
      }))
    } else {
      const bucketMs = segRange / maxStations
      const map = new Map()
      for (const d of rowData) {
        const key = Math.floor((d.playAt - segStart) / bucketMs)
        if (!map.has(key)) map.set(key, { ts: segStart + key * bucketMs + bucketMs / 2, events: [], count: 0, hot: false })
        const b = map.get(key); b.events.push(d); b.count++
      }
      stations = Array.from(map.values())
      // 聚合后：count > 5 即为热门
      for (const s of stations) s.hot = s.count > 5
    }

    const maxCount = Math.max(1, ...stations.map(s => s.count))
    for (let si = 0; si < stations.length; si++) {
      const s = stations[si]
      const frac = (s.ts - segStart) / segRange
      if (frac < 0 || frac > 1) continue
      const sx = leftToRight ? x1 + frac * (x2 - x1) : x2 - frac * (x2 - x1)
      const above = si % 2 === 0
      const yOff = above ? -sqSize - 8 : sqSize + 8
      const labelY = above ? rowY - sqSize - 16 : rowY + sqSize + 26

      // 连接线
      ctx.strokeStyle = borderColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45
      ctx.beginPath(); ctx.moveTo(sx, rowY); ctx.lineTo(sx, rowY + yOff); ctx.stroke()

      // 方形站点 — 全黑色系
      const sz = sqSize + Math.min(10, (s.count / maxCount) * 10)
      // 填充：实心黑色
      ctx.fillStyle = borderColor; ctx.globalAlpha = 0.85
      ctx.fillRect(sx - sz / 2, rowY + yOff - sz / 2, sz, sz)

      // 播放次数 >5：加外框
      if (s.hot) {
        ctx.strokeStyle = borderColor; ctx.lineWidth = 2
        ctx.strokeRect(sx - sz / 2 - 3, rowY + yOff - sz / 2 - 3, sz + 6, sz + 6)
      }

      // 标签
      const song = songMap[s.events[0]?.path]
      if (song && s.count <= 8) {
        const short = song.name.length > 8 ? song.name.slice(0, 7) + '…' : song.name
        ctx.fillStyle = textColor; ctx.font = '11px monospace'; ctx.textAlign = 'center'
        ctx.globalAlpha = 0.45; ctx.fillText(short, sx, labelY)
      }
      if (s.count > 5) {
        ctx.fillStyle = textColor; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'
        ctx.globalAlpha = 0.75; ctx.fillText(s.count, sx, rowY + yOff + 4)
      }
    }
  }
  ctx.globalAlpha = 1

  // ── hover 高亮（方形边框，不画圆） ──
  if (hoveredIdx >= 0 && hoveredIdx < rawData.length) {
    const d = rawData[hoveredIdx]
    // 找到所在行
    const row = Math.min(rowCount - 1, Math.floor((d.playAt - viewStart) / segRange))
    const segStart = viewStart + row * segRange
    const segEnd = segStart + segRange
    const leftToRight = row % 2 === 0
    const rowY = padTop + row * actualRowH + actualRowH * 0.5
    const frac = Math.max(0, Math.min(1, (d.playAt - segStart) / segRange))
    const hx = leftToRight ? padX + frac * (w - padX * 2) : w - padX - frac * (w - padX * 2)

    // 方形高亮边框（仅边框，无反色填充）
    const hlSize = sqSize - 1
    ctx.strokeStyle = hoverBg; ctx.lineWidth = 2
    ctx.strokeRect(hx - hlSize / 2, rowY - hlSize / 2, hlSize, hlSize)
  }
}

// ── 交互 ──
function onWheel(e) {
  const delta = e.deltaY > 0 ? -1 : 1
  zoomLevel.value = Math.max(1, Math.min(maxZoom.value, zoomLevel.value + delta))
  viewCenter = (viewStart + viewEnd) / 2
  applyZoom()
  view.value = 'custom'; draw()
}
function onMouseDown(e) { dragging = true; dragStartX = e.clientX; dragStartView = viewStart }
function onMouseUp() { dragging = false }

function onMouseMove(e) {
  if (dragging) {
    const range = viewEnd - viewStart
    viewStart = dragStartView - ((e.clientX - dragStartX) / tlCanvas.value.offsetWidth) * range
    viewStart = Math.max(viewOrigStart, Math.min(viewOrigEnd - range, viewStart))
    viewEnd = viewStart + range
    viewCenter = (viewStart + viewEnd) / 2
    draw(); return
  }
  const canvas = tlCanvas.value
  if (!canvas || !rawData.length) { clearHover(); return }
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left; const my = e.clientY - rect.top
  const w = canvas.offsetWidth; const h = canvas.offsetHeight
  const rowH = (h - 56) / 3
  const rowCount = 3
  const segRange = (viewEnd - viewStart) / rowCount

  let bestIdx = -1, bestDist = 56
  for (let i = 0; i < rawData.length; i++) {
    const t = rawData[i].playAt
    if (t < viewStart || t > viewEnd) continue
    const row = Math.min(rowCount - 1, Math.floor((t - viewStart) / segRange))
    const segStart = viewStart + row * segRange
    const rowY = 28 + row * rowH + rowH * 0.5
    const frac = (t - segStart) / segRange
    const leftToRight = row % 2 === 0
    const sx = leftToRight ? 72 + frac * (w - 144) : w - 72 - frac * (w - 144)
    const dist = Math.abs(mx - sx) + Math.abs(my - rowY)
    if (dist < bestDist) { bestDist = dist; bestIdx = i }
  }
  if (bestIdx !== hoveredIdx) {
    hoveredIdx = bestIdx
    draw()
    updateHoverCard()
  }
}

function updateHoverCard() {
  clearTimeout(tooltipTimeout)
  if (hoveredIdx < 0) { hoveredSong.value = null; return }
  const d = rawData[hoveredIdx]
  const song = songMap[d.path]
  if (song) {
    hoveredSong.value = { ...song }
  } else {
    hoveredSong.value = { name: '未知歌曲', singer: '' }
  }
  const dt = new Date(d.playAt)
  hoveredTime.value = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

function clearHover() {
  if (hoveredIdx >= 0) { hoveredIdx = -1; draw(); hoveredSong.value = null }
}

function onClick() {
  if (hoveredIdx < 0) return
  const d = rawData[hoveredIdx]
  const song = songMap[d.path]
  if (song) { playerStore.setPlayList(localMusicStore.songList); playerStore.playGlobalSong(song) }
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    requestAnimationFrame(() => draw())
  }, 80)
}
watch(view, () => { calcView(); draw() })
watch(themeClass, () => draw())  // 主题切换时重绘 canvas
onMounted(() => {
  loadData()
  calcView()
  draw()
  requestAnimationFrame(() => { entered.value = true })
  window.addEventListener('resize', onResize)
})
onUnmounted(() => { window.removeEventListener('resize', onResize); clearTimeout(tooltipTimeout) })
</script>

<style scoped>
/* ═══ 主题变量（与其他页面统一） ═══ */
.theme-white {
  --bg: #fff; --text: #000; --border: #000;
  --btn: #f8f8f8; --btn-hover: #000; --btn-text: #fff; --light: #f5f5f5;
}
.theme-dark {
  --bg: #2c2c2c; --text: #fff; --border: #fff;
  --btn: #292929; --btn-hover: #fff; --btn-text: #000; --light: #333;
}

.music-timeline {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

/* ═══ 页头 ═══ */
.tl-header {
  padding: 16px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.tl-header::after {
  content: ''; position: absolute; bottom: 0; left: 0;
  width: 100%; height: 2px;
  background: var(--border-color);
  transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .tl-header::after { transform: scaleX(1); }

.tl-header-row { display: flex; justify-content: space-between; align-items: flex-start; }

.tl-header h2 {
  font-size: 20px; margin: 0 0 4px;
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              transform 0.18s cubic-bezier(0.2, 0, 0.2, 1),
              letter-spacing 0.25s cubic-bezier(0.2, 0, 0.2, 1);
}
.entered .tl-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.tl-desc {
  font-size: 12px; margin: 0;
  opacity: 0; transform: translateY(-6px);
  transition: opacity 0.15s ease 0.04s, transform 0.15s ease 0.04s;
}
.entered .tl-desc { opacity: 0.7; transform: translateY(0); }

/* 返回按钮 */
.tl-back-btn {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px; font-family: monospace;
  cursor: pointer; flex-shrink: 0;
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease 0.06s,
              transform 0.13s cubic-bezier(0.25, 0, 0, 1) 0.06s,
              background 0.2s, color 0.2s;
}
.entered .tl-back-btn { opacity: 1; transform: scaleX(1); }
.tl-back-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.tl-back-btn svg { width: 15px; height: 15px; }

/* ═══ 工具栏 ═══ */
.tl-toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 16px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.tl-toolbar::after {
  content: ''; position: absolute; bottom: 0; left: 0;
  width: 100%; height: 2px;
  background: var(--border-color);
  transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .tl-toolbar::after { transform: scaleX(1); }

.tl-view-btn, .tl-nav-btn, .tl-seed-btn {
  height: 26px; padding: 0 10px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 11px; font-family: monospace;
  cursor: pointer;
  opacity: 0; transform: scaleX(0);
  transition: opacity 0.12s ease 0.12s,
              transform 0.13s cubic-bezier(0.25, 0, 0, 1) 0.12s,
              background 0.2s, color 0.2s;
}
.tl-nav-btn { padding: 0 8px; font-size: 12px; }

.entered .tl-view-btn,
.entered .tl-nav-btn { opacity: 1; transform: scaleX(1); }

.tl-view-btn.active,
.tl-view-btn:hover,
.tl-nav-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

.tl-hint {
  margin-left: auto; font-size: 10px; font-family: monospace;
  opacity: 0; transition: opacity 0.15s ease 0.20s;
}
.entered .tl-hint { opacity: 0.35; }

/* ═══ 画布 ═══ */
.tl-canvas-wrap {
  flex: 1; position: relative; overflow: hidden;
}
.tl-canvas {
  width: 100%; height: 100%; cursor: crosshair;
  opacity: 0;
  transition: opacity 0.25s ease 0.44s;
}
.entered .tl-canvas { opacity: 1; }
.tl-canvas:active { cursor: grabbing; }

/* ═══ 缩放控件（画布右上角内部） ═══ */
.tl-zoom {
  position: absolute; top: 8px; right: 12px;
  display: flex; align-items: center; gap: 6px;
  z-index: 2;
  opacity: 0; transition: opacity 0.2s ease 0.50s;
}
.entered .tl-zoom { opacity: 1; }

.tl-zoom-label {
  font-size: 10px; font-family: monospace;
  color: var(--text-primary); opacity: 0.7;
}

.tl-zoom-slider {
  -webkit-appearance: none; appearance: none;
  width: 64px; height: 3px;
  background: var(--border-color);
  opacity: 1; outline: none; cursor: pointer;
}
.tl-zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 10px; height: 10px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
}

/* ═══ hover 信息卡 ═══ */
.tl-hover-bar {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px 6px 6px;
  border: 2px solid var(--border-color);
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  opacity: 0; pointer-events: none;
  transition: opacity 0.12s;
  z-index: 10;
}
.tl-hover-bar.visible { opacity: 1; }

.tl-hover-cover {
  width: 36px; height: 36px;
  border: 1px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.tl-hover-cover img { width: 100%; height: 100%; object-fit: cover; }
.tl-hover-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: 0.5; }

.tl-hover-info { min-width: 0; }
.tl-hover-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.tl-hover-artist { font-size: 11px; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }

.tl-hover-time { font-size: 10px; font-family: monospace; opacity: 0.55; white-space: nowrap; }
</style>
