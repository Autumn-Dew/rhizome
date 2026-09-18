import { describe, it, expect } from 'vitest'
import { MOTION_SCHEMES, DEFAULT_MOTION_ID, getMotionScheme } from '@/constants/motion-schemes'

describe('motion-schemes — 动画方案注册表', () => {
    it('默认方案为 classic，且经典/华丽两套风格均在列', () => {
        expect(DEFAULT_MOTION_ID).toBe('classic')
        expect(MOTION_SCHEMES.map(s => s.id)).toEqual(['classic', 'ornate'])
    })

    it('class 字段与 motion-tokens.css 的 :root.motion-* 覆盖块一致', () => {
        expect(getMotionScheme('classic').class).toBe('motion-classic')
        expect(getMotionScheme('ornate').class).toBe('motion-ornate')
    })

    it('label 为「经典 / 华丽」', () => {
        expect(getMotionScheme('classic').label).toBe('经典')
        expect(getMotionScheme('ornate').label).toBe('华丽')
    })

    it('getMotionScheme 按 id 取方案，未知 id（含旧 standard/snappy/cinematic）回退默认', () => {
        expect(getMotionScheme('ornate').id).toBe('ornate')
        expect(getMotionScheme('standard').id).toBe(DEFAULT_MOTION_ID)
        expect(getMotionScheme('snappy').id).toBe(DEFAULT_MOTION_ID)
        expect(getMotionScheme('unknown').id).toBe(DEFAULT_MOTION_ID)
        expect(getMotionScheme(undefined).id).toBe(DEFAULT_MOTION_ID)
    })
})
