# Rhizome Refactoring Master Plan

**版本**：v1.0（基于 2026-09-08 全项目审计，任务书依据 = 已实测代码）
**性质**：后续所有 Agent（GLM-5.3 / GLM-5.3-Flash）执行重构的总纲。

---

## 1. 最终目标架构

以实际代码为准的轻量分层，**不引入后端、不建过度抽象**：

```
rhizome/
├── src/
│   ├── components/          # UI（含逐步拆分后的子组件）
│   ├── views/               # 页面
│   ├── composables/         # UI 行为复用（现状保留）
│   ├── stores/              # 状态容器：只管状态与状态协调
│   ├── services/            # 【新】应用服务层：全项目唯一允许出现 window.electron 的地方
│   ├── domain/              # 【新】可独立测试的纯业务逻辑（shuffle、play-mode、歌词合并）
│   ├── utils/               # 轻量工具（format 等现状保留）
│   ├── constants/           # storage-keys.js 等注册表
│   └── router/
├── electron/
│   ├── main.js              # 渐进拆为 windows/ tray/ shortcuts/ ipc/ persistence/（最后做）
│   ├── preload.js           # 演进目标：thin bridge
│   ├── preload-lyrics.js
│   ├── ipc-channels.js      # 【新】通道名单一声源（main + preload 共用，CJS）
│   └── lib/lrc.cjs          # 【新】LRC 解析纯函数（preload 现逻辑迁出，可被 vitest 直测）
└── docs/ + .ai/current-state.md + AGENTS.md
```

目标调用链（终态）：

```
Vue Component → composable/store → services/ → preload API → IPC(常量) → main → OS/FS
```

**关键设计判断（基于实测构建边界，不是猜测）**：

1. **IPC 通道常量只需覆盖 electron/ 侧**。Renderer 从不写通道名——它调用的是 `window.electron.selectAudioFiles()` 这类方法名，通道字符串只出现在 main.js 与 preload.js 中，两者都是**不被 Vite 打包的纯 CommonJS 运行时文件**（`package.json` 无 `"type": "module"`，`main: electron/main.js`，builder `files: electron/**`）。因此一个普通的 `electron/ipc-channels.js`（CJS `module.exports`）被两边 `require()` 即可，**零构建魔改、零跨边界问题**。Renderer 无需也不应 import 它。
2. **storage-keys 的 preload 同步问题**（现 `BACKUP_KEYS` 手工双写）：`src/constants/storage-keys.js` 是 ESM，preload 是 CJS，无法直接 require。映射规则经核验是**纯机械的**（`rhizome-x-y → rhizome_x_y`；非 rhizome 前缀键 JSON 名 = 原键名）。推荐方案：preload 内改为"键列表 + 机械推导函数"，键列表放 `electron/storage-keys.cjs` 镜像，并用 **vitest 一致性测试**（断言镜像 == `src/constants/storage-keys.js` 的 `ALL_STORAGE_KEYS`）替代现在注释里"保持同步"的口头约定。备选方案是 preload 动态 `import()` ESM——运行时可行但引入异步时序复杂度，**不推荐**。风险：镜像仍是两份文件，但由测试强制同步，违反即 CI 红。
3. **`domain/` 只放值得独立测试的纯函数**（shuffle、LRC、play-mode 轮转、歌词合并），不建实体类、不建接口层。当前规模下 Domain = 纯函数模块，这是刻意选择（对应 ADR-001）。

---

## 2. 重构原则

### 什么应该改
实测确认的 15 项技术债务（审计报告 §13）：死代码/死通道/死依赖、双注册 bug、BACKUP_KEYS 双写、preload 业务、无服务层、巨型组件、playerStore 多职责、webSecurity、空 catch、无退订、硬编码 key、重复映射、零测试、无文档、无语义 commit。

### 什么暂时不动（有明确后续 Phase 负责）
| 对象 | 负责阶段 |
|---|---|
| preload 内 ~150 行解析业务 | Phase 4 |
| `webSecurity: false` | Phase 5（RHZ-security-001） |
| playerStore 内部结构 | Phase 6（先测试后拆） |
| 6 个巨型组件 | Phase 7 |
| main.js 单文件结构 | Phase 8 |

在对应 Phase 之前，任何任务（含 Flash）不得"顺手"修改这些区域。

### 绝对不能动（全周期红线）
1. `contextIsolation: true` / `nodeIntegration: false` 及 Renderer 零 Node API 现状。
2. **全局单 Audio 实例**。任何拆分不得产生第二个全局 Audio。
3. 桌面歌词时序机制：`desktop-lyrics-ready` 握手、rAF 插值、行切换校正、lock 状态文件、三路状态恢复——不简化、不合并。
4. localStorage → userData JSON 的既有迁移路径（`migrateIfNeeded`）。
5. **所有 storage key 的字符串值**与所有存活 IPC 通道名（Phase 2 只集中定义，不改名）。
6. Electron 41 / Vue 3 / Vite 8 / Pinia 3 / Router 4 版本。
7. 行为语义：随机模式 prev 沿 shuffle 序列回退、30 秒收听阈值计历史、关窗=隐藏、托盘行为、Media Session 双路径中 renderer 侧为生效路径。

### 修改纪律
- 每个阶段独立 commit、可独立 `git revert`；单 commit 控制在可审查规模。
- 每次涉及 Electron 三方（main/preload/renderer）任一侧的契约修改，必须三方同查（AGENTS.md 约束 4）。
- 新增依赖仅限：`vitest`、`happy-dom`（devDependencies，测试策略所必需），其余一律需 ADR 论证。

---

## 3. Phase 0 ～ Phase 8

### Phase 0：工程底座（文档 + 测试 + 计划落盘）

| 项 | 内容 |
|---|---|
| 目标 | 让后续一切重构有行为锚点与事实文档；不改任何运行时行为 |
| 修改范围 | 新增：`vitest` + `happy-dom` 配置；`electron/lib/lrc.cjs`（从 preload.js:53-77 **原样搬移** `parseLRC`，preload 改为 require）；`docs/`（project-overview / architecture / electron / ipc / testing）；重写 `AGENTS.md`；`.ai/current-state.md`；落盘本计划；ADR-001（轻量分层、无后端）；`docs/smoke-checklist.md`（手工冒烟清单：播放/暂停/上下曲/四种模式/进度/音量/托盘/桌面歌词/备份恢复/设置页） |
| 风险 | 极低。唯一运行时接触点是 `parseLRC` 搬移——逐字节搬移 + 下方测试锚定 |
| 前置条件 | 本计划获确认 |
| 测试要求 | 第一批纯函数测试：`parseLRC`（offset 标签、2/3 位毫秒、ti/ar/al 元数据行跳过、排序）、`resolveLyrics`（synced 优先、原始行回退 999999、同时间戳合并）、`createSongFromMeta`（字段映射全表）、`formatTime`、storage-keys 一致性（`ALL_STORAGE_KEYS` 无重复、命名规范） |
| 完成标准 | `npx vitest run` 全绿；`npm run build` 成功；应用手工冒烟清单通过；`parseLRC` 在 preload 中不再有副本 |
| Commit 建议 | `test: add vitest foundation with pure function coverage` ／ `refactor: extract parseLRC to shared CJS module` ／ `docs: rewrite AGENTS.md and add architecture docs` |

### Phase 1：零行为清理 + bug 修复

| 项 | 内容 |
|---|---|
| 目标 | 删除死物、修复确证 bug，降低全库认知负担；行为不变 |
| 修改范围 | ① 删 8 个死 IPC 通道/死 API：`find-sidecar-cover`(main.js:553, preload.js:270)、`getAudioCover`(520)、`media-update`(561)、`media-play/pause/prev/next` 四个 handle(577-588)、`global-player-stop` 发送(65)、`app-quit` handle(485)、preload 的 `readLocalLrc`/`getFileMtime`(259/267)。**逐项先 grep 确认零引用再删**。② 修复 `update-global-shortcuts` 双注册 + 重复守卫（main.js:622-627）。③ 托盘点击补 `win?.` 防护（main.js:83）。④ 删依赖 `dayjs`、`flac-metadata`、`jsmediatags`、`music-metadata-browser`（均已实测零引用）。⑤ 删根目录死文件 `mock-diary-data.js`。⑥ 消除硬编码 storage key（`SongDetail.vue:214` 的 `'playCountReal'` → `K_PLAY_COUNT_REAL`，另全库 grep `localStorage.getItem/setItem` 找出全部逃逸点）。⑦ `localMusicStore.initFromStorage:47-67` 改用 `createSongFromMeta`——**先补字段对比测试**，已知差异：手写版 `durationFormat` 回退 `'00:00'`，工厂版回退 `formatTime(duration)`，属可接受的微改进，需在 commit message 声明 |
| 风险 | 低。唯一非严格零行为项是 ⑦ 的 durationFormat 回退改进 |
| 前置条件 | Phase 0 |
| 测试要求 | ⑦ 的映射对比测试先行；完成后全量 vitest + build + 冒烟清单 |
| 完成标准 | 全库 grep 无死通道名；`npm ls` 无四个死依赖；测试全绿 |
| Commit 建议 | `fix: prevent duplicate global shortcut registration` ／ `chore: remove dead ipc channels and unused dependencies` ／ `refactor: use song-factory in localMusicStore` ／ `refactor: replace hardcoded storage keys with registry constants` |

### Phase 2：IPC 契约统一 + Storage 单一声源

| 项 | 内容 |
|---|---|
| 目标 | 通道名与备份键各只有一个事实来源；preload 订阅可退订 |
| 修改范围 | ① 新建 `electron/ipc-channels.js`（CJS），main.js / preload.js 全部改为引用常量，**通道名字符串值不变**；② `electron/storage-keys.cjs` 镜像 + preload `BACKUP_KEYS` 改为机械推导（规则见 §1.2）；③ vitest 一致性测试：镜像 == `ALL_STORAGE_KEYS`、推导结果 == 现 BACKUP_KEYS 映射表（快照）；④ preload `on*` 九个订阅改为返回取消函数（纯增量 API）；⑤ 新增 grep 守卫脚本：main/preload 中除 ipc-channels.js 外不得出现通道名字符串字面量 |
| 风险 | 低——纯等价替换，由测试与快照锚定 |
| 前置条件 | Phase 1（死通道已清，常量表更小更准） |
| 测试要求 | 一致性测试 + 推导快照测试 + 冒烟清单（重点：托盘、桌面歌词、快捷键、媒体键） |
| 完成标准 | 常量文件外零通道字符串；备份/恢复实测一轮 |
| Commit 建议 | `refactor: centralize ipc channel definitions` ／ `refactor: derive backup keys from storage key registry` ／ `feat: preload event subscriptions return unsubscribe` |

### Phase 3：services 层（Renderer 边界）

| 项 | 内容 |
|---|---|
| 目标 | 组件/store 不再直调 `window.electron`，47 处调用收敛到服务层；保留浏览器回退语义 |
| 修改范围 | 新建 `src/services/`：`electronGateway.js`（唯一接触 `window.electron` 的模块，保留 `?.` 防护与 null 回退）、`musicService`（选文件/选文件夹/parseAudio/路径与文件夹持久化）、`windowService`（窗口控制/托盘/桌面歌词显示与更新）、`systemService`（自启/快捷键/报告/清数据）、`backupService`。逐文件迁移 12 个调用方（MainLayout 18 处、SettingsPage 8 处、LocalMusic 5 处、DesktopLyrics 4 处、useShortcuts 3 处、其余各 1-2 处）——**每文件独立 commit** |
| 风险 | 中：触面广但机械。最大陷阱是丢失 `?.` 回退语义——gateway 统一封装后反而更安全 |
| 前置条件 | Phase 0（测试底座）；建议 Phase 2 之后（electron 侧先稳定） |
| 测试要求 | gateway 单测（无 `window.electron` 环境下不抛错、返回 null）；每迁移一个文件跑冒烟对应功能 |
| 完成标准 | `grep "window.electron" src` 仅命中 `electronGateway.js`；全部冒烟通过 |
| Commit 建议 | `refactor: add electron gateway service` ／ `refactor: migrate MainLayout to windowService` ／ …（每文件一条） |

### Phase 4：preload 瘦身——元数据解析迁入 main（GLM-5.3 亲自执行）

| 项 | 内容 |
|---|---|
| 目标 | preload 成为 thin bridge；解析业务归位 main 进程 |
| 修改范围 | `music-metadata` 解析、封面提取（含消除 main/preload 双实现，`COVER_NAMES`/`MIME_MAP` 收敛为一份）、歌词提取从 preload.js 迁入 main（复用 Phase 0 的 `lib/lrc.cjs`）；`parseAudio` 变为 IPC invoke 通道 |
| 风险 | **高**。① 并发模型改变：现 25 并发解析在 preload（渲染侧），迁入后走 IPC 序列化；② 封面 base64 大负载跨进程传输开销。**启动性能可能劣化——若实测劣化不可接受，保留 preload 实现并出 ADR 记录结论，此为允许的"不动"结局** |
| 前置条件 | Phase 0（LRC 测试）、Phase 2（通道常量）；**性能基线先行**：instrumentation 记录当前 500+ 曲库冷启动解析总耗时 |
| 测试要求 | 解析结果等价测试（同一文件集，迁移前后 `parseAudio` 输出深度对比）；启动耗时对比报告写入 ADR-004 |
| 完成标准 | 打包版实测：曲库加载、封面、歌词、FLAC/MP3/WAV 全通过且耗时不劣于基线 +10%；preload.js ≤ 100 行 |
| Commit 建议 | `refactor: move cover extraction to main` ／ `refactor: move metadata parsing behind ipc` ／ `docs: ADR-004 metadata process placement` ／ `perf: batch parseAudio ipc calls` |
| 回滚 | 见 §8 |

### Phase 5：RHZ-security-001 —— 移除 `webSecurity: false`（GLM-5.3 亲自执行）

| 项 | 内容 |
|---|---|
| 目标 | 用自定义协议替代关闭 webSecurity |
| 修改范围 | `protocol.handle` 注册安全协议（限定音频/图片扩展名、路径约束在用户选择的文件范围），Audio src 与封面 src 改走新协议；**保留开关常量**，验证矩阵全绿后的下一个 commit 才删除 `webSecurity: false` 与开关 |
| 风险 | 高：协议在 dev（localhost:9000）与 packaged（file://）两模式下行为不同；Windows 路径、中文/空格路径、无损大文件流式读取均需覆盖 |
| 前置条件 | Phase 2；与 Phase 4 无强依赖但建议其后（封面交付方式已定型） |
| 测试要求 | 验证矩阵：{开发环境， 打包环境} × {本地音频播放， 封面显示， 桌面歌词， 频谱} × {MP3, FLAC, WAV} × {中文路径， 空格路径}；外加越权访问测试（协议拒绝访问白名单外路径） |
| 完成标准 | 矩阵全绿；`webSecurity: false` 从代码中消失；ADR-005 记录方案与放弃项 |
| Commit 建议 | `feat: register secure media protocol` ／ `fix: remove webSecurity false after protocol verification` ／ `docs: ADR-005 custom protocol` |

### Phase 6：playerStore 渐进拆分（GLM-5.3 设计 + 审查）

| 项 | 内容 |
|---|---|
| 目标 | 七职责归位，**store 对外返回 API 完全不变**（组件零改动） |
| 修改范围 | 先行补齐行为测试（见测试矩阵），再抽：`domain/shuffle.js`（Fisher-Yates + 首曲防重 + prev 回退语义）、`domain/play-mode.js`（轮转）、playback engine（Audio 生命周期唯一持有者——**单实例红线的执行点**）、persistence（playerState/历史/播放次数经 service）、mediaSession adapter、托盘推送经 windowService。playerStore 变为组合这些模块的 facade |
| 风险 | 高：Audio 生命周期、切歌状态重置序列、watch 副作用时序（30 秒阈值）都易碎 |
| 前置条件 | Phase 1 的 store 行为测试 + Phase 3（services 就位） |
| 测试要求 | 见测试矩阵"播放器核心"整组；拆分前后测试全绿即行为锚点成立 |
| 完成标准 | 全部既有测试不改动一行断言即通过；冒烟清单全绿；ADR-006 |
| Commit 建议 | `test: add player store behavior coverage` ／ `refactor: extract shuffle and play-mode to domain` ／ `refactor: extract playback engine from playerStore` ／ `refactor: route persistence and tray push through services` |

### Phase 7：巨型组件按职责拆分（GLM-5.3 定策略，Flash 执行）

| 项 | 内容 |
|---|---|
| 目标 | 认知成本下降，不是文件数上升 |
| 修改范围与顺序（由低风险到高） | ① `PlaylistDetail.vue`(596) → ② `SettingsPage.vue`(619，天然按设置分区切) → ③ `MusicTimeline.vue`(733) → ④ `LocalMusic.vue`(1106 → SongList/AlbumGrid/ArtistGrid/FolderStrip + 拖拽重排逻辑入 composable) → ⑤ `SongDetail.vue`(1164 → SongInfo/LyricsPanel/Spectrum + 歌词进度 RAF 入 composable) → ⑥ `MainLayout.vue`(684，最后做：窗口编排 + 桌面歌词推送，**只拆 UI 区块，桌面歌词推送数据流不动**） |
| 风险 | 中；MainLayout 单独标高 |
| 前置条件 | Phase 3；⑤ 依赖 Phase 6（SongDetail 直读 `playerStore.audio?.currentTime`，facade 保持该暴露） |
| 测试要求 | 每个组件拆分前，先为将被抽取的纯逻辑/composable 补测试；拆分后冒烟该页面全部交互 |
| 完成标准 | 每组件一条独立 commit；模板与交互行为肉眼/冒烟等价 |
| Commit 建议 | `refactor: split SettingsPage into sections` 等，一组件一 commit |

### Phase 8：main.js 模块化（可选，最后）

Phase 4 完成后 main 已含 metadata/persistence 雏形，此时按 `windows/ tray/ shortcuts/ ipc/` 拆分才顺理成章。若 Phase 4-7 后 main.js 已降至可维护规模，**可依据"不为重构而重构"原则取消本阶段**——完成一次 ADR 记录决定即可。

---

## 4. 阶段依赖关系

```
P0 ──→ P1 ──→ P2 ──→ P3 ──→ P6(playerStore) ──→ P7(组件: SongDetail/MainLayout)
 │                     │
 │                     ├──→ P4(preload迁移) ──→ P8(main拆分,可选)
 │                     └──→ P5(webSecurity)
P7(PlaylistDetail/SettingsPage/MusicTimeline/LocalMusic) 仅依赖 P3，可与 P4/P5/P6 并行
```

硬约束：P4/P5/P6 的**实施**必须串行（都动 electron 核心或播放核心，并行会互相污染验证结果）；P7 的前四个组件可与它们并行推进。

---

## 5. Flash 可直接执行的任务（精确规格后派发）

共同特征：范围封闭、判定标准明确、失败模式可见、不触碰红线清单。

| 任务卡 | 前置 | 需 GLM-5.3 先产出的规格 |
|---|---|---|
| T-F01 vitest 底座 + 纯函数测试（parseLRC/resolveLyrics/createSongFromMeta/formatTime/storage-keys 一致性） | P0 确认 | 每函数的用例清单（含边界：offset 负值、3 位毫秒、空歌词、同时间戳合并） |
| T-F02 parseLRC 搬移至 `electron/lib/lrc.cjs` | T-F01 | 搬移步骤 + preload require 改法 |
| T-F03 文档四件套 + AGENTS.md 重写 + current-state.md + ADR-001 | P0 确认 | 基于审计事实的文档大纲与关键结论清单 |
| T-F04 死通道/死 API/死依赖/死文件清理 | P1 规格 | **逐项清单**（本计划 §3-P1 已是清单）+ 每项删除前 grep 验证命令 |
| T-F05 硬编码 storage key 全量替换 | P1 规格 | grep 命令 + 命中文件清单 + 映射表 |
| T-F06 ipc-channels.js 常量化三方替换 | P2 规格 | 常量表内容 + 替换点清单（main/preload 各自的行号级清单） |
| T-F07 BACKUP_KEYS 机械推导 + 镜像 + 一致性测试 | P2 规格 | 推导函数实现 + 快照基线 |
| T-F08 services 层逐文件迁移（每文件一张卡） | P3 规格 | gateway 代码 + 该文件全部调用点的旧→新映射 |
| T-F09 组件拆分执行（P7 ①-④） | P7 规格 | 职责切分图 + props/emits 契约 + 迁移顺序 |
| T-F10 每阶段收尾的 current-state.md / 文档更新 | 各阶段 | 阶段结果摘要 |

---

## 6. 必须由 GLM-5.3 亲自执行的任务

1. 各 Phase 的规格书与验收（上表右列全部）。
2. **ADR 全部**（ADR-001~006）——决策记录不可外包。
3. Phase 4 preload 搬迁全程（含性能基线测量与解读、"不可接受则保留现状"的判断）。
4. Phase 5 webSecurity/protocol 设计与验证矩阵执行。
5. Phase 6 playerStore 拆分设计与 facade 兼容性审查。
6. Phase 7 的 MainLayout 拆分（桌面歌词推送数据流耦合区）。
7. 一切触碰红线清单（§2"绝对不能动"）相邻区域的改动。
8. Flash 产出的 **diff 审查**（每任务卡验收时抽查关键 hunk，不重写实现）。
9. 任何"测试失败且 Flash 报告规格本身有误"的裁决。

---

## 7. 测试矩阵

| 功能 | 测试 | 建立阶段 | 验收标准 |
|---|---|---|---|
| LRC 解析（offset/毫秒位数/元数据行/排序） | `lib/lrc.cjs` 单测 | P0 | 用例清单全绿 |
| 歌词合并与回退（synced 优先/999999/同戳合并） | `utils/lyrics` 单测 | P0 | 同上 |
| song 对象映射 | factory 单测 + store 映射对比 | P0/P1 | 字段全表等价（durationFormat 回退差异显式声明） |
| storage key 注册表完整性 | 一致性测试 + 硬编码 grep 守卫 | P0/P2 | 无重复、无逃逸 |
| shuffle（首曲防重/全覆盖/prev 回退语义） | `domain/shuffle` 或 store 级测试（stub Audio + fake timers） | P1 补，P6 随迁 | 按现行为**原样**断言，包括"非标准"的 prev 语义 |
| next/prev/四模式轮转/single 不自进/singleLoop 重播 | store 行为测试 | P1/P6 | 同上 |
| 30 秒阈值计历史、同曲去重、30 条窗口/全量 1 万上限 | store 测试（fake timers） | P1 | 同上 |
| playerState 保存字段与 15s 定时/暂停即存 | store 测试 | P6 | 同上 |
| gateway 无 Electron 环境不抛错 | service 单测 | P3 | happy-dom 下 null 安全 |
| 通道常量零字面量 | grep 守卫 | P2 | 守卫通过 |
| 备份/恢复往返 + 推导映射 | 快照测试 + 手工实测 | P2 | 恢复后数据逐键相等 |
| parseAudio 迁移等价 | 前后输出深度对比脚本 | P4 | 同批文件输出全等 |
| 协议越权与格式矩阵 | 手工矩阵 + 越权测试 | P5 | §3-P5 矩阵全绿 |
| 全功能回归 | `docs/smoke-checklist.md` 手工清单 | 每 Phase | 全项通过 |

---

## 8. 回滚策略

- **通则**：一阶段多 commit、一 commit 一意图，任何阶段可 `git revert` 单点回退；重灾时 revert 整阶段区间。
- **P4**：迁移按"封面 → 歌词 → 元数据"分三个独立 commit，任一环节实测劣化即止步 revert，已验证的部分保留；性能不达标是**允许的终态**（ADR-004 记录"保留 preload 实现"结论），不视为失败。
- **P5**：`webSecurity: false` 的删除放在验证矩阵全绿之后的**独立 commit**，且协议代码带开关常量——线上发现问题只需 revert 最后一个 commit 即恢复旧加载路径，协议代码可留待修复。
- **P6**：facade 对外 API 不变是硬性完成标准，因此回滚 = revert 拆分 commits，组件层无任何连带修改。
- **P7**：一组件一 commit，坏一个回滚一个，组件间零耦合依赖（除 SongDetail 依赖 P6 的 facade 暴露，该暴露在 P6 验收时已锁定）。

---

## 9. AI Agent 协作协议

### GLM-5.3（额度 ~1.5M，集中用于不可替代的判断）
- 职责：§6 全部清单；每张 Flash 任务卡的**规格书**；Flash 产出的验收审查（读 diff + 跑测试，不重做）；ADR；阶段门槛裁决（放行/打回/终止）。
- 禁止：亲自批量写测试/文档/机械迁移（除非 Flash 两次执行失败后接管）。

### GLM-5.3-Flash（额度 ~3M，承担量）
- 职责：T-F01~T-F10。**只能修改规格书列出的文件**；只能做纯增量或规格明确的替换。
- **可自主决策**：测试用例的具体组织、变量命名、文档措辞、规格内实现细节的选择；发现规格笔误（如行号漂移）时按语义修正并在报告注明。
- **必须升级给 GLM-5.3**（立即停手）：① 实现正确但测试失败（= 行为假设有误）；② 需要触碰文件清单之外的文件；③ 发现与规格描述不符的现有代码；④ 任何涉及红线清单的改动诱惑；⑤ build 因无关原因失败；⑥ 对"行为等价"产生怀疑。
- 汇报格式：变更文件列表、新增/运行的测试及结果、与规格的偏差清单（零偏差也要写"无"）。

### 会话间接力
每阶段收尾由 Flash 执行 T-F10 更新 `.ai/current-state.md`（含"下一步是哪张任务卡"），任何新 Agent 会话从该文件 + 本计划恢复上下文，无需重新审计。

---

## 不确定性与推荐方案声明（不假装已确定）

1. **P4 并发模型**：25 并发 IPC invoke 是否被 main 进程串行化取决于 Electron 调度，未实测。推荐先做基线测量再迁移，结论写入 ADR-004；"保留 preload 实现"是预设的合法退路。
2. **storage-keys.cjs 镜像**仍是双文件，靠测试同步——这是权衡后的折中，不是完美单一声源；若未来 main 进程全面 ESM 化可升级为真单源。
3. **P7 MainLayout 的桌面歌词推送编排**是否值得抽 service，需在 P6 完成后看耦合实况再定，本计划不预设结论。
4. **P8 可能被取消**——"不为重构而重构"优先于目录美观。
