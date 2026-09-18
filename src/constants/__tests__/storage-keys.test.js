import { describe, it, expect, test } from 'vitest'
import * as keys from '@/constants/storage-keys'

// 红线守护测试：storage key 字符串值在全重构周期内不得改变。
// 本文件显式写出每个期望字面值——任何 key 改名都会在此失败。

const EXPECTED = {
    // ── rhizome 命名空间 ──
    K_PLAY_MODE: 'rhizome-play-mode',
    K_VOLUME: 'rhizome-volume',
    K_THEME: 'rhizome-theme',
    K_MOTION: 'rhizome-motion',
    K_LYRIC_SIZE: 'rhizome-lyric-size',
    K_LYRIC_ALIGN: 'rhizome-lyric-align',
    K_DESKTOP_LYRICS_VIS: 'rhizome-desktop-lyrics-visible',
    K_DESKTOP_LYRICS_LCK: 'rhizome-desktop-lyrics-locked',
    K_DESKTOP_LYRICS_BG: 'rhizome-desktop-lyrics-bg',
    K_PLAYER_STATE: 'rhizome-player-state',
    K_SHORTCUTS: 'rhizome-shortcuts',
    K_ACTION_CHAINS: 'rhizome-action-chains',
    K_AUDIO_DEVICE: 'rhizome-audio-device',
    K_IDLE_TIMEOUT: 'rhizome-idle-timeout',
    K_EQ_BANDS: 'rhizome-eq-bands',
    K_REPORT_PATH: 'rhizome-report-path',
    K_WEEKLY_PLAYLISTS: 'rhizome-weekly-playlists',
    K_WEEKLY_ENABLED: 'rhizome-weekly-playlists-enabled',
    K_DELETE_CONFIRM: 'rhizome-delete-confirm',
    K_LYRIC_OFFSET: 'rhizome-lyric-offset',
    K_SONG_CACHE: 'rhizome-song-cache',
    K_REPORT_GENERATED: 'rhizome-report-generated',
    K_SOUND_ENABLED: 'rhizome-sound-enabled',
    K_SOUND_VOLUME: 'rhizome-sound-volume',
    K_SORT_PREF: 'rhizome-sort-pref',
    K_SORT_ORDERS: 'rhizome-sort-orders',
    K_REPORT_AUTO: 'rhizome-report-auto',
    K_SCREENSAVER_ENABLED: 'rhizome-screensaver-enabled',
    // ── 旧版 / 非 rhizome 前缀（兼容） ──
    K_LOCAL_PLAYLISTS: 'local_playlists',
    K_PLAYLIST_SONGS: 'local_playlist_songs',
    K_PLAY_HISTORY_VIEW: 'playHistoryView',
    K_PLAY_HISTORY_FULL: 'playHistoryFull',
    K_PLAY_COUNT_REAL: 'playCountReal',
    K_LOCAL_MUSIC_LIST: 'local-music-list',
    K_LOCAL_MUSIC_FOLDERS: 'local-music-folders',
}

describe('storage-keys — 字面值红线守护', () => {
    for (const [name, value] of Object.entries(EXPECTED)) {
        it(`${name} === '${value}'`, () => {
            expect(keys[name]).toBe(value)
        })
    }

    it('模块导出的 K_* 常量与期望清单一一对应（无多无少）', () => {
        const exported = Object.keys(keys).filter(k => k.startsWith('K_')).sort()
        expect(exported).toEqual(Object.keys(EXPECTED).sort())
    })
})

describe('storage-keys — ALL_STORAGE_KEYS 注册表完整性', () => {
    it('无重复项', () => {
        const set = new Set(keys.ALL_STORAGE_KEYS)
        expect(set.size).toBe(keys.ALL_STORAGE_KEYS.length)
    })

    it('无空字符串项', () => {
        expect(keys.ALL_STORAGE_KEYS.every(k => typeof k === 'string' && k.length > 0)).toBe(true)
    })

    it('当前已登记的 18 个键全部在列', () => {
        // 已知缺口 RHZ-K1：K_DESKTOP_LYRICS_BG 与 K_IDLE_TIMEOUT 当前未入列
        // （与 preload BACKUP_KEYS 的缺口一致，属现状行为，是否补录待 GLM-5.3 裁决）
        const registered = keys.ALL_STORAGE_KEYS
        for (const [name, value] of Object.entries(EXPECTED)) {
            if (name === 'K_DESKTOP_LYRICS_BG' || name === 'K_IDLE_TIMEOUT') continue
            expect(registered).toContain(value)
        }
    })

    it('RHZ-K1 已知缺口：BG / IDLE_TIMEOUT 两键当前不在 ALL_STORAGE_KEYS 中', () => {
        expect(keys.ALL_STORAGE_KEYS).not.toContain('rhizome-desktop-lyrics-bg')
        expect(keys.ALL_STORAGE_KEYS).not.toContain('rhizome-idle-timeout')
    })

    it('非 rhizome- 前缀的遗留键恰为 7 个', () => {
        const legacy = keys.ALL_STORAGE_KEYS.filter(k => !k.startsWith('rhizome-'))
        expect(legacy.sort()).toEqual([
            'local-music-folders',
            'local-music-list',
            'local_playlist_songs',
            'local_playlists',
            'playCountReal',
            'playHistoryFull',
            'playHistoryView',
        ])
    })
})

// 修复缺口时启用：两键并入 ALL_STORAGE_KEYS 后，应删除上一节"已知缺口"断言
test.todo('RHZ-K1: K_DESKTOP_LYRICS_BG 与 K_IDLE_TIMEOUT 并入 ALL_STORAGE_KEYS（待裁决，属备份行为变更）')
