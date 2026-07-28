import { ref, watch, toRef, isRef, onMounted, onUnmounted } from 'vue'

const DEFAULT_MS = 5 * 60 * 1000

export function useIdle(options = {}) {
  const timeoutRef = isRef(options.timeout)
    ? options.timeout
    : toRef(() => options.timeout ?? DEFAULT_MS)
  const onIdle = options.onIdle ?? (() => {})
  const onActive = options.onActive ?? (() => {})

  const isIdle = ref(false)
  let timer = null

  function resetTimer() {
    clearTimeout(timer)
    if (isIdle.value) {
      isIdle.value = false
      onActive()
    }
    timer = setTimeout(() => {
      isIdle.value = true
      onIdle()
    }, timeoutRef.value)
  }

  function onActivity() { resetTimer() }

  onMounted(() => {
    document.addEventListener('mousemove', onActivity, { passive: true })
    document.addEventListener('mousedown', onActivity)
    document.addEventListener('keydown', onActivity)
    document.addEventListener('wheel', onActivity, { passive: true })
    document.addEventListener('touchstart', onActivity, { passive: true })
    resetTimer()
  })

  // timeout 变化时重新计时
  watch(timeoutRef, () => resetTimer())

  onUnmounted(() => {
    clearTimeout(timer)
    document.removeEventListener('mousemove', onActivity)
    document.removeEventListener('mousedown', onActivity)
    document.removeEventListener('keydown', onActivity)
    document.removeEventListener('wheel', onActivity)
    document.removeEventListener('touchstart', onActivity)
  })

  return { isIdle, resetTimer }
}
