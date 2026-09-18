/**
 * Rhizome 主题注册表（多主题）。
 *
 * 设计：
 *  - 主题以「字符串 id」标识（K_THEME 持久化存储 id）。
 *  - class 字段决定挂到 document.documentElement 上的 class（现有 CSS 选择器
 *    `.theme-white` / `.theme-dark` 依赖它，保持不变）。
 *  - dark 字段派生出全局的 isDark 布尔（报告配色 / canvas 反色等 UI 逻辑依赖它）。
 *
 * 新增主题只需在此列表加一项，并在 global-theme.css 增加对应变量块
 * （以及各页面 scoped 内按需补 `.theme-<class>` 局部变量）。
 */
export const THEMES = [
  { id: 'light', label: '浅色', class: 'theme-white', dark: false },
  { id: 'dark',  label: '深色', class: 'theme-dark',  dark: true },
]

export const DEFAULT_THEME_ID = 'light'

/** 按 id 取主题；未知 id 回退到默认主题。 */
export function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

/** 指定主题是否为深色（未知 id 按默认主题判定）。 */
export function themeIsDark(id) {
  return getTheme(id).dark === true
}
