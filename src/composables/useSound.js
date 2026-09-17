// UI 音效服务 — 通用操作音效 / 多次点击递增音效 / 快捷键音效 / 光标悬停音效 / 长按提示音效
// 仅用于瞬时 UI 反馈音效，与播放器音乐 Audio（playerStore.audio）完全隔离，不触碰播放核心。
import { K_SOUND_ENABLED, K_SOUND_VOLUME } from '@/constants/storage-keys'

const BASE = import.meta.env.BASE_URL || './'

// ── 音效开关 / 音量（持久化） ──
let sfxEnabled = localStorage.getItem(K_SOUND_ENABLED) !== 'false' // 默认开启
let sfxVolume = clampVolume(localStorage.getItem(K_SOUND_VOLUME))

function clampVolume(v) {
  // 注意：Number(null) === 0，若直接 Number(getItem(...)) 会把"未设置"误当成音量 0
  if (v == null || v === '') return 1
  const n = Number(v)
  if (!isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}

export function isSoundEnabled() { return sfxEnabled }
export function setSoundEnabled(v) {
  sfxEnabled = !!v
  localStorage.setItem(K_SOUND_ENABLED, String(!!v))
}
export function getSoundVolume() { return sfxVolume }
export function setSoundVolume(v) {
  sfxVolume = clampVolume(v)
  localStorage.setItem(K_SOUND_VOLUME, String(sfxVolume))
}

// 多次点击递增音效：顺序 0 → 4（文件名中间的数字后缀固定对应）
const CHARGE_FILES = [
  'magic_basic_mag_overcharge_0_14.wav',
  'magic_basic_mag_overcharge_1_15.wav',
  'magic_basic_mag_overcharge_2_16.wav',
  'magic_basic_mag_overcharge_3_17.wav',
  'magic_basic_mag_overcharge_4_18.wav',
]

// ── 音效播放 ──
// 主用 Web Audio API：AudioContext 跟随系统默认输出设备，切换音频设备时会自动重新路由；
// 而 <audio> 元素在设备切换后输出流可能损坏导致静默，故仅作加载失败时的回退。
let audioCtx = null
const sfxBuffers = {}
const sfxLoadPromises = {}

function getAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    try { audioCtx = new Ctx() } catch { return null }
  }
  if (audioCtx.state === 'suspended') {
    try { audioCtx.resume() } catch {}
  }
  return audioCtx
}

function loadArrayBuffer(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) resolve(xhr.response)
      else reject(new Error('status ' + xhr.status))
    }
    xhr.onerror = () => reject(new Error('xhr error'))
    xhr.send()
  })
}

function loadSfxBuffer(ctx, src) {
  if (sfxBuffers[src]) return Promise.resolve(sfxBuffers[src])
  if (!sfxLoadPromises[src]) {
    sfxLoadPromises[src] = loadArrayBuffer(src)
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buf) => { sfxBuffers[src] = buf; return buf })
      .catch((e) => { sfxLoadPromises[src] = null; throw e })
  }
  return sfxLoadPromises[src]
}

// 共享 master Gain：音量统一，避免每次播放都新建 GainNode（每次只保留一次性的 BufferSource）
let masterGain = null
function getMasterGain(ctx) {
  if (!masterGain || masterGain.context !== ctx) {
    try {
      masterGain = ctx.createGain()
      masterGain.connect(ctx.destination)
    } catch { masterGain = null }
  }
  if (masterGain) masterGain.gain.value = sfxVolume
  return masterGain
}

function playBuffer(ctx, buf) {
  try {
    const dst = getMasterGain(ctx)
    if (!dst) return
    const node = ctx.createBufferSource()
    node.buffer = buf
    node.connect(dst)
    node.start(0)
    node.onended = () => { try { node.disconnect() } catch {} }
  } catch {}
}

// 回退：<audio> 池（复用小量实例，避免累积触发 media element 上限）
const SFX_POOL_SIZE = 6
const sfxPool = []
let sfxPoolCursor = 0

function acquireSfxAudio() {
  if (sfxPool.length < SFX_POOL_SIZE) {
    const a = new Audio()
    sfxPool.push(a)
    return a
  }
  const a = sfxPool[sfxPoolCursor]
  sfxPoolCursor = (sfxPoolCursor + 1) % sfxPool.length
  return a
}

function playViaAudio(src) {
  try {
    const a = acquireSfxAudio()
    a.volume = sfxVolume
    a.src = src
    a.play().catch(() => {})
  } catch {}
}

export function playSound(src) {
  if (!sfxEnabled) return
  const ctx = getAudioCtx()
  if (!ctx) { playViaAudio(src); return }
  const cached = sfxBuffers[src]
  if (cached) { playBuffer(ctx, cached); return }
  loadSfxBuffer(ctx, src).then((buf) => playBuffer(ctx, buf)).catch(() => playViaAudio(src))
}

// 预加载常用音效（应用启动时调用，减少首次触发延迟）
export function preloadSfx() {
  const ctx = getAudioCtx()
  if (!ctx) return
  for (const f of ['pr_basic_getmana_pr_58.wav', 'ui_cursor_29.wav', 'ui_enter_34.wav']) {
    loadSfxBuffer(ctx, BASE + f).catch(() => {})
  }
}

// 通用操作音效
export function playUiSound() {
  playSound(BASE + 'pr_basic_getmana_pr_58.wav')
}

// 光标悬停音效
export function playCursorSound() {
  playSound(BASE + 'ui_cursor_29.wav')
}

// 文件夹长按提示音效（长按 1s 触发）
export function playHoldSound() {
  playSound(BASE + 'magic_basic_magic_hold_nocharge_en_43.wav')
}

// 多次点击递增音效：clickIndex 为第几次点击（1 起），映射到 _0.._4
export function playChargeSound(clickIndex) {
  const i = Math.max(0, Math.min(4, (Number(clickIndex) || 1) - 1))
  playSound(BASE + CHARGE_FILES[i])
}

// 快捷键音效
export function playShortcutSound() {
  playSound(BASE + 'ui_enter_34.wav')
}

// 全局 click 委托：点击任意可交互元素即播放通用音效
// 带 [data-charge-sound] 的元素（删除确认类）跳过，由 useDeleteConfirm 播放递增音效
export const CLICKABLE_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  '.album-thumb',       // 播放栏封面
  '.folder-chip',       // 本地音乐文件夹 chip
  '.view-card',         // 本地音乐专辑/艺人卡片
  '.playlist-cover',    // 歌单封面
  '.playlist-item',     // 歌单列表行
  '.playlist-option',   // 歌单弹窗选项
  '.song-item',         // 歌曲列表行
  '.song-select-item',  // 歌单选择项
  '.diary-song',        // 听歌日记歌曲行
  '.sp-tab',            // 设置选项卡
  '.ss-cell-key',       // 设置快捷键格
  '.album-cover',       // 歌曲详情封面返回
].join(',')

let globalBound = false

export function initGlobalUiSound() {
  if (globalBound || typeof document === 'undefined') return
  globalBound = true
  document.addEventListener('click', (e) => {
    if (e.button !== 0) return
    const target = e.target instanceof Element ? e.target : null
    if (!target) return
    const el = target.closest(CLICKABLE_SELECTOR)
    if (!el) return
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return
    // 删除确认类操作走递增音效，跳过通用音效
    if (el.closest('[data-charge-sound]')) return
    playUiSound()
  })
}
