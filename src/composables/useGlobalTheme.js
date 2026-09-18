import { computed, ref, watch } from 'vue'
import { K_THEME } from '@/constants/storage-keys'
import { THEMES, DEFAULT_THEME_ID, getTheme, themeIsDark } from '@/constants/themes'

// 从 localStorage 读主题 id；未知 id（含未来新增后回退的旧值）回退到默认
function loadThemeId() {
    const saved = localStorage.getItem(K_THEME)
    return THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME_ID
}

const themeId = ref(loadThemeId())

// 同步到 document 根元素：data-theme 属性（供 [data-theme="..."] 选择器）+ theme-* class（兼容现有选择器）
function syncTheme() {
    const t = getTheme(themeId.value)
    const root = document.documentElement
    root.setAttribute('data-theme', t.id)
    root.classList.forEach(c => { if (c.startsWith('theme-')) root.classList.remove(c) })
    if (t.class) root.classList.add(t.class)
}
syncTheme()

watch(themeId, (id) => {
    localStorage.setItem(K_THEME, id)
    syncTheme()
})

const isDark = computed(() => themeIsDark(themeId.value))
const themeClass = computed(() => getTheme(themeId.value).class)

export function useGlobalTheme() {
    const setTheme = (id) => {
        if (!THEMES.some(t => t.id === id) || id === themeId.value) return
        themeId.value = id
    }
    const toggleTheme = () => {
        const idx = THEMES.findIndex(t => t.id === themeId.value)
        const next = THEMES[(idx + 1) % THEMES.length]
        themeId.value = next.id
    }

    return {
        themes: THEMES,
        themeId,
        isDark,
        themeClass,
        setTheme,
        toggleTheme,
    }
}
