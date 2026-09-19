# Rhizome

简约的本地音乐播放器 · Vue 3 + Electron

![预览 1](public/1.png)

![预览 2](public/2.png)

![预览 3](public/3.png)

![预览 4](public/4.png)

## 功能

### 音频
- 本地音频管理（MP3 / FLAC / WAV）
- 文件夹导入 & 批量扫描
- 封面提取
- 频谱可视化（播放栏实时频谱 + 全屏频谱页）
- AB 循环播放

### 歌词
- 内嵌 LRC 歌词解析 & 显示
- 侧车 .lrc / .txt 歌词支持
- 桌面歌词（置顶透明窗口，可锁定拖拽、调整字号与对齐）
- 歌词取景框边框 + 播放进度边框动效
- 歌词延迟调节（±2000ms，5ms 精度）
- 桌面歌词背景透明度可调
- `Ctrl+'` 全局切换桌面歌词

### 播放
- 五种播放模式：列表 / 列表循环 / 单曲循环 / 单曲 / 随机（Fisher-Yates 伪随机不重复）
- 进度条拖拽 & 滚轮微调 & AB 循环右键设点
- Media Session 系统控件集成
- 音频设备路由（热切换 & 热插拔检测）

### 歌单
- 自定义歌单（创建 / 编辑 / 排序 / 多选操作）
- 「我喜欢」固定歌单，全局心形按钮一键收藏
- 智能歌单（每周 / 每月 / 每年自动生成「最爱」+「发现」）
- 歌单内拖拽排序 & 数字序号排序
- 删除确认（次数可配 1/2/3，按钮脉冲反馈）

### 统计 & 报告
- 听歌统计（总次数 / 歌曲数 / 时长 / 最爱歌手 / 排行）
- 播放记录 PNG 报告生成（卡片式排版，2x 分辨率，可设保存路径）
- 定时报告：周报 / 月报 / 年报 / 今日报告

### 数据
- 听歌日记 — 横向卡片时间线，每天精选三首歌
- 音乐时间线 — Canvas 绘制播放记录站点
- 播放历史恢复后保留元数据（缺失文件灰色删除线标记）
- 数据备份与恢复（含歌单、历史、播放记录、偏好设置）

### 界面
- 主题：暗色 / 亮色可切换，启动即恢复上次选择
- 动画方案：「经典」/「华丽」两套可切换（华丽为更慢的动效节奏与更繁复的装饰）
- 全屏频谱页 — 封面模糊背景 + 左右竖直柱频谱 + 当前一句歌词，进入/退出走几何重构转场
- Rhizome 风格启动动画（锁链、星环、符文、多层光环）
- 设置页选项卡布局（系统选项 / 外观 / 快捷键 / 动作链）
- 全页面精密组装入场动效 & 列表项 stagger 交错延迟
- 当前播放歌曲反色高亮 & 缺失文件灰色标记
- 拖拽排序 spring 弹性反馈
- 删除按钮脉冲加速动效

### 系统
- 全局快捷键（可自定义，本地 + 全局双通道）
- 动作链（5 组可编程快捷键序列，Alt+1~5 触发）
- 屏保（空闲自动触发，时间可配 1-60min，复刻启动动画）
- 开机自启
- 系统托盘增强控制（播放/暂停/上下曲/歌词开关）
- UI 互动音效（点击 / 连点递进 / 快捷键 / 光标悬停 / 长按提示）
- 调试日志开关（默认关闭，排查问题时可在设置页开启）

## 开发

```bash
npm install          # 安装依赖
npm run electron:dev # 启动开发（Vite + Electron）
npm run build        # 生产构建（Vite + electron-builder，输出 dist_electron）
npm test             # 运行测试（vitest）
npm run clean        # 清理构建产物与 Vite 缓存
npm run clean:app    # 清理应用数据（%APPDATA%\Rhizome）
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
| `Alt+1~5` | 触发动作链 |

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 桌面运行时 | Electron | 41 |
| 前端框架 | Vue（Composition API） | 3.5 |
| 构建 | Vite | 8 |
| 状态 | Pinia | 3 |
| 路由 | Vue Router | 4 |
| UI 组件 | Element Plus | 2.x |
| 音频元数据 | music-metadata | 11 |
| 测试 | vitest + happy-dom | 5 / 20 |
| 打包 | electron-builder | 24 |

## 结构

```
rhizome/
├── electron/                     # 主进程 & preload
│   ├── main.js                   # 窗口管理 / IPC / 托盘 / 全局快捷键
│   ├── preload.js                # 音频解析、文件 IO、备份恢复
│   ├── preload-lyrics.js         # 歌词窗口桥接
│   └── lib/
│       ├── lrc.cjs               # LRC 解析纯函数
│       └── logger.cjs            # 运行时文件日志（默认关闭）
├── src/                          # 渲染进程
│   ├── components/
│   │   ├── common/               # FavoriteButton / AboutModal / SelectModal
│   │   ├── lyrics/               # DesktopLyrics
│   │   ├── player/               # GlobalPlayer / ProgressBar / VolumeControl
│   │   │                         # SpectrumOverlay（频谱页）/ SpectrumTransition
│   │   └── splash/               # SplashOverlay（屏保动画）
│   ├── views/
│   │   ├── MainLayout.vue        # 主布局
│   │   └── player/               # 页面组件
│   │       ├── LocalMusic.vue    # 本地音乐
│   │       ├── MyPlaylist.vue    # 歌单列表
│   │       ├── PlaylistDetail.vue# 歌单详情
│   │       ├── AlbumDetail.vue   # 专辑 / 艺人详情
│   │       ├── PlayHistory.vue   # 播放历史
│   │       ├── PlayStats.vue     # 听歌统计
│   │       ├── SongDetail.vue    # 歌曲详情（含频谱页）
│   │       ├── MusicTimeline.vue # 音乐时间线
│   │       ├── DiaryPage.vue     # 听歌日记
│   │       └── SettingsPage.vue  # 设置
│   ├── stores/                   # Pinia（playerStore / localMusicStore / playlistStore）
│   ├── composables/              # 可复用逻辑（主题 / 动画方案 / 播放 / 歌词 / 频谱 / 歌单 / 报告 …）
│   ├── utils/                    # 纯函数（format / lyrics / song-factory / sort / report / play-count / auto-playlists）
│   ├── constants/                # 常量（storage-keys / defaults / themes / motion-schemes）
│   ├── assets/css/               # 全局样式（global-theme / motion-tokens / reset / global）
│   └── router/
├── public/                       # 静态资源（含启动动画音效与预览图）
├── index.html                    # 入口（含启动动画）
├── desktop-lyrics.html           # 桌面歌词窗口入口
└── package.json
```

## License

MIT
