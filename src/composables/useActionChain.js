// 动作链 — 存储 + 执行引擎
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'

const STORAGE_KEY = 'rhizome-action-chains'

export const ACTION_TYPES = [
  { type: 'play', label: '播放', params: [] },
  { type: 'pause', label: '暂停', params: [] },
  { type: 'togglePlay', label: '播放/暂停', params: [] },
  { type: 'next', label: '下一首', params: [] },
  { type: 'prev', label: '上一首', params: [] },
  { type: 'setVolume', label: '设置音量', params: [{ key: 'volume', label: '音量', min: 0, max: 1, step: 0.05, default: 0.8 }] },
  { type: 'fadeVolume', label: '淡入淡出', params: [
    { key: 'from', label: '起始', min: 0, max: 1, step: 0.05, default: 0 },
    { key: 'to', label: '目标', min: 0, max: 1, step: 0.05, default: 1 },
    { key: 'duration', label: '时长(秒)', min: 1, max: 30, step: 1, default: 3 },
  ]},
  { type: 'setPlayMode', label: '播放模式', params: [{ key: 'mode', label: '模式', options: [
    { label: '列表播放', value: 'list' }, { label: '单曲播放', value: 'single' },
    { label: '列表循环', value: 'listLoop' }, { label: '单曲循环', value: 'singleLoop' }, { label: '随机播放', value: 'random' },
  ]}] },
  { type: 'showDesktopLyrics', label: '显示桌面歌词', params: [] },
  { type: 'hideDesktopLyrics', label: '隐藏桌面歌词', params: [] },
  { type: 'toggleDesktopLyrics', label: '桌面歌词开关', params: [] },
  { type: 'seek', label: '跳转', params: [{ key: 'seconds', label: '秒数', min: 0, max: 3600, step: 1, default: 0 }] },
  { type: 'sleepTimer', label: '睡眠定时', params: [{ key: 'minutes', label: '分钟', min: 1, max: 120, step: 1, default: 30 }] },
  { type: 'quit', label: '退出应用', params: [] },
]

function loadAll() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveAll(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

const chains = ref(loadAll())

export function useActionChain() {
  function persist() { saveAll(chains.value) }

  function add(name, actions) {
    if (chains.value.length >= 5) return false
    chains.value.push({ id: Date.now(), name, actions })
    persist(); return true
  }
  function update(id, name, actions) {
    const c = chains.value.find(x => x.id === id)
    if (c) { c.name = name; c.actions = actions; persist() }
  }
  function remove(id) {
    chains.value = chains.value.filter(x => x.id !== id)
    persist()
  }
  function execute(chain) {
    const store = usePlayerStore()
    const api = window.electron
    for (const act of chain.actions) {
      switch (act.type) {
        case 'play':
          if (!store.isPlaying) {
            if (store.currentSong && !store.audio) store.playGlobalSong(store.currentSong)
            else store.togglePlay()
          }
          break
        case 'pause': if (store.isPlaying) store.togglePlay(); break
        case 'togglePlay': store.togglePlay(); break
        case 'next': store.nextSong(); break
        case 'prev': store.prevSong(); break
        case 'setVolume': store.setAudioVolume(Math.max(0, Math.min(1, Number(act.params?.volume ?? 0.8) || 0))); break
        case 'fadeVolume': {
          const from = Number(act.params?.from ?? 0), to = Number(act.params?.to ?? 1), dur = Number(act.params?.duration ?? 3)
          const steps = Math.max(2, dur * 10); let step = 0
          const iv = setInterval(() => { step++; store.setAudioVolume(from + (to - from) * step / steps); if (step >= steps) clearInterval(iv) }, dur * 1000 / steps)
          break
        }
        case 'setPlayMode': store.setPlayMode(act.params?.mode || 'list'); break
        case 'showDesktopLyrics': api?.showDesktopLyrics?.(); break
        case 'hideDesktopLyrics': api?.hideDesktopLyrics?.(); break
        case 'toggleDesktopLyrics': api?.showDesktopLyrics?.(); break
        case 'seek': store.seekTo(Number(act.params?.seconds ?? 0)); break
        case 'sleepTimer': setTimeout(() => { if (store.isPlaying) store.togglePlay() }, (act.params?.minutes ?? 30) * 60000); break
        case 'quit': api?.appQuit?.(); break
      }
    }
  }

  return { chains, add, update, remove, execute, persist }
}
