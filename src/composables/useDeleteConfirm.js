/**
 * useDeleteConfirm — 删除操作多次点击确认
 *
 * 用法:
 *   const { confirmDelete, resetConfirm, confirmHint } = useDeleteConfirm()
 *
 *   function tryDelete(item) {
 *     if (!confirmDelete(item.id)) return  // 自动弹出 ElMessage 提示剩余次数
 *     resetConfirm()
 *     // 真正执行删除...
 *   }
 *
 * 特殊场景（清除数据，固定 5 次，不受设置影响）:
 *   const { confirmHardDelete } = useDeleteConfirm()
 *   if (!confirmHardDelete()) return
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { K_DELETE_CONFIRM } from '@/constants/storage-keys'
import { DELETE_CONFIRM_DEFAULT, DELETE_CONFIRM_OPTIONS } from '@/constants/defaults'

const requiredCount = ref(
  (() => {
    const v = parseInt(localStorage.getItem(K_DELETE_CONFIRM), 10)
    return DELETE_CONFIRM_OPTIONS.includes(v) ? v : DELETE_CONFIRM_DEFAULT
  })()
)

const lastTarget = ref(null)
const clickCount = ref(0)

// 硬删除独立计数（不受设置影响，固定 5 次）
const hardClickCount = ref(0)
const HARD_DELETE_COUNT = 5

/** 点击删除按钮时调用。返回 true 表示确认通过。失败时自动弹出 ElMessage 提示。 */
function confirmDelete(targetId) {
  if (lastTarget.value !== targetId) {
    lastTarget.value = targetId
    clickCount.value = 1
    ElMessage({ message: `再点 ${requiredCount.value - 1} 次删除`, type: 'warning', duration: 1500, showClose: false })
    return false
  }
  clickCount.value++
  const remaining = requiredCount.value - clickCount.value
  if (remaining > 0) {
    ElMessage({ message: `再点 ${remaining} 次删除`, type: 'warning', duration: 1500, showClose: false })
    return false
  }
  ElMessage({ message: '已删除', type: 'success', duration: 1000, showClose: false })
  return true
}

/** 清除所有数据专用：固定 5 次点击，不受设置影响 */
function confirmHardDelete() {
  hardClickCount.value++
  const remaining = HARD_DELETE_COUNT - hardClickCount.value
  if (remaining > 0) {
    ElMessage({ message: `清除数据需确认 · 再点 ${remaining} 次`, type: 'error', duration: 2000, showClose: false })
    return false
  }
  hardClickCount.value = 0
  return true
}

/** 重置计数 */
function resetConfirm() {
  lastTarget.value = null
  clickCount.value = 0
}

/** 设置确认次数（设置页用） */
function setRequiredCount(n) {
  const v = DELETE_CONFIRM_OPTIONS.includes(n) ? n : DELETE_CONFIRM_DEFAULT
  requiredCount.value = v
  localStorage.setItem(K_DELETE_CONFIRM, String(v))
}

/** tooltip 文字（给 :title 用） */
function confirmHint(targetId) {
  if (lastTarget.value !== targetId || clickCount.value === 0) return ''
  const remaining = requiredCount.value - clickCount.value
  if (remaining <= 0) return ''
  return `再点 ${remaining} 次删除`
}

/** 当前删除紧急度 0~1（用于 CSS 脉冲速度） */
const urgency = computed(() =>
  clickCount.value > 0 ? clickCount.value / requiredCount.value : 0
)

/** 删除脉冲阶梯样式：第1次慢+浅红，第2次起快+暗红 */
const pulseStyle = computed(() => {
  if (clickCount.value <= 0) return {}
  if (clickCount.value === 1) {
    return { '--pulse-speed': '0.7s', '--pulse-color': '#ff6b6b', '--pulse-bg': 'rgba(255,107,107,0.12)' }
  }
  return { '--pulse-speed': '0.3s', '--pulse-color': '#c0392b', '--pulse-bg': 'rgba(192,57,43,0.18)' }
})

export function useDeleteConfirm() {
  return {
    confirmDelete,
    confirmHardDelete,
    resetConfirm,
    clickCount,
    requiredCount,
    confirmHint,
    pulseStyle,
    setRequiredCount,
    DELETE_CONFIRM_OPTIONS,
  }
}
