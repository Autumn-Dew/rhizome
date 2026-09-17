import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { K_DELETE_CONFIRM } from '@/constants/storage-keys'
import { DELETE_CONFIRM_DEFAULT, DELETE_CONFIRM_OPTIONS } from '@/constants/defaults'
import { playChargeSound } from '@/composables/useSound'

const requiredCount = ref(
  (() => {
    const v = parseInt(localStorage.getItem(K_DELETE_CONFIRM), 10)
    return DELETE_CONFIRM_OPTIONS.includes(v) ? v : DELETE_CONFIRM_DEFAULT
  })()
)

const HARD_DELETE_COUNT = 5

export function useDeleteConfirm() {
  const lastTarget = ref(null)
  const clickCount = ref(0)
  const hardClickCount = ref(0)
  let resetTimer = null

  function confirmDelete(targetId) {
    clearTimeout(resetTimer)
    if (lastTarget.value !== targetId) {
      lastTarget.value = targetId
      clickCount.value = 1
      playChargeSound(clickCount.value)
      ElMessage({ message: `再点 ${requiredCount.value - 1} 次删除`, type: 'warning', duration: 1500, showClose: false })
      resetTimer = setTimeout(resetConfirm, 3000)
      return false
    }
    clickCount.value++
    playChargeSound(clickCount.value)
    const remaining = requiredCount.value - clickCount.value
    if (remaining > 0) {
      ElMessage({ message: `再点 ${remaining} 次删除`, type: 'warning', duration: 1500, showClose: false })
      resetTimer = setTimeout(resetConfirm, 3000)
      return false
    }
    ElMessage({ message: '已删除', type: 'success', duration: 1000, showClose: false })
    resetConfirm()
    return true
  }

  function confirmHardDelete() {
    hardClickCount.value++
    playChargeSound(hardClickCount.value)
    const remaining = HARD_DELETE_COUNT - hardClickCount.value
    if (remaining > 0) {
      ElMessage({ message: `清除数据需确认 · 再点 ${remaining} 次`, type: 'error', duration: 2000, showClose: false })
      return false
    }
    hardClickCount.value = 0
    return true
  }

  function resetConfirm() {
    clearTimeout(resetTimer)
    lastTarget.value = null
    clickCount.value = 0
  }

  function setRequiredCount(n) {
    const v = DELETE_CONFIRM_OPTIONS.includes(n) ? n : DELETE_CONFIRM_DEFAULT
    requiredCount.value = v
    localStorage.setItem(K_DELETE_CONFIRM, String(v))
  }

  function confirmHint(targetId) {
    if (lastTarget.value !== targetId || clickCount.value === 0) return ''
    const remaining = requiredCount.value - clickCount.value
    if (remaining <= 0) return ''
    return `再点 ${remaining} 次删除`
  }

  const pulseStyle = computed(() => {
    if (clickCount.value <= 0) return {}
    if (clickCount.value === 1) {
      return { '--pulse-speed': '0.7s', '--pulse-color': '#ff6b6b', '--pulse-bg': 'rgba(255,107,107,0.12)' }
    }
    return { '--pulse-speed': '0.3s', '--pulse-color': '#c0392b', '--pulse-bg': 'rgba(192,57,43,0.18)' }
  })

  /** 获取指定 target 的脉冲样式（仅匹配的 target 有样式） */
  function pulseFor(targetId) {
    if (lastTarget.value !== targetId || clickCount.value <= 0) return {}
    return pulseStyle.value
  }

  return { confirmDelete, confirmHardDelete, resetConfirm, clickCount, requiredCount, confirmHint, pulseStyle, pulseFor, setRequiredCount, DELETE_CONFIRM_OPTIONS }
}
