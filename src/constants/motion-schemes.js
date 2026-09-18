/**
 * Rhizome 动画方案注册表（多动画方案 / 多风格）。
 *
 * 设计：
 *  - 方案以「字符串 id」标识（K_MOTION 持久化存储 id）。
 *  - class 字段决定挂到 document.documentElement 上的 class；
 *    motion-tokens.css 中 `:root.motion-<class>` 块覆盖 `--motion-*` 变量；
 *    结构性动效（签名 keyframes）用 `[data-motion="<id>"]` / `.motion-<class>` 选择器切换。
 *  - classic 为默认方案（其参数即 motion-tokens.css 的 :root 原始值）。
 *
 * 新增方案只需在此列表加一项，并在 motion-tokens.css 增加对应覆盖块；
 * 结构性动效需在各组件按选择器补充。
 */
export const MOTION_SCHEMES = [
  { id: 'classic', label: '经典', class: 'motion-classic', desc: '克制简洁的默认动效' },
  { id: 'ornate',  label: '华丽', class: 'motion-ornate',  desc: '界面几何重构转场 + 更慢的动效节奏' },
]

export const DEFAULT_MOTION_ID = 'classic'

/** 按 id 取方案；未知 id 回退到默认方案。 */
export function getMotionScheme(id) {
  return MOTION_SCHEMES.find(s => s.id === id) || MOTION_SCHEMES[0]
}
