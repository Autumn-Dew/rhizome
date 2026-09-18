<!-- src/components/player/ProgressBar.vue -->
<template>
  <div class="rc-progress-wrapper">
    <span class="rc-time current-time">{{ formatTime(currentValue) }}</span>
    <div
        class="rc-progress-bar-container"
        @click="onBarClick"
        @contextmenu.prevent="onBarRightClick"
        @wheel.prevent="onWheel"
        @mousemove="onMouseMove"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
    >
      <div class="rc-progress-track">
        <div class="rc-progress-fill" :style="{ width: percent + '%' }"></div>
        <div v-if="loopA != null && loopB != null" class="rc-ab-zone"
          :style="{ left: (loopA / maxValue * 100) + '%', width: ((loopB - loopA) / maxValue * 100) + '%' }"></div>
        <div v-if="loopA != null" class="rc-ab-marker" :style="{ left: (loopA / maxValue * 100) + '%' }" title="A 点"></div>
        <div v-if="loopB != null" class="rc-ab-marker" :style="{ left: (loopB / maxValue * 100) + '%' }" title="B 点"></div>
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
  },
  loopA: {
    type: Number,
    default: null
  },
  loopB: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update', 'change', 'setABPoint'])

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
  emit('change', percent * props.maxValue)
}

const onBarRightClick = (e) => {
  if (!props.draggable) return
  const rect = e.currentTarget.querySelector('.rc-progress-track').getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const percent = Math.min(1, Math.max(0, clickX / rect.width))
  emit('setABPoint', { time: percent * props.maxValue })
}

const onMouseMove = (e) => {
  const rect = e.currentTarget.querySelector('.rc-progress-track').getBoundingClientRect()
  hoverPercent.value = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
}

const onWheel = (e) => {
  if (!props.draggable) return
  const delta = e.deltaY > 0 ? 2 : -2
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
  transition: width var(--motion-duration-instant) var(--motion-easing-linear);
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
  transition: height var(--motion-duration-normal);
}

.rc-progress-bar-container:hover .rc-progress-fill {
  background: var(--btn-hover-bg);
}

.rc-ab-zone {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--btn-hover-bg);
  opacity: 0.2;
  pointer-events: none;
}

.rc-ab-marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: var(--border-color);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 3;
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
/* ══ Ornate：进度条——红色填充 + 蝙蝠播放头 ══ */
html[data-motion="ornate"] .rc-progress-track { overflow: visible; }
html[data-motion="ornate"] .rc-progress-fill { background: #c0392b; }
html[data-motion="ornate"] .rc-progress-fill::after {
  content: '';
  position: absolute; right: -5px; top: 50%;
  width: 14px; height: 14px;
  transform: translateY(-50%);
  background: #c0392b;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' transform='rotate(90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") center / contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' transform='rotate(90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") center / contain no-repeat;
  pointer-events: none;
}
</style>