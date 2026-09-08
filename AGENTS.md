# Rhizome Agent Guide

Rhizome v1.0.8：Windows 本地单机音乐播放器（Electron 桌面应用）。无后端、无数据库、无远程 API、无网络功能。
重构总纲：`docs/refactoring/master-plan.md`（一切改动的依据）；当前进度：`.ai/current-state.md`。

## 项目架构（现状）

```
Vue Renderer（src/：Views 13 个 .vue + Components 12 个 + App.vue）
    ↓ 直调
composables（18 个 use-*） / Pinia Stores（3 个）
    ↓ window.electron（preload 经 contextBridge 暴露 ~38 方法；现状组件/store 仍直调）
IPC ~34 通道（24 个 handle + 10 个 on；通道名字符串散落在 main/preload，规划收敛至 electron/ipc-channels.js）
    ↓
Electron Main（electron/main.js 691 行单文件：窗口 / 托盘 / 全局快捷键 / 桌面歌词窗口 / JSON 持久化）
    ↓
OS / 文件系统（音频文件、userData/data/*.json）
```

渲染层零 Node API：`contextIsolation: true` / `nodeIntegration: false`。

规划目标链路（master-plan §1，尚未实施）：

```
Component → composable/store → services → gateway → preload → IPC(常量) → main → OS/FS
```

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 桌面运行时 | Electron | 41 |
| 前端框架 | Vue（Composition API） | 3.5 |
| 构建 | Vite（dev 端口 9000，双入口 index.html + desktop-lyrics.html） | 8 |
| 状态 | Pinia | 3 |
| 路由 | Vue Router（hash 模式） | 4 |
| UI 组件 | Element Plus（unplugin 自动导入） | 2.x |
| 音频元数据 | music-metadata（main + preload 各有一份调用） | 11 |
| 测试 | vitest + happy-dom | 5 / 20 |
| 打包 | electron-builder（NSIS，Windows，输出 dist_electron） | 24 |

## 目录结构

```
src/
├── views/               # MainLayout / NotFound + player/ 下 11 个（index.vue 为容器 + 10 页面）
├── components/          # common / demo / lyrics / player / splash（SplashOverlay 即屏保）
├── composables/         # 18 个 use-*.js + demo/（engine.js、script.js）
├── stores/              # playerStore / localMusicStore / playlistStore
├── constants/           # storage-keys.js（键注册表）、defaults.js（快捷键/EQ/播放模式等默认值）
├── utils/               # format.js / lyrics.js / song-factory.js（均带测试）
├── router/              # hash 路由表
├── desktopLyrics.js     # 桌面歌词窗口渲染入口（挂载 DesktopLyrics.vue）
├── services/            # 【规划】Phase 3：唯一允许出现 window.electron 的应用服务层
└── domain/              # 【规划】Phase 6：纯业务纯函数（shuffle / play-mode 等），不建实体类
electron/
├── main.js              # 691 行单文件（Phase 8 再考虑拆分）
├── preload.js           # ~283 行：contextBridge API + ~150 行解析业务（Phase 4 迁移）
├── preload-lyrics.js    # 歌词窗口专用桥接（22 行）
├── lib/lrc.cjs          # parseLRC 纯函数（已从 preload 迁出，vitest 直测）
└── ipc-channels.js      # 【规划】Phase 2：通道常量单一声源（CJS，main+preload require）
docs/
├── refactoring/master-plan.md   # 重构总纲（勿改）
├── project-overview.md / architecture.md / electron.md / ipc.md / smoke-checklist.md
└── decisions/ADR-001-lightweight-layering.md
.ai/current-state.md      # 会话间接力：当前 Phase / Task / 测试与构建状态
```

## 核心约束

1. 不要随意修改 localStorage key
2. 不要创建第二个全局 Audio 实例
3. 播放状态统一通过 playerStore 管理
4. 修改 IPC 时必须同时检查 main/preload/renderer
5. 修改歌词系统时必须检查独立歌词窗口
6. 修改播放器核心时必须检查 Media Session
7. 不要为了一个 UI 修改重构整个 Store
8. 不要修改与任务无关的文件

## 工作流程

1. 先分析
2. 列出受影响文件
3. 给出修改计划
4. 执行修改
5. Build
6. 检查 diff
7. 汇报修改内容

## Electron 规则

1. **单 Audio 实例**：全局唯一的 `Audio` 对象在 playerStore 的 `playGlobalSong` 中创建与销毁，任何拆分/重构不得产生第二个全局 Audio。
2. **桌面歌词机制五要素不得简化或合并**（见 docs/electron.md）：`desktop-lyrics-ready` 握手、歌词窗口本地 rAF 插值、行切换校正（行索引变化推送 + 2 秒周期同步）、lock 状态文件（desktop-lyrics-lock.json）、三路状态恢复（补发最后一次歌词数据 + 补发锁定状态 + 重申 alwaysOnTop）。
3. **安全边界**：保持 `contextIsolation: true` / `nodeIntegration: false` 与渲染层零 Node API；`webSecurity: false` 是已知问题（Phase 5 处理），新代码不得扩大对它的依赖。
4. **关窗 = 隐藏**：主窗口 close 事件被拦截转为 hide（托盘常驻），退出走托盘菜单"退出"。
5. 修改歌词系统时必须检查独立歌词窗口（preload-lyrics.js + desktop-lyrics.html + DesktopLyrics.vue 一条链）。

## 测试规则

- 命令 `npm test`（= `vitest run`）。现状：5 个测试文件，81 passed + 1 todo。
- **新纯函数必须带测试**；修改已有纯函数先跑测试，全绿才算完成。
- 行为锚点原则：测试断言"现状行为如此"，不是"理想行为如此"；重构时测试不改断言即通过才等价成立。
- 纯函数放 `electron/lib/*.cjs`（main/preload 共用，vitest 可直测）或 `src/utils/`（规划中业务纯函数放 `src/domain/`）。
- 修改播放器核心时必须检查 Media Session：renderer 侧 `navigator.mediaSession` 是生效路径，main 侧 `media-update` 通道已死。

## Storage 规则

- localStorage key 一律经 `src/constants/storage-keys.js` 引用，禁止硬编码字符串（已知逃逸点：SongDetail.vue 的 `'playCountReal'`，Phase 1 清理）。
- 不随意修改 key 字符串值；新 key 必须登记进 `ALL_STORAGE_KEYS`（详见 docs/electron.md 的键注册表说明）。
- 已迁移到 userData JSON 的数据（音乐路径/文件夹、桌面歌词位置/锁定）主存储是 JSON 文件，localStorage 仅回退兼容；不得改动迁移路径 `localMusicStore.migrateIfNeeded`。
- preload 的 `BACKUP_KEYS` 与 storage-keys.js 是手工双写（Phase 2 改机械推导 + 一致性测试），改任一侧必须同步另一侧。
- RHZ-K1：`rhizome-desktop-lyrics-bg` 与 `rhizome-idle-timeout` 尚不在 `ALL_STORAGE_KEYS`/备份范围，待裁决，不得擅自补入。

## Git 规则

- 语义化 commit 前缀：`test` / `fix` / `refactor` / `docs` / `chore` / `perf`。
- 一 commit 一意图；阶段内每个任务独立 commit、可独立 `git revert`；单 commit 控制在可审查规模。

## 禁止事项（摘要，全文见 master-plan §2）

- 全周期红线：安全配置现状、单 Audio 实例、桌面歌词时序机制、localStorage→JSON 迁移路径、所有 storage key 字符串值与存活 IPC 通道名（Phase 2 只集中定义不改名）、Electron/Vue/Vite/Pinia/Router 版本、行为语义（随机模式 prev 沿 shuffle 序列回退、30 秒收听阈值计历史、关窗=隐藏、托盘行为、Media Session renderer 侧为生效路径）。
- 阶段冻结（对应 Phase 到位前不得"顺手"修改）：preload 解析业务（P4）、`webSecurity: false`（P5）、playerStore 内部结构（P6）、6 个 >600 行巨型组件（P7）、main.js 单文件结构（P8）。
- 新增依赖仅限 vitest / happy-dom（已安装），其余一律需 ADR 论证。
- 不修改与任务无关的文件（核心约束 8）。

## AI Agent 工作流程

1. **恢复上下文**：读 `docs/refactoring/master-plan.md` + `.ai/current-state.md`，无需重新审计全库。
2. **按任务卡执行**：只改任务卡 Allowed files 列出的文件；先分析、列受影响文件、给计划，再动手。发现以下情况立即停手上报：实现正确但测试失败、需触碰清单外文件、现有代码与规格描述不符、涉及红线区域的改动诱惑、build 因无关原因失败。
3. **报告格式**：变更文件列表；新增/运行的测试及结果；与规格的偏差清单（零偏差也要写"无"）。未经任务卡要求不执行 git commit。
