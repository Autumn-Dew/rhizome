<template>
  <div v-if="active" class="demo-overlay">
    <div class="demo-vignette" :class="{ 'demo-outro-vignette': masked }" />
    <Transition name="demo-cap">
      <div v-if="captionVisible" class="demo-caption-box">
        <div class="demo-caption-main">{{ caption }}</div>
      </div>
    </Transition>
    <div v-if="hint" class="demo-click-hint">{{ hint }}</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  active: Boolean,
  masked: Boolean,
  caption: { type: String, default: '' },
  captionVisible: Boolean,
  triggerCount: { type: Number, default: 0 },
})

const hint = ref('')
let hintTimer = null

watch(() => props.triggerCount, count => {
  clearTimeout(hintTimer)
  if (count > 0 && count < 5) {
    hint.value = `演示模式 ${'●'.repeat(count)}${'○'.repeat(5 - count)}  (还需 ${5 - count} 次)`
    hintTimer = setTimeout(() => { hint.value = '' }, 1500)
  } else {
    hint.value = ''
  }
})
</script>

<style scoped>
.demo-overlay {
  position: fixed;
  inset: 0;
  z-index: 99980;
  pointer-events: none;
}

.demo-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.18) 100%);
  animation: vignette-in 0.6s var(--motion-easing-standard);
  transition: background 0.5s var(--motion-easing-standard);
}

.demo-outro-vignette {
  background: rgba(0, 0, 0, 0.55);
}

@keyframes vignette-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.demo-caption-box {
  position: absolute;
  top: 46%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  will-change: transform, opacity, filter;
}

.demo-caption-main {
  font-size: 52px;
  font-weight: 700;
  letter-spacing: 7px;
  color: var(--text-primary);
  text-shadow:
    0 0 60px var(--c40, rgba(255, 255, 255, 0.12)),
    0 0 120px var(--c20, rgba(255, 255, 255, 0.05));
}

.demo-cap-enter-active {
  transition:
    opacity 0.4s var(--motion-easing-standard),
    transform 0.45s var(--motion-easing-enter),
    filter 0.4s var(--motion-easing-standard);
}

.demo-cap-leave-active {
  transition:
    opacity 0.35s var(--motion-easing-standard),
    transform 0.3s var(--motion-easing-leave),
    filter 0.3s var(--motion-easing-standard);
}

.demo-cap-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.92);
  filter: blur(6px);
}

.demo-cap-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.04);
  filter: blur(3px);
}

.demo-click-hint {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--text-primary);
  opacity: 0.6;
  padding: 6px 16px;
  border: 1px solid var(--c25, var(--border-color));
  background: var(--bg-secondary);
  animation: hint-pop 0.3s var(--motion-easing-spring);
}

@keyframes hint-pop {
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.95); }
  to { opacity: 0.6; transform: translateX(-50%) translateY(0) scale(1); }
}
</style>
