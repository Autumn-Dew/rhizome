import { ref } from 'vue'
import { K_LOG_ENABLED } from '@/constants/storage-keys'

/**
 * 调试日志开关（默认关闭）。
 *
 * 影响两处：
 *  - main 进程：`electron/lib/logger.cjs` 的落盘开关（IPC `set-log-enabled`）
 *  - renderer：`usePerfLogger` 的性能采样（longtask / fps）
 *
 * 注意：main 进程读不到 localStorage，所以渲染进程启动时必须调用
 * `syncLogEnabledToMain()` 把持久化值同步过去，否则「开启日志后重启」会失效。
 */
function readStored() {
  try {
    return localStorage.getItem(K_LOG_ENABLED) === 'true'
  } catch {
    return false
  }
}

/** 当前开关状态（响应式；供 usePerfLogger 等 watch 使用） */
export const logEnabled = ref(readStored())

/** 当前是否启用调试日志（响应式） */
export function isLogEnabled() {
  return logEnabled.value
}

/** 切换开关：写 localStorage 并通知主进程 */
export function setLogEnabled(v) {
  const on = !!v
  logEnabled.value = on
  try {
    localStorage.setItem(K_LOG_ENABLED, on ? 'true' : 'false')
  } catch { /* ignore */ }
  try {
    window.electron?.setLogEnabled?.(on)
  } catch { /* ignore */ }
}

/** 启动时把持久化值同步给 main 进程 */
export function syncLogEnabledToMain() {
  try {
    window.electron?.setLogEnabled?.(logEnabled.value)
  } catch { /* ignore */ }
}

export function useLogging() {
  return { logEnabled, isLogEnabled, setLogEnabled }
}
