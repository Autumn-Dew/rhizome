<template>
  <div class="diary-page" :class="[themeClass, { entered }]">
    <div class="diary-header">
      <div class="header-row">
        <div>
          <h2>听歌日记</h2>
          <p class="desc">每天的三个瞬间</p>
        </div>
        <button class="tl-entry-btn" @click="goBack" title="返回播放历史">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          <span>返回</span>
        </button>
      </div>
    </div>

    <div class="diary-toolbar">
      <button class="tl-entry-btn" @click="goMonth(-1)" :disabled="!hasPrevMonth">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="diary-month-label">{{ currentMonthLabel }}</span>
      <button class="tl-entry-btn" @click="goMonth(1)" :disabled="!hasNextMonth">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <span class="diary-hint">← 滚轮滚动 →</span>
    </div>

    <div class="diary-scroll" ref="scrollBox" @wheel.prevent="onWheel">
      <div class="diary-cards">
        <div v-for="(entry, idx) in entries" :key="entry.date" class="diary-card" :style="staggerStyle(idx)">
          <div class="diary-card-head">
            <div class="diary-card-date">{{ entry.dateLabel }}</div>
            <div class="diary-card-summary">{{ entry.summary }}</div>
          </div>
          <div class="diary-card-songs">
            <div class="diary-song" v-for="(song, si) in entry.songs" :key="si" @dblclick="playSong(song)">
              <div class="diary-song-cover">
                <img v-if="song.coverUrl" :src="song.coverUrl" loading="lazy" decoding="async" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>
              </div>
              <div class="diary-song-info">
                <div class="diary-song-tag">{{ song.tag }}</div>
                <div class="diary-song-name">{{ song.name }}</div>
                <div class="diary-song-meta">{{ song.singer }}<span v-if="song.timeLabel"> · {{ song.timeLabel }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="diary-empty" v-if="!entries.length">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
      <p>暂无播放记录</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePageEnter } from '@/composables/usePageEnter'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlayerStore } from '@/stores/playerStore'
import { K_PLAY_HISTORY_FULL } from '@/constants/storage-keys'

const { themeClass } = useGlobalTheme()
const { entered, staggerStyle } = usePageEnter()
const router = useRouter()
const localMusicStore = useLocalMusicStore()
const playerStore = usePlayerStore()

const scrollBox = ref(null)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const hasData = ref(false)

const currentMonthLabel = computed(() => `${currentYear.value} 年 ${currentMonth.value} 月`)
const hasPrevMonth = computed(() => {
  const d = new Date()
  return currentYear.value > d.getFullYear() - 2 || (currentYear.value === d.getFullYear() - 2 && currentMonth.value > d.getMonth() + 1)
})
const hasNextMonth = computed(() => {
  const d = new Date()
  return currentYear.value < d.getFullYear() || (currentYear.value === d.getFullYear() && currentMonth.value < d.getMonth() + 1)
})
function goMonth(delta) {
  let m = currentMonth.value + delta, y = currentYear.value
  if (m > 12) { m = 1; y++ }
  if (m < 1) { m = 12; y-- }
  currentYear.value = y; currentMonth.value = m
}
function goBack() { router.push('/player/history') }

const entries = ref([])
function loadDiary() {
  try {
    const full = JSON.parse(localStorage.getItem(K_PLAY_HISTORY_FULL) || '[]')
    if (!full.length) { hasData.value = false; entries.value = []; return }
    hasData.value = true
    const ms = new Date(currentYear.value, currentMonth.value - 1, 1).getTime()
    const me = new Date(currentYear.value, currentMonth.value, 1).getTime()
    const records = full.filter(h => h.playAt >= ms && h.playAt < me)
    const songMap = {}
    for (const s of localMusicStore.songList) songMap[s.path] = s
    const cache = JSON.parse(localStorage.getItem('rhizome-song-cache') || '[]')
    for (const c of cache) { if (!songMap[c.path]) songMap[c.path] = c }
    const dayMap = {}
    for (const h of records) {
      const d = new Date(h.playAt)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!dayMap[k]) dayMap[k] = []
      const s = songMap[h.path]
      dayMap[k].push({ path: h.path, time: h.playAt, name: s?.name || '未知歌曲', singer: s?.singer || '', coverUrl: s?.coverUrl || '', ts: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })
    }
    const wd = ['日','一','二','三','四','五','六']
    const r = []
    for (const [dk, songs] of Object.entries(dayMap)) {
      const [y, m, d] = dk.split('-')
      const dt = new Date(+y, +m-1, +d)
      const sorted = songs.sort((a, b) => a.time - b.time)
      const cm = {}; for (const s of sorted) cm[s.path] = (cm[s.path]||0)+1
      let mp = sorted[0].path, mc = 0
      for (const [p, c] of Object.entries(cm)) { if (c > mc) { mp = p; mc = c } }
      const most = sorted.find(s => s.path === mp) || sorted[0]
      const picks = [
        { ...sorted[0], tag: '第一首', timeLabel: '' },
        { ...most, tag: `今天最爱 · ${mc} 遍`, timeLabel: '' },
        { ...sorted[sorted.length-1], tag: '最后一首', timeLabel: '' },
      ]
      const tm = Math.ceil(songs.length * 3), hh = Math.floor(tm/60), mm = tm%60
      r.push({ date: dk, dateLabel: `${+m}月${+d}日 · 周${wd[dt.getDay()]}`, summary: `${songs.length} 首歌 · ${hh>0?hh+'小时':''}${mm}分钟`, songs: picks })
    }
    r.sort((a, b) => a.date.localeCompare(b.date))
    entries.value = r
  } catch { entries.value = [] }
}
function playSong(song) {
  const full = localMusicStore.songList.find(s => s.path === song.path)
  if (full && full.exists !== false) {
    playerStore.setPlayList([full])
    playerStore.playGlobalSong(full)
  }
}
function onWheel(e) { const b = scrollBox.value; if (b) b.scrollLeft += e.deltaY }
watch([currentYear, currentMonth], loadDiary)

onMounted(() => { if (!localMusicStore.loaded) localMusicStore.initFromStorage().then(loadDiary); else loadDiary() })
</script>

<style scoped>
.diary-page {
  flex: 1; min-height: 0; height: 100%;
  background: var(--bg-primary); color: var(--text-primary);
  display: flex; flex-direction: column; overflow: hidden;
}

/* header — 统一其他页面 */
.diary-header { padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.diary-header::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .diary-header::after { transform: scaleX(1); }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.diary-header h2 {
  font-size: 20px; margin: 0 0 4px;
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard), transform var(--motion-duration-medium) var(--motion-easing-standard), letter-spacing var(--motion-duration-slow);
}
.entered .diary-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }
.desc {
  font-size: 12px;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .desc { opacity: 0.7; transform: translateY(0); }

/* toolbar — 统一 */
.diary-toolbar {
  display: flex; gap: 8px; padding: 12px; align-items: center;
  border-bottom: 2px solid transparent; position: relative;
}
.diary-toolbar::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .diary-toolbar::after { transform: scaleX(1); }
.diary-month-label {
  font-size: 13px; font-family: monospace; min-width: 100px; text-align: center;
  opacity: 0; transform: translateY(-4px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.10s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.10s;
}
.entered .diary-month-label { opacity: 1; transform: translateY(0); }
.diary-hint {
  font-size: 11px; font-family: monospace; margin-left: auto;
  opacity: 0;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.18s;
}
.entered .diary-hint { opacity: 0.35; }

.tl-entry-btn {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 2px solid var(--border-color); background: var(--bg-secondary);
  color: var(--text-primary); font-size: 12px; font-family: monospace;
  cursor: pointer; transition: var(--motion-btn-hover); flex-shrink: 0;
}
.tl-entry-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.tl-entry-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.tl-entry-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; }

/* header 返回按钮入场 */
.header-row .tl-entry-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
  transition-delay: 0.08s;
}
.entered .header-row .tl-entry-btn { opacity: 1; transform: scaleX(1); }

/* toolbar 月份按钮入场 */
.diary-toolbar .tl-entry-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.diary-toolbar .tl-entry-btn:nth-child(1) { transition-delay: 0.08s; }
.diary-toolbar .tl-entry-btn:nth-child(3) { transition-delay: 0.13s; }
.entered .diary-toolbar .tl-entry-btn { opacity: 1; transform: scaleX(1); }

/* 横向滚动 */
.diary-scroll { flex: 1; min-height: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.diary-scroll::-webkit-scrollbar { display: none; }
.diary-cards { display: flex; gap: 16px; height: 100%; align-items: stretch; padding: 12px; }
.diary-cards::after { content: ''; min-width: 1px; }

/* 卡片 */
.diary-card {
  flex-shrink: 0; width: 320px; height: 100%;
  border: 2px solid var(--border-color);
  padding: 28px 24px; display: flex; flex-direction: column;
  justify-content: center;
  opacity: 0; transform: translateY(20px);
  transition: opacity var(--motion-duration-normal) var(--motion-easing-standard), transform var(--motion-duration-normal) var(--motion-easing-standard), border-color var(--motion-duration-normal), background var(--motion-duration-normal);
}
.entered .diary-card { opacity: 1; transform: translateY(0); }
.diary-card:hover { border-color: var(--text-primary); background: var(--bg-secondary); }
.diary-card-head {
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid transparent;
  position: relative;
}
.diary-card-head::after {
  content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 1px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .diary-card-head::after { transform: scaleX(1); }
.diary-card-date {
  font-size: 24px; font-weight: 100; letter-spacing: 2px; margin-bottom: 4px;
  opacity: 0; transform: translateX(-8px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .diary-card-date { opacity: 1; transform: translateX(0); }
.diary-card-summary {
  font-size: 12px; font-family: monospace;
  opacity: 0; transform: translateX(-6px);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease) 0.02s, transform var(--motion-duration-btn-transform) var(--motion-easing-enter) 0.02s;
}
.entered .diary-card-summary { opacity: 0.45; transform: translateX(0); }

.diary-card-songs { display: flex; flex-direction: column; gap: 16px; }
.diary-song {
  display: flex; gap: 14px; align-items: center; cursor: pointer;
  padding: 14px; border: 1px solid var(--border-color);
  position: relative; z-index: 0;
}
.diary-song::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform var(--motion-duration-slow) var(--motion-easing-ease);
}
.diary-song:hover::before { transform: scaleX(1); }
.diary-song:hover { color: var(--btn-hover-text); }
.diary-song:hover .diary-song-tag,
.diary-song:hover .diary-song-name,
.diary-song:hover .diary-song-meta { color: inherit; }
.diary-song-cover { width: 64px; height: 64px; flex-shrink: 0; overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); }
.diary-song-cover img { width: 100%; height: 100%; object-fit: cover; }
.diary-song-cover svg { width: 22px; height: 22px; opacity: 0.3; }
.diary-song-info { flex: 1; min-width: 0; }
.diary-song-tag { font-size: 11px; font-family: monospace; opacity: 0.5; margin-bottom: 4px; }
.diary-song-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.diary-song-meta { font-size: 11px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

.diary-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
  opacity: 0; transform: translateY(12px);
  transition: opacity var(--motion-duration-normal) var(--motion-easing-standard) 0.2s,
              transform var(--motion-duration-normal) var(--motion-easing-standard) 0.2s;
}
.entered .diary-empty { opacity: 0.35; transform: translateY(0); }
.diary-empty svg { width: 52px; height: 52px; }

/* ══════════════════════════════════════════════════════════════
   Ornate（华丽方案）页面装饰 —— 对齐 PlayStats：
   页面头蕾丝 + 标题居中；卡片蕾丝边 + 四角蝙蝠；
   列表项 hover 单层红覆盖 + 双白蝙蝠；按钮四边 currentColor 延展。
   ══════════════════════════════════════════════════════════════ */

/* ── 鸢尾花纹（明暗两套，.diary-page.theme-dark 切换） ── */
html[data-motion="ornate"] .diary-page {
  --dy-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23000'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}
html[data-motion="ornate"] .diary-page.theme-dark {
  --dy-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23fff'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}

/* ── 页面头：外蕾丝（左侧内嵌鸢尾，右侧有返回按钮故不装饰），标题/副标题居中 ── */
html[data-motion="ornate"] .diary-header { position: relative; }
html[data-motion="ornate"] .diary-header::before {
  content: '';
  position: absolute; inset: 6px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    var(--dy-deco), var(--dy-deco), var(--dy-deco);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%, 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%;
  opacity: 0;
  animation: dy-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .diary-header::before { opacity: 0.5; }
/* 标题/副标题居中：三列 grid（左空 / 中标题 / 右按钮）；
   标题保持在文档流内，使页头高度与其它页面一致（不再绝对居中导致高度塌陷） */
html[data-motion="ornate"] .header-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
html[data-motion="ornate"] .header-row > div { grid-column: 2; text-align: center; }
html[data-motion="ornate"] .diary-header h2 { text-align: center; letter-spacing: 2px; }
html[data-motion="ornate"] .diary-header .desc { text-align: center; }
html[data-motion="ornate"] .header-row > button { grid-column: 3; justify-self: end; }
@keyframes dy-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px, 12px 20%, 12px 50%, 12px 80%; }
}

/* ── 日记卡：蕾丝边 + 四角蝙蝠（闪烁 + 偶发变红） ── */
/* 绽放入场：scale(0.6) → scale(1)（覆盖 classic 的 translateY 位移） */
html[data-motion="ornate"] .diary-card {
  position: relative;
  transform: scale(0.6);
  transition: opacity 0.5s var(--motion-easing-standard),
              transform 1.15s cubic-bezier(0.34, 1.8, 0.64, 1);
}
html[data-motion="ornate"] .entered .diary-card { transform: scale(1); }
html[data-motion="ornate"] .diary-card::before {
  content: '';
  position: absolute; inset: 3px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0;
  animation: dy-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .diary-card::before { opacity: 0.4; }
html[data-motion="ornate"] .diary-card::after {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  background: var(--border-color);
  -webkit-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
html[data-motion="ornate"] .entered .diary-card::after {
  opacity: 0.65;
  transform: scale(1);
  animation: dy-bat 5s ease-in-out infinite;
}
@keyframes dy-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* ══════════════════════════════════════════════════════════════
   歌曲条目 hover 动效（单层）：红色覆盖 + 两只竖向白蝙蝠（左右各一，
   位于条目左右外侧）；以中心为起点，自中间向两侧展开（对齐 PlayStats）。
   ══════════════════════════════════════════════════════════════ */

/* 列表项入场：以中心为轴 scaleX(0) → scaleX(1)（元素本身无其他 transform，不与 hover 冲突） */
html[data-motion="ornate"] .diary-song {
  opacity: 0;
  transform: scaleX(0);
  transform-origin: center;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-slow) var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .diary-song { opacity: 1; transform: scaleX(1); }

/* 本风格只用单层红覆盖：彻底移除 classic 的反色滑动底 */
html[data-motion="ornate"] .diary-song::before,
html[data-motion="ornate"] .diary-song:hover::before { display: none; }

/* 单层覆盖：红色 + 四角小蝙蝠（inset 0，不溢出条目/卡片边框） */
html[data-motion="ornate"] .diary-song::after {
  content: '';
  position: absolute; inset: 0; z-index: -1;
  pointer-events: none;
  background-color: #c0392b;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;
  background-position: left top, right top, left bottom, right bottom;
  background-size: 16px 16px, 16px 16px, 16px 16px, 16px 16px;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  transition: opacity 0s, clip-path var(--motion-duration-glacial) var(--motion-easing-enter);
}
html[data-motion="ornate"] .diary-song:hover::after {
  opacity: 1;
  clip-path: inset(0 0 0 0);
}

/* ── 按钮：四边 currentColor 延展（对齐 PlayStats） ── */
html[data-motion="ornate"] .tl-entry-btn { position: relative; }
html[data-motion="ornate"] .tl-entry-btn::before {
  content: '';
  position: absolute; inset: 1px;
  pointer-events: none;
  background:
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat,
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat;
  background-size: 0 2px, 0 2px, 0 2px, 0 2px, 2px 0, 2px 0, 2px 0, 2px 0;
  transition: background-size var(--motion-time-interaction) var(--motion-easing-standard);
}
html[data-motion="ornate"] .tl-entry-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}

/* 标题两侧对称点缀（与设置页一致：3 圆点 + 双短线 + 双小弧） */
html[data-motion="ornate"] .diary-header h2::before,
html[data-motion="ornate"] .diary-header h2::after {
  content: '';
  display: inline-block;
  width: 92px; height: 14px;
  vertical-align: middle;
  margin: 0 14px;
  opacity: 0;
  transform: scaleX(0);
  transform-origin: center;
  background:
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) left center / 6px 6px no-repeat,
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) center center / 6px 6px no-repeat,
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) right center / 6px 6px no-repeat,
    linear-gradient(90deg, var(--border-color), var(--border-color)) left 3px / 28px 1px no-repeat,
    linear-gradient(90deg, var(--border-color), var(--border-color)) right 4px / 28px 1px no-repeat,
    conic-gradient(from 200deg, var(--border-color) 0 50deg, transparent 50deg 360deg) 30px center / 12px 12px no-repeat,
    conic-gradient(from 110deg, var(--border-color) 0 50deg, transparent 50deg 360deg) calc(100% - 30px) center / 12px 12px no-repeat;
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s var(--motion-easing-enter) 0.4s;
}
html[data-motion="ornate"] .entered .diary-header h2::before,
html[data-motion="ornate"] .entered .diary-header h2::after {
  opacity: 0.75;
  transform: scaleX(1);
}
</style>
