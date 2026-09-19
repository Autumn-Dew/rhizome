import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createLogger, todayStamp, timeStamp, fmtArg } = require('../logger.cjs')

describe('logger.cjs', () => {
  it('todayStamp 输出 YYYYMMDD（本地时区、补零）', () => {
    expect(todayStamp(new Date(2026, 0, 5))).toBe('20260105')
    expect(todayStamp(new Date(2026, 11, 31))).toBe('20261231')
    expect(todayStamp()).toMatch(/^\d{8}$/)
  })

  it('timeStamp 返回 ISO 字符串', () => {
    const s = timeStamp(new Date('2026-09-19T05:00:00Z'))
    expect(s).toBe('2026-09-19T05:00:00.000Z')
  })

  it('fmtArg 处理字符串 / Error / 对象 / undefined', () => {
    expect(fmtArg('hi')).toBe('hi')
    expect(fmtArg(undefined)).toBe('undefined')
    expect(fmtArg({ a: 1 })).toBe('{"a":1}')
    const e = new Error('boom')
    expect(fmtArg(e)).toContain('boom')
  })

  it('fmtArg 对循环引用不抛异常', () => {
    const o = {}
    o.self = o
    expect(typeof fmtArg(o)).toBe('string')
  })

  it('createLogger 默认关闭落盘：setEnabled(true) 后才写入', async () => {
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rhizome-log-'))
    const lg = createLogger(dir)
    expect(lg.isEnabled()).toBe(false)
    lg.info('while-disabled')
    lg.setEnabled(true)
    expect(lg.isEnabled()).toBe(true)
    lg.info('while-enabled')
    lg.close()
    let txt = ''
    for (let i = 0; i < 40; i++) {
      try {
        txt = fs.readFileSync(lg.filePath, 'utf8')
      } catch { txt = '' }
      if (txt.includes('while-enabled')) break
      await new Promise(r => setTimeout(r, 25))
    }
    expect(txt).not.toContain('while-disabled')
    expect(txt).toContain('while-enabled')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
