// 音频设备路由 — 枚举输出设备、切换、热插拔监听
import { ref, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'rhizome-audio-device'

export function useAudioDevice() {
  const devices = ref([])
  const selectedId = ref(localStorage.getItem(STORAGE_KEY) || '')

  async function refresh() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default')
    } catch {
      devices.value = []
    }
  }

  function select(deviceId) {
    selectedId.value = deviceId
    localStorage.setItem(STORAGE_KEY, deviceId)
  }

  // 将选中设备应用到 audio 元素
  async function applyTo(audio) {
    if (!audio || !audio.setSinkId) return
    const id = selectedId.value
    if (!id) {
      // 空 = 系统默认，不需要设置
      try { await audio.setSinkId('') } catch {}
      return
    }
    // 检查设备是否存在
    const exists = devices.value.some(d => d.deviceId === id)
    if (!exists) {
      // 设备已拔出，回退默认
      select('')
      try { await audio.setSinkId('') } catch {}
      return false // 返回 false 表示回退了
    }
    try {
      await audio.setSinkId(id)
      return true
    } catch {
      return false
    }
  }

  // 热插拔监听
  let handler = null
  onMounted(() => {
    refresh()
    handler = async () => {
      await refresh()
      // 如果当前选中设备不在新列表中，回退
      if (selectedId.value && !devices.value.some(d => d.deviceId === selectedId.value)) {
        select('')
      }
    }
    navigator.mediaDevices?.addEventListener('devicechange', handler)
  })
  onUnmounted(() => {
    navigator.mediaDevices?.removeEventListener('devicechange', handler)
  })

  return { devices, selectedId, refresh, select, applyTo }
}
