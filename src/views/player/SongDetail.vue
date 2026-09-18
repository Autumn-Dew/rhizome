<template>
  <div class="song-detail" :class="[themeClass, { 'spectrum-out': detailFolded }]">
    <div class="detail-container" :class="{ entered, switching }">
      <div class="detail-header" :style="foldStyle('header')">
        <div class="song-info">
          <h1 class="song-title">{{ currentSong.name }}</h1>
          <p class="song-artist">{{ currentSong.singer }}</p>
        </div>
      </div>

      <div class="detail-main">
        <div class="album-section">
          <div class="album-cover" @click="openSpectrum" title="点击打开频谱">
            <img v-if="currentSong.coverUrl" :src="currentSong.coverUrl" alt="cover"/>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" stroke-width="2"/>
            </svg>
          </div>

          <div class="player-controls" :style="foldStyle('controls')">
            <button class="control-btn" @click="playerStore.prevSong">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 20L9 12 19 4v16z" stroke-width="2"/>
              </svg>
            </button>
            <button class="control-btn play-btn" @click="playerStore.togglePlay">
              <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="6" y="4" width="4" height="16" stroke-width="2"/>
                <rect x="14" y="4" width="4" height="16" stroke-width="2"/>
              </svg>
            </button>
            <button class="control-btn" @click="playerStore.nextSong">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 4l10 8-10 8V4z" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="progress-section" :style="foldStyle('progress')">
            <span class="time">{{ formatTime(playerStore.currentTime) }}</span>
            <div
                class="progress-bar-container"
                @wheel.prevent="onDetailWheel"
                @mousemove="onDetailMouseMove"
                @mouseenter="detailHovering = true"
                @mouseleave="detailHovering = false"
            >
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                <input
                    type="range"
                    class="progress-input"
                    min="0"
                    max="100"
                    :value="progress"
                    @input="onProgressChange"
                />
              </div>
              <span class="sd-seek-label" v-show="detailHovering" :style="{ left: detailHoverPercent * 100 + '%' }">{{ detailSeekLabel }}</span>
            </div>
            <span class="time">{{ formatTime(playerStore.duration) }}</span>
          </div>

          <div class="song-stats" v-if="currentSong.path">
            <span class="play-count">{{ playCount }} 次播放</span>
            <span class="play-time">{{ totalPlayTime }}</span>
          </div>
          <div class="song-meta" v-if="currentSong.album || currentSong.genre || currentSong.codec || currentSong.sampleRate">
            <span v-if="currentSong.album">{{ currentSong.album }}</span>
            <span v-if="currentSong.genre">{{ currentSong.genre }}</span>
            <span v-if="currentSong.codec">{{ currentSong.codec.toUpperCase() }}</span>
            <span v-if="currentSong.bitrate">{{ Math.round(currentSong.bitrate / 1000) }}kbps</span>
            <span v-if="currentSong.sampleRate">{{ (currentSong.sampleRate / 1000).toFixed(1) }}kHz</span>
            <span v-if="currentSong.channels">{{ currentSong.channels }}ch</span>
          </div>
          <canvas ref="spectrumCanvas" class="spectrum-canvas" v-show="playerStore.isPlaying && currentSong.path"></canvas>
        </div>

        <div class="lyrics-section" :style="foldStyle('lyrics')">
          <div class="lyrics-frame" :style="{ '--border-progress': borderProgress }">
            <div class="lyrics-wrapper" ref="lyricsBox">
              <div class="lyrics-container">
              <p
                  v-for="(line, idx) in lyrics"
                  :key="idx"
                  :class="{ active: idx === currentLine }"
                  :style="idx === currentLine ? { '--lyric-progress': lyricProgress } : staggerStyle(idx)"
                  @click="clickToJump(line.time)"
              >
                <span>{{ line.text }}</span>
              </p>
              <p v-if="lyrics.length === 0" class="empty-lyrics">暂无歌词</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <SpectrumTransition
    v-if="transitionMode !== 'none'"
    :active="true"
    :mode="transitionMode"
    :coverUrl="currentSong.coverUrl || ''"
    :fromRect="transitionFromRect"
    :layoutRects="transitionLayoutRects"
    @reveal="onTransitionReveal"
    @done="onTransitionDone"
  />

  <SpectrumOverlay
    :visible="spectrumVisible"
    :coverUrl="currentSong.coverUrl || ''"
    :song="currentSong"
    @close="closeSpectrum"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePageEnter } from '@/composables/usePageEnter'
import { useMotionState } from '@/composables/useMotionState'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePlayerStore } from '@/stores/playerStore'
import { useLyricOffset } from '@/composables/useLyricOffset'
import { formatTime } from '@/utils/format'
import { resolveLyrics } from '@/utils/lyrics'
import SpectrumOverlay from '@/components/player/SpectrumOverlay.vue'
import SpectrumTransition from '@/components/player/SpectrumTransition.vue'

const router = useRouter()
const { themeClass } = useGlobalTheme()
const playerStore = usePlayerStore()
const { offsetSeconds } = useLyricOffset()

const currentSong = ref({})
const lyrics = ref([])
const currentLine = ref(0)
const lyricsBox = ref(null)
const statsRefreshKey = ref(0)
const { entered, staggerStyle } = usePageEnter();
const switching = ref(false)

onMounted(() => {
  if (!playerStore.currentSong) return router.back()
  currentSong.value = playerStore.currentSong
  parseLyrics()
  resetLyrics()
  updateLyricProgress()
})

watch(() => playerStore.currentSong, (val) => {
  if (val) {
    switching.value = true
    // 先播放覆盖动效，200ms 后再更新数据+展开
    setTimeout(() => {
      currentSong.value = val
      parseLyrics()
      resetLyrics()
      switching.value = false
    }, 200)
  }
}, { deep: true })

// ==============================================
// 歌词解析（优先使用预解析的时间戳数据）
// ==============================================
function parseLyrics() {
  lyrics.value = resolveLyrics(currentSong.value)
}

// ==============================================
// 重置：切歌回到第一行并居中
// ==============================================
function resetLyrics() {
  currentLine.value = 0
  nextTick(() => {
    if (lyricsBox.value) {
      lyricsBox.value.scrollTop = 0
    }
  })
}

const progress = computed(() => {
  if (!playerStore.duration) return 0
  return (playerStore.currentTime / playerStore.duration) * 100
})

const borderProgress = computed(() => {
  if (!playerStore.duration) return 0
  return Math.min(1, playerStore.currentTime / playerStore.duration)
})

const lyricProgress = ref(0)
let lyricRAF = null

function updateLyricProgress() {
  if (!playerStore.isPlaying) {
    lyricProgress.value = 0
  } else {
    const realTime = playerStore.audio?.currentTime || 0
    const list = lyrics.value
    const idx = currentLine.value
    if (idx >= 0 && idx < list.length) {
      const start = list[idx].time
      const end = idx + 1 < list.length
        ? list[idx + 1].time
        : (playerStore.duration || start + 5)
      if (end > start) {
        const p = (realTime - start) / (end - start)
        lyricProgress.value = Math.max(0, Math.min(1, p))
      }
    } else {
      lyricProgress.value = 0
    }
  }
  lyricRAF = requestAnimationFrame(updateLyricProgress)
}

function stopLyricRAF() {
  if (lyricRAF) { cancelAnimationFrame(lyricRAF); lyricRAF = null }
}

const playCount = computed(() => {
  void statsRefreshKey.value
  const p = currentSong.value?.path
  if (!p) return 0
  try {
    const map = JSON.parse(localStorage.getItem('playCountReal') || '{}')
    return map[p] || 0
  } catch { return 0 }
})

const totalPlayTime = computed(() => {
  const d = currentSong.value?.duration || 0
  const c = playCount.value
  const sec = d * c
  if (sec < 60) return sec + 's'
  if (sec < 3600) return Math.round(sec / 60) + 'min'
  return (sec / 3600).toFixed(1) + 'h'
})

// === 频谱可视化 ===
import { useSpectrumEngine } from '@/composables/useSpectrumEngine'

const spectrumCanvas = ref(null)
const engine = useSpectrumEngine()
let animId = null

function startDraw() {
  stopDraw()
  const analyser = engine.analyser()
  const canvas = spectrumCanvas.value
  if (!canvas || !analyser) return
  canvas.width = canvas.offsetWidth || 260
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  const bufLen = analyser.frequencyBinCount
  const dataArr = new Uint8Array(bufLen)
  function draw() {
    animId = requestAnimationFrame(draw)
    analyser.getByteFrequencyData(dataArr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fill = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#fff'
    const barW = canvas.width / bufLen
    for (let i = 0; i < bufLen; i++) {
      const h = (dataArr[i] / 255) * canvas.height
      ctx.fillStyle = fill
      ctx.fillRect(i * barW, canvas.height - h, Math.max(barW - 1, 1), h)
    }
  }
  draw()
}

function stopDraw() {
  if (animId) { cancelAnimationFrame(animId); animId = null }
}

// 播放/暂停
watch(() => playerStore.isPlaying, (val) => {
  if (val) {
    engine.ensure()
    engine.resume()
    engine.connect(playerStore.audio)
    startDraw()
  } else {
    stopDraw()
  }
})

// 切歌
watch(() => playerStore.currentSong, (song) => {
  if (song && playerStore.isPlaying) {
    engine.connect(playerStore.audio)
    startDraw()
  }
})

onMounted(() => {
  if (playerStore.isPlaying) {
    engine.ensure()
    engine.connect(playerStore.audio)
    startDraw()
  }
})

onUnmounted(() => {
  stopDraw()
  stopLyricRAF()
})

// ==============================================
// 终极居中滚动（永远在正中间）
// ==============================================
let scrollTimer = null
function scrollToCenter() {
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(async () => {
    await nextTick()
    const box = lyricsBox.value
    const activeEl = box?.querySelector('.active')
    if (!box || !activeEl) return

    const boxHeight = box.clientHeight
    const elHeight = activeEl.offsetHeight
    const scrollTop = activeEl.offsetTop - (boxHeight - elHeight) / 2

    box.scrollTo({ top: scrollTop, behavior: 'smooth' })
  }, 50)
}

// ==============================================
// 歌词自动跟随（不会乱跳）
// ==============================================
watch(() => playerStore.currentTime, (now) => {
  const list = lyrics.value
  if (!list.length) return
  if (list.every(l => l.time >= 999999)) { currentLine.value = -1; return }
  const adjusted = now + offsetSeconds()
  if (adjusted < 0.1) { currentLine.value = 0; return }
  let idx = 0
  for (let i = 0; i < list.length; i++) { if (list[i].time <= adjusted) idx = i }
  currentLine.value = idx
}, { flush: 'post' })

watch(() => currentLine.value, () => {
  scrollToCenter()
}, { flush: 'post' })

// 歌曲结束时刷新播放次数与时间
watch(
  () => ({ t: playerStore.currentTime, playing: playerStore.isPlaying }),
  (now, prev) => {
    if (prev?.playing && !now.playing && now.t === 0) {
      statsRefreshKey.value++
    }
  },
  { deep: true }
)
watch(() => playerStore.currentSong, () => {
  statsRefreshKey.value++
})

// ==============================================
// 点击歌词正常跳转
// ==============================================
function clickToJump(time) {
  if (!time || time <= 0) return
  if (time > playerStore.duration) return
  playerStore.seekTo(time)
}

const onProgressChange = (e) => {
  const percent = e.target.value / 100
  playerStore.seekTo(percent * playerStore.duration)
}

const detailHovering = ref(false)
const detailHoverPercent = ref(0)

const detailSeekLabel = computed(() => {
  if (!playerStore.duration) return '00:00'
  return formatTime(detailHoverPercent.value * playerStore.duration)
})

const onDetailMouseMove = (e) => {
  const rect = e.currentTarget.querySelector('.progress-track').getBoundingClientRect()
  detailHoverPercent.value = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

const onDetailWheel = (e) => {
  const delta = e.deltaY > 0 ? -2 : 2
  const newTime = Math.max(0, Math.min(playerStore.duration, playerStore.currentTime + delta))
  playerStore.seekTo(newTime)
}

const goBack = () => router.back()
const spectrumVisible = ref(false)
// 'none' | 'in'（详情页→频谱页）| 'out'（频谱页→详情页）
const transitionMode = ref('none')
// 接入 Motion State：转场进行中让 Ambient 让位（transition 优先级最高）
const { setTransitioning } = useMotionState()
watch(transitionMode, (m) => setTransitioning(m !== 'none'))
const transitionFromRect = ref(null)
// 详情页各 UI 区域矩形（供过场把布局映射为几何线条）
const transitionLayoutRects = ref(null)
// 详情页打包层是否处于「向后折叠」态：进入时折叠，退出完成后恢复
const detailFolded = ref(false)

function openSpectrum() {
  if (transitionMode.value !== 'none' || spectrumVisible.value) return
  // 记录详情页封面的实际位置/尺寸，供过场做共享元素（FLIP）动画
  const el = document.querySelector('.album-cover')
  transitionFromRect.value = el ? el.getBoundingClientRect().toJSON() : null
  measureLayoutRects()
  detailFolded.value = true
  transitionMode.value = 'in'
}
// 详情页封面始终在 DOM 里，退出时可重新取一次位置
function measureCover() {
  const el = document.querySelector('.album-cover')
  if (el) transitionFromRect.value = el.getBoundingClientRect().toJSON()
}

// 采集详情页各 UI 区域矩形，供过场阶段 2「UI → 线条」把真实布局映射成几何线条
function rectOf(sel) {
  const el = document.querySelector(sel)
  return el ? el.getBoundingClientRect().toJSON() : null
}
function measureLayoutRects() {
  transitionLayoutRects.value = {
    root: rectOf('.song-detail'),
    header: rectOf('.detail-header'),
    controls: rectOf('.player-controls'),
    progress: rectOf('.progress-section'),
    lyrics: rectOf('.lyrics-section'),
  }
}

// 详情页各「打包层」向后折叠的内联样式（内联优先级最高，避免被既有 CSS 覆盖）
const FOLD_LAYERS = {
  header: { y: -46, s: 0.9, d: 0.02 },
  controls: { y: -26, s: 0.86, d: 0.08 },
  progress: { y: -14, s: 0.82, d: 0.14 },
  lyrics: { y: -30, s: 0.88, d: 0.1 },
}
function foldStyle(key) {
  const f = FOLD_LAYERS[key]
  if (!f) return {}
  const base = { transform: '', opacity: '', transitionDelay: '' }
  if (!detailFolded.value) return base
  return {
    transform: `translateY(${f.y}px) scale(${f.s})`,
    opacity: '0',
    transition: 'transform 0.9s cubic-bezier(0.55,0,0.85,0.4), opacity 0.85s ease',
    transitionDelay: `${f.d}s`,
  }
}
function closeSpectrum() {
  if (transitionMode.value !== 'none') return
  measureCover()
  measureLayoutRects()
  detailFolded.value = false // 详情页各层依次展开
  transitionMode.value = 'out'
  spectrumVisible.value = false
}
// 过场淡出期间先显示频谱页（z-index 低于过场）→ 交叉淡入淡出，避免突兀切换
function onTransitionReveal() {
  spectrumVisible.value = true
}
function onTransitionDone() {
  transitionMode.value = 'none'
}
</script>

<style scoped>
.theme-white {
  --bg: #fff;
  --text: #000;
  --border: #000;
  --btn: #f8f8f8;
  --btn-hover: #000;
  --btn-text: #fff;
  --light: #f5f5f5;
  --progress-bg: #e0e0e0;
  --tooltip-bg: #000;
  --tooltip-text: #fff;
}
.theme-dark {
  --bg: #2c2c2c;
  --text: #fff;
  --border: #fff;
  --btn: #292929;
  --btn-hover: #fff;
  --btn-text: #000;
  --light: #333;
  --progress-bg: #4a4a4a;
  --tooltip-bg: #fff;
  --tooltip-text: #000;
}

.song-detail {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  /* 3D 透视容器：进入频谱页时各「打包层」沿透视向后折叠 */
  perspective: 1400px;
  perspective-origin: 50% 42%;
}

/* ===== 进入频谱页：详情页各打包层向后折叠（实际由 foldStyle() 内联样式驱动，见 script） =====
   说明：这里的 CSS 版本会被页面上更高的优先级吞掉，故改由内联 style 驱动；
   本块仅保留层的基础过渡与 3D 上下文。 */
.song-detail .detail-header,
.song-detail .player-controls,
.song-detail .progress-section,
.song-detail .song-stats,
.song-detail .song-meta,
.song-detail .lyrics-section {
  transform-style: preserve-3d;
  will-change: transform, opacity;
}
/* 封面交给过场里的飞行封面接管 */
.song-detail.spectrum-out .album-cover { opacity: 0; transition: opacity 0.25s ease; }

.detail-container {
  padding: 40px 20px 20px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-left: 2px solid transparent;
  padding-left: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  position: relative;
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity var(--motion-duration-normal) var(--motion-easing-standard) 0.06s,
              transform var(--motion-duration-normal) var(--motion-easing-standard) 0.06s;
}
/* 竖线动效 */
.detail-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 2px; height: 100%;
  background: var(--border);
  transform: scaleY(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter) 0.04s;
}
.entered .detail-header::before { transform: scaleY(1); }
.entered .detail-header {
  opacity: 1;
  transform: translateY(0);
}
.detail-header .song-title {
  letter-spacing: 4px;
  transition: letter-spacing var(--motion-duration-slow) var(--motion-easing-standard) 0.06s;
}
.entered .detail-header .song-title {
  letter-spacing: 0;
}

/* 切歌动效：从竖线向右拓展色条覆盖，再退回 */
.detail-header {
  position: relative;
}
.detail-header::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--border);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.16s var(--motion-easing-swipe);
  z-index: 2;
  pointer-events: none;
}
.switching .detail-header::after {
  transform: scaleX(1);
}

.song-info {
  flex: 1;
}

.song-title {
  font-size: 22px;
  margin: 0 0 4px 0;
}

.song-artist {
  font-size: 13px;
  opacity: .7;
  margin: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 2px solid var(--border);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  padding: 4px 10px;
  transition: var(--motion-btn-hover);
}

.back-btn svg {
  width: 14px;
  height: 14px;
}

.back-btn:hover {
  background: var(--btn-hover);
  color: var(--btn-text);
  transform: translateY(-1px);
}

.detail-main {
  display: flex;
  gap: 30px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.album-section {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: stretch;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--btn);
  cursor: pointer;
  opacity: 0;
  transform: translateX(-40px);
  clip-path: inset(0 0 0 0);
  transition: opacity 0.22s var(--motion-easing-standard),
              transform 0.22s var(--motion-easing-standard),
              clip-path var(--motion-duration-normal) var(--motion-easing-enter);
}

.entered .album-cover {
  opacity: 1;
  transform: translateX(0);
}
.switching .album-cover {
  clip-path: inset(50% 50% 50% 50%);
}

.album-cover:hover {
  transform: scale(1.02);
  border-color: var(--btn-hover);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-cover svg {
  width: 80px;
  height: 80px;
  stroke: currentColor;
}

.player-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.control-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border);
  background: var(--btn);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease),
              transform var(--motion-duration-fast) var(--motion-easing-enter),
              background var(--motion-duration-normal),
              color var(--motion-duration-normal);
}
.player-controls .control-btn:nth-child(1) { transition-delay: 0.16s; }
.player-controls .control-btn:nth-child(2) { transition-delay: 0.2s; }
.player-controls .control-btn:nth-child(3) { transition-delay: 0.24s; }
.entered .player-controls .control-btn {
  opacity: 1;
  transform: scaleX(1);
  transition-delay: 0s;
}

.control-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}

.control-btn:hover {
  background: var(--btn-hover);
  color: var(--btn-text);
  transform: scale(1.05);
}

.play-btn {
  width: 36px;
  height: 36px;
}

.progress-section {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-ease) 0.28s;
}
.entered .progress-section {
  opacity: 1;
}

.time {
  font-size: 11px;
  font-family: monospace;
  opacity: .7;
  min-width: 40px;
}

.progress-bar-container {
  flex: 1;
  position: relative;
  cursor: pointer;
  transform: scaleX(0);
  transition: transform var(--motion-duration-normal) var(--motion-easing-enter) 0.28s;
}
.entered .progress-bar-container {
  transform: scaleX(1);
}

.progress-track {
  position: relative;
  height: 4px;
  background: var(--progress-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}

/* 切歌进度条脉冲 */
.progress-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--border);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
.switching .progress-track::after {
  animation: sd-progress-pulse 0.35s ease-out;
}
@keyframes sd-progress-pulse {
  0% { opacity: 0; }
  30% { opacity: 0.5; }
  100% { opacity: 0; }
}
@keyframes sd-info-blink {
  0% { opacity: 1; }
  12% { opacity: 0.2; }
  25% { opacity: 1; }
  40% { opacity: 0.2; }
  55% { opacity: 1; }
  70% { opacity: 0.2; }
  85% { opacity: 1; }
  100% { opacity: 1; }
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--border);
  width: 0%;
  pointer-events: none;
  transition: width var(--motion-duration-instant) var(--motion-easing-linear);
}

.progress-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.progress-bar-container:hover .progress-track {
  height: 6px;
  transition: height var(--motion-duration-normal);
}

.progress-bar-container:hover .progress-fill {
  background: var(--btn-hover-bg);
}

.sd-seek-label {
  position: absolute;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  font-size: 11px;
  font-family: monospace;
  color: var(--text);
  background: var(--btn);
  border: 1px solid var(--border);
  padding: 2px 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
}

.song-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  opacity: .5;
}

.song-meta span {
  padding: 2px 6px;
  border: 1px solid var(--border);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-standard),
              transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.switching .song-meta span {
  animation: sd-info-blink 0.36s ease-out;
}
.entered .song-meta span {
  opacity: 1;
  transform: translateX(0);
}
.song-meta span:nth-child(1) { transition-delay: 0.36s; }
.song-meta span:nth-child(2) { transition-delay: 0.39s; }
.song-meta span:nth-child(3) { transition-delay: 0.42s; }
.song-meta span:nth-child(4) { transition-delay: 0.45s; }
.song-meta span:nth-child(5) { transition-delay: 0.48s; }
.song-meta span:nth-child(6) { transition-delay: 0.51s; }

.spectrum-canvas {
  width: 100%;
  height: 60px;
  margin-top: auto;
  flex-shrink: 0;
}

.song-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--border);
  background: var(--btn);
  margin-bottom: 4px;
  opacity: 0;
  transform: translateX(6px);
  transition: opacity var(--motion-duration-medium) var(--motion-easing-ease) 0.32s,
              transform var(--motion-duration-medium) var(--motion-easing-standard) 0.32s;
}
.switching .song-stats {
  animation: sd-info-blink 0.4s ease-out;
}
.entered .song-stats {
  opacity: 1;
  transform: translateX(0);
}

.play-count {
  font-size: 10px;
  opacity: 0.7;
}

.play-time {
  font-size: 10px;
  opacity: 0.55;
  font-family: monospace;
}

.lyrics-section {
  flex: 1; min-width: 0;
  opacity: 0;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.3s;
}
.entered .lyrics-section {
  opacity: 1;
}

.lyrics-fullscreen-btn {
  position: absolute; top: 0; right: 0;
  width: 28px; height: 28px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-primary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: var(--motion-btn-hover); z-index: 5;
}
.lyrics-fullscreen-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.lyrics-fullscreen-btn svg { width: 14px; height: 14px; }

/* 外层固定四角边框 */
.lyrics-frame {
  height: calc(100vh - 260px);
  min-height: 200px;
  position: relative;
  border: 2px solid transparent;
  opacity: 0;
  transform: translateX(-30px);
  transition: opacity 0.22s var(--motion-easing-standard) 0.3s,
              transform 0.22s var(--motion-easing-standard) 0.3s;
}
.entered .lyrics-frame {
  opacity: 1;
  transform: translateX(0);
}
/* 切歌时透明闪烁 */
.switching .lyrics-frame {
  animation: lyrics-blink 0.4s ease-out;
}
@keyframes lyrics-blink {
  0% { opacity: 1; }
  12% { opacity: 0.08; }
  25% { opacity: 1; }
  40% { opacity: 0.08; }
  55% { opacity: 1; }
  70% { opacity: 0.08; }
  85% { opacity: 1; }
  100% { opacity: 1; }
}

/* 播放进度边框：每条边从中点向两端生长 */
.lyrics-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  --p: var(--border-progress, 0);
  background:
    /* top */
    linear-gradient(to right,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) top / 100% 2px no-repeat,
    /* bottom */
    linear-gradient(to right,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) bottom / 100% 2px no-repeat,
    /* left */
    linear-gradient(to bottom,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) left / 2px 100% no-repeat,
    /* right */
    linear-gradient(to bottom,
      transparent calc((1 - var(--p)) * 50%),
      var(--border) 0,
      var(--border) calc((1 + var(--p)) * 50%),
      transparent 0
    ) right / 2px 100% no-repeat;
}
.lyrics-frame::after {
  content: '';
  position: absolute;
  inset: -2px;
  pointer-events: none;
  background:
    linear-gradient(to right, var(--border) 18px, transparent 0) left top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 18px, transparent 0) left top / 2px 100% no-repeat,
    linear-gradient(to left, var(--border) 18px, transparent 0) right top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 18px, transparent 0) right top / 2px 100% no-repeat,
    linear-gradient(to right, var(--border) 18px, transparent 0) left bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 18px, transparent 0) left bottom / 2px 100% no-repeat,
    linear-gradient(to left, var(--border) 18px, transparent 0) right bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 18px, transparent 0) right bottom / 2px 100% no-repeat;
}

/* 内层滚动 */
.lyrics-wrapper {
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lyrics-wrapper::-webkit-scrollbar {
  display: none;
}

.lyrics-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: calc((100vh - 280px) / 2) 24px;
  overflow-x: hidden;
}

/* ---------- 单行基础 ---------- */
.lyrics-container p {
  font-size: var(--lyric-font-size, 14px);
  line-height: 1.4;
  text-align: center;
  margin: 0;
  padding: 6px 64px;
  transition: var(--motion-btn-hover);
  opacity: 0.5;
  cursor: pointer;
  transform: scale(0.95);
  position: relative;
  overflow: visible;
  white-space: pre-line;
}

/* ---------- 反色背景 ::before — scaleX 从中心扩散 ---------- */
.lyrics-container p::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.28s var(--motion-easing-enter);
}

/* ---------- 取景框四角 + 顶边刻度 ::after ---------- */
.lyrics-container p::after {
  content: '';
  position: absolute;
  inset: -4px;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity var(--motion-duration-normal), transform 0.28s var(--motion-easing-enter);
  background:
    /* top-left L */
    linear-gradient(to right, var(--border) 10px, transparent 0) 0 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 10px, transparent 0) 0 0 / 2px 100% no-repeat,
    /* top-right L */
    linear-gradient(to left, var(--border) 10px, transparent 0) 100% 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border) 10px, transparent 0) 100% 0 / 2px 100% no-repeat,
    /* bottom-left L */
    linear-gradient(to right, var(--border) 10px, transparent 0) 0 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 10px, transparent 0) 0 100% / 2px 100% no-repeat,
    /* bottom-right L */
    linear-gradient(to left, var(--border) 10px, transparent 0) 100% 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--border) 10px, transparent 0) 100% 100% / 2px 100% no-repeat;
}

/* ---------- 左右消逝线 ---------- */

.lyrics-container p span::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 48px;
  height: 2px;
  background: var(--btn-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: right center;
  transition: transform var(--motion-duration-normal) linear;
  opacity: 0;
}

.lyrics-container p span::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  width: 48px;
  height: 2px;
  background: var(--btn-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: left center;
  transition: transform var(--motion-duration-normal) linear;
  opacity: 0;
}

/* ============================================= */
/*               ACTIVE LINE                       */
/* ============================================= */

.lyrics-container p.active {
  opacity: 1;
  font-size: calc(var(--lyric-font-size, 14px) + 1px);
  font-weight: 600;
  color: var(--btn-hover-text);
  transform: scale(1.02);
}

/* 背景从中心扩散到位 */
.lyrics-container p.active::before {
  transform: scaleX(1);
}

/* 四角取景框滑入定位 */
.lyrics-container p.active::after {
  opacity: 1;
  transform: scale(1);
}

/* 左右消逝线显现 + 随进度收缩 */
.lyrics-container p.active span::before,
.lyrics-container p.active span::after {
  opacity: 1;
}



.empty-lyrics {
  text-align: center;
  opacity: .5;
  padding: 30px 0;
}

@media (max-width: 768px) {
  .detail-main {
    flex-direction: column;
  }

  .album-section {
    flex: none;
    width: 100%;
    max-width: 260px;
    margin: 0 auto;
  }

  .lyrics-wrapper {
    height: calc(100vh - 280px);
  }

  .detail-container {
    padding: 16px;
  }
}

/* 注：Ornate 的页面装饰已废弃。ornate 现仅表示「更慢的动效节奏」+「界面几何重构」转场（见 SpectrumTransition.vue）。 */

/* ═══ Motion System：Ambient + 局部 Hover 响应（仅「华丽」动画方案生效）═══
   仅 html[data-motion="ornate"] 下挂载；classic 保持原生动效。
   约束：绝对定位伪元素 + transform / opacity / background-*；pointer-events: none（不改布局、不影响功能）。 */

/* Core：播放中封面极轻微「活着」 */
html[data-motion="ornate"][data-motion-mode="playing"] .album-cover {
  animation: mt-cover-live var(--motion-time-ambient) var(--motion-easing-ease-out) infinite;
}
/* 进度：红色填充 + 蝙蝠播放头（替代圆点） */
html[data-motion="ornate"] .progress-fill { position: relative; background: #c0392b; }
html[data-motion="ornate"] .progress-fill::after {
  content: '';
  position: absolute; right: -7px; top: 50%;
  width: 16px; height: 16px;
  transform: translateY(-50%);
  background: #c0392b;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' transform='rotate(90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' transform='rotate(90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") center / contain no-repeat;
  pointer-events: none;
}
html[data-motion="ornate"][data-motion-mode="playing"] .progress-fill::after {
  animation: mt-node-pulse var(--motion-time-ambient) ease-in-out infinite;
}

/* 封面 hover：略微放大 */
/* 封面 hover：略微放大（需带 .entered，否则会被下方 .entered .album-cover{transform:scale(1)} 覆盖） */
html[data-motion="ornate"] .entered .album-cover:hover { transform: scale(1.03); }

/* 歌曲信息左侧：藤蔓纹样（替代 classic 光秃竖线），保留自上而下生长入场 */
html[data-motion="ornate"] .detail-header::before {
  width: 8px;
  background: var(--border);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 96' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 2 C6 14 18 24 12 38 C6 52 18 62 12 76 C9 83 10 90 12 94'/%3E%3Cpath d='M12 20 C8 18 6 14 6 10'/%3E%3Cpath d='M12 20 C16 18 18 14 18 10'/%3E%3Cpath d='M12 56 C8 54 6 50 6 46'/%3E%3Cpath d='M12 56 C16 54 18 50 18 46'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 96' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 2 C6 14 18 24 12 38 C6 52 18 62 12 76 C9 83 10 90 12 94'/%3E%3Cpath d='M12 20 C8 18 6 14 6 10'/%3E%3Cpath d='M12 20 C16 18 18 14 18 10'/%3E%3Cpath d='M12 56 C8 54 6 50 6 46'/%3E%3Cpath d='M12 56 C16 54 18 50 18 46'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
}

/* ═══ 按钮动效规范（ornate）：hover 反色 + 四条边从角向中点延展（currentColor）═══
   对齐设置页左侧按钮；后续各页面按钮沿用此规范。 */
/* 控制按钮 */
html[data-motion="ornate"] .control-btn::before {
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
html[data-motion="ornate"] .control-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
/* 返回按钮 / 全屏歌词按钮：同一规范（补齐四边延展） */
html[data-motion="ornate"] .back-btn,
html[data-motion="ornate"] .lyrics-fullscreen-btn { position: relative; }
html[data-motion="ornate"] .back-btn::before,
html[data-motion="ornate"] .lyrics-fullscreen-btn::before {
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
html[data-motion="ornate"] .back-btn:hover::before,
html[data-motion="ornate"] .lyrics-fullscreen-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}

/* 封面 —— 四角蝙蝠剪影（按角位斜 45° 朝外，闪烁明暗） */
html[data-motion="ornate"] .album-cover::after {
  content: '';
  position: absolute; inset: 0;
  z-index: 2;
  pointer-events: none;
  background: var(--border);
  -webkit-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 20px 20px no-repeat;
  mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 20px 20px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 20px 20px no-repeat;
  opacity: 0.7;
  animation: sd-bat 5s ease-in-out infinite;
}
@keyframes sd-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border); }
  20%      { opacity: 0.18; background-color: var(--border); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* 歌词区四角：蝙蝠剪影（替代 classic 四角短线取景框），闪烁 + 偶发变红 */
html[data-motion="ornate"] .lyrics-frame::after {
  inset: 0;
  background: var(--border);
  -webkit-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 18px 18px no-repeat;
  mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 18px 18px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 18px 18px no-repeat;
  opacity: 0.6;
  animation: sd-bat 5s ease-in-out infinite;
}

/* Hover：歌词行局部聚焦（无位移） */
html[data-motion="ornate"] .lyrics-container p:not(.active):hover { opacity: 0.75; }

/* 常驻：封面蕾丝边（四边短线），缓慢流动（Lolita 装帧） */
html[data-motion="ornate"] .album-cover::before {
  content: '';
  position: absolute; inset: 3px;
  z-index: 2;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0.55;
  animation: sd-lace 8s linear infinite;
}
@keyframes sd-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px; }
}

/* 按钮 hover：ornate 下更克制（覆盖 classic 的 scale(1.05)） */
html[data-motion="ornate"] .control-btn:hover { transform: scale(1.02); }

/* ═══ 加载动画（华丽 / 夸张 / 优雅，仅 ornate）═══
   封面绽放 → 蕾丝生长 → 蝙蝠点亮（与蕾丝同步）。 */
html[data-motion="ornate"] .album-cover {
  transform: scale(0.6);
  transition: opacity 0.5s var(--motion-easing-standard),
              transform 1.15s cubic-bezier(0.34, 1.8, 0.64, 1);
}
html[data-motion="ornate"] .entered .album-cover { transform: scale(1); }

/* 蕾丝边：沿四边生长 + 淡入 */
html[data-motion="ornate"] .album-cover::before {
  opacity: 0;
  background-size: 0 3px, 0 3px, 3px 0, 3px 0;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s,
              background-size 1.15s var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .album-cover::before {
  opacity: 0.55;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
}
/* 蝙蝠：点亮（缩放 + 淡入，与蕾丝同步）+ 闪烁 */
html[data-motion="ornate"] .album-cover::after {
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
html[data-motion="ornate"] .entered .album-cover::after {
  opacity: 0.7;
  transform: scale(1);
  animation: mt-flicker 1.1s var(--motion-easing-standard) 0.4s both, sd-bat 5s ease-in-out 1.5s infinite;
}
</style>

<style>
.lyrics-fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  background: var(--bg-primary);
  display: flex; align-items: center; justify-content: center;
}

/* 取景框 — 1:1 复刻 .lyrics-frame */
.lyrics-fullscreen-frame {
  width: 100%; max-width: 800px;
  height: calc(100vh - 120px);
  position: relative;
  border: 2px solid transparent;
}
.lyrics-fullscreen-frame::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  --p: var(--border-progress, 0);
  background:
    linear-gradient(to right, transparent calc((1 - var(--p)) * 50%), var(--border-color) 0, var(--border-color) calc((1 + var(--p)) * 50%), transparent 0) top / 100% 2px no-repeat,
    linear-gradient(to right, transparent calc((1 - var(--p)) * 50%), var(--border-color) 0, var(--border-color) calc((1 + var(--p)) * 50%), transparent 0) bottom / 100% 2px no-repeat,
    linear-gradient(to bottom, transparent calc((1 - var(--p)) * 50%), var(--border-color) 0, var(--border-color) calc((1 + var(--p)) * 50%), transparent 0) left / 2px 100% no-repeat,
    linear-gradient(to bottom, transparent calc((1 - var(--p)) * 50%), var(--border-color) 0, var(--border-color) calc((1 + var(--p)) * 50%), transparent 0) right / 2px 100% no-repeat;
}
.lyrics-fullscreen-frame::after {
  content: '';
  position: absolute; inset: -2px; pointer-events: none;
  background:
    linear-gradient(to right, var(--border-color) 24px, transparent 0) left top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border-color) 24px, transparent 0) left top / 2px 100% no-repeat,
    linear-gradient(to left, var(--border-color) 24px, transparent 0) right top / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--border-color) 24px, transparent 0) right top / 2px 100% no-repeat,
    linear-gradient(to right, var(--border-color) 24px, transparent 0) left bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border-color) 24px, transparent 0) left bottom / 2px 100% no-repeat,
    linear-gradient(to left, var(--border-color) 24px, transparent 0) right bottom / 100% 2px no-repeat,
    linear-gradient(to top, var(--border-color) 24px, transparent 0) right bottom / 2px 100% no-repeat;
}

/* 滚动区 */
.lyrics-fullscreen-wrapper {
  height: 100%; overflow-y: auto; scroll-behavior: smooth;
  scrollbar-width: none; -ms-overflow-style: none;
}
.lyrics-fullscreen-wrapper::-webkit-scrollbar { display: none; }

.lyrics-fullscreen-container {
  display: flex; flex-direction: column; gap: 10px;
  padding: calc(50vh - 60px) 24px;
  overflow-x: hidden;
}

/* 单行 — 1:1 复刻 .lyrics-container p */
.lyrics-fullscreen-container p {
  font-size: 20px; line-height: 1.5; margin: 0;
  text-align: center; padding: 8px 64px;
  transition: all var(--motion-duration-slow); opacity: 0.35;
  cursor: pointer; position: relative;
  transform: scale(0.95); white-space: pre-line;
}
.lyrics-fullscreen-container p:hover { opacity: 0.7; }

/* 当前行 — 1:1 复刻详情页 */
.lyrics-fullscreen-container p.active {
  opacity: 1; font-weight: 700; font-size: 24px;
  transform: scale(1); color: var(--btn-hover-text);
}
.lyrics-fullscreen-container p.active::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(var(--lyric-progress, 0));
  transform-origin: left;
  transition: transform var(--motion-duration-instant) var(--motion-easing-linear);
}

.lyrics-fullscreen-container .empty-lyrics {
  text-align: center; opacity: 0.4;
}

.lyrics-fullscreen-hint {
  position: fixed; bottom: 20px; font-size: 11px; opacity: 0.25;
  font-family: monospace; pointer-events: none;
}
</style>
