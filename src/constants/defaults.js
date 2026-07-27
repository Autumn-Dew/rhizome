/**
 * Rhizome 全部默认配置的中央注册表。
 *
 * 用途：
 *  - 快捷键默认值（与 electron/main.js initialShortcuts 同步；两处需保持一致）
 *  - 均衡器预设
 *  - 动作链类型定义
 *  - 播放模式映射
 *  - 其他硬编码的魔法值
 */

// ── 快捷键默认值 ──
// 每个 action 的 local 和 global 组合键配置
// ⚠ 与 electron/main.js initialShortcuts 需保持同步
export const SHORTCUT_DEFAULTS = {
  togglePlay: {
    local:  { code: 'Space',      ctrl: false, shift: false, alt: false },
    global: { code: 'Slash',      ctrl: true,  shift: true,  alt: false },
  },
  prevSong: {
    local:  { code: 'ArrowLeft',  ctrl: false, shift: false, alt: false },
    global: { code: 'ArrowLeft',  ctrl: true,  shift: false, alt: false },
  },
  nextSong: {
    local:  { code: 'ArrowRight', ctrl: false, shift: false, alt: false },
    global: { code: 'ArrowRight', ctrl: true,  shift: false, alt: false },
  },
  volUp: {
    local:  { code: 'ArrowUp',    ctrl: false, shift: false, alt: false },
    global: { code: 'ArrowUp',    ctrl: true,  shift: false, alt: false },
  },
  volDown: {
    local:  { code: 'ArrowDown',  ctrl: false, shift: false, alt: false },
    global: { code: 'ArrowDown',  ctrl: true,  shift: false, alt: false },
  },
  toggleWindow: {
    local:  null,
    global: { code: 'Backslash',  ctrl: true,  shift: false, alt: false },
  },
  toggleDesktopLyrics: {
    local:  null,
    global: { code: 'Quote',      ctrl: true,  shift: false, alt: false },
  },
}

// 快捷键 action 定义：label + 是否支持 local/global
export const SHORTCUT_ACTION_DEFS = {
  togglePlay:   { label: '播放 / 暂停',     local: true,  global: true },
  prevSong:     { label: '上一曲',          local: true,  global: true },
  nextSong:     { label: '下一曲',          local: true,  global: true },
  volUp:        { label: '音量增大',        local: true,  global: true },
  volDown:      { label: '音量减小',        local: true,  global: true },
  toggleWindow: { label: '显示 / 隐藏窗口',  local: false, global: true },
  toggleDesktopLyrics: { label: '显示 / 隐藏桌面歌词', local: true, global: true },
}

// ── 均衡器 ──
export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQ_PRESETS = {
  '摇滚':   [4,  3, -1, -2,  1,  3,  5,  4,  3,  2],
  '流行':   [-1, 1,  3,  2, -1,  0,  2,  3,  4,  3],
  '古典':   [3,  2,  0,  0, -1, -1,  0,  1,  2,  3],
  '人声增强': [-2, -1, 2,  4,  4,  2,  1,  0, -1, -2],
  '电子':   [6,  5,  2, -2, -3,  0,  2,  4,  5,  6],
}

// ── 动作链 ──
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

// ── 播放模式 SVG 路径映射 ──
export const PLAY_MODE_ICONS = {
  list:        'M4 7h14 M4 12h12 M4 17h16',
  single:      'M12 7v10 M9 16h6',
  listLoop:    'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2',
  singleLoop:  'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2 M12 9v6 M10 14h4',
  random:      'M4 8h8v6h8 M20 16h-8v-6H4',
}

export const PLAY_MODES = ['list', 'listLoop', 'singleLoop', 'single', 'random']

// ── 歌词默认值 ──
export const LYRIC_SIZE_DEFAULT = 14
export const LYRIC_SIZE_MIN = 10
export const LYRIC_SIZE_MAX = 18
export const LYRIC_ALIGN_DEFAULT = 'center'

// ── 删除确认 ──
export const DELETE_CONFIRM_DEFAULT = 3
export const DELETE_CONFIRM_OPTIONS = [1, 2, 3]

// ── 歌词延迟 ──
export const LYRIC_OFFSET_DEFAULT = 0     // ms
export const LYRIC_OFFSET_MIN = -2000     // ms
export const LYRIC_OFFSET_MAX = 2000      // ms
export const LYRIC_OFFSET_STEP = 5        // ms
