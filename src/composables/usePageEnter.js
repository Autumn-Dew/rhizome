import { ref, onMounted, onActivated, nextTick } from 'vue'

// 与 motion-tokens.css 中 --motion-stagger-base / --motion-stagger-interval 保持一致
const STAGGER_INTERVAL = 0.023
const STAGGER_BASE = 0.24

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

  function staggerStyle(index, baseDelay = STAGGER_BASE) {
    return { transitionDelay: `${baseDelay + index * STAGGER_INTERVAL}s` }
  }

  return { entered, triggerEnter, staggerStyle, resetEnter }
}
