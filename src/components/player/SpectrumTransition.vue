<template>
  <Teleport to="body">
    <div v-if="active" class="st-root">
      <!-- 背景：封面铺满 + 模糊（与频谱页一致），渐显 -->
      <div class="st-bg" :class="{ on: expanded }" :style="bgStyle"></div>
      <div class="st-mask" :class="{ on: expanded }"></div>

      <!-- 几何引擎：线 / 框 / 环 / 核心 四种视觉语言 -->
      <canvas ref="cv" class="st-lines"></canvas>

      <!-- 核心：飞行封面（共享元素 FLIP + 透视推进） -->
      <div class="st-fly" :style="flyStyle">
        <img v-if="coverUrl" :src="coverUrl" alt="cover" />
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2" />
          <circle cx="12" cy="12" r="3" stroke-width="2" />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * SpectrumTransition — Rhizome「音乐界面重构」转场
 *
 * 视觉语言统一为四种元素：线(信息/轨迹/歌词) · 框(页面结构) · 环(扫描/旋转) · 核心(封面)。
 *
 * 进入（in）＝ UI → 线 → 框 → 环 → 核心 → 封面屏保
 *   0.00–0.17 克制：核心轻微响应（轮廓线 + 一道极细扫描弧）
 *   0.17–0.39 解构：详情页 UI 被解析成几何线条（真实 DOM 由 SongDetail 折叠淡出）
 *   0.39–0.72 重组：线/框/环围绕核心分层重组（内环+刻度 / 中弧+六边形+轨道 / 外框+长线+节点）
 *   0.72–0.89 收束：环停、半径收缩、结构向核心汇聚（慢→快→高速）
 *   0.89–0.94 极简：线条快速消失，只剩核心
 *   0.94–1.00 接管：核心扩大占满屏幕 → emit('done')
 * 退出（out）＝ 核心 → 环 → 框 → 线 → UI（同样的元素，时间与聚合方向镜像）
 */
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'

const props = defineProps({
  active: { type: Boolean, default: false },
  coverUrl: { type: String, default: '' },
  // 详情页封面起始矩形
  fromRect: { type: Object, default: null },
  // 'in' | 'out'
  mode: { type: String, default: 'in' },
  // 详情页各 UI 区域矩形：{ root, header, controls, progress, lyrics }
  layoutRects: { type: Object, default: null },
})
const emit = defineEmits(['done', 'reveal'])

const DURATION = 900
const REVEAL_AT = DURATION          // 核心到位那一刻才让频谱页显示
const DONE_AT = DURATION + 40

const { isDark } = useGlobalTheme()

const expanded = ref(false)
let tReveal = null
let tDone = null
let tStart = null

const bgStyle = computed(() =>
  props.coverUrl ? { backgroundImage: `url("${props.coverUrl}")` } : {})

/* ==================== 几何引擎（Canvas） ==================== */
const cv = ref(null)
let raf = null
let watchdog = null
let startTs = 0
let lastTick = 0
let drawing = false
let dpr = 1

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const seg = (t, a, b) => clamp01((t - a) / (b - a))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeIn = (x) => x * x * x
const lerp = (a, b, p) => a + (b - a) * p
const TAU = Math.PI * 2

/** 主题反色（浅色主题深线 / 深色主题浅线） */
function inkRGB() { return isDark.value ? '240,240,244' : '16,16,20' }

// 时间轴分界
const T = { calm: 0.17, decode: 0.39, reorganize: 0.72, converge: 0.89, minimal: 0.94 }

function resizeCanvas() {
  const c = cv.value
  if (!c) return
  const r = c.getBoundingClientRect()
  if (!r.width || !r.height) return
  dpr = window.devicePixelRatio || 1
  c.width = Math.max(1, Math.round(r.width * dpr))
  c.height = Math.max(1, Math.round(r.height * dpr))
}

/** 把矩形画成「四条边各自从角向中点生长」的框（框的视觉语言） */
function rectFromCorners(ctx, x, y, w, h, p, segs = 8) {
  const hw = (w / 2) * p, hh = (h / 2) * p
  const steps = segs
  for (let i = 0; i < steps; i++) {
    const s0 = i / steps, s1 = (i + 1) / steps * p
    const a0 = Math.min(s0 * p, p), a1 = s1
    if (a1 <= a0) continue
    // 上/下：从两端向中心
    ctx.beginPath(); ctx.moveTo(x + w * a0, y); ctx.lineTo(x + w * a1, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + w - w * a0, y); ctx.lineTo(x + w - w * a1, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + w * a0, y + h); ctx.lineTo(x + w * a1, y + h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + w - w * a0, y + h); ctx.lineTo(x + w - w * a1, y + h); ctx.stroke()
    // 左/右：从两端向中心
    ctx.beginPath(); ctx.moveTo(x, y + h * a0); ctx.lineTo(x, y + h * a1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y + h - h * a0); ctx.lineTo(x, y + h - h * a1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + w, y + h * a0); ctx.lineTo(x + w, y + h * a1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + w, y + h - h * a0); ctx.lineTo(x + w, y + h - h * a1); ctx.stroke()
  }
}

/** 水平线（两端向中心生长） */
function hLine(ctx, cx, y, full, p) {
  const half = (full / 2) * p
  ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx + half, y); ctx.stroke()
}

/** 不完整圆弧 */
function arc(ctx, cx, cy, r, a0, a1) {
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke()
}

/**
 * 一帧绘制。t ∈ [0,1]。out 模式对 t 取镜像。
 */
function draw(tRaw) {
  const c = cv.value
  if (!c) return
  const t = props.mode === 'out' ? 1 - tRaw : tRaw
  const ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 1
  const ink = inkRGB()
  const L = (a) => `rgba(${ink},${a})`

  const cx = w / 2
  const cy = h / 2
  const coreSize = Math.min(h * 0.44, w * 0.44)
  const R = coreSize / 2

  // 阶段进度
  const pCalm = seg(t, 0, T.calm)
  const pDecode = seg(t, T.calm, T.decode)
  const pReorg = seg(t, T.reorganize, 1)
  const pConv = seg(t, T.reorganize, T.converge)
  const pMin = seg(t, T.converge, T.minimal)
  // 收束位移（慢→快）+ 极简淡出
  const conv = easeIn(pConv)
  const fade = 1 - easeOut(pMin)
  // 结构整体不透明度：从「解构」阶段就渐显（此前 vis 只在重组阶段才 >0，导致前 350ms 全空）
  const vis = Math.min(easeOut(Math.max(pDecode, pReorg)), fade)

  /* ---------- 框：页面结构（外框 + UI 区域框） ---------- */
  const rects = props.layoutRects
  const rootR = rects && rects.root
  if (rootR && vis > 0.01) {
    // 页面边缘 → 极细矩形框（从四角向中心延展），并随收束向核心缩拢
    const k = conv
    const x = lerp(6, cx - R * 0.9, k)
    const y = lerp(6, cy - R * 0.9, k)
    const fw = lerp(w - 12, R * 1.8, k)
    const fh = lerp(h - 12, R * 1.8, k)
    ctx.strokeStyle = L(0.52 * vis)
    rectFromCorners(ctx, x, y, fw, fh, Math.min(1, pDecode * 0.6 + pReorg), 4)
  }

  /* ---------- 线：UI 元素被解析成的几何线条 ---------- */
  if (rects && vis > 0.01) {
    ctx.strokeStyle = L(0.82 * vis)
    // 标题 → 一条水平线（line）
    if (rects.header) {
      const r = rects.header
      const ty = lerp(r.top + r.height * 0.4, cy - R * 0.42, conv)
      const tx = cx // 水平居中于屏幕/封面中心
      hLine(ctx, tx, ty, Math.min(r.width * 0.9, 420) * Math.max(pDecode, conv), 1)
    }
    // 艺术家 → 短线段 + 小节点
    if (rects.header) {
      const r = rects.header
      const ay = lerp(r.top + r.height * 0.78, cy - R * 0.3, conv)
      const ax = cx // 水平居中于屏幕/封面中心
      const len = 90 * Math.max(pDecode, conv)
      ctx.strokeStyle = L(0.7 * vis)
      ctx.beginPath(); ctx.moveTo(ax - len / 2, ay); ctx.lineTo(ax + len / 2, ay); ctx.stroke()
      ctx.beginPath(); ctx.arc(ax, ay, 2, 0, TAU); ctx.stroke()
    }
    // 播放控制 → 圆弧与几何轨道
    if (rects.controls) {
      const r = rects.controls
      const ox = lerp(r.left + r.width / 2, cx, conv)
      const oy = lerp(r.top + r.height / 2, cy + R * 1.25, conv)
      const rr = lerp(Math.min(r.height, r.width) * 0.32, R * 0.5, conv)
      ctx.strokeStyle = L(0.8 * vis)
      arc(ctx, ox, oy, rr, -Math.PI * 0.8, -Math.PI * 0.2)
      arc(ctx, ox, oy, rr, Math.PI * 0.2, Math.PI * 0.8)
    }
    // 进度条 → 细长轨道（line）
    if (rects.progress) {
      const r = rects.progress
      const py = lerp(r.top + r.height * 0.5, cy + R * 0.6, conv)
      const pw = lerp(r.width * 0.8, R * 1.4, conv) * Math.max(pDecode, conv)
      ctx.strokeStyle = L(0.66 * vis)
      ctx.beginPath(); ctx.moveTo(cx - pw / 2, py); ctx.lineTo(cx + pw / 2, py); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx - pw / 2, py, 2, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx + pw / 2, py, 2, 0, TAU); ctx.stroke()
    }
    // 歌词 → 多组极细平行线
    if (rects.lyrics) {
      const r = rects.lyrics
      const gx = cx // 水平居中于屏幕/封面中心
      const gy = lerp(r.top + r.height * 0.5, cy + R * 1.05, conv)
      const gw = lerp(r.width * 0.8, R * 1.6, conv)
      const n = 6
      for (let i = 0; i < n; i++) {
        const yy = gy + (i - (n - 1) / 2) * 7
        const a = (0.55 - Math.abs(i - (n - 1) / 2) * 0.07) * vis
        ctx.strokeStyle = L(a)
        const len = gw * (0.6 + 0.4 * ((i * 37) % 100) / 100) * Math.max(pDecode, conv)
        ctx.beginPath(); ctx.moveTo(gx - len / 2, yy); ctx.lineTo(gx + len / 2, yy); ctx.stroke()
      }
    }
  }

  /* ---------- 核心：封面轮廓 + 扫描（阶段 1 的克制响应） ---------- */
  if (pCalm > 0) {
    ctx.strokeStyle = L(0.55 * pCalm * fade)
    const s = R * 1.06
    rectFromCorners(ctx, cx - s, cy - s, s * 2, s * 2, easeOut(pCalm), 3)
    // 一道极细扫描弧，短暂扫过
    const sweep = easeOut(pCalm) * TAU
    ctx.strokeStyle = L(0.5 * pCalm * fade)
    arc(ctx, cx, cy, R * 1.18, -Math.PI / 2, -Math.PI / 2 + sweep)
  }

  /* ---------- 环：围绕核心的多层结构 ---------- */
  if (vis > 0.01) {
    const grow = Math.max(pReorg, 0.0001)
    // 内层：小圆环 + 精密刻度
    const r0 = lerp(R * 1.35, R * 1.1, conv) * (0.6 + 0.4 * easeOut(grow))
    ctx.strokeStyle = L(0.8 * vis)
    arc(ctx, cx, cy, r0, 0, TAU)
    const spin0 = t * 0.6
    ctx.strokeStyle = L(0.7 * vis)
    for (let i = 0; i < 36; i++) {
      const a = spin0 + (i / 36) * TAU
      const t0 = r0 - 5, t1 = r0 - (i % 3 === 0 ? 11 : 8)
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * t0, cy + Math.sin(a) * t0)
      ctx.lineTo(cx + Math.cos(a) * t1, cy + Math.sin(a) * t1)
      ctx.stroke()
    }
    // 中层：不完整圆弧 + 六边形 + 轨道
    const r1 = lerp(R * 1.75, R * 1.35, conv) * (0.55 + 0.45 * easeOut(grow))
    const spin1 = -t * 0.45
    ctx.strokeStyle = L(0.75 * vis)
    arc(ctx, cx, cy, r1, spin1, spin1 + Math.PI * 1.35)
    arc(ctx, cx, cy, r1, spin1 + Math.PI, spin1 + Math.PI * 1.5)
    // 六边形
    ctx.strokeStyle = L(0.68 * vis)
    const hr = r1 * 0.86
    ctx.beginPath()
    for (let i = 0; i <= 6; i++) {
      const a = spin1 * 0.5 + (i / 6) * TAU
      const px = cx + Math.cos(a) * hr, py = cy + Math.sin(a) * hr
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
    // 轨道（椭圆）
    ctx.strokeStyle = L(0.55 * vis)
    ctx.beginPath()
    ctx.ellipse(cx, cy, r1 * 1.25, r1 * 0.55, t * 0.35, 0, TAU)
    ctx.stroke()
    // 外层：长线 + 少量节点（局部聚集，不是均匀放射）
    const r2 = lerp(R * 2.3, R * 1.7, conv) * (0.5 + 0.5 * easeOut(grow))
    ctx.strokeStyle = L(0.55 * vis)
    const clamp = [[-0.75, -0.35], [-0.15, 0.2], [0.5, 0.9], [1.2, 1.55]]
    for (const [a0, a1] of clamp) {
      const aa = t * 0.22 + a0
      arc(ctx, cx, cy, r2, aa, aa + (a1 - a0))
    }
    ctx.strokeStyle = L(0.78 * vis)
    for (const ang of [0.4, 1.9, 3.3, 5.1]) {
      const px = cx + Math.cos(ang + t * 0.2) * r2
      const py = cy + Math.sin(ang + t * 0.2) * r2
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.stroke()
    }
  }

  // 核心到极简阶段：只剩封面（线条已随 fade 消失）
}

function step() {
  lastTick = performance.now()
  const t = clamp01((performance.now() - startTs) / DURATION)
  try { draw(t) } catch (e) { console.warn('[SpectrumTransition] draw error:', e) }
}
function loop() { step(); if (drawing) raf = requestAnimationFrame(loop) }

function startDraw() {
  drawing = true
  startTs = performance.now()
  lastTick = startTs
  if (cv.value) cv.value.style.opacity = '1'
  resizeCanvas()
  step()
  raf = requestAnimationFrame(loop)
  watchdog = setInterval(() => {
    if (!drawing) { clearInterval(watchdog); watchdog = null; return }
    if (performance.now() - lastTick > 150) step()
  }, 100)
}
function stopDraw() {
  drawing = false
  if (raf) { cancelAnimationFrame(raf); raf = null }
  if (watchdog) { clearInterval(watchdog); watchdog = null }
}

/* ==================== 核心（封面）共享元素 ==================== */
function finalSize() {
  if (typeof window === 'undefined') return 320
  return Math.min(window.innerHeight * 0.44, window.innerWidth * 0.44)
}
const offStyle = computed(() => {
  const r = props.fromRect
  if (!r || !r.width || !r.height || typeof window === 'undefined') return { transform: 'scale(1)' }
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = r.left + r.width / 2 - cx
  const dy = r.top + r.height / 2 - cy
  const s = r.width / finalSize()
  return { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotateX(12deg) translateZ(-200px)` }
})
const centerStyle = computed(() => ({ transform: 'translate(0, 0) scale(1) rotateX(0deg) translateZ(0px)' }))
const flyStyle = computed(() => {
  // in：expanded false→true（详情页位置 → 居中）
  // out：expanded true→false（居中 → 详情页位置），与进入严格镜像
  const atOff = !expanded.value
  return atOff ? offStyle.value : centerStyle.value
})

async function start() {
  expanded.value = props.mode === 'out'
  await nextTick()
  tStart = setTimeout(() => { expanded.value = !expanded.value }, 20)
  // reveal（让频谱页显示）只在「进入」时触发；退出时频谱页应保持隐藏
  if (props.mode === 'in') {
    tReveal = setTimeout(() => emit('reveal'), REVEAL_AT)
  }
  tDone = setTimeout(() => emit('done'), DONE_AT)
  startDraw()
}
function stop() {
  for (const t of [tReveal, tDone, tStart]) if (t) clearTimeout(t)
  tReveal = tDone = tStart = null
  stopDraw()
}

// immediate：组件常由 v-if 在 active 已为 true 时挂载
watch(() => props.active, (v) => { if (v) start(); else stop() }, { immediate: true })
onUnmounted(stop)
</script>

<style scoped>
.st-root {
  position: fixed;
  inset: 0;
  z-index: 4100;
  overflow: hidden;
  perspective: 1600px;
  perspective-origin: 50% 46%;
  animation: st-root-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes st-root-in {
  from { background: rgba(233, 233, 236, 0); }
  to { background: rgba(233, 233, 236, 1); }
}

.st-bg {
  position: absolute;
  inset: -8%;
  background-size: cover;
  background-position: center;
  filter: blur(64px) brightness(1.15) saturate(1.25);
  transform: scale(1.12);
  opacity: 0;
  transition: opacity 0.6s ease;
}
.st-bg.on { opacity: 1; }

.st-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
  opacity: 0;
  transition: opacity 0.6s ease;
}
.st-mask.on { opacity: 1; }

.st-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 核心：封面（共享元素） */
.st-fly {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(44vh, 44vw);
  height: min(44vh, 44vw);
  margin: calc(min(44vh, 44vw) / -2) 0 0 calc(min(44vh, 44vw) / -2);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
.st-fly img { width: 100%; height: 100%; object-fit: cover; }
.st-fly svg { width: 30%; height: 30%; stroke: #333; }
</style>
