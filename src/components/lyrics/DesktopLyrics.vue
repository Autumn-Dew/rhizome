<!-- src/components/lyrics/DesktopLyrics.vue -->
<template>
  <div class="desktop-lyrics" :class="[themeClass, { 'show-bounds': showBounds }]" :style="rootStyle" @contextmenu.prevent>
    <div class="lyric-line" :style="{ '--lyric-progress': smoothProgress }">
      <span>{{ displayText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const displayText = ref('Rhizome · 音乐播放器')
const smoothProgress = ref(0)
const themeClass = ref('theme-dark')
const fontSize = ref(14)
const align = ref('center')
// ---- 窗口锁定状态（锁定时隐藏边界背景） ----
const locked = ref(false)
const showBounds = computed(() => !locked.value)

// 本地 RAF 插值用的时间基准
let lineStartTime = 0
let lineEndTime = 0
let localRefTime = 0
let dataElapsed = 0
let paused = false

let rafId = null
let unsub = null

// ---- 对齐方式 ----
const alignFlexMap = { left: 'flex-start', center: 'center', right: 'flex-end' }
const alignTextMap = { left: 'left', center: 'center', right: 'right' }

// ---- 居中显示 ----
const rootStyle = computed(() => ({
  fontSize: (fontSize.value + 1) + 'px',
  justifyContent: alignFlexMap[align.value] || 'center',
  textAlign: alignTextMap[align.value] || 'center',
}))

// ---- 本地 RAF 平滑动画 ----
function runLocalRAF() {
  rafId = requestAnimationFrame(runLocalRAF)
  if (paused) return
  if (lineEndTime <= lineStartTime) { smoothProgress.value = 0; return }
  const elapsed = dataElapsed + (performance.now() - localRefTime) / 1000
  const dur = lineEndTime - lineStartTime
  smoothProgress.value = Math.max(0, Math.min(1, elapsed / dur))
}

function startRAF() { stopRAF(); runLocalRAF() }
function stopRAF() { if (rafId) { cancelAnimationFrame(rafId); rafId = null } }

// ---- IPC 数据接收 ----
function applyUpdate(data) {
  if (!data) return
  if (data.text !== undefined) displayText.value = data.text || 'Rhizome · 音乐播放器'
  if (data.themeClass) themeClass.value = data.themeClass
  if (data.fontSize) fontSize.value = data.fontSize
  if (data.align) align.value = data.align

  if (data.lineStartTime !== undefined && data.lineEndTime !== undefined) {
    lineStartTime = data.lineStartTime
    lineEndTime = data.lineEndTime
    dataElapsed = data.elapsed || 0
    localRefTime = performance.now()
    paused = data.paused || false
    if (!paused) startRAF()
  }
  if (data.progress !== undefined && data.paused) {
    smoothProgress.value = Number(data.progress) || 0
  }
}

onMounted(() => {
  if (window.electron?.desktopLyricsReady) window.electron.desktopLyricsReady()
  if (window.electron?.onDesktopLyricsUpdate) unsub = window.electron.onDesktopLyricsUpdate(applyUpdate)
  if (window.electron?.onDesktopLyricsLockChanged) {
    window.electron.onDesktopLyricsLockChanged((isLocked) => { locked.value = !!isLocked })
  }
  startRAF()
})

onUnmounted(() => {
  stopRAF()
  if (typeof unsub === 'function') unsub()
})
</script>

<style>
html, body, #lyrics-app {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  background: transparent !important;
  user-select: none;
}
</style>

<style scoped>
/* ========== Theme variables ========== */
.desktop-lyrics.theme-white {
  --dl-border: #000000;
  --dl-hover-bg: #000000;
  --dl-hover-text: #ffffff;
}
.desktop-lyrics.theme-dark {
  --dl-border: #ffffff;
  --dl-hover-bg: #ffffff;
  --dl-hover-text: #000000;
}

.desktop-lyrics {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  /* justify-content / text-align 由 JS inline style 控制 */
  background: transparent;
  -webkit-app-region: drag;
  overflow: hidden;
  transition: background 0.25s;
  padding: 16px;
  box-sizing: border-box;
}

/* 解锁时显示窗口边界（锁定时 .show-bounds 不生效，完全透明） */
.desktop-lyrics.show-bounds {
  background: rgba(128, 128, 128, 0.18);
}

/* ========== Lyric line — 1:1 SongDetail active ========== */
.lyric-line {
  position: relative;
  display: inline-block;
  font-size: inherit;
  line-height: 1.4;
  font-weight: 600;
  color: var(--dl-hover-text);
  padding: 6px 64px;
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;
  transform: scale(1.02);
  flex-shrink: 0;
}

/* 反色背景 (始终展开，对应 SongDetail .active::before) */
.lyric-line::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--dl-hover-bg);
  transform: scaleX(1);
  transform-origin: center;
}

/* 取景框四角 — 与 SongDetail 完全一致 */
.lyric-line::after {
  content: '';
  position: absolute;
  inset: -4px;
  pointer-events: none;
  background:
    linear-gradient(to right, var(--dl-border) 10px, transparent 0) 0 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--dl-border) 10px, transparent 0) 0 0 / 2px 100% no-repeat,
    linear-gradient(to left, var(--dl-border) 10px, transparent 0) 100% 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--dl-border) 10px, transparent 0) 100% 0 / 2px 100% no-repeat,
    linear-gradient(to right, var(--dl-border) 10px, transparent 0) 0 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--dl-border) 10px, transparent 0) 0 100% / 2px 100% no-repeat,
    linear-gradient(to left, var(--dl-border) 10px, transparent 0) 100% 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--dl-border) 10px, transparent 0) 100% 100% / 2px 100% no-repeat;
}

/* 左右消逝线（进度条） */
.lyric-line span { position: static; }

.lyric-line span::before {
  content: '';
  position: absolute;
  left: 12px; top: 50%;
  width: 48px; height: 2px;
  background: var(--dl-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: right center;
  opacity: 1;
}

.lyric-line span::after {
  content: '';
  position: absolute;
  right: 12px; top: 50%;
  width: 48px; height: 2px;
  background: var(--dl-hover-text);
  transform: translateY(-50%) scaleX(calc(1 - var(--lyric-progress, 0)));
  transform-origin: left center;
  opacity: 1;
}
</style>
