# IPC 通道文档

> 与源码（electron/main.js、electron/preload.js）实测一致。通道名 Phase 2 之前不得改名。
> 状态标注：**存活** = 有实际调用方；**死** = 渲染层零引用（master-plan §3-P1 清理清单）；**孤儿** = main 已注册但 preload 未暴露。

## 一、renderer → main 通道（invoke，共 24 个 handle）

| 通道 | preload 方法 | 用途 | 状态 |
|---|---|---|---|
| select-audio-files | selectAudioFiles | 文件选择对话框（多选，按 AUDIO_EXTENSIONS 过滤，含无损/有损分组） | 存活 |
| select-audio-folder | selectAudioFolder | 文件夹选择 + 递归扫描音频文件，返回 {dirPath, dirName, files} | 存活 |
| load-music-paths | loadMusicPaths | 读 music-paths.json | 存活 |
| save-music-paths | saveMusicPaths | 写 music-paths.json | 存活 |
| load-music-folders | loadMusicFolders | 读 music-folders.json | 存活 |
| save-music-folders | saveMusicFolders | 写 music-folders.json | 存活 |
| backup-data | backupData | 备份：保存对话框 + 写 {paths, folders, playlists, time} | 存活 |
| restore-data | restoreData | 恢复：选备份文件，写回 paths/folders JSON，playlists 返回渲染层写 localStorage | 存活 |
| save-report-file | saveReportFile | 报告 PNG（base64）落盘 | 存活 |
| select-report-dir | selectReportDir | 选择报告保存目录 | 存活 |
| open-path | openPath | shell.openPath 打开文件/目录 | 存活 |
| get-auto-launch | getAutoLaunch | 读开机自启（app.getLoginItemSettings） | 存活 |
| set-auto-launch | setAutoLaunch | 写开机自启（app.setLoginItemSettings） | 存活 |
| clear-all-data | clearAllData | 删除 music-paths.json / music-folders.json | 存活 |
| update-global-shortcuts | updateGlobalShortcuts | 按用户配置重注册全局快捷键（含双注册 bug，P1 修复） | 存活 |
| get-desktop-lyrics-lock | getDesktopLyricsLock | 读歌词锁定状态（内存优先，lock 文件回退） | 存活 |
| get-user-music-dir | （未暴露） | 返回 ~/Music 路径 | 孤儿（master-plan 死通道清单未列，处置需先裁决） |
| getAudioCover | （无） | 内嵌+侧车封面提取 | 死（P1） |
| find-sidecar-cover | findSidecarCover | 侧车封面查询（方法暴露但渲染层零引用） | 死（P1） |
| media-update | （无） | main 侧 Media Session 推送（setMediaMetadata/setMediaPositionState） | 死（P1） |
| media-play | （无） | → media-play 事件转发 | 死（P1） |
| media-pause | （无） | → media-pause 事件转发 | 死（P1） |
| media-prev | （无） | → media-prev 事件转发 | 死（P1） |
| media-next | （无） | → media-next 事件转发 | 死（P1） |

## 二、renderer → main 通道（send，共 10 个 on）

| 通道 | preload 方法 | 用途 | 状态 |
|---|---|---|---|
| update-tray-info | updateTrayInfo | playerStore 推送 {songName, isPlaying, lyricsVisible}，托盘菜单重建 | 存活 |
| window-minimize | minimize | 主窗口最小化 | 存活 |
| window-maximize | maximize | 主窗口最大化/还原切换 | 存活 |
| window-hide | close | 主窗口隐藏（关窗按钮实义） | 存活 |
| show-desktop-lyrics | showDesktopLyrics | 创建/显示歌词窗口 | 存活 |
| hide-desktop-lyrics | hideDesktopLyrics | 隐藏歌词窗口 | 存活 |
| set-desktop-lyrics-lock | setDesktopLyricsLock | 锁定/解锁（鼠标穿透 + lock 文件 + 通知歌词窗口） | 存活 |
| update-desktop-lyrics | updateDesktopLyrics | 推送当前行歌词数据（行切换/状态切换时） | 存活 |
| desktop-lyrics-ready | desktopLyricsReady（preload-lyrics.js） | 歌词窗口加载完成握手 | 存活 |
| app-quit | appQuit | 退出应用（渲染层零引用） | 死（P1） |

合计：34 个已注册通道，其中死通道 8 个（getAudioCover、find-sidecar-cover、media-update、media-play、media-pause、media-prev、media-next、app-quit）。

## 三、main → renderer 事件（webContents.send）

| 事件 | 触发方 | 接收方 | 状态 |
|---|---|---|---|
| global-player-stop | 主窗口 close | （渲染层无监听） | 死发送（P1） |
| window-maximized (true/false) | win maximize / unmaximize | MainLayout（自绘标题栏状态） | 存活 |
| media-play-pause | 托盘 / 全局快捷键 / win32 媒体键 | useShortcuts → playerStore.togglePlay | 存活 |
| media-prev / media-next | 同上 | useShortcuts → playerStore.prevSong / nextSong | 存活 |
| media-vol-up / media-vol-down | 同上 | useShortcuts → 音量调节 | 存活 |
| toggle-desktop-lyrics | 托盘 / Ctrl+' 全局快捷键 | useShortcuts → MainLayout | 存活 |
| action-chain-execute (0-4) | Alt+1~5 | MainLayout → useActionChain | 存活 |
| desktop-lyrics-update | main（转发主窗口推送） | DesktopLyrics.vue | 存活 |
| desktop-lyrics-lock-changed | main（锁定变化/握手补发） | DesktopLyrics.vue | 存活 |

## 四、preload 暴露的 window.electron 方法面（38 个）

- **文件选择**：selectAudioFiles / selectAudioFolder
- **路径持久化**：loadMusicPaths / saveMusicPaths / loadMusicFolders / saveMusicFolders
- **自启动**：getAutoLaunch / setAutoLaunch
- **备份恢复**：backupData / restoreData（内含 BACKUP_KEYS 23 项 localStorage↔JSON 映射）
- **音频解析**：parseAudio（在 preload 内就地执行 music-metadata + 封面 + 歌词提取，P4 迁移）
- **窗口控制**：minimize / maximize / close
- **事件订阅（9 个，现不可退订）**：onMediaPlayPause / onMediaNext / onMediaPrev / onMediaVolUp / onMediaVolDown / onToggleDesktopLyrics / onToggleWindow / onWindowMaximized / onActionChainExecute
- **数据清除**：clearAllData / appQuit（死）
- **全局快捷键**：updateGlobalShortcuts
- **桌面歌词**：showDesktopLyrics / hideDesktopLyrics / setDesktopLyricsLock / getDesktopLyricsLock / updateDesktopLyrics
- **托盘**：updateTrayInfo
- **报告**：saveReportFile / selectReportDir / openPath
- **死方法（P1 删）**：readLocalLrc / getFileMtime（纯 preload 实现，无 IPC）/ findSidecarCover / appQuit

preload-lyrics.js 另暴露 3 个方法（仅歌词窗口）：desktopLyricsReady / onDesktopLyricsUpdate / onDesktopLyricsLockChanged（后两者返回退订函数）。

## 五、规划：ipc-channels.js 常量化（Phase 2）

- 新建 `electron/ipc-channels.js`（CJS `module.exports`），main.js 与 preload.js 均 `require` 引用；**通道名字符串值不变**。
- Renderer 不 import 它：渲染层只调 `window.electron.方法名`，从不接触通道字符串；main/preload 都是不经 Vite 打包的纯 CJS 运行时文件，无构建边界问题。
- 配套 grep 守卫：ipc-channels.js 之外，main/preload 中不得出现通道名字符串字面量。
- 同期 preload 的 9 个 `on*` 订阅改为返回取消函数（纯增量 API）。
