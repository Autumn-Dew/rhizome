// 播放次数档位竖条：读取累计播放次数映射，提供每首歌的档位颜色
import { K_PLAY_COUNT_REAL } from '@/constants/storage-keys'
import { playCountTierColor } from '@/utils/play-count'

export function usePlayCountBar() {
  let map
  try { map = JSON.parse(localStorage.getItem(K_PLAY_COUNT_REAL) || '{}') } catch { map = {} }

  // 返回歌曲对应的档位颜色；无 path 或 <10 次返回 null（不显示竖条）
  function barColor(song) {
    if (!song?.path) return null
    return playCountTierColor(map[song.path] || 0)
  }

  return { barColor }
}
