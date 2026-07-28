import { ref } from 'vue'
import { K_IDLE_TIMEOUT } from '@/constants/storage-keys'

const DEFAULT = 5 * 60
const saved = Number(localStorage.getItem(K_IDLE_TIMEOUT)) || DEFAULT
export const idleTimeoutSec = ref(saved)

// 写入时同步 localStorage
export function setIdleTimeout(minutes) {
  const sec = minutes * 60
  idleTimeoutSec.value = sec
  localStorage.setItem(K_IDLE_TIMEOUT, String(sec))
}
