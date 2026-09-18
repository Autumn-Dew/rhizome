// 自动歌单：周 / 月 / 年三种周期独立生成
// - 每种周期各生成「最爱」（周期内播放 top10）与「发现」（未播放优先）两类歌单
// - 三种周期前缀互不相同、清理逻辑各自独立（互不干扰）
// - 每种周期各自保留最近 4 期；更早的会被新一期覆盖/清理
// - 用户「永久保存」的自动歌单会转为普通歌单（localId 不再带周期前缀），天然脱离自动系统
import { K_WEEKLY_PLAYLISTS, K_WEEKLY_ENABLED, K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS, K_PLAY_HISTORY_FULL, K_PLAY_COUNT_REAL } from '@/constants/storage-keys'
import { PERIODS, getPeriodKey, getPeriodRangeStart, PERIOD_META } from '@/utils/auto-playlists'

export function isWeeklyEnabled() {
  return localStorage.getItem(K_WEEKLY_ENABLED) === 'true'
}

export function setWeeklyEnabled(val) {
  localStorage.setItem(K_WEEKLY_ENABLED, String(!!val))
}

// 每类自动歌单的歌曲数量上限
const AUTO_LIMIT = 30

// 生成单个周期的自动歌单；force=true 时强制重新生成（覆盖旧一期）
function generateForPeriod(songList, period, force = false) {
  const meta = PERIOD_META[period]
  const key = getPeriodKey(period)

  const genMeta = JSON.parse(localStorage.getItem(K_WEEKLY_PLAYLISTS) || '{}')
  const existing = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]')
  const hasTop = existing.some(p => p.localId === meta.topPrefix + key)
  const hasDisc = existing.some(p => p.localId === meta.discPrefix + key)
  if (!force && genMeta[period] === key && (hasTop || hasDisc)) return null

  const history = JSON.parse(localStorage.getItem(K_PLAY_HISTORY_FULL) || '[]')
  const countMap = JSON.parse(localStorage.getItem(K_PLAY_COUNT_REAL) || '{}')
  const start = getPeriodRangeStart(period)

  // 该周期内播放次数
  const periodPlays = {}
  history.forEach(h => {
    if (h && h.path && typeof h.playAt === 'number' && h.playAt >= start) {
      periodPlays[h.path] = (periodPlays[h.path] || 0) + 1
    }
  })

  const playedPaths = new Set(Object.keys(countMap))

  const top = songList
    .map(s => ({ path: s.path, p: periodPlays[s.path] || 0 }))
    .filter(s => s.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, AUTO_LIMIT)
    .map(s => s.path)

  const neverPlayed = songList.filter(s => !playedPaths.has(s.path))
  const leastPlayed = songList
    .filter(s => playedPaths.has(s.path))
    .sort((a, b) => (countMap[a.path] || 0) - (countMap[b.path] || 0))
  const discovery = [...neverPlayed, ...leastPlayed].slice(0, AUTO_LIMIT).map(s => s.path)

  const playlists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]')
  const songsMap = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')

  // 移除该周期的旧一期（仅本周期前缀），其它周期/普通歌单不受影响
  const others = playlists.filter(p =>
    !p.localId?.startsWith(meta.topPrefix) && !p.localId?.startsWith(meta.discPrefix)
  )

  const now = Date.now()
  if (top.length) {
    others.push({ localId: meta.topPrefix + key, title: `${meta.topTitle} · ${key}`, intro: meta.topIntro, isAuto: true, createdAt: now })
    songsMap[meta.topPrefix + key] = top
  }
  if (discovery.length) {
    others.push({ localId: meta.discPrefix + key, title: `${meta.discTitle} · ${key}`, intro: meta.discIntro, isAuto: true, createdAt: now })
    songsMap[meta.discPrefix + key] = discovery
  }

  // 清理该周期可能残留的旧歌曲数据（单期覆盖）
  Object.keys(songsMap).forEach(id => {
    if (id.startsWith(meta.topPrefix) || id.startsWith(meta.discPrefix)) {
      if (id !== meta.topPrefix + key && id !== meta.discPrefix + key) delete songsMap[id]
    }
  })

  localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(others))
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(songsMap))
  genMeta[period] = key
  localStorage.setItem(K_WEEKLY_PLAYLISTS, JSON.stringify(genMeta))
  return true
}

// 检查并生成 周/月/年 三类自动歌单（各自独立）
// force=true 时强制重新生成（用于开关开启瞬间的数据更新/覆盖）
export function checkAndGenerateAuto(songList, force = false) {
  if (!isWeeklyEnabled()) return null
  if (!songList || !songList.length) return null
  for (const period of PERIODS) {
    try { generateForPeriod(songList, period, force) } catch (e) { console.error('[auto-playlist] failed', period, e) }
  }
  return true
}

// 兼容旧调用名
export const checkAndGenerateWeekly = checkAndGenerateAuto

// 是否为自动歌单（带任一周期前缀）
export function isAutoPlaylistId(localId) {
  if (!localId) return false
  return PERIODS.some(p => localId.startsWith(PERIOD_META[p].topPrefix) || localId.startsWith(PERIOD_META[p].discPrefix))
}
