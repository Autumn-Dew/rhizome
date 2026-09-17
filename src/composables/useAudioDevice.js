// 音频设备路由 — 枚举输出设备、切换、热插拔监听
import { ref, onMounted } from 'vue'
import { K_AUDIO_DEVICE } from '@/constants/storage-keys'

// 模块级单例：MainLayout 与 SettingsPage 各自调用 useAudioDevice 时共享选中设备状态，
// 避免两个实例的 selectedId 不同步导致热插拔误判
const selectedId = ref(localStorage.getItem(K_AUDIO_DEVICE) || '')

export function useAudioDevice() {
  const devices = ref([])
  let knownIds = new Set()

  async function refresh() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      devices.value = all.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default')
      return all.filter(d => d.kind === 'audiooutput' && d.deviceId)
    } catch {
      devices.value = []
      return []
    }
  }

  function select(deviceId) {
    selectedId.value = deviceId || ''
    localStorage.setItem(K_AUDIO_DEVICE, deviceId || '')
  }

  // 将选中设备应用到 audio 元素；返回 true=已切换，false=设备不存在已回退默认
  async function applyTo(audio) {
    if (!audio || !audio.setSinkId) return false
    const id = selectedId.value
    if (!id) {
      try { await audio.setSinkId('') } catch {}
      return true
    }
    const exists = devices.value.some(d => d.deviceId === id)
    if (!exists) {
      // 设备已拔出，回退默认
      select('')
      try { await audio.setSinkId('') } catch {}
      return false
    }
    try {
      await audio.setSinkId(id)
      return true
    } catch {
      return false
    }
  }

  // 热插拔同步：
  //   - 接入新设备 → 自动切换并持久化
  //   - 当前选中设备断开 → 回退系统默认设备（setSinkId('')）
  async function syncDeviceChange(getAudio) {
    const audioOut = await refresh()
    const currentIds = new Set(audioOut.map(d => d.deviceId))
    const audio = typeof getAudio === 'function' ? getAudio() : null
    const isFirst = knownIds.size === 0

    if (!isFirst) {
      for (const id of currentIds) {
        if (!knownIds.has(id)) {
          select(id)
          if (audio?.setSinkId) audio.setSinkId(id).catch(() => {})
        }
      }
      for (const id of knownIds) {
        if (!currentIds.has(id) && selectedId.value === id) {
          select('')
          if (audio?.setSinkId) audio.setSinkId('').catch(() => {})
        }
      }
    }
    knownIds = currentIds
  }

  onMounted(() => { refresh() })

  return { devices, selectedId, refresh, select, applyTo, syncDeviceChange }
}
