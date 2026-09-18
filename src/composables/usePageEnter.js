import { ref, onMounted, onActivated, nextTick } from 'vue'

// 回退值：与 motion-tokens.css 中 --motion-stagger-base / --motion-stagger-interval 的 :root 默认值一致，
// 在 CSS 变量不可读（如测试环境）时使用，保证与经典方案行为一致。
const STAGGER_INTERVAL = 0.023
const STAGGER_BASE = 0.24

// 读取指定 CSS 时间变量（秒）；不可读时回退。
function readCssTime(name, fallback) {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

// 按当前动画方案缓存 stagger 参数；方案（data-motion）变化时才重读 CSS 变量。
let _cache = { motion: null, base: STAGGER_BASE, interval: STAGGER_INTERVAL }
function readStagger() {
  if (typeof document === 'undefined') return _cache
  const motion = document.documentElement.getAttribute('data-motion')
  if (_cache.motion !== motion) {
    _cache = {
      motion,
      base: readCssTime('--motion-stagger-base', STAGGER_BASE),
      interval: readCssTime('--motion-stagger-interval', STAGGER_INTERVAL),
    }
  }
  return _cache
}

export function usePageEnter() {
  const entered = ref(false)
  let triggered = false

  function triggerEnter() {
    if (triggered) { entered.value = true; return }
    triggered = true
    requestAnimationFrame(() => { entered.value = true })
  }

  function resetEnter() {
    entered.value = false
    triggered = false
  }

  onMounted(() => {
    nextTick(() => { if (!triggered) triggerEnter() })
  })

  // keep-alive 缓存后返回时重新触发入场动效
  onActivated(() => {
    resetEnter()
    nextTick(() => { triggerEnter() })
  })

  function staggerStyle(index, baseDelay) {
    const { base, interval } = readStagger()
    const start = baseDelay ?? base
    return { transitionDelay: `${start + index * interval}s` }
  }

  return { entered, triggerEnter, staggerStyle, resetEnter }
}
