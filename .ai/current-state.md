# Rhizome Current State

- 更新时间：2026-09-08
- 当前 Phase：0（工程底座）
- 当前 Task：T-F03（文档体系）——完成后 Phase 0 收尾
- 已完成：master-plan 落盘(4d07933)；vitest 底座+82测试(346b1f6)；parseLRC 迁出(5478dee)；文档体系(本次)
- 测试状态：npm test 全绿（81 passed + 1 todo）
- Build 状态：vite build PASS；electron-builder 未验证（Phase 0 收尾需跑一次 npm run build）
- 已知问题：见 master-plan §2 与本文档"未解决风险"
- 未解决风险：RHZ-K1（两 storage key 不在备份范围，待裁决）；webSecurity:false（Phase 5）
- 下一 Task：Phase 0 收尾（npm run build 验证 + 手工冒烟）→ Phase 1 T-F04（死代码清理）
- 禁止事项：Phase 1 前不得动 preload 业务/webSecurity/playerStore 内部/巨型组件

## 文档体系（本次 T-F03 产出）

- AGENTS.md：重写扩充入库（保留原 8 条核心约束与工作流程原文；新增技术栈/目录结构/Electron 规则/测试规则/Storage 规则/Git 规则/禁止事项/AI Agent 工作流程）。
- docs/project-overview.md：项目定位、功能列表、技术栈、命令。
- docs/architecture.md：现状调用链、分层差距、模块行数清单、已知问题索引。
- docs/electron.md：main/preload/preload-lyrics 职责、安全配置、桌面歌词五要素机制、托盘/快捷键/媒体键、userData/data/*.json 持久化。
- docs/ipc.md：34 个通道全表（8 个死通道标注待 P1 清理；get-user-music-dir 为孤儿通道，master-plan 清单未列，处置需先裁决）、window.electron 38 方法面、ipc-channels.js 规划。
- docs/smoke-checklist.md：手工冒烟清单（启动与窗口/播放核心/歌词/数据/设置五组，含预期表现）。
- docs/decisions/ADR-001-lightweight-layering.md：轻量分层决策（无后端式架构、domain 仅纯函数）。

## 与事实清单的核对说明

- IPC 通道实测 34 个（24 handle + 10 on），其中死通道 8 个；"~24 通道"为 handle 数量口径。
- 播放模式常量为 5 种（list / listLoop / singleLoop / single / random），README 写"四种"系旧文案；冒烟清单按 5 种覆盖。
