# Electron 侧文档（main / preload / 桌面歌词）

> 行号以 v1.0.8（2026-09-08 审计）为准，后续 Phase 会漂移，以语义为准。

## main.js（691 行单文件）

职责清单：

1. **单实例锁**：`app.requestSingleInstanceLock()`，二次启动聚焦已有窗口。
2. **主窗口**：1200×800（最小 1000×700），无边框（frame:false），`show:false` + `ready-to-show` 再显示；dev 加载 `http://localhost:9000`，打包加载 `dist/index.html`；`removeMenu()`。
3. **关窗=隐藏**：`close` 事件 `preventDefault()` → 发送 `global-player-stop`（渲染层无监听，死事件）→ `win.hide()`。真正退出走托盘菜单"退出"（置 `app.isQuitting` 后 destroy）。
4. **托盘**：`electron/icons/img.png`；点击切换主窗口显隐；右键菜单动态重建（当前曲名 / 上一首 / 播放暂停 / 下一首 / 音量± / 桌面歌词开关 / 退出），状态由渲染层经 `update-tray-info` 推送。
5. **全局快捷键**：启动时注册 7 个默认（Ctrl+Shift+/ 播放暂停、Ctrl+←/→ 上下曲、Ctrl+↑/↓ 音量、Ctrl+\ 显隐窗口、Ctrl+' 桌面歌词）+ Alt+1~5 动作链；渲染层设置页修改后经 `update-global-shortcuts` 重注册（该 handler 存在**双注册 bug**：`registerActionChainShortcuts` 被调两次 + 重复的空列表守卫，main.js:622-627，Phase 1 修复）。`buildAccelerator` 把 combo（code+ctrl/shift/alt）转 Electron accelerator。
6. **win32 媒体键**：`app.on('media-play-pause' | 'media-next-track' | 'media-previous-track')` 转发到渲染层。
7. **桌面歌词窗口管理**（见下节）。
8. **IPC 注册**：34 个通道（详见 docs/ipc.md）。
9. **JSON 持久化**：`loadJsonFile` / `saveJsonFile`（自动建目录），服务于音乐路径/文件夹与备份恢复。
10. **生命周期**：`window-all-closed` 空实现（应用驻留托盘）；`will-quit` 解绑全部全局快捷键。

## preload.js（~283 行）

- 经 `contextBridge.exposeInMainWorld("electron", {...})` 暴露 ~38 个方法（方法面详见 docs/ipc.md）。
- **含 ~150 行解析业务**（Phase 4 迁出）：`parseAudio`（music-metadata 解析 + 元数据映射 + songKey 生成）、封面提取（`embCover` 内嵌 base64 → `sideCover` 同目录 12 个候选文件名）、歌词提取（`extLyrics`：FLAC Vorbis LYRICS 字段 → common.lyrics → unsyncedLyrics → 侧车 .lrc → 侧车 .txt，synced 解析复用 lib/lrc.cjs）。
- `backupData` / `restoreData` 在 preload 内直接读写 renderer 的 localStorage（经 `BACKUP_KEYS` 23 项手工映射表，json 名下划线 ↔ localStorage 键连字符/原名；与 storage-keys.js 双写同步，Phase 2 改机械推导）。
- 事件订阅（`onMediaPlayPause` 等 9 个）现返回值未定义、不可退订（Phase 2 改为返回取消函数）；preload-lyrics.js 的两个订阅已返回退订函数。

## preload-lyrics.js（22 行）

桌面歌词窗口专用桥接，暴露 3 个方法：`desktopLyricsReady()`（握手）、`onDesktopLyricsUpdate(cb)`（收歌词数据，返回退订函数）、`onDesktopLyricsLockChanged(cb)`（收锁定状态，返回退订函数）。

## lib/lrc.cjs（29 行）

`parseLRC` 纯函数（Phase 0 从 preload.js 原样搬移，勿重写）：支持 `[offset:±ms]`、2/3 位毫秒、`ti/ar/al/by/length/re/ve` 元数据行跳过、输出按 time 升序、负时间截 0。CJS 导出，main/preload/vitest 三方可用（测试在 electron/lib/__tests__/lrc.test.js，16 例）。

## 安全配置

| 配置 | 值 | 说明 |
|---|---|---|
| contextIsolation | **true** | 红线，不得改 |
| nodeIntegration | **false** | 红线，不得改；渲染层零 Node API |
| sandbox | false | preload 需 require CJS 模块 |
| webSecurity | **false** | 已知安全债（为让 `<audio>`/封面读本地文件），Phase 5 用自定义协议替换 |

两个窗口（主窗口、歌词窗口）均为 contextIsolation:true / nodeIntegration:false / sandbox:false。

## 桌面歌词窗口机制（五要素，不得简化）

**窗口**：800×100，无边框、透明、置顶（`setAlwaysOnTop(true, 'screen-saver')`，hide/show 后在 `did-finish-load` 重申）、skipTaskbar、不可缩放、无阴影；禁右键菜单；初始隐藏。入口 desktop-lyrics.html（Vite 第二构建入口），渲染端 src/desktopLyrics.js 挂载 DesktopLyrics.vue。

1. **握手**：歌词窗口 onMounted 调 `desktopLyricsReady()` → main 置 `lyricReady=true`，随后补发状态（见第 5 点）。
2. **rAF 本地插值**：主窗口不逐帧推送。MainLayout 只在行索引变化/播放状态切换时推送 `{text, lineStartTime, lineEndTime, elapsed, paused, themeClass, fontSize, align, bgOpacity}`；歌词窗口用 `elapsed + (performance.now() - localRefTime)` 在 rAF 中平滑推进 `--lyric-progress`（左右消逝线动效）。
3. **行切换校正**：MainLayout watch `playerStore.currentTime` 检测行索引变化时推送新行；另有 2 秒周期 syncTimer 防时钟漂移；切歌/主题变更时强制推送。
4. **lock 状态文件**：`set-desktop-lyrics-lock` → `setIgnoreMouseEvents(locked, {forward:true})`（锁定后鼠标穿透）+ 写入 desktop-lyrics-lock.json + 通知歌词窗口（锁定时隐藏取景框背景）。
5. **三路状态恢复**：握手完成时 main 一次性补发——最后一份歌词数据（`lastLyricData`）、锁定状态（内存优先、lock 文件兜底，覆盖 IPC 时序问题）、重申 alwaysOnTop。

**位置持久化**：窗口 `moved` 事件写 desktop-lyrics-pos.json；启动时恢复，无文件则默认水平居中、y=45。

**可见性**：显隐由 MainLayout 经 `show-desktop-lyrics` / `hide-desktop-lyrics` 控制，开关状态存 localStorage（K_DESKTOP_LYRICS_VIS / K_DESKTOP_LYRICS_LCK）。

## 托盘 / 快捷键 / 媒体键（数据流）

- 托盘：playerStore watch → `update-tray-info(songName, isPlaying)` → main 重建菜单；菜单点击 → `media-prev / media-play-pause / media-next / media-vol-up / media-vol-down / toggle-desktop-lyrics` 发给渲染层 → useShortcuts 的订阅回调调 playerStore。
- 全局快捷键：useShortcuts `syncElectronGlobal()` 把用户配置经 `update-global-shortcuts` 同步给 main（覆盖默认注册）；触发后 main 直接 `win.webContents.send(s.event)`，`toggle-window` 由 main 直接显隐窗口。
- 本地快捷键：useShortcuts 在渲染层 `keydown` 监听（输入框聚焦时跳过），与全局双通道并存。
- 动作链：Alt+1~5（main 固定注册）→ `action-chain-execute(0-4)` → MainLayout 执行对应动作序列。
- Media Session：生效路径在 renderer（playerStore 的 `navigator.mediaSession` metadata/playbackState/setPositionState/setActionHandler）；main 侧 `media-update` 通道（setMediaMetadata/setMediaPositionState）无调用方，属死通道。

## 文件持久化位置

`DATA_DIR = app.getPath('userData')/data`（Windows 即 `%APPDATA%/Rhizome/data`）：

| 文件 | 写入方 | 内容 |
|---|---|---|
| music-paths.json | save-music-paths | 本地音乐文件绝对路径数组 |
| music-folders.json | save-music-folders | 导入的文件夹 {name, path} |
| desktop-lyrics-pos.json | 歌词窗口 moved 事件 | {x, y} |
| desktop-lyrics-lock.json | set-desktop-lyrics-lock | true/false |

备份文件（用户自选位置，默认名 rhizome-backup.json）：`{paths, folders, playlists(23 个 localStorage 键映射), time}`。`clear-all-data` 只删 music-paths.json 与 music-folders.json（不清 localStorage 与歌词文件）。
