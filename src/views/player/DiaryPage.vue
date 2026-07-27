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
                <img v-if="song.coverUrl" :src="song.coverUrl" />
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
  if (full && full.exists !== false) { playerStore.setPlayList(localMusicStore.songList.filter(s => s.exists !== false)); playerStore.playGlobalSong(full) }
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
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .diary-header::after { transform: scaleX(1); }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.diary-header h2 {
  font-size: 20px; margin: 0 0 4px;
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity 0.18s cubic-bezier(0.2,0,0.2,1), transform 0.18s, letter-spacing 0.25s;
}
.entered .diary-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }
.desc { font-size: 12px; opacity: 0.7; }

/* toolbar — 统一 */
.diary-toolbar {
  display: flex; gap: 8px; padding: 12px; align-items: center;
  border-bottom: 2px solid transparent; position: relative;
}
.diary-toolbar::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1);
}
.entered .diary-toolbar::after { transform: scaleX(1); }
.diary-month-label { font-size: 13px; font-family: monospace; min-width: 100px; text-align: center; }
.diary-hint { font-size: 11px; opacity: 0.35; font-family: monospace; margin-left: auto; }

.tl-entry-btn {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 2px solid var(--border-color); background: var(--bg-secondary);
  color: var(--text-primary); font-size: 12px; font-family: monospace;
  cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}
.tl-entry-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.tl-entry-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.tl-entry-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; }

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
  transition: opacity 0.2s cubic-bezier(0.2,0,0.2,1), transform 0.2s cubic-bezier(0.2,0,0.2,1), border-color 0.2s, background 0.2s;
}
.entered .diary-card { opacity: 1; transform: translateY(0); }
.diary-card:hover { border-color: var(--text-primary); background: var(--bg-secondary); }
.diary-card-head { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.diary-card-date { font-size: 24px; font-weight: 100; letter-spacing: 2px; margin-bottom: 4px; }
.diary-card-summary { font-size: 12px; opacity: 0.45; font-family: monospace; }

.diary-card-songs { display: flex; flex-direction: column; gap: 16px; }
.diary-song { display: flex; gap: 14px; align-items: center; cursor: pointer; padding: 14px; border: 1px solid var(--border-color); transition: background 0.15s; }
.diary-song:hover { background: var(--bg-secondary); }
.diary-song-cover { width: 64px; height: 64px; flex-shrink: 0; overflow: hidden; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); }
.diary-song-cover img { width: 100%; height: 100%; object-fit: cover; }
.diary-song-cover svg { width: 22px; height: 22px; opacity: 0.3; }
.diary-song-info { flex: 1; min-width: 0; }
.diary-song-tag { font-size: 11px; font-family: monospace; opacity: 0.5; margin-bottom: 4px; }
.diary-song-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.diary-song-meta { font-size: 11px; opacity: 0.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

.diary-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.35; gap: 14px; }
.diary-empty svg { width: 52px; height: 52px; }
</style>
