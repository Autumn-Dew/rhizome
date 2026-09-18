import { ref } from 'vue'
import { K_IDLE_TIMEOUT, K_SCREENSAVER_ENABLED } from '@/constants/storage-keys'

const DEFAULT = 5 * 60
const saved = Number(localStorage.getItem(K_IDLE_TIMEOUT)) || DEFAULT
export const idleTimeoutSec = ref(saved)

// 写入时同步 localStorage
export function setIdleTimeout(minutes) {
  const sec = minutes * 60
  idleTimeoutSec.value = sec
  localStorage.setItem(K_IDLE_TIMEOUT, String(sec))
}

// 屏保开关（默认开启）
export const screensaverEnabled = ref(localStorage.getItem(K_SCREENSAVER_ENABLED) !== 'false')
export function setScreensaverEnabled(v) {
  screensaverEnabled.value = !!v
  localStorage.setItem(K_SCREENSAVER_ENABLED, String(!!v))
}

// 屏保抑制（频谱页等全屏界面显示时临时禁用屏保）
export const screensaverSuppressed = ref(false)
export function setScreensaverSuppressed(v) {
  screensaverSuppressed.value = !!v
}
