# ADR-001：采用轻量分层，不引入后端式架构

- **状态**：已接受（Accepted）
- **日期**：2026-09-08
- **决策者**：重构总纲（docs/refactoring/master-plan.md）确认，基于同日全项目审计
- **关联**：master-plan §1（最终目标架构）、§2（重构原则）

## 背景

Rhizome 是本地单机音乐播放器：无后端、无数据库、无远程 API、无网络功能（2026-09-08 审计确认，旧任务书中 Spring Boot 式描述已被否定）。全部状态在 localStorage 与 userData JSON 文件中，全部计算在 Electron main/renderer 两个进程内完成。

重构启动前需要先裁决代码组织方式：renderer 侧是否照搬后端式四层架构（Controller / Service / Repository / DTO），或引入更重的 Clean Architecture。

## 问题

现状：约 47 处 `window.electron` 调用散落在 12 个组件/composable 文件中；业务纯函数（shuffle、播放模式轮转、LRC 解析）内嵌在 playerStore 与 preload 里，不可独立测试。需要一个分层方案解决边界与可测性问题，但必须与"单机播放器"的实际规模匹配。

## 决策

采用**轻量分层**：

```
src/
├── components/  views/     # UI
├── composables/            # UI 行为复用（现状保留）
├── stores/                 # 状态容器：只管状态与状态协调
├── services/               # 【新】应用服务层：全项目唯一允许出现 window.electron 的地方
├── domain/                 # 【新】可独立测试的纯业务函数
├── utils/  constants/  router/
```

关键限定：**domain 只放值得独立测试的纯函数**（shuffle、play-mode 轮转、歌词合并等），**不建实体类、不建接口层、不引入 DI 容器、不引入事件总线**。跨进程边界收敛为一条链：`Component → composable/store → services → gateway → preload → IPC(常量) → main → OS/FS`。

## 理由

1. **技术决策优先级**（任务书）：正确性 > 稳定性 > 可维护性 > 可测试性 > 性能 > 代码美观。轻量分层在不引入新故障面的前提下解决最大的两个问题（window.electron 散落、纯函数不可测）。
2. **不为重构而重构**：单机应用没有 Repository/DTO 要抽象的对象——没有数据库、没有网络传输、没有多实现需要接口隔离。后端式四层只会增加文件数与间接层，不增加正确性。
3. **可测性收益集中在纯函数**：shuffle 首曲防重/prev 回退语义、LRC 解析、播放模式轮转是最易碎且最值得锚定的逻辑，做成纯函数后 vitest 直测即可，不需要类/接口/DI 才能测。
4. **边界收益集中在 services**：`grep "window.electron" src` 只命中 gateway 一个文件，回退语义（无 Electron 环境返回 null）统一封装，迁移可逐文件独立 commit。

## 放弃的方案

| 方案 | 放弃原因 |
|---|---|
| 完整 Clean Architecture（entities/usecases/adapters 层） | 无后端、无多实现，抽象成本 > 收益；违反"不为重构而重构" |
| Repository pattern + DTO | 没有数据库；localStorage/JSON 读写的"仓储"抽象只会复刻现结构 |
| DI 容器 | 无需要替换的多实现依赖；徒增启动时序与理解成本 |
| 事件总线（全局 pub/sub） | 现有数据流单向清晰（store + props/emits），事件总线会掩盖依赖方向 |
| 维持现状（不分层） | 47 处 window.electron 散落与纯函数内嵌使 P4/P6 重构无锚点，测试无法先行 |

## 影响

**正面**：

- 新增 `src/services/` 与 `src/domain/` 两个目录（Phase 3 / Phase 6 落地）。
- 纯业务函数集中、可被 vitest 直测（Phase 0 已先行：parseLRC 迁出至 electron/lib/lrc.cjs，16 例测试）。
- Electron 边界（含浏览器回退语义）单点收口，P3 之后组件/store 不再接触 window.electron。

**负面 / 代价**：

- services 是"唯一接触点"靠纪律 + grep 守卫维持，没有编译期强制。
- domain 与 utils 的归属判断存在灰色地带（如 format 留 utils、shuffle 进 domain），需在具体 Phase 中按"是否值得独立测试"裁决。
- 多一层间接（组件 → service → preload），单次阅读路径变长——以每文件 ≤ 一跳为限，不再加深。

## 后续 ADR 预告

master-plan 预留 ADR-004（元数据解析进程归属）、ADR-005（自定义协议）、ADR-006（playerStore 拆分），本 ADR 不预设其结论。
