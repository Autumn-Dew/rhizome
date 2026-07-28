/**
 * Rhizome 所有 localStorage 键的中央注册表。
 *
 * 规则：
 *  - 键名统一使用 kebab-case 前缀 "rhizome-"
 *  - 非 rhizome 前缀的旧键（如 local_playlists）保留兼容
 *  - ALL_KEYS 用于备份/恢复等需要遍历全部键的场景
 *  - 所有读写 localStorage 的地方都应通过此文件引用键名，禁止硬编码字符串
 */

// ── rhizome 命名空间 ──
export const K_PLAY_MODE         = 'rhizome-play-mode'
export const K_VOLUME             = 'rhizome-volume'
export const K_THEME              = 'rhizome-theme'
export const K_LYRIC_SIZE         = 'rhizome-lyric-size'
export const K_LYRIC_ALIGN        = 'rhizome-lyric-align'
export const K_DESKTOP_LYRICS_VIS = 'rhizome-desktop-lyrics-visible'
export const K_DESKTOP_LYRICS_LCK = 'rhizome-desktop-lyrics-locked'
export const K_DESKTOP_LYRICS_BG  = 'rhizome-desktop-lyrics-bg'
export const K_PLAYER_STATE       = 'rhizome-player-state'
export const K_SHORTCUTS          = 'rhizome-shortcuts'
export const K_ACTION_CHAINS      = 'rhizome-action-chains'
export const K_AUDIO_DEVICE       = 'rhizome-audio-device'
export const K_IDLE_TIMEOUT       = 'rhizome-idle-timeout'
export const K_EQ_BANDS           = 'rhizome-eq-bands'
export const K_REPORT_PATH        = 'rhizome-report-path'
export const K_WEEKLY_PLAYLISTS   = 'rhizome-weekly-playlists'
export const K_WEEKLY_ENABLED     = 'rhizome-weekly-playlists-enabled'
export const K_DELETE_CONFIRM     = 'rhizome-delete-confirm'
export const K_LYRIC_OFFSET      = 'rhizome-lyric-offset'
export const K_SONG_CACHE        = 'rhizome-song-cache'

// ── 旧版 / 非 rhizome 前缀（兼容） ──
export const K_LOCAL_PLAYLISTS    = 'local_playlists'
export const K_PLAYLIST_SONGS     = 'local_playlist_songs'
export const K_PLAY_HISTORY_VIEW  = 'playHistoryView'
export const K_PLAY_HISTORY_FULL  = 'playHistoryFull'
export const K_PLAY_COUNT_REAL    = 'playCountReal'
export const K_LOCAL_MUSIC_LIST   = 'local-music-list'
export const K_LOCAL_MUSIC_FOLDERS = 'local-music-folders'

// ── 索引：遍历全部键（备份/恢复/清除等） ──
export const ALL_STORAGE_KEYS = [
  // rhizome 命名空间（经常变化的数据）
  K_PLAY_MODE,
  K_VOLUME,
  K_THEME,
  K_LYRIC_SIZE,
  K_LYRIC_ALIGN,
  K_DESKTOP_LYRICS_VIS,
  K_DESKTOP_LYRICS_LCK,
  K_PLAYER_STATE,
  K_SHORTCUTS,
  K_ACTION_CHAINS,
  K_AUDIO_DEVICE,
  K_EQ_BANDS,
  K_REPORT_PATH,
  K_WEEKLY_PLAYLISTS,
  K_WEEKLY_ENABLED,
  K_DELETE_CONFIRM,
  K_LYRIC_OFFSET,
  K_SONG_CACHE,
  // 大型数据
  K_LOCAL_PLAYLISTS,
  K_PLAYLIST_SONGS,
  K_PLAY_HISTORY_VIEW,
  K_PLAY_HISTORY_FULL,
  K_PLAY_COUNT_REAL,
  // 已迁移到 JSON 文件，但仍用于回退兼容
  K_LOCAL_MUSIC_LIST,
  K_LOCAL_MUSIC_FOLDERS,
]
