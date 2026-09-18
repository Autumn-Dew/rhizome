<template>
  <Teleport to="body">
    <Transition name="sp-fade">
      <div
        v-if="visible"
        class="spectrum-overlay"
        :class="themeClass"
        :style="{ '--sp-fg': fgColor, '--sp-bar': barColor }"
      >
        <!-- 背景：封面放大 + 大半径模糊 + 极浅遮罩（浅色毛玻璃） -->
        <div class="bg-blur" :style="bgStyle"></div>
        <div class="bg-mask"></div>

        <!-- 左右两组竖直柱频谱（横向铺开 80vw，底部对齐封面顶部水平线，向上延伸） -->
        <canvas ref="leftCanvas" class="spectrum spectrum-left"></canvas>
        <canvas ref="rightCanvas" class="spectrum spectrum-right"></canvas>

        <!-- 中心封面（独立固定定位）；切歌时新封面淡入 -->
        <div class="cover" @click.stop="close">
          <img v-if="coverUrl" :key="song.path || 'cover'" :src="coverUrl" alt="cover" />
          <svg v-else key="cover-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <circle cx="12" cy="12" r="3" stroke-width="2" />
          </svg>
          <!-- hover：大蝙蝠剪影（内联 SVG，渲染最可靠） -->
          <svg class="cover-bat" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z" />
          </svg>
          <!-- 边框：四条边各分两段，分别从四个角出发向该边中点延展，最后合并成完整边框 -->
          <span class="cf cf-tl"></span><span class="cf cf-tr"></span>
          <span class="cf cf-bl"></span><span class="cf cf-br"></span>
          <span class="cf cf-lt"></span><span class="cf cf-lb"></span>
          <span class="cf cf-rt"></span><span class="cf cf-rb"></span>
        </div>

        <!-- 封面上方（与歌词中心对称）：歌名 | 歌手；切歌时淡入 -->
        <div class="song-info" :key="song.path || 'info'">{{ song.name }}<span class="sep">|</span>{{ song.singer }}</div>

        <!-- 歌词：仅当前一句（纯音乐不显示）；切歌时淡入 -->
        <div class="lyrics" v-if="!isPureMusic" :key="song.path || 'lyrics'">
          <p class="lyric">{{ curText }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePlayerStore } from '@/stores/playerStore'
import { useSpectrumEngine } from '@/composables/useSpectrumEngine'
import { extractPalette } from '@/composables/useColorExtractor'
import { resolveLyrics } from '@/utils/lyrics'
import { setScreensaverSuppressed } from '@/composables/useIdleTimeout'
import { playUiSound, playShortcutSound } from '@/composables/useSound'

const props = defineProps({
  visible: { type: Boolean, default: false },
  coverUrl: { type: String, default: '' },
  song: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close'])

const playerStore = usePlayerStore()
const { themeClass } = useGlobalTheme()
const { ensure, connect, resume, analyser } = useSpectrumEngine()

const bgStyle = computed(() => props.coverUrl ? { backgroundImage: `url("${props.coverUrl}")` } : {})

// 颜色随背景：提取封面主色，按叠加白遮罩后的亮度选对比色
const palette = ref(null)
watch(() => props.coverUrl, async (url) => {
  try { palette.value = await extractPalette(url) } catch { palette.value = null }
}, { immediate: true })

function maskLumOf(primary) {
  const m = (primary || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!m) return null
  const lum = 0.299 * (+m[1]) + 0.587 * (+m[2]) + 0.114 * (+m[3])
  return lum * 0.45 + 255 * 0.55 // 叠加 55% 白遮罩后的实际亮度
}
const fgColor = computed(() => {
  const l = maskLumOf(palette.value?.primary)
  return l === null ? '#111111' : (l > 140 ? '#111111' : '#f5f5f5')
})
const barColor = computed(() => {
  const m = (palette.value?.primary || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!m) return 'rgba(60,60,60,0.75)'
  const r = +m[1], g = +m[2], b = +m[3]
  const l = maskLumOf(palette.value?.primary)
  if (l === null) return 'rgba(60,60,60,0.75)'
  if (l > 140) {
    // 背景偏浅 → 柱色深一点点（主色压暗）
    const k = 0.5
    return `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},0.85)`
  }
  // 背景偏暗 → 柱色浅一点点（主色提亮）
  const k = 0.45
  const mix = (c) => Math.round(c * (1 - k) + 255 * k)
  return `rgba(${mix(r)},${mix(g)},${mix(b)},0.9)`
})

// 歌词（三句，当前句居中）
const lyrics = ref([])
const currentLine = ref(0)
function parseLyrics() { lyrics.value = resolveLyrics(props.song || {}) || [] }
watch(() => props.song, () => { parseLyrics(); currentLine.value = 0 })
watch(() => playerStore.currentTime, (now) => {
  const list = lyrics.value
  if (!list.length) return
  if (list.every(l => l.time >= 999999)) { currentLine.value = -1; return }
  let idx = -1
  for (let i = 0; i < list.length; i++) { if (list[i].time <= now) idx = i; else break }
  currentLine.value = idx
})
const curText = computed(() => {
  const i = currentLine.value
  const list = lyrics.value
  if (i >= 0 && list[i]) return list[i].text || ''
  return list.length ? (list[0].text || '') : '暂无歌词'
})

// 纯音乐判定：只看有效歌词行数——不超过 MIN_LYRIC_LINES 视为纯音乐，不显示歌词
// （纯音乐即便带词，通常也不超过 5 句；超过 5 句才显示）
const MIN_LYRIC_LINES = 5
const isPureMusic = computed(() => {
  const list = lyrics.value
  if (!list.length || list.some(l => !l || l.time >= 999999)) return true
  return list.length <= MIN_LYRIC_LINES
})

// 频谱（竖直柱，底部对齐 canvas 底部；左右两组同一数据、镜像）
const leftCanvas = ref(null)
const rightCanvas = ref(null)
const BARS = ref(64) // 横向柱数量，随频谱高度自适应（柱宽固定）
const BAR_H = 5      // 每条厚度（CSS px，固定）
const GAP = 3        // 条间间距（CSS px，保证边界清晰）
let raf = null
let dpr = 1          // 与 canvas 物理尺寸同源的缩放比，避免渲染时尺寸不一致
let ro = null        // ResizeObserver：窗口/CSS 尺寸变化时重算几何

function render(canvas, bins, reversed) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // 以 CSS 像素为逻辑坐标，保证清晰
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = barColor.value
  const n = BARS.value
  for (let i = 0; i < n; i++) {
    // 横向柱：长度=幅度、水平延伸；竖向铺开，柱厚固定 + 固定间距（边界清晰）
    const freqIdx = reversed ? (n - 1 - i) : i
    const bin = Math.min(bins.length - 1, Math.floor((freqIdx / n) * bins.length))
    const v = bins[bin] / 255
    const len = Math.max(2, v * w * 0.96)
    const y = i * (BAR_H + GAP)
    if (y + BAR_H > h) break
    if (reversed) ctx.fillRect(w - len, y, len, BAR_H) // 右列：自右边缘向左
    else ctx.fillRect(0, y, len, BAR_H)                 // 左列：自左边缘向右
  }
}

function tick() {
  const an = analyser()
  if (an) {
    const bins = new Uint8Array(an.frequencyBinCount)
    an.getByteFrequencyData(bins)
    render(leftCanvas.value, bins, false)
    render(rightCanvas.value, bins, true)
  }
  raf = requestAnimationFrame(tick)
}

function resizeCanvas() {
  const el = leftCanvas.value || rightCanvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // 布局未就绪（宽/高为 0）时跳过，避免把 canvas 设成 1×1 导致拉伸模糊
  if (!rect.width || !rect.height) return
  dpr = window.devicePixelRatio || 1
  const pw = Math.max(1, Math.round(rect.width * dpr))
  const ph = Math.max(1, Math.round(rect.height * dpr))
  for (const c of [leftCanvas.value, rightCanvas.value]) {
    if (!c) continue
    if (c.width !== pw) c.width = pw
    if (c.height !== ph) c.height = ph
  }
  // 仅数量随高度自适应；柱厚固定（BAR_H + GAP）
  BARS.value = Math.max(1, Math.floor(rect.height / (BAR_H + GAP)))
}

function observeCanvas() {
  if (typeof ResizeObserver === 'undefined') return
  const el = leftCanvas.value
  if (!el) return
  if (!ro) ro = new ResizeObserver(() => resizeCanvas())
  ro.disconnect()
  ro.observe(el)
}

function close() { emit('close') }

async function start() {
  ensure()
  if (playerStore.audio) connect(playerStore.audio)
  resume()
  parseLyrics()
  await nextTick()          // 等 v-if 内容插入并完成布局后再测量
  observeCanvas()
  resizeCanvas()
  setScreensaverSuppressed(true) // 显示期间禁用屏保
  if (!raf) raf = requestAnimationFrame(tick)
}
function stop() {
  if (raf) { cancelAnimationFrame(raf); raf = null }
  if (ro) ro.disconnect()
  setScreensaverSuppressed(false) // 关闭后恢复屏保
}

// 播放/暂停或音频元素变化时重连频谱引擎
// 单曲循环（playGlobalSong 重建 Audio，currentSong 不变）与切歌都经此恢复频谱
watch(() => playerStore.isPlaying, (v) => {
  if (!props.visible || !v) return
  ensure(); resume(); connect(playerStore.audio)
})
watch(() => playerStore.audio, (au) => {
  if (!props.visible || !au || !playerStore.isPlaying) return
  ensure(); resume(); connect(au)
})

watch(() => props.visible, (v) => {
  if (v) { start(); playShortcutSound() }   // 进入该页面
  else { stop(); playUiSound() }            // 退出该页面
})

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  if (props.visible) start()
})
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (ro) { ro.disconnect(); ro = null }
  stop()
})
</script>

<style scoped>
.spectrum-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  overflow: hidden;
  background: #e9e9ec;
  --sp-fg: #111;
  --sp-bar: rgba(0, 0, 0, 0.55);
}

.bg-blur {
  position: absolute;
  inset: -8%;
  background-size: cover;
  background-position: center;
  filter: blur(64px) brightness(1.15) saturate(1.25);
  transform: scale(1.12);
}
.bg-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
}

/* 横向柱频谱：封面左右两侧，竖向铺开；每列宽 40vw（水平合计 80% 窗口宽度）、高 80vh */
.spectrum {
  position: absolute;
  top: 10vh;
  height: 80vh;
  width: 40vw;
}
.spectrum-left { left: 0; }
.spectrum-right { right: 0; }

/* 封面：整个窗口的正中心 */
.cover {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(44vh, 44vw);
  height: min(44vh, 44vw);
  z-index: 2;
  background: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
  transition: transform 0.2s var(--motion-easing-standard);
}
/* hover：整体略微放大（参考底部播放栏 .album-thumb:hover 的 transform 方案） */
.cover:hover { transform: translate(-50%, -50%) scale(1.05); }
/* hover：封面上浮现大蝙蝠剪影（内联 SVG；用 .cover .cover-bat 提高特定性，避免被 .cover svg 的 30% 尺寸覆盖） */
.cover .cover-bat {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  padding: 21%;
  box-sizing: border-box;
  fill: var(--sp-fg);
  stroke: none;
  opacity: 0;
  transform: scale(0.88);
  transition: opacity 0.25s var(--motion-easing-standard),
              transform 0.25s var(--motion-easing-standard);
  pointer-events: none;
  z-index: 1;
}
.cover:hover .cover-bat { opacity: 0.82; transform: scale(1); }
.cover img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s var(--motion-easing-standard); }
/* hover：封面图本身也放大（与底部播放栏 .album-thumb 的缩放思路一致，双保险可见） */
.cover:hover img { transform: scale(1.06); }
.cover svg { width: 30%; height: 30%; stroke: var(--sp-fg); }

/* 封面边框：四条边各分两段，分别从四个角出发向该边中点延展（scale 0→1），
   p=1 时四边在中间合并成完整边框。用真实元素 + transform 动画，最可靠。 */
.cf {
  position: absolute;
  background: var(--sp-fg);
  opacity: 0.9;
  pointer-events: none;
}
.cf-tl, .cf-tr, .cf-bl, .cf-br { height: 2px; width: 50%; }
.cf-lt, .cf-lb, .cf-rt, .cf-rb { width: 2px; height: 50%; }
.cf-tl { top: 0; left: 0; transform-origin: left center; animation: cf-x 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-tr { top: 0; right: 0; transform-origin: right center; animation: cf-x 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-bl { bottom: 0; left: 0; transform-origin: left center; animation: cf-x 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-br { bottom: 0; right: 0; transform-origin: right center; animation: cf-x 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-lt { left: 0; top: 0; transform-origin: center top; animation: cf-y 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-lb { left: 0; bottom: 0; transform-origin: center bottom; animation: cf-y 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-rt { right: 0; top: 0; transform-origin: center top; animation: cf-y 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.cf-rb { right: 0; bottom: 0; transform-origin: center bottom; animation: cf-y 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
@keyframes cf-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cf-y { from { transform: scaleY(0); } to { transform: scaleY(1); } }

/* 歌曲信息：上区（0 → 封面上沿）正中心 */
.song-info {
  position: absolute;
  left: 50%;
  /* 封面尺寸 min(44vh,44vw)，封面上沿 = 50vh - 封面高/2；上区中心 = 其一半 */
  top: calc(25vh - min(11vh, 11vw));
  transform: translate(-50%, -50%);
  width: 70%;
  max-width: 760px;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--sp-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.35);
  z-index: 2;
}
.song-info .sep { margin: 0 12px; opacity: 0.5; }

/* 歌曲信息 / 歌词：桌面歌词风格的「取景框四角」（仅歌曲信息保留） */
.song-info::after {
  content: '';
  position: absolute;
  inset: -6px -14px;
  pointer-events: none;
  background:
    linear-gradient(to right, var(--sp-fg) 12px, transparent 0) 0 0 / 100% 2px no-repeat,
    linear-gradient(to left, var(--sp-fg) 12px, transparent 0) 100% 0 / 100% 2px no-repeat,
    linear-gradient(to bottom, var(--sp-fg) 12px, transparent 0) 0 0 / 2px 100% no-repeat,
    linear-gradient(to bottom, var(--sp-fg) 12px, transparent 0) 100% 0 / 2px 100% no-repeat,
    linear-gradient(to right, var(--sp-fg) 12px, transparent 0) 0 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--sp-fg) 12px, transparent 0) 0 100% / 2px 100% no-repeat,
    linear-gradient(to left, var(--sp-fg) 12px, transparent 0) 100% 100% / 100% 2px no-repeat,
    linear-gradient(to top, var(--sp-fg) 12px, transparent 0) 100% 100% / 2px 100% no-repeat;
  opacity: 0.55;
}

/* 歌词：下区（封面下沿 → 窗口底部）正中心 */
.lyrics {
  position: absolute;
  left: 50%;
  /* 封面下沿 = 50vh + 封面高/2；下区中心 = (封面下沿 + 100vh) / 2 */
  top: calc(75vh + min(11vh, 11vw));
  transform: translate(-50%, -50%);
  width: 70%;
  max-width: 760px;
  text-align: center;
  color: var(--sp-fg);
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.35);
  z-index: 2;
}
.lyric {
  margin: 0;
  height: 1.6em;
  line-height: 1.6em;
  font-size: 24px;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 进入动画用 CSS @keyframes（不依赖 Vue 的 enter 类管理 / rAF），
   即使过渡被延迟或中断，元素也不会停留在 opacity:0。退出仍用 Transition。 */
/* 频谱页整体、背景、封面都不再做入场动画：
   封面飞行与背景渐显已由过场完成，这里是静态接管，避免二次动画（尤其在被过场遮住时白播）。 */
@keyframes sp-in {
  from { opacity: 0; transform: scale(1.03); }
  to { opacity: 1; transform: none; }
}

/* 切歌：封面 / 歌曲信息 / 歌词 内容切换过渡（:key 变化触发新节点重挂载 → CSS 动画自动播放） */
.cover img, .song-info, .lyrics {
  animation: sp-fadein var(--motion-duration-slow, 0.25s) var(--motion-easing-standard, ease);
}
@keyframes sp-fadein { from { opacity: 0; } to { opacity: 1; } }

/* 首次进入：只让封面边框、信息、歌词动 —— 且都在过场 reveal（封面到位）之后开始。
   - 封面/背景由过场飞到位，这里静态接管（不再做 sp-rise-cover）。
   - 信息与歌词「多次闪烁」浮现；边框从四角向中心延展合并（观赏页，时长偏慢）。
   延迟 ≥ (DONE_AT - REVEAL_AT)=40ms，确保不被过场尾巴遮住。 */
.spectrum-overlay .song-info { animation: sp-flicker 0.9s var(--motion-easing-standard, ease) 0.1s both; }
.spectrum-overlay .lyrics { animation: sp-flicker 0.9s var(--motion-easing-standard, ease) 0.2s both; }
@keyframes sp-flicker {
  0% { opacity: 0; }
  15% { opacity: 1; }
  28% { opacity: 0.1; }
  45% { opacity: 1; }
  60% { opacity: 0.25; }
  78% { opacity: 1; }
  100% { opacity: 1; }
}

/* 退出该页面：淡出 */
.sp-fade-leave-active {
  transition: opacity var(--motion-duration-slow, 0.25s) var(--motion-easing-standard, ease);
}
.sp-fade-leave-to { opacity: 0; }

/* ══ Ornate：频谱页——克制的四边蕾丝内衬（不叠加花/蝙蝠，保持频谱视觉身份） ══ */
html[data-motion="ornate"] .spectrum-overlay::before {
  content: '';
  position: absolute; inset: 10px;
  pointer-events: none;
  z-index: 5;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0;
  animation: spec-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .spectrum-overlay::before { opacity: 0.35; }
@keyframes spec-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px; }
}
</style>
