/**
 * usePageEnter — 页面入场动画统一 composable
 *
 * 使用:
 *   const { entered, triggerEnter, staggerStyle } = usePageEnter()
 *   模板: <div :class="{ entered }">
 *
 * 默认行为：onMounted 后 nextTick 自动触发。
 * 需要等待异步数据的视图：在数据加载完成后手动调用 triggerEnter()。
 *
 * staggerStyle(idx, baseDelay) — 列表项逐项延迟入场（替代 nth-child CSS 硬编码）
 */
import { ref, onMounted, nextTick } from 'vue'

const STAGGER_INTERVAL = 0.023  // 每项间隔 23ms
const STAGGER_BASE = 0.24        // 首项从 240ms 开始

export function usePageEnter() {
  const entered = ref(false)
  let triggered = false

  function triggerEnter() {
    if (triggered) return
    triggered = true
    requestAnimationFrame(() => { entered.value = true })
  }

  onMounted(() => {
    // nextTick 确保 DOM 已渲染。异步加载的视图应在数据就绪后手动调用 triggerEnter()，
    // 那时 triggered 已为 true，这里的调用会被跳过。
    nextTick(() => {
      if (!triggered) triggerEnter()
    })
  })

  /**
   * 列表项逐项延迟入场。
   * @param {number} index  — 0-based 列表索引
   * @param {number} [baseDelay=0.24] — 首项延迟秒数
   * @returns {{ transitionDelay: string }}
   */
  function staggerStyle(index, baseDelay = STAGGER_BASE) {
    return { transitionDelay: `${baseDelay + index * STAGGER_INTERVAL}s` }
  }

  return { entered, triggerEnter, staggerStyle }
}
