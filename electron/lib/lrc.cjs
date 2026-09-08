// parseLRC — LRC 歌词解析（自 electron/preload.js 原样迁出，勿重写）
// 输入：LRC 文本；输出：[{ time(秒), text }] 按 time 升序
const parseLRC = (t) => {
  const lines = t.split(/\r?\n/)
  const res = []
  const re = /^\[(\d{1,}):(\d{1,})(?:[.:](\d{2,3}))?\]/
  const mre = /^\[(ti|ar|al|by|length|re|ve):/i
  let off = 0

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim()
    if (!ln) continue
    if (ln.match(/^\[offset:([+-]?\d+)\]/)) { off = parseInt(RegExp.$1, 10) / 1000; continue }
    if (mre.test(ln)) continue
    const m = ln.match(re)
    if (m) {
      const mn = parseInt(m[1], 10)
      const sc = parseInt(m[2], 10)
      let ms = 0
      if (m[3]) { ms = parseInt(m[3], 10); ms = m[3].length === 2 ? ms / 100 : ms / 1000 }
      const tm = mn * 60 + sc + ms + off
      const tx = ln.replace(re, "").trim()
      if (tx) res.push({ time: Math.max(0, tm), text: tx })
    }
  }
  return res.sort((a, b) => a.time - b.time)
}

module.exports = { parseLRC }
