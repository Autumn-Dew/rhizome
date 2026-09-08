import { describe, it, expect } from 'vitest'
import { parseLRC } from '../lrc.cjs'

// parseLRC 行为锚点（自 electron/preload.js 原样迁出至 electron/lib/lrc.cjs，勿改实现）
// 断言以迁出时的实际行为为准（含"怪癖"），不做任何"改进"：
//   怪癖 1：时间戳正则的分数段要求 \d{2,3} 位，单个小数位（如 [00:01.5]）整行不匹配 → 该行被丢弃
//   怪癖 2：多时间戳行只解析第一个时间戳；replace 受 ^ 锚定只去掉行首第一个匹配，
//           剩余 '[..]' 原样留在 text 中
describe('parseLRC — 基本解析', () => {
    it('规格原输入：[00:01.5]（单小数位）整行不匹配，仅保留 [00:03] 行', () => {
        expect(parseLRC('[00:01.5]hello\n[00:03]world')).toEqual([
            { time: 3, text: 'world' },
        ])
    })

    it('两位小数版基本解析：两条均匹配，按 time 升序', () => {
        expect(parseLRC('[00:01.50]hello\n[00:03]world')).toEqual([
            { time: 1.5, text: 'hello' },
            { time: 3, text: 'world' },
        ])
    })
})

describe('parseLRC — 毫秒段位数', () => {
    it('2 位毫秒按 /100：[00:01.50]a → time 1.5', () => {
        expect(parseLRC('[00:01.50]a')).toEqual([{ time: 1.5, text: 'a' }])
    })
    it('3 位毫秒按 /1000：[00:01.500]a → time 1.5', () => {
        expect(parseLRC('[00:01.500]a')).toEqual([{ time: 1.5, text: 'a' }])
    })
    it('冒号分隔毫秒按 3 位处理：[00:01:500]a → time 1.5', () => {
        expect(parseLRC('[00:01:500]a')).toEqual([{ time: 1.5, text: 'a' }])
    })
})

describe('parseLRC — offset 标签', () => {
    it('正 offset：[offset:+500] → time +0.5', () => {
        expect(parseLRC('[offset:+500]\n[00:01]a')).toEqual([{ time: 1.5, text: 'a' }])
    })
    it('负 offset：[offset:-1000] → time -1', () => {
        expect(parseLRC('[offset:-1000]\n[00:03]a')).toEqual([{ time: 2, text: 'a' }])
    })
    it('负结果钳制为 0：[offset:-2000] + [00:01] → time 0', () => {
        expect(parseLRC('[offset:-2000]\n[00:01]a')).toEqual([{ time: 0, text: 'a' }])
    })
})

describe('parseLRC — 行过滤', () => {
    it('元数据行（ti/ar/al/by）跳过，仅保留歌词行', () => {
        expect(parseLRC('[ti:title]\n[ar:artist]\n[al:album]\n[by: someone]\n[00:01]a')).toEqual([
            { time: 1, text: 'a' },
        ])
    })
    it('时间戳后无文本的行丢弃：[00:01] → []', () => {
        expect(parseLRC('[00:01]')).toEqual([])
    })
    it('纯空行/空白行丢弃 → []', () => {
        expect(parseLRC('\n   \n\t\n')).toEqual([])
    })
    it('未匹配行忽略：纯文本行 → []', () => {
        expect(parseLRC('plain text line')).toEqual([])
    })
    it('多时间戳行：只取第一个时间戳，行首之后的 [00:05] 留在 text 中（实际行为）', () => {
        expect(parseLRC('[00:01][00:05]duet')).toEqual([{ time: 1, text: '[00:05]duet' }])
    })
})

describe('parseLRC — 排序与边界', () => {
    it('乱序输入按 time 升序输出', () => {
        expect(parseLRC('[00:30]late\n[00:05]early\n[01:10]last')).toEqual([
            { time: 5, text: 'early' },
            { time: 30, text: 'late' },
            { time: 70, text: 'last' },
        ])
    })
    it('空字符串输入 → []', () => {
        expect(parseLRC('')).toEqual([])
    })
    it('\\r\\n 行尾与 \\n 等价', () => {
        expect(parseLRC('[00:01.50]hello\r\n[00:03]world')).toEqual(
            parseLRC('[00:01.50]hello\n[00:03]world'),
        )
    })
})
