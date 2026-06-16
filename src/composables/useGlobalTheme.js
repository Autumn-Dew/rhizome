import {computed, ref, watch} from 'vue'

const isDark = ref(false)

const saved = localStorage.getItem('rhizome-theme')
if (saved) {
    isDark.value = saved === 'dark'
}

// 同步到 document 根元素
function syncTheme() {
    document.documentElement.className = isDark.value ? 'theme-dark' : ''
}
syncTheme()

watch(isDark, (val) => {
    localStorage.setItem('rhizome-theme', val ? 'dark' : 'light')
    syncTheme()
})

export function useGlobalTheme() {
    const toggleTheme = () => {
        isDark.value = !isDark.value
    }

    return {
        isDark,
        toggleTheme,
        themeClass: computed(() => isDark.value ? 'theme-dark' : 'theme-white')
    }
}
