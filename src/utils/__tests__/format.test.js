import { describe, it, expect } from 'vitest'
import { formatTime, formatDuration } from '@/utils/format'

// 行为锚点：断言当前实际行为（包括 falsy 回退），不表达"理想行为"

describe('formatTime', () => {
    it.each([
        [null, '00:00'],
        [undefined, '00:00'],
        [0, '00:00'],
        [-3, '00:00'],
        [5, '00:05'],
        [60, '01:00'],
        [61.5, '01:01'],   // 秒向下取整
        [3599, '59:59'],
    ])('formatTime(%s) === %s', (input, expected) => {
        expect(formatTime(input)).toBe(expected)
    })
})

describe('formatDuration', () => {
    it.each([
        [null, '0 分钟'],
        [undefined, '0 分钟'],
        [0, '0 分钟'],
        [-10, '0 分钟'],
        [3599, '59 分钟'],
        [3600, '1 小时 0 分钟'],
        [7322, '2 小时 2 分钟'],
    ])('formatDuration(%s) === %s', (input, expected) => {
        expect(formatDuration(input)).toBe(expected)
    })
})
