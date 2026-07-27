/**
 * resolveLyrics — 统一歌词解析（SongDetail + MainLayout 桌面歌词共用）
 *
 * 优先级: syncedLyrics（含有效时间戳） > raw lyrics 字符串数组解析
 * 返回 [{time, text}, ...] 已排序、已合并相同时间戳的行
 */
export function resolveLyrics(song) {
  if (!song) return []

  const synced = song.syncedLyrics
  let list = []

  // 优先使用预解析的同步歌词（需包含有效时间戳）
  if (synced && synced.length > 0 && synced.some(l => l.time > 0)) {
    list = synced.map(l => ({ ...l }))
  } else {
    // 回退：原始 LRC 字符串数组
    const raw = song.lyrics || []
    raw.forEach(line => {
      const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/)
      if (match) {
        list.push({
          time: Number(match[1]) * 60 + Number(match[2]),
          text: match[3].trim(),
        })
      } else {
        list.push({ time: 999999, text: line })
      }
    })
    list.sort((a, b) => a.time - b.time)
  }

  // 合并相同时间戳的行（原词+翻译合并为一行）
  const merged = []
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].time === list[i - 1].time) {
      merged[merged.length - 1].text += '\n' + list[i].text
    } else {
      merged.push({ ...list[i] })
    }
  }
  return merged
}
