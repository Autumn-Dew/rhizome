import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME_ID, getTheme, themeIsDark } from '@/constants/themes'

describe('themes — 主题注册表', () => {
    it('默认主题为 light，且 light/dark 均在列', () => {
        expect(DEFAULT_THEME_ID).toBe('light')
        expect(THEMES.map(t => t.id)).toEqual(expect.arrayContaining(['light', 'dark']))
    })

    it('class 字段与既有 CSS 选择器一致（theme-white / theme-dark）', () => {
        expect(getTheme('light').class).toBe('theme-white')
        expect(getTheme('dark').class).toBe('theme-dark')
    })

    it('getTheme 按 id 取主题，未知 id 回退默认', () => {
        expect(getTheme('dark').id).toBe('dark')
        expect(getTheme('light').id).toBe('light')
        expect(getTheme('ocean').id).toBe(DEFAULT_THEME_ID)
        expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID)
    })

    it('themeIsDark 正确判定深色（未知 id 按默认主题）', () => {
        expect(themeIsDark('light')).toBe(false)
        expect(themeIsDark('dark')).toBe(true)
        expect(themeIsDark('ocean')).toBe(false)
    })
})
