// 全局频谱引擎 — 独立于任何组件，音频播放期间持续运行
let audioCtx = null
let analyser = null
let srcNode = null
let currentAudio = null

export function useSpectrumEngine() {
  function ensure() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.85
      analyser.connect(audioCtx.destination)
    }
  }

  function connect(audio) {
    if (!audio || !analyser) return false
    if (audio === currentAudio && srcNode) return true
    currentAudio = audio
    if (srcNode) { try { srcNode.disconnect() } catch {}; srcNode = null }
    try {
      srcNode = audioCtx.createMediaElementSource(audio)
      srcNode.connect(analyser)
      return true
    } catch (e) { return false }
  }

  function resume() {
    if (audioCtx?.state === 'suspended') audioCtx.resume()
  }

  return { ensure, connect, resume, analyser: () => analyser }
}
