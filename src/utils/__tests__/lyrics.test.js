import { describe, it, expect } from 'vitest'
import { resolveLyrics } from '@/utils/lyrics'

// resolveLyrics 行为锚点：synced 优先 → 原始行回退(999999) → 排序 → 同时间戳合并

describe('resolveLyrics — 入参防护', () => {
    it('null → []', () => {
        expect(resolveLyrics(null)).toEqual([])
    })
    it('undefined → []', () => {
        expect(resolveLyrics(undefined)).toEqual([])
    })
    it('空 lyrics 与空 syncedLyrics → []', () => {
        expect(resolveLyrics({ lyrics: [], syncedLyrics: [] })).toEqual([])
    })
})

describe('resolveLyrics — syncedLyrics 有效路径', () => {
    it('非空且存在 time>0 的行 → 原样返回（拷贝）', () => {
        const synced = [
            { time: 1, text: 'a' },
            { time: 2, text: 'b' },
        ]
        expect(resolveLyrics({ syncedLyrics: synced, lyrics: ['x'] })).toEqual([
            { time: 1, text: 'a' },
            { time: 2, text: 'b' },
        ])
    })

    it('相同 time 的相邻行用 \\n 合并为一行（原词+翻译）', () => {
        const synced = [
            { time: 1, text: 'hello' },
            { time: 1, text: '你好' },
            { time: 2, text: 'bye' },
        ]
        expect(resolveLyrics({ syncedLyrics: synced })).toEqual([
            { time: 1, text: 'hello\n你好' },
            { time: 2, text: 'bye' },
        ])
    })

    it('所有行 time 均为 0 → 视为无效，回退解析 lyrics', () => {
        const song = {
            syncedLyrics: [{ time: 0, text: 'raw-synced' }],
            lyrics: ['[00:01.5]fallback'],
        }
        expect(resolveLyrics(song)).toEqual([{ time: 1.5, text: 'fallback' }])
    })
})

describe('resolveLyrics — 原始行回退路径', () => {
    it('匹配 [mm:ss] / [mm:ss.xx] 行 → time = 分*60+秒，text 为 trim 后的尾部', () => {
        const song = {
            lyrics: [
                '[01:02]first',
                '[00:03.5]second',
                '[00:04.25]third ',
            ],
        }
        expect(resolveLyrics(song)).toEqual([
            { time: 3.5, text: 'second' },
            { time: 4.25, text: 'third' },
            { time: 62, text: 'first' },
        ])
    })

    it('不匹配时间戳格式的行 → time 999999，text 保留原始行（不 trim）', () => {
        // 注意：两条 999999 行是相同时间戳，会被末尾合并步骤合为一行（当前实际行为）
        const song = { lyrics: ['纯文本行', '  带空格的行  '] }
        expect(resolveLyrics(song)).toEqual([
            { time: 999999, text: '纯文本行\n  带空格的行  ' },
        ])
    })

    it('回退结果按 time 升序排序（999999 沉底）', () => {
        const song = {
            lyrics: ['tail', '[00:05]x', '[00:01]y'],
        }
        const result = resolveLyrics(song)
        expect(result.map(l => l.time)).toEqual([1, 5, 999999])
    })
})

describe('resolveLyrics — 返回值为输入的浅拷贝', () => {
    it('修改返回值不影响输入对象（synced 路径）', () => {
        const synced = [{ time: 1, text: 'a' }]
        const result = resolveLyrics({ syncedLyrics: synced })
        result[0].text = 'mutated'
        expect(synced[0].text).toBe('a')
    })
})
