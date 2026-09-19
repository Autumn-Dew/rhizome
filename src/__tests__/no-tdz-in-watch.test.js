import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// 回归防线：`watch(identifier, …)` 的第一个参数是「立即求值」的。
// 若该标识符此刻尚未初始化（TDZ），会抛
// `ReferenceError: Cannot access 'x' before initialization`，
// 而组件 setup 抛错会导致整个主界面无法渲染 —— 表现为启动后全黑。
//
// 这类错误构建期不会报（vite/vue 都编译得过去），只在运行时炸，
// 而且正好是「加了新 watch 但放错位置」这种极易复发的形态，故静态守住。

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(vue|js)$/.test(e.name) && !p.includes('__tests__')) out.push(p)
  }
  return out
}

describe('watch 首参数不得早于其声明（TDZ 防线）', () => {
  it('src 下所有 watch(identifier, …) 的标识符都在其之前声明', () => {
    const root = path.resolve(process.cwd(), 'src')
    const problems = []
    for (const f of walk(root)) {
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
      lines.forEach((line, i) => {
        const m = line.match(/watch\(\s*([A-Za-z_$][\w$]*)\s*,/)
        if (!m) return
        const name = m[1]
        const re = new RegExp('(?:const|let|var|function)\\s+' + name + '\\b')
        let decl = -1
        for (let j = 0; j < lines.length; j++) {
          if (re.test(lines[j])) { decl = j; break }
        }
        // 找不到声明说明来自 import（模块导入不存在 TDZ），跳过
        if (decl === -1) return
        if (decl > i) {
          problems.push(`${path.relative(root, f)}:${i + 1} watch(${name}) 早于第 ${decl + 1} 行的声明`)
        }
      })
    }
    expect(problems).toEqual([])
  })
})
