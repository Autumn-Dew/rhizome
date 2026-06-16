<!-- src/components/player/ProgressBar.vue -->
<template>
  <div class="rc-progress-wrapper">
    <span class="rc-time current-time">{{ formatTime(currentValue) }}</span>
    <div
        class="rc-progress-bar-container"
        @click="onBarClick"
        @wheel.prevent="onWheel"
        @mousemove="onMouseMove"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
      <div class="rc-progress-track">
        <div class="rc-progress-fill" :style="{ width: percent + '%' }"></div>
        <input
            type="range"
            class="rc-progress-input"
            min="0"
            max="100"
            :value="percent"
            @input="onProgressChange"
        />
      </div>
      <span class="rc-seek-label" v-show="hovering" :style="{ left: hoverPercent * 100 + '%' }">{{ seekLabel }}</span>
    </div>
    <span class="rc-time total-time">{{ formatTime(maxValue) }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  currentValue: {
    type: Number,
    default: 0
  },
  maxValue: {
    type: Number,
    default: 0
  },
  // 是否可拖动
  draggable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update', 'change'])

const hovering = ref(false)
const hoverPercent = ref(0)

const percent = computed(() => {
  if (!props.maxValue) return 0
  return (props.currentValue / props.maxValue) * 100
})

const seekLabel = computed(() => {
  if (!props.maxValue) return '00:00'
  return formatTime(hoverPercent.value * props.maxValue)
})

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const onProgressChange = (e) => {
  if (!props.draggable) return
  const percent = Number(e.target.value) / 100
  const newValue = percent * props.maxValue
  emit('update', newValue)
}

const onBarClick = (e) => {
  if (!props.draggable) return
  const rect = e.currentTarget.querySelector('.rc-progress-track').getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const percent = Math.min(1, Math.max(0, clickX / rect.width))
  const newValue = percent * props.maxValue
  emit('change', newValue)
}

const onMouseMove = (e) => {
  const rect = e.currentTarget.querySelector('.rc-progress-track').getBoundingClientRect()
  hoverPercent.value = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

const onWheel = (e) => {
  if (!props.draggable) return
  const delta = e.deltaY > 0 ? -2 : 2
  const newValue = Math.max(0, Math.min(props.maxValue, props.currentValue + delta))
  emit('change', newValue)
}
</script>

<style scoped>
.rc-progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 800px;
}

.rc-time {
  font-size: 11px;
  font-family: monospace;
  opacity: 0.7;
  flex-shrink: 0;
}

.current-time {
  width: 40px;
  text-align: right;
}

.total-time {
  width: 40px;
  text-align: left;
}

.rc-progress-bar-container {
  flex: 1;
  position: relative;
  cursor: pointer;
}

.rc-progress-track {
  position: relative;
  height: 4px;
  background: var(--progress-bg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.rc-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--progress-fill);
  width: 0%;
  pointer-events: none;
  transition: width 0.1s linear;
}

.rc-progress-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.rc-progress-bar-container:hover .rc-progress-track {
  height: 6px;
  transition: height 0.2s;
}

.rc-progress-bar-container:hover .rc-progress-fill {
  background: var(--btn-hover-bg);
}

.rc-seek-label {
  position: absolute;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  font-size: 11px;
  font-family: monospace;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
}
</style>