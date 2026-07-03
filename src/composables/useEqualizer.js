// 10 段均衡器 — BiquadFilter 链
import { reactive, computed } from 'vue'

const FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const STORAGE_KEY = 'rhizome-eq-bands'

const PRESETS = {
  '摇滚': [4,3,-1,-2,1,3,5,4,3,2],
  '流行': [-1,1,3,2,-1,0,2,3,4,3],
  '古典': [3,2,0,0,-1,-1,0,1,2,3],
  '人声增强': [-2,-1,2,4,4,2,1,0,-1,-2],
  '电子': [6,5,2,-2,-3,0,2,4,5,6],
}

let filters = null
let eqInput = null
let eqOutput = null

export function useEqualizer() {
  const bands = reactive(FREQS.map((f, i) => ({ freq: f, gain: 0 })))
  const presets = computed(() => PRESETS)

  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (s?.length === 10) s.forEach((g, i) => { bands[i].gain = g })
  } catch {}

  function build(ctx) {
    if (filters) return
    filters = []
    let prev = null
    for (let i = 0; i < 10; i++) {
      const f = ctx.createBiquadFilter()
      f.type = 'peaking'
      f.frequency.value = FREQS[i]
      f.Q.value = 1.4
      f.gain.value = bands[i].gain
      if (prev) prev.connect(f)
      filters.push(f)
      prev = f
    }
    eqInput = filters[0]
    eqOutput = filters[9]
  }

  function setGain(i, v) {
    const val = Math.max(-12, Math.min(12, Number(v)))
    bands[i].gain = val
    if (filters?.[i]) filters[i].gain.value = val
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bands.map(b => b.gain)))
  }

  function loadPreset(name) {
    const g = PRESETS[name]
    if (g) g.forEach((v, i) => setGain(i, v))
  }

  function install(ctx) {
    build(ctx)
    bands.forEach((b, i) => { if (filters?.[i]) filters[i].gain.value = b.gain })
    return { input: eqInput, output: eqOutput }
  }

  return { bands, presets, setGain, loadPreset, install }
}
