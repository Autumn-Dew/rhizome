# Rhizome 架构（现状）

> 本文记录 2026-09-08 审计时的实际代码结构（v1.0.8）。目标架构与差距见 docs/refactoring/master-plan.md §1。

## 现状调用链（文字版）

```
[渲染进程 renderer，零 Node API]
Vue Views（13 个 .vue）+ Components（12 个 .vue）+ App.vue
  ├─ 直调 composables（18 个 use-*，UI 行为复用）
  ├─ 直调 Pinia Stores（playerStore / localMusicStore / playlistStore）
  └─ 大量调用点直接调 window.electron.*（约 47 处，分散在 12 个文件）
        ↓ preload（electron/preload.js，contextBridge 暴露 ~38 个方法）
        ↓ 其中 parseAudio 等在 preload 内就地执行 music-metadata 解析 / 封面 / 歌词提取
        ↓ 其余经 ipcRenderer.invoke / send（~34 个通道，字符串字面量散落两侧）
[主进程 main，electron/main.js 691 行单文件]
窗口管理（无边框主窗口 + 桌面歌词窗口） / 托盘 / 全局快捷键 / 动作链
IPC 注册（34 个通道） / JSON 持久化（userData/data/*.json） / win32 媒体键转发
  ↓
OS / 文件系统（音频文件读取由 renderer 以本地路径直接 <audio src> 播放，
依赖 webSecurity:false 绕过 file:// 跨域限制 —— Phase 5 待修）
```

要点：

- 播放核心在 renderer：`playerStore` 内部 `new Audio()`（全局唯一实例），Audio 事件驱动 currentTime/duration/ended。
- localStorage 由 renderer 读写，key 经 `src/constants/storage-keys.js`（27 个键常量，`ALL_STORAGE_KEYS` 收录 25 个，RHZ-K1 除外）。
- 文件型数据（音乐路径/文件夹、桌面歌词位置/锁定）已迁移到 main 进程的 userData JSON，localStorage 保留回退兼容（`localMusicStore.migrateIfNeeded`）。
- Media Session 有两条路径：renderer 侧 `navigator.mediaSession`（生效路径）与 main 侧 `media-update` 通道（已死，无调用方）。

## 分层现状与目标差距

| 目标层（master-plan §1） | 现状 | 差距 / 负责 Phase |
|---|---|---|
| components / views | 已有，但 6 个组件 >600 行 | 拆分 → Phase 7 |
| composables | 18 个，现状保留 | — |
| stores | 3 个；playerStore 七职责混合（播放/历史/计数/持久化/MediaSession/托盘推送/AB循环） | 拆分 → Phase 6 |
| services（唯一 window.electron 接触点） | 不存在；约 47 处调用散落 12 个文件 | 新建 → Phase 3 |
| domain（纯函数） | 无目录；shuffle/LRC/播放模式逻辑内嵌 store 与 preload | 新建 → Phase 6（部分已进 electron/lib/lrc.cjs） |
| utils / constants / router | 已有（format、song-factory、storage-keys、defaults） | — |
| electron/ipc-channels.js | 不存在；通道名字符串直写 main/preload | 新建 → Phase 2 |
| electron/main.js 模块化 | 691 行单文件 | Phase 8（可能取消） |
| preload thin bridge | 283 行，含 ~150 行解析业务 | 迁移 → Phase 4 |

目标调用链（终态）：`Component → composable/store → services → gateway → preload → IPC(常量) → main → OS/FS`。

## 模块清单及行数规模

### src/（渲染层，合计约 12,500 行）

| 模块 | 规模 |
|---|---|
| views/player/SongDetail.vue | 1164（巨型组件，P7-⑤） |
| views/player/LocalMusic.vue | 1106（巨型组件，P7-④） |
| views/player/MusicTimeline.vue | 733（巨型组件，P7-③） |
| views/MainLayout.vue | 684（巨型组件，P7-⑥，含桌面歌词推送编排） |
| views/player/SettingsPage.vue | 619（巨型组件，P7-②） |
| views/player/PlaylistDetail.vue | 596（巨型组件，P7-①） |
| views/player/ 其余（PlayHistory 487 / MyPlaylist 440 / AlbumDetail 383 / PlayStats 316 / DiaryPage 310 / index 205） | 合计约 2581 |
| components/（SelectModal 417 / GlobalPlayer 392 / SplashOverlay 386 / ProgressBar 224 / DesktopLyrics 206 / VolumeControl 205 / 其余 6 个） | 合计约 1803 |
| stores/playerStore.js | 387（七职责，P6） |
| stores/localMusicStore.js | 219（含 migrateIfNeeded 迁移逻辑） |
| stores/playlistStore.js | 40 |
| composables/（18 个 use-* + demo/ 2 个） | 合计约 1700 |
| constants/（storage-keys 72 / defaults 108） | 180 |
| utils/（format / lyrics 43 / song-factory） | 约 100（另有 3 个测试文件） |
| router/index.js | 58（hash 路由，player 子路由 10 个） |

### electron/（主进程侧）

| 文件 | 行数 | 说明 |
|---|---|---|
| main.js | 691 | 窗口/托盘/快捷键/桌面歌词窗口/IPC/JSON 持久化，单文件（P8） |
| preload.js | ~283 | contextBridge ~38 方法 + ~150 行解析业务（P4） |
| preload-lyrics.js | 22 | 歌词窗口桥接（3 个方法，订阅返回退订函数） |
| lib/lrc.cjs | 29 | parseLRC 纯函数（Phase 0 已从 preload 原样迁出） |

## 已知问题摘要（详见 master-plan §2/§3，此处仅索引）

1. `webSecurity: false`（安全债）→ Phase 5（RHZ-security-001）。
2. `update-global-shortcuts` 双注册 + 重复守卫 bug（main.js:622-627）→ Phase 1。
3. 8 个死 IPC 通道 + 死 API（详见 docs/ipc.md）→ Phase 1。
4. preload 含 ~150 行解析业务（music-metadata/封面/歌词）→ Phase 4。
5. 6 个 >600 行巨型组件（见上表）→ Phase 7。
6. playerStore 七职责 → Phase 6。
7. RHZ-K1：`rhizome-desktop-lyrics-bg` 与 `rhizome-idle-timeout` 不在 ALL_STORAGE_KEYS/备份范围 → 待裁决。
8. 零 HTTP/后端（确认事实，非问题）：无任何网络请求代码。
9. 死依赖 4 个（dayjs / flac-metadata / jsmediatags / music-metadata-browser，已实测零引用）+ 根目录死文件 mock-diary-data.js → Phase 1。
