// 动作链 — 存储 + 执行引擎
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { K_ACTION_CHAINS } from '@/constants/storage-keys'

export { ACTION_TYPES } from '@/constants/defaults'

function loadAll() { try { return JSON.parse(localStorage.getItem(K_ACTION_CHAINS)) || [] } catch { return [] } }
function saveAll(data) { localStorage.setItem(K_ACTION_CHAINS, JSON.stringify(data)) }

const chains = ref(loadAll())

export function useActionChain() {
  // 在 setup 上下文中捕获 store 引用，确保 IPC 回调中也能触发响应式更新
  const store = usePlayerStore()

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
        case 'next': store.nextSong(); break
        case 'prev': store.prevSong(); break
        case 'setVolume': store.setAudioVolume(Math.max(0, Math.min(1, Number(act.params?.volume ?? 0.8) || 0))); break
        case 'setPlayMode': store.setPlayMode(act.params?.mode || 'list'); break
        case 'showDesktopLyrics': api?.showDesktopLyrics?.(); break
        case 'hideDesktopLyrics': api?.hideDesktopLyrics?.(); break
      }
    }
  }

  return { chains, add, update, remove, execute, persist }
}
