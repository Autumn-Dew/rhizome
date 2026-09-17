# Rhizome 项目概览

> 面向新 AI Agent / 新维护者的入口文档。更多细节见 docs/architecture.md、docs/electron.md、docs/ipc.md。

## 项目定位

Rhizome v1.0.82 是一个 **Windows 本地单机音乐播放器**（Electron 桌面应用），主打无损音频、桌面歌词与频谱可视化。

- 无后端、无数据库、无远程 API、无网络上传下载功能（重构审计已否定旧任务书中的 Spring Boot 描述）。
- 数据全部落在本机：localStorage（偏好/历史/歌单）+ `%APPDATA%/Rhizome/data/*.json`（音乐路径、桌面歌词位置/锁定）。
- 作者 AutumnDew，MIT License。

## 功能列表（摘自 README.md）

- **音频**：本地音频管理（MP3 / FLAC / WAV）；文件夹导入 & 批量扫描；封面提取；频谱可视化；AB 循环播放。
- **歌词**：内嵌 LRC 解析显示；侧车 .lrc / .txt 支持；桌面歌词（置顶透明窗口，可锁定拖拽、调整字号与对齐、背景透明度可调）；歌词取景框边框 + 进度动效；歌词延迟调节（±2000ms，5ms 精度）；`Ctrl+'` 全局切换桌面歌词。
- **播放**：列表 / 循环 / 单曲循环 / 单曲 / 随机（Fisher-Yates 伪随机不重复，prev 沿 shuffle 序列回退）；进度条拖拽 & 滚轮微调 & AB 循环右键设点；Media Session 系统控件集成；音频设备路由（热切换 & 热插拔检测）。
- **歌单**：自定义歌单（创建 / 编辑 / 排序 / 多选）；「我喜欢」固定歌单；智能歌单（每周生成「本周最爱」「每周发现」，保留最近 4 期）；拖拽排序；删除确认（次数可配 1/2/3）。
- **统计 & 报告**：听歌统计（总次数 / 歌曲数 / 时长 / 最爱歌手 / 排行）；播放记录 PNG 报告（可设保存路径）；定时报告（周 / 月 / 年 / 今日）。
- **数据**：听歌日记；音乐时间线（Canvas 绘制播放记录）；播放历史恢复后保留元数据（缺失文件灰色删除线）；数据备份与恢复。
- **界面**：暗色 / 亮色主题；Sdorica 风格启动动画；设置页选项卡布局；入场动效 & stagger；当前播放歌曲反色高亮。
- **系统**：全局快捷键（可自定义，本地 + 全局双通道）；动作链（Alt+1~5 触发 5 组可编程序列）；屏保（空闲触发，1-60min 可配）；开机自启；系统托盘增强控制（播放/暂停/上下曲/歌词开关/音量）。

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 桌面运行时 | Electron | 41 |
| 前端 | Vue 3（Composition API）+ Element Plus | 3.5 / 2.x |
| 状态 | Pinia | 3 |
| 路由 | Vue Router（hash） | 4 |
| 音频元数据 | music-metadata | 11 |
| 构建 | Vite + electron-builder（NSIS） | 8 / 24 |
| 测试 | vitest + happy-dom | 5 / 20 |

## 命令

```bash
npm install           # 安装依赖
npm run electron:dev  # 开发：concurrently 启动 Vite(9000 端口) + wait-on 后启动 Electron
npm run build         # 生产构建：vite build && electron-builder（NSIS 安装包 → dist_electron/）
npm test              # 测试：vitest run（现状 81 passed + 1 todo）
npm run clean         # 清理 dist / dist_electron / node_modules/.vite
npm run clean:app     # 清理 %APPDATA%/Rhizome（应用数据，慎用）
```

打包产物：`dist_electron/Rhizome Setup <版本>.exe`（NSIS，可选安装目录，创建桌面/开始菜单快捷方式）。asar 开启，打包内容仅 `electron/**` 与 `dist/**`。

## 文档索引

| 文档 | 内容 |
|---|---|
| docs/refactoring/master-plan.md | 重构总纲：目标架构、Phase 0-8、红线、协作协议 |
| docs/architecture.md | 现状调用链、分层差距、模块行数清单 |
| docs/electron.md | main / preload 职责、安全配置、桌面歌词机制、持久化 |
| docs/ipc.md | IPC 通道全表、window.electron 方法面、死通道 |
| docs/smoke-checklist.md | 手工冒烟清单（每个 Phase 收尾跑一遍） |
| docs/decisions/ADR-001-lightweight-layering.md | 轻量分层决策 |
| .ai/current-state.md | 当前 Phase / Task / 测试构建状态（会话间接力） |
