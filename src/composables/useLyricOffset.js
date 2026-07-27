/**
 * useLyricOffset — 歌词延迟调节（全局共享，ms 精度）
 *
 * 正值 = 歌词延后显示（当前时间需要领先歌词时间戳 offset 秒才高亮）
 * 负值 = 歌词提前显示
 */
import { ref, watch } from 'vue'
import { K_LYRIC_OFFSET } from '@/constants/storage-keys'
import { LYRIC_OFFSET_DEFAULT } from '@/constants/defaults'

// 模块级单例：SongDetail 和 MainLayout 共享
const offsetMs = ref(
  (() => {
    const v = parseInt(localStorage.getItem(K_LYRIC_OFFSET), 10)
    return isNaN(v) ? LYRIC_OFFSET_DEFAULT : v
  })()
)

// 自动持久化
watch(offsetMs, (val) => {
  localStorage.setItem(K_LYRIC_OFFSET, String(val))
})

export function useLyricOffset() {
  /** 偏移量（秒），用于歌词高亮计算：list[i].time <= currentTime + offset */
  function offsetSeconds() {
    return offsetMs.value / 1000
  }

  return {
    offsetMs,
    offsetSeconds,
  }
}
