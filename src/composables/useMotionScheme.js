import { computed, ref, watch } from 'vue'
import { K_MOTION } from '@/constants/storage-keys'
import { MOTION_SCHEMES, DEFAULT_MOTION_ID, getMotionScheme } from '@/constants/motion-schemes'

// 从 localStorage 读方案 id；未知 id 回退到默认
function loadMotionId() {
    const saved = localStorage.getItem(K_MOTION)
    return MOTION_SCHEMES.some(s => s.id === saved) ? saved : DEFAULT_MOTION_ID
}

const motionId = ref(loadMotionId())

// 同步到 document 根元素：data-motion 属性（供 [data-motion="..."] 选择器）+ motion-* class
function syncMotion() {
    const s = getMotionScheme(motionId.value)
    const root = document.documentElement
    root.setAttribute('data-motion', s.id)
    root.classList.forEach(c => { if (c.startsWith('motion-')) root.classList.remove(c) })
    if (s.class) root.classList.add(s.class)
}
syncMotion()

watch(motionId, (id) => {
    localStorage.setItem(K_MOTION, id)
    syncMotion()
})

const motionClass = computed(() => getMotionScheme(motionId.value).class)

export function useMotionScheme() {
    const setMotion = (id) => {
        if (!MOTION_SCHEMES.some(s => s.id === id) || id === motionId.value) return
        motionId.value = id
    }

    return {
        schemes: MOTION_SCHEMES,
        motionId,
        motionClass,
        setMotion,
    }
}
