import { onMounted, onUnmounted } from 'vue'
import { K_SHORTCUTS } from '@/constants/storage-keys'
import { SHORTCUT_DEFAULTS, SHORTCUT_ACTION_DEFS } from '@/constants/defaults'

// 每个 action：label + local(有/无) + global(有/无)
// local: 应用内键监听；global: Electron 全局（窗口外也生效）

let config = JSON.parse(JSON.stringify(SHORTCUT_DEFAULTS))

function load() {
  try {
    const raw = localStorage.getItem(K_SHORTCUTS)
    if (raw) {
      const saved = JSON.parse(raw)
      for (const k of Object.keys(SHORTCUT_DEFAULTS)) {
        if (saved[k]) {
          if (saved[k].local && SHORTCUT_DEFAULTS[k].local) config[k].local = saved[k].local
          if (saved[k].global) config[k].global = saved[k].global
        }
      }
    }
  } catch {}
}
load()

function save() {
  localStorage.setItem(K_SHORTCUTS, JSON.stringify(config))
}

export function comboLabel(c) {
  if (!c) return '—'
  const parts = []
  if (c.ctrl) parts.push('Ctrl')
  if (c.shift) parts.push('Shift')
  if (c.alt) parts.push('Alt')
  const key = c.code
    .replace('Key', '').replace('Digit', '')
    .replace('ArrowLeft','←').replace('ArrowRight','→')
    .replace('ArrowUp','↑').replace('ArrowDown','↓')
    .replace('Backslash','\\')
  parts.push(key === 'Space' ? 'Space' : key)
  return parts.join('+')
}

function match(e, c) {
  if (!c) return false
  return e.code === c.code && e.ctrlKey === c.ctrl && e.shiftKey === c.shift && e.altKey === c.alt
}

function syncElectronGlobal() {
  const list = []
  const eventMap = {
    togglePlay: 'media-play-pause',
    prevSong: 'media-prev',
    nextSong: 'media-next',
    volUp: 'media-vol-up',
    volDown: 'media-vol-down',
    toggleWindow: 'toggle-window',
    toggleDesktopLyrics: 'toggle-desktop-lyrics',
  }
  for (const [action, def] of Object.entries(SHORTCUT_ACTION_DEFS)) {
    if (!def.global) continue
    const c = config[action]?.global
    if (c) list.push({ combo: c, event: eventMap[action] })
  }
  window.electron?.updateGlobalShortcuts?.(list)
}

export function useShortcuts(handlers) {
  const handlerMap = {
    togglePlay:   () => handlers.togglePlay?.(),
    prevSong:     () => handlers.prevSong?.(),
    nextSong:     () => handlers.nextSong?.(),
    volUp:        () => handlers.volUp?.(),
    volDown:      () => handlers.volDown?.(),
    toggleWindow: () => window.electron?.minimize?.(), // placeholder
    toggleDesktopLyrics: () => handlers.toggleDesktopLyrics?.(),
  }

  const onKeydown = (e) => {
    const tag = e.target?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return
    for (const [action, c] of Object.entries(config)) {
      if (match(e, c.local)) { e.preventDefault(); handlerMap[action]?.(); return }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    // 同步全局快捷键到 Electron（覆盖 main.js 初始默认值以反映用户自定义）
    syncElectronGlobal()
    // Electron IPC 全局快捷键
    const ipc = window.electron
    ipc?.onMediaPlayPause?.(() => handlers.togglePlay?.())
    ipc?.onMediaNext?.(() => handlers.nextSong?.())
    ipc?.onMediaPrev?.(() => handlers.prevSong?.())
    ipc?.onMediaVolUp?.(() => handlers.volUp?.())
    ipc?.onMediaVolDown?.(() => handlers.volDown?.())
    // 桌面歌词全局快捷键
    if (ipc?.onToggleDesktopLyrics) {
      ipc.onToggleDesktopLyrics(() => handlers.toggleDesktopLyrics?.())
    }
    // toggleWindow 特殊处理：切换主窗口显隐
    if (ipc?.onToggleWindow) {
      ipc.onToggleWindow(() => handlers.toggleWindow?.())
    } else {
      // 手动注册自定义事件
      window.addEventListener('toggle-window-custom', () => {
        handlers.toggleWindow?.()
      })
    }
  })
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}

export function getActionDefs() { return { ...SHORTCUT_ACTION_DEFS } }

export function getShortcutConfig() { return JSON.parse(JSON.stringify(config)) }

export function updateShortcut(action, scope, combo) {
  if (combo) {
    config[action][scope] = { ...combo }
  } else {
    // clear
    config[action][scope] = SHORTCUT_DEFAULTS[action][scope] ? { code: '', ctrl: false, shift: false, alt: false } : null
  }
  save()
  if (scope === 'global') syncElectronGlobal()
}

export function resetShortcuts() {
  config = JSON.parse(JSON.stringify(SHORTCUT_DEFAULTS))
  save()
  syncElectronGlobal()
  window.location.reload()
}
