import { ref, computed, watch, effectScope } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'

/**
 * Rhizome Motion State —— 单一轻量状态源（不做过度抽象）。
 *
 * 职责：
 *  - 派生页面/播放的 Motion 状态 mode（transition 优先级最高）。
 *  - 把 mode 同步到根元素 `data-motion-mode`，供 CSS 选择器驱动 Ambient Motion：
 *      playing  → 界面运转（ambient animation 运行）
 *      paused   → 明显降低
 *      idle     → 进一步安静
 *      transition → 页面转场接管，ambient 让位（由 SpectrumTransition 主导）
 *
 * 约定：仅此一个状态源；不再新增 useXxxAnimation 之类的分散 composable。
 */
const transitioning = ref(false)
const mode = ref('idle')
let scope = null

function wire() {
  if (scope) return
  // detached scope：Motion State 是全局单例，不随某个组件卸载而失效
  scope = effectScope(true)
  scope.run(() => {
    const playerStore = usePlayerStore()
    const derived = computed(() => {
      if (transitioning.value) return 'transition' // 优先级最高，独占视觉节奏
      if (!playerStore.currentSong) return 'idle'
      return playerStore.isPlaying ? 'playing' : 'paused'
    })
    watch(derived, (m) => {
      mode.value = m
      if (typeof document !== 'undefined') {
        const root = document.documentElement
        root.setAttribute('data-motion-mode', m)
        // 转场强度：转场时为 1，其余为 0，供 CSS 决定 ambient 是否让位
        root.style.setProperty('--motion-transition', transitioning.value ? '1' : '0')
      }
    }, { immediate: true })
  })
}

export function useMotionState() {
  wire()
  const setTransitioning = (v) => { transitioning.value = !!v }
  return { mode, transitioning, setTransitioning }
}
