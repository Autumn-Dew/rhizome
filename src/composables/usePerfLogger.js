import { onMounted, onUnmounted, watch } from 'vue'
import { logEnabled, isLogEnabled } from '@/composables/useLogging'

/**
 * 轻量性能采样（诊断用，纯增量、可整体移除）。
 *
 * - `PerformanceObserver` 观察 longtask（≥50ms 的主线程阻塞）并打印；
 * - 每 5s 打印一次实测 FPS；
 * 输出走 `console`，开启「调试日志」后由 main 进程的 `console-message` 钩子落盘到
 * `userData/logs/rhizome-YYYYMMDD.log`，便于回传定位卡顿。
 *
 * **默认不启动**：仅在设置页 → 系统选项的「调试日志」开启时才采样，
 * 避免为了诊断而长期承担采样开销；开关切换即时生效。
 *
 * 采样频率刻意压低（5s 一次），避免日志/采样本身造成负担。
 */
export function usePerfLogger(label = 'app') {
  let rafId = 0
  let frames = 0
  let lastTs = 0
  let observer = null
  let running = false
  let unwatch = null

  function loop(t) {
    if (!lastTs) lastTs = t
    frames++
    if (t - lastTs >= 5000) {
      const fps = Math.round((frames * 1000) / (t - lastTs))
      console.log(`[perf][${label}] fps=${fps}`)
      frames = 0
      lastTs = t
    }
    rafId = requestAnimationFrame(loop)
  }

  function start() {
    if (running) return
    // 开关关闭（默认）：不建立 PerformanceObserver、不跑 rAF 循环
    if (!isLogEnabled()) return
    running = true
    try {
      if (typeof PerformanceObserver === 'function') {
        observer = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.duration >= 50) {
              console.warn(`[perf][${label}] longtask ${Math.round(e.duration)}ms @${Math.round(e.startTime)}ms`)
            }
          }
        })
        observer.observe({ entryTypes: ['longtask'] })
      }
    } catch { /* longtask 不被支持时忽略 */ }
    try {
      lastTs = 0
      frames = 0
      rafId = requestAnimationFrame(loop)
    } catch {}
  }

  function stop() {
    running = false
    try { cancelAnimationFrame(rafId) } catch {}
    try { if (observer) observer.disconnect() } catch {}
  }

  onMounted(() => {
    start()
    // 运行中切换开关时即时启停采样
    unwatch = watch(logEnabled, (on) => (on ? start() : stop()))
  })
  onUnmounted(() => {
    try { unwatch?.() } catch { /* ignore */ }
    unwatch = null
    stop()
  })

  return { start, stop }
}
