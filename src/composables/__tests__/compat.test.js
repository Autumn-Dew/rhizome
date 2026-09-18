import { describe, it, expect, beforeEach } from 'vitest'
import { checkAndGenerateAuto } from '@/composables/useWeeklyPlaylists'
import {
  K_WEEKLY_PLAYLISTS, K_WEEKLY_ENABLED, K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS,
  K_PLAY_HISTORY_FULL, K_PLAY_COUNT_REAL,
} from '@/constants/storage-keys'

// 兼容性回归：模拟 1.0.82 遗留的 localStorage 形态，确认新代码安全降级、不崩溃

const SONG_LIST = [
  { path: 'a.mp3', name: 'A', duration: 100 },
  { path: 'b.mp3', name: 'B', duration: 200 },
  { path: 'c.mp3', name: 'C', duration: 300 },
]

function clearAll() {
  localStorage.clear()
}

describe('升级兼容：自动歌单读取 1.0.82 旧值', () => {
  beforeEach(clearAll)

  it('旧 K_WEEKLY_PLAYLISTS={weekKey} 不会崩溃，并重新生成周/月/年', () => {
    // 1.0.82 形态：只记录单个 weekKey
    localStorage.setItem(K_WEEKLY_PLAYLISTS, JSON.stringify({ weekKey: '2026-W37' }))
    localStorage.setItem(K_WEEKLY_ENABLED, 'true')
    localStorage.setItem(K_PLAY_COUNT_REAL, JSON.stringify({ 'a.mp3': 5 }))
    localStorage.setItem(K_PLAY_HISTORY_FULL, JSON.stringify([{ path: 'a.mp3', playAt: Date.now(), duration: 100 }]))
    localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify([]))
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify({}))

    expect(() => checkAndGenerateAuto(SONG_LIST)).not.toThrow()

    const meta = JSON.parse(localStorage.getItem(K_WEEKLY_PLAYLISTS))
    expect(meta.weekly).toBeTruthy()
    expect(meta.monthly).toBeTruthy()
    expect(meta.yearly).toBeTruthy()

    const playlists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS))
    // 三种周期各自生成，前缀互不相同
    expect(playlists.some(p => p.localId.startsWith('__weekly_'))).toBe(true)
    expect(playlists.some(p => p.localId.startsWith('__monthly_'))).toBe(true)
    expect(playlists.some(p => p.localId.startsWith('__yearly_'))).toBe(true)
  })

  it('旧版周报歌单（__weekly_ 前缀）被识别/复用，不与月/年冲突', () => {
    const weekKey = '2026-W37'
    localStorage.setItem(K_WEEKLY_ENABLED, 'true')
    localStorage.setItem(K_WEEKLY_PLAYLISTS, JSON.stringify({ weekKey }))
    localStorage.setItem(K_PLAY_COUNT_REAL, JSON.stringify({ 'a.mp3': 5 }))
    localStorage.setItem(K_PLAY_HISTORY_FULL, JSON.stringify([{ path: 'a.mp3', playAt: Date.now(), duration: 100 }]))
    // 1.0.82 遗留的周报歌单
    localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify([
      { localId: `__weekly_top__${weekKey}`, title: '本周最爱 · 旧', intro: 'x', isAuto: true, createdAt: 1 },
    ]))
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify({ [`__weekly_top__${weekKey}`]: ['a.mp3'] }))

    expect(() => checkAndGenerateAuto(SONG_LIST)).not.toThrow()

    const playlists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS))
    // 旧周报歌单不应消失（同一周期 key 已被识别），且不出现重复
    const weeklyIds = playlists.filter(p => p.localId.startsWith('__weekly_top__')).map(p => p.localId)
    expect(new Set(weeklyIds).size).toBe(weeklyIds.length)
  })

  it('自动歌单关闭时不做任何事（旧 key 缺失也安全）', () => {
    localStorage.setItem(K_WEEKLY_ENABLED, 'false')
    expect(() => checkAndGenerateAuto(SONG_LIST)).not.toThrow()
    expect(localStorage.getItem(K_LOCAL_PLAYLISTS)).toBeNull()
  })

  it('空 songList / 空播放历史不崩溃', () => {
    localStorage.setItem(K_WEEKLY_ENABLED, 'true')
    expect(() => checkAndGenerateAuto([])).not.toThrow()
    expect(() => checkAndGenerateAuto(SONG_LIST)).not.toThrow() // FULL/COUNT 均缺失
  })

  it('每周期仅保留 1 期：新一期覆盖旧一期，不堆积', () => {
    localStorage.setItem(K_WEEKLY_ENABLED, 'true')
    localStorage.setItem(K_PLAY_COUNT_REAL, JSON.stringify({ 'a.mp3': 5 }))
    localStorage.setItem(K_PLAY_HISTORY_FULL, JSON.stringify([{ path: 'a.mp3', playAt: Date.now(), duration: 100 }]))
    // 预置一个更早的周报 top（旧一期）
    localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify([
      { localId: '__weekly_top__2020-W01', title: '本周最爱 · 旧', intro: 'x', isAuto: true, createdAt: 1 },
    ]))
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify({ '__weekly_top__2020-W01': ['a.mp3'] }))

    checkAndGenerateAuto(SONG_LIST, true)

    const playlists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS))
    const weeklyTops = playlists.filter(p => p.localId.startsWith('__weekly_top__'))
    expect(weeklyTops.length).toBe(1) // 单期，旧的被覆盖
    expect(playlists.some(p => p.localId === '__weekly_top__2020-W01')).toBe(false)

    const songs = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS))
    expect(songs['__weekly_top__2020-W01']).toBeUndefined() // 旧歌曲数据被清理
  })

  it('每类歌单最多 30 首', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ path: `s${i}.mp3`, name: `S${i}`, duration: 100 }))
    const countMap = {}
    many.forEach(s => { countMap[s.path] = 1 })
    localStorage.setItem(K_WEEKLY_ENABLED, 'true')
    localStorage.setItem(K_PLAY_COUNT_REAL, JSON.stringify(countMap))
    localStorage.setItem(K_PLAY_HISTORY_FULL, JSON.stringify(many.map(s => ({ path: s.path, playAt: Date.now(), duration: 100 }))))

    checkAndGenerateAuto(many, true)

    const songs = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS))
    const weeklyTop = songs[Object.keys(songs).find(k => k.startsWith('__weekly_top__'))]
    expect(weeklyTop.length).toBe(30)
  })
})
