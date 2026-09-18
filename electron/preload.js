const { contextBridge, ipcRenderer } = require("electron")
const mm = require("music-metadata")
const path = require("path")
const fs = require("fs/promises")
const { parseLRC } = require("./lib/lrc.cjs")

// ── 工具函数 ──
const normalizeText = (s) => (s || "").toLowerCase().replace(/[\s\u3000]+/g, " ").trim()
const normalizeArtist = (a) => (a || "").split(/[,&]/).map(normalizeText).filter(Boolean).sort().join(" ")
const genKey = (t, a) => normalizeText(t) + "|" + normalizeArtist(a)
const fmtDur = (s) => {
  if (!s || s < 0) return "00:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m.toString().padStart(2, "0") + ":" + sec.toString().padStart(2, "0")
}

const COVER_NAMES = ["cover.jpg", "cover.png", "cover.webp", "cover.jpeg",
  "folder.jpg", "folder.png", "album.jpg", "album.png",
  "AlbumArt.jpg", "AlbumArt.png", "front.jpg", "front.png"]

const MIME_MAP = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }

// ── 封面提取 ──
const embCover = (pics) => {
  const p = pics && pics[0]
  if (!p) return null
  return {
    url: "data:" + p.format + ";base64," + Buffer.from(p.data).toString("base64"),
    mime: p.format,
    source: "embedded",
  }
}

const sideCover = async (fp) => {
  const dir = path.dirname(fp)
  for (let i = 0; i < COVER_NAMES.length; i++) {
    try {
      const fullPath = path.join(dir, COVER_NAMES[i])
      await fs.access(fullPath)
      const buf = await fs.readFile(fullPath)
      const ext = path.extname(COVER_NAMES[i]).toLowerCase()
      return {
        url: "data:" + (MIME_MAP[ext] || "image/jpeg") + ";base64," + buf.toString("base64"),
        mime: MIME_MAP[ext] || "image/jpeg",
        source: "sidecar",
      }
    } catch (ex) { /* 继续尝试下一个文件名 */ }
  }
  return null
}

// ── 内嵌 / 侧车歌词提取 ──
const extLyrics = async (fp, common, native, isFlac) => {
  // FLAC Vorbis Comment 中的 LYRICS 字段
  if (isFlac && native) {
    const ks = Object.keys(native)
    for (let i = 0; i < ks.length; i++) {
      const tag = native[ks[i]]
      if (Array.isArray(tag)) {
        for (let j = 0; j < tag.length; j++) {
          const item = tag[j]
          // { id, value } 格式 (music-metadata v11)
          if (typeof item === "object" && item !== null && item.id && item.value && typeof item.value === "string") {
            if (item.id.toUpperCase() === "LYRICS" && item.value.indexOf("[00:") >= 0) {
              const p = parseLRC(item.value)
              if (p.length > 0) return { lines: item.value.split(/\r?\n/).filter(Boolean), synced: p, source: "embedded" }
            }
          }
          // 纯字符串格式
          if (typeof item === "string" && item.indexOf("[00:") >= 0) {
            const p = parseLRC(item)
            if (p.length > 0) return { lines: item.split(/\r?\n/).filter(Boolean), synced: p, source: "embedded" }
          }
        }
      }
    }
  }

  // mp3/wav 及其他通用路径
  let bl = [], bs = []
  if (common.lyrics && common.lyrics.length) {
    const t = common.lyrics.map((x) => x.text || x).join("\n")
    bl = t.split(/\r?\n/).filter(Boolean); bs = parseLRC(t)
    if (bs.length > 0) return { lines: bl, synced: bs, source: "embedded" }
  }
  if (!bs.length && typeof common.unsyncedLyrics === "string" && common.unsyncedLyrics.trim()) {
    bl = common.unsyncedLyrics.split(/\r?\n/).filter(Boolean); bs = parseLRC(common.unsyncedLyrics)
    if (bs.length > 0) return { lines: bl, synced: bs, source: "embedded" }
  }

  // 侧车 LRC 文件
  const cand = [fp.replace(/\.\w+$/, ".lrc")]
  const dir = path.dirname(fp)
  const base = path.basename(fp, path.extname(fp))
  const mx = base.match(/^(.+?)\s*[-–—]\s*/)
  if (mx && mx[1].length > 1) cand.push(path.join(dir, mx[1] + ".lrc"))
  for (let k = 0; k < cand.length; k++) {
    try {
      await fs.access(cand[k])
      const ct = await fs.readFile(cand[k], "utf8")
      const pp = parseLRC(ct)
      return { lines: ct.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), synced: pp, source: "sidecar-lrc" }
    } catch (ex) { /* 继续 */ }
  }

  // 侧车 TXT
  try {
    const tp = fp.replace(/\.\w+$/, ".txt")
    await fs.access(tp)
    const tc = await fs.readFile(tp, "utf8")
    const tl = tc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (tl.length) return { lines: tl, synced: [], source: "sidecar-txt" }
  } catch (ex) { /* 继续 */ }

  if (bl.length) return { lines: bl, synced: bs, source: "embedded" }
  return { lines: [], synced: [], source: null }
}

// ── 备份键列表：与 src/constants/storage-keys.js 保持同步 ──
// JSON 属性名用下划线，localStorage 键用连字符
const BACKUP_KEYS = [
  { json: "rhizome_shortcuts",              ls: "rhizome-shortcuts" },
  { json: "rhizome_action_chains",          ls: "rhizome-action-chains" },
  { json: "rhizome_play_mode",              ls: "rhizome-play-mode" },
  { json: "rhizome_theme",                  ls: "rhizome-theme" },
  { json: "rhizome_lyric_size",             ls: "rhizome-lyric-size" },
  { json: "rhizome_lyric_align",            ls: "rhizome-lyric-align" },
  { json: "rhizome_desktop_lyrics_visible", ls: "rhizome-desktop-lyrics-visible" },
  { json: "rhizome_desktop_lyrics_locked",  ls: "rhizome-desktop-lyrics-locked" },
  { json: "rhizome_volume",                 ls: "rhizome-volume" },
  { json: "rhizome_player_state",           ls: "rhizome-player-state" },
  { json: "rhizome_audio_device",           ls: "rhizome-audio-device" },
  { json: "rhizome_eq_bands",               ls: "rhizome-eq-bands" },
  { json: "rhizome_report_path",            ls: "rhizome-report-path" },
  { json: "rhizome_weekly_playlists",       ls: "rhizome-weekly-playlists" },
  { json: "rhizome_weekly_enabled",         ls: "rhizome-weekly-playlists-enabled" },
  { json: "rhizome_delete_confirm",         ls: "rhizome-delete-confirm" },
  { json: "rhizome_lyric_offset",           ls: "rhizome-lyric-offset" },
  { json: "rhizome_song_cache",             ls: "rhizome-song-cache" },
  { json: "rhizome_report_generated",       ls: "rhizome-report-generated" },
  { json: "rhizome_sound_enabled",          ls: "rhizome-sound-enabled" },
  { json: "rhizome_sound_volume",           ls: "rhizome-sound-volume" },
  { json: "rhizome_sort_pref",              ls: "rhizome-sort-pref" },
  { json: "rhizome_sort_orders",            ls: "rhizome-sort-orders" },
  { json: "rhizome_report_auto",            ls: "rhizome-report-auto" },
  { json: "rhizome_screensaver_enabled",    ls: "rhizome-screensaver-enabled" },
  { json: "local_playlists",                ls: "local_playlists" },
  { json: "local_playlist_songs",           ls: "local_playlist_songs" },
  { json: "playHistoryView",                ls: "playHistoryView" },
  { json: "playHistoryFull",                ls: "playHistoryFull" },
  { json: "playCountReal",                  ls: "playCountReal" },
]

// ── 暴露 API 到渲染进程 ──
contextBridge.exposeInMainWorld("electron", {
  // 文件选择
  selectAudioFiles: () => ipcRenderer.invoke("select-audio-files"),
  selectAudioFolder: () => ipcRenderer.invoke("select-audio-folder"),

  // 持久化路径
  loadMusicPaths: () => ipcRenderer.invoke("load-music-paths"),
  saveMusicPaths: (p) => ipcRenderer.invoke("save-music-paths", p),
  loadMusicFolders: () => ipcRenderer.invoke("load-music-folders"),
  saveMusicFolders: (f) => ipcRenderer.invoke("save-music-folders", f),

  // 开机自启
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),

  // 备份 / 恢复
  backupData() {
    const data = {}
    for (let i = 0; i < BACKUP_KEYS.length; i++) {
      const val = localStorage.getItem(BACKUP_KEYS[i].ls)
      if (val !== null) data[BACKUP_KEYS[i].json] = val
    }
    return ipcRenderer.invoke("backup-data", data)
  },
  restoreData() {
    return ipcRenderer.invoke("restore-data").then((result) => {
      if (result && result.playlists) {
        const p = result.playlists
        for (let i = 0; i < BACKUP_KEYS.length; i++) {
          const val = p[BACKUP_KEYS[i].json]
          if (val !== undefined && val !== null) {
            localStorage.setItem(BACKUP_KEYS[i].ls, val)
          }
        }
      }
      return result ? result.ok : false
    })
  },

  // 音频解析
  parseAudio: async (fp) => {
    if (typeof fp !== "string" || !fp) return null
    try {
      const meta = await mm.parseFile(fp, { duration: true, skipCovers: false, skipPostHeaders: false, includeChapters: false })
      const c = meta.common
      const title = c.title || path.basename(fp, path.extname(fp))
      const artist = c.artist || "未知歌手"
      let cv = embCover(c.picture)
      if (!cv) cv = await sideCover(fp)
      const isFlac = fp.toLowerCase().endsWith(".flac")
      const lr = await extLyrics(fp, c, meta.native, isFlac)
      let mtime = 0
      try { const st = await fs.stat(fp); mtime = Math.floor(st.mtimeMs) } catch { /* ignore */ }
      return {
        path: fp, title, singer: artist,
        album: c.album || "", year: c.year || null,
        genre: (c.genre && c.genre.length) ? c.genre.join(" / ") : "",
        track: c.track ? c.track.no : null,
        composer: c.composer ? c.composer[0] : "",
        duration: meta.format.duration || 0,
        durationFormat: fmtDur(meta.format.duration),
        songKey: genKey(title, artist),
        coverUrl: cv ? cv.url : "", coverSource: cv ? cv.source : null,
        lyrics: lr.lines, syncedLyrics: lr.synced, lyricsSource: lr.source,
        mtime,
        _raw: {
          codec: meta.format.codec, container: meta.format.container,
          bitrate: meta.format.bitrate, sampleRate: meta.format.sampleRate,
          numberOfChannels: meta.format.numberOfChannels,
        },
      }
    } catch (err) {
      console.error("[parseAudio] fail", err)
      return {
        path: fp, title: path.basename(fp, path.extname(fp)), singer: "未知歌手",
        album: "", year: null, genre: "", track: null, composer: "",
        duration: 0, durationFormat: "00:00",
        songKey: genKey(path.basename(fp, path.extname(fp)), "未知歌手"),
        coverUrl: "", coverSource: null, lyrics: [], syncedLyrics: [], lyricsSource: null, _raw: null,
      }
    }
  },

  // 歌词 / 文件
  readLocalLrc: async (fp) => {
    try {
      const lp = fp.replace(/\.\w+$/, ".lrc")
      await fs.access(lp)
      const ct = await fs.readFile(lp, "utf8")
      return parseLRC(ct)
    } catch (e) { return [] }
  },
  getFileMtime: async (fp) => {
    try { const st = await fs.stat(fp); return Math.floor(st.mtimeMs) } catch { return 0 }
  },
  findSidecarCover: (fp) => ipcRenderer.invoke("find-sidecar-cover", fp),

  // 窗口控制
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-hide"),

  // 媒体事件监听
  onMediaPlayPause: (cb) => ipcRenderer.on("media-play-pause", cb),
  onMediaNext: (cb) => ipcRenderer.on("media-next", cb),
  onMediaPrev: (cb) => ipcRenderer.on("media-prev", cb),
  onMediaVolUp: (cb) => ipcRenderer.on("media-vol-up", cb),
  onMediaVolDown: (cb) => ipcRenderer.on("media-vol-down", cb),
  onToggleDesktopLyrics: (cb) => ipcRenderer.on("toggle-desktop-lyrics", cb),
  onToggleWindow: (cb) => ipcRenderer.on("toggle-window", cb),
  onWindowMaximized: (cb) => ipcRenderer.on("window-maximized", (_e, state) => cb(state)),
  onActionChainExecute: (cb) => ipcRenderer.on("action-chain-execute", (_e, idx) => cb(idx)),

  // 数据清除
  clearAllData: () => ipcRenderer.invoke("clear-all-data"),
  appQuit: () => ipcRenderer.send("app-quit"),

  // 退出前报告生成握手
  onPrepareQuit: (cb) => ipcRenderer.on("prepare-quit", cb),
  sendQuitReady: () => ipcRenderer.send("quit-ready"),

  // 全局快捷键
  updateGlobalShortcuts: (list) => ipcRenderer.invoke("update-global-shortcuts", list),

  // 桌面歌词
  showDesktopLyrics: () => ipcRenderer.send("show-desktop-lyrics"),
  hideDesktopLyrics: () => ipcRenderer.send("hide-desktop-lyrics"),
  setDesktopLyricsLock: (locked) => ipcRenderer.send("set-desktop-lyrics-lock", locked),
  getDesktopLyricsLock: () => ipcRenderer.invoke("get-desktop-lyrics-lock"),
  updateDesktopLyrics: (data) => ipcRenderer.send("update-desktop-lyrics", data),

  // 系统托盘
  updateTrayInfo: (data) => ipcRenderer.send("update-tray-info", data),

  // 报告
  saveReportFile: (dirPath, filename, base64Data) => ipcRenderer.invoke("save-report-file", dirPath, filename, base64Data),
  selectReportDir: () => ipcRenderer.invoke("select-report-dir"),
  openPath: (p) => ipcRenderer.invoke("open-path", p),
})
