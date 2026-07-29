import { ref, computed, onMounted, onUnmounted } from 'vue'
import { DemoEngine } from '@/composables/demo/engine'
import { playDemo } from '@/composables/demo/script'

const active = ref(false)
const caption = ref('')
const captionVisible = ref(false)
const splashVisible = ref(false)
const masked = ref(false)
const triggerCount = ref(0)

let engine = null
let deps = null

const ui = {
  caption,
  captionVisible,
  splashVisible,
  masked,
}

function bindEngine() {
  if (!deps) return null
  return new DemoEngine(deps, ui)
}

function teardown() {
  active.value = false
  captionVisible.value = false
  splashVisible.value = false
  masked.value = false
  engine?.resetSideEffects()
  engine?.abort()
  engine = null
}

export function useDemoMode() {
  function configure(options) {
    deps = options
  }

  async function start() {
    if (active.value || !deps?.router) return
    active.value = true
    engine = bindEngine()
    try {
      await playDemo(engine)
    } catch {
      /* 演示中断 */
    }
    teardown()
  }

  function stop() {
    teardown()
  }

  return {
    active: computed(() => active.value),
    caption: computed(() => caption.value),
    captionVisible: computed(() => captionVisible.value),
    splashVisible: computed(() => splashVisible.value),
    masked: computed(() => masked.value),
    triggerCount: computed(() => triggerCount.value),
    configure,
    start,
    stop,
  }
}

/** 设置按钮 5 连击 → 触发演示 */
export function useDemoTrigger(onFire) {
  const TRIGGERS = 5
  let count = 0

  function onClick(e) {
    if (active.value) return
    if (!e.target.closest('[data-demo-trigger]')) {
      count = 0
      triggerCount.value = 0
      return
    }
    count++
    triggerCount.value = count
    if (count >= TRIGGERS) {
      count = 0
      triggerCount.value = 0
      onFire()
    }
  }

  onMounted(() => document.addEventListener('click', onClick))
  onUnmounted(() => document.removeEventListener('click', onClick))
}
