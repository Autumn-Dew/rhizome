// 10 段均衡器 — BiquadFilter 链
import { reactive, computed } from 'vue'
import { K_EQ_BANDS } from '@/constants/storage-keys'
import { EQ_FREQS, EQ_PRESETS } from '@/constants/defaults'

let filters = null
let eqInput = null
let eqOutput = null

export function useEqualizer() {
  const bands = reactive(EQ_FREQS.map((f, i) => ({ freq: f, gain: 0 })))
  const presets = computed(() => EQ_PRESETS)

  try {
    const s = JSON.parse(localStorage.getItem(K_EQ_BANDS))
    if (s?.length === 10) s.forEach((g, i) => { bands[i].gain = g })
  } catch {}

  function build(ctx) {
    if (filters) return
    filters = []
    let prev = null
    for (let i = 0; i < 10; i++) {
      const f = ctx.createBiquadFilter()
      f.type = 'peaking'
      f.frequency.value = EQ_FREQS[i]
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
    localStorage.setItem(K_EQ_BANDS, JSON.stringify(bands.map(b => b.gain)))
  }

  function loadPreset(name) {
    const g = EQ_PRESETS[name]
    if (g) g.forEach((v, i) => setGain(i, v))
  }

  function install(ctx) {
    build(ctx)
    bands.forEach((b, i) => { if (filters?.[i]) filters[i].gain.value = b.gain })
    return { input: eqInput, output: eqOutput }
  }

  return { bands, presets, setGain, loadPreset, install }
}
