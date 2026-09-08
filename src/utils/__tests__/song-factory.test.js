import { describe, it, expect } from 'vitest'
import { createSongFromMeta } from '@/utils/song-factory'

// createSongFromMeta 行为锚点：字段映射全表 + falsy 回退语义（按当前实现断言）

describe('createSongFromMeta — 完整 meta', () => {
    it('逐字段映射，name 取 title，playUrl 取 path', () => {
        const meta = {
            path: 'D:/music/a.flac',
            title: 'Song A',
            singer: 'Artist A',
            album: 'Album A',
            year: 2024,
            genre: 'Pop',
            track: 3,
            composer: 'Composer A',
            duration: 200,
            durationFormat: '03:20',
            songKey: 'song a|artist a',
            coverUrl: 'data:image/jpeg;base64,xxx',
            lyrics: ['[00:01]line'],
            syncedLyrics: [{ time: 1, text: 'line' }],
            lyricsSource: 'sidecar-lrc',
            _raw: { codec: 'FLAC', bitrate: 900000, sampleRate: 44100, numberOfChannels: 2 },
        }
        expect(createSongFromMeta(meta)).toEqual({
            path: 'D:/music/a.flac',
            name: 'Song A',
            singer: 'Artist A',
            album: 'Album A',
            year: 2024,
            genre: 'Pop',
            track: 3,
            composer: 'Composer A',
            duration: 200,
            durationFormat: '03:20',
            playUrl: 'D:/music/a.flac',
            songKey: 'song a|artist a',
            coverUrl: 'data:image/jpeg;base64,xxx',
            lyrics: ['[00:01]line'],
            syncedLyrics: [{ time: 1, text: 'line' }],
            lyricsSource: 'sidecar-lrc',
            codec: 'FLAC',
            bitrate: 900000,
            sampleRate: 44100,
            channels: 2,
        })
    })
})

describe('createSongFromMeta — 最小 meta 的默认值', () => {
    it('仅 path/title/singer 时全部走默认回退', () => {
        const song = createSongFromMeta({ path: 'p.mp3', title: 'T', singer: 'S' })
        expect(song).toEqual({
            path: 'p.mp3',
            name: 'T',
            singer: 'S',
            album: '',
            year: null,
            genre: '',
            track: null,
            composer: '',
            duration: 0,
            durationFormat: '00:00',
            playUrl: 'p.mp3',
            songKey: undefined,
            coverUrl: '',
            lyrics: [],
            syncedLyrics: [],
            lyricsSource: undefined,
            codec: '',
            bitrate: null,
            sampleRate: null,
            channels: null,
        })
    })
})

describe('createSongFromMeta — falsy 语义（当前实现）', () => {
    it('year: 0 → null（|| 回退）', () => {
        expect(createSongFromMeta({ path: 'p', title: 't', singer: 's', year: 0 }).year).toBeNull()
    })
    it('track: 0 → null（|| 回退）', () => {
        expect(createSongFromMeta({ path: 'p', title: 't', singer: 's', track: 0 }).track).toBeNull()
    })
    it('duration: 75.2 且未提供 durationFormat → formatTime(75.2) === "01:15"', () => {
        const song = createSongFromMeta({ path: 'p', title: 't', singer: 's', duration: 75.2 })
        expect(song.durationFormat).toBe('01:15')
    })
    it('durationFormat 显式提供时不经 formatTime', () => {
        const song = createSongFromMeta({ path: 'p', title: 't', singer: 's', duration: 75.2, durationFormat: '' })
        expect(song.durationFormat).toBe('01:15') // '' 是 falsy，仍回退
    })
})

describe('createSongFromMeta — null meta（当前实际行为）', () => {
    it('null 入参抛 TypeError（直接访问 meta.path，无防护）', () => {
        expect(() => createSongFromMeta(null)).toThrow(TypeError)
    })
})
