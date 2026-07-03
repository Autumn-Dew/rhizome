# Rhizome

简约的本地音乐播放器 · Vue 3 + Electron

## 预览

![暗色主题](public/1.png)
![亮色主题](public/2.png)

## 功能

### 音频
- 本地音频管理（MP3 / FLAC / WAV / M4A / OGG / APE / WAV 等）
- 文件夹导入 & 批量扫描
- 封面提取（内嵌 / 侧车文件）+ 主色调提取
- 均衡器
- 频谱可视化

### 歌词
- 内嵌 LRC 歌词解析 & 显示
- 侧车 .lrc / .txt 歌词支持
- 桌面歌词（置顶透明窗口，可锁定拖拽、调整字号与对齐）
- 歌词四角 HUD 取景框 + 播放进度边框（每边从中点向两端生长）
- `Ctrl+'` 全局切换桌面歌词

### 播放
- 列表 / 循环 / 单曲 / 随机（Fisher-Yates 伪随机不重复）
- 进度条拖拽 & 滚轮微调
- Media Session 系统控件集成
- 切歌动效：封面四角收拢、文字色条擦除、歌词闪烁、进度条脉冲

### 歌单
- 自定义歌单（创建 / 编辑 / 排序 / 多选操作）
- 「我喜欢」固定歌单，全局心形按钮一键收藏
- 周报自动歌单（设置中开启）：「本周最爱」Top 10 +「每周发现」10 首，保留最近 4 期
- 歌单内拖拽排序 & 数字序号排序

### 统计 & 报告
- 听歌统计（总次数 / 歌曲数 / 时长 / 最爱歌手 / 排行）
- 播放记录 PNG 报告生成（可设保存路径，精确到秒命名）
- 定时报告：周报 / 月报 / 年报

### 界面
- 暗色 / 亮色主题
- 全页面统一入场动效（标题 / 按钮 / 封面 / 列表条目 / 分隔线依次动效）
- 当前播放歌曲反色高亮
- 浮动定位按钮（跳转到当前播放歌曲）
- 音乐时间线视图

### 系统
- 全局快捷键（可自定义）
- 开机自启
- 系统托盘（最小化到托盘）
- 音频设备热切换
- 数据备份与恢复（含歌单、历史、播放记录、偏好设置）

## 开发

```bash
npm install          # 安装依赖
npm run electron:dev # 启动开发（Vite + Electron）
npm run build        # 生产构建
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `←` / `→` | 上一曲 / 下一曲 |
| `↑` / `↓` | 音量增减 |
| `Ctrl+'` | 显示 / 隐藏桌面歌词 |
| `Ctrl+Shift+/` | 全局播放 / 暂停 |
| `Ctrl+←` / `Ctrl+→` | 全局上一曲 / 下一曲 |
| `Ctrl+↑` / `Ctrl+↓` | 全局音量增减 |
| `Ctrl+\` | 全局显示 / 隐藏窗口 |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 (Composition API) / Pinia / Vue Router |
| 桌面 | Electron |
| 音频 | music-metadata |
| 构建 | Vite / electron-builder |

## 结构

```
rhizome/
├── electron/                # 主进程 & preload
│   ├── main.js              # 窗口管理 / IPC / 托盘 / 全局快捷键
│   ├── preload.js           # 音频解析、文件 IO、备份恢复
│   └── preload-lyrics.js    # 歌词窗口桥接
├── src/                     # 渲染进程
│   ├── components/
│   │   ├── common/          # FavoriteButton / AboutModal / SelectModal
│   │   ├── lyrics/          # DesktopLyrics
│   │   └── player/          # GlobalPlayer / ProgressBar / VolumeControl
│   ├── views/
│   │   ├── MainLayout.vue   # 主布局（标题栏 + 导航 + 路由出口）
│   │   └── player/          # 页面组件
│   │       ├── index.vue         # 播放器布局
│   │       ├── LocalMusic.vue    # 本地音乐
│   │       ├── PlaylistDetail.vue# 歌单详情
│   │       ├── MyPlaylist.vue    # 歌单列表
│   │       ├── PlayHistory.vue   # 播放历史
│   │       ├── PlayStats.vue     # 听歌统计
│   │       ├── SongDetail.vue    # 歌曲详情
│   │       ├── MusicTimeline.vue # 音乐时间线
│   │       └── SettingsPage.vue  # 设置
│   ├── stores/              # Pinia（playerStore / localMusicStore）
│   ├── composables/         # 可复用逻辑
│   │   ├── useGlobalTheme.js
│   │   ├── useShortcuts.js
│   │   ├── useSpectrumEngine.js
│   │   ├── useReportGenerator.js
│   │   ├── useCurrentSongHighlight.js
│   │   ├── useFavorites.js
│   │   ├── useWeeklyPlaylists.js
│   │   ├── useActionChain.js
│   │   ├── useAudioDevice.js
│   │   ├── useColorExtractor.js
│   │   └── useEqualizer.js
│   └── router/
├── public/
├── index.html
├── desktop-lyrics.html
└── package.json
```

## 更新日志

### v1.0.7
- 修复：随机播放 prevSong 游标不一致
- 修复：toggleWindow 全局快捷键未注册处理器
- 修复：PlayStats 重复 CSS 清理
- 新增：音乐时间线视图
- 新增：设置页独立为 SettingsPage
- 新增：均衡器、音频设备热切换、主色调提取
- 新增：useActionChain 动作链管理

### v1.0.6
- 新增「我喜欢」歌单 + 全局心形收藏
- 新增周报自动歌单
- 全页面动效统一
- 分隔线入场动效
- 歌词播放进度边框

## License

MIT
