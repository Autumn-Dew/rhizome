<!-- src/components/player/VolumeControl.vue -->
<template>
  <div class="rc-volume-control">
    <button class="rc-volume-btn control-btn" @click="toggleMute">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9v6h4l5 5V4L7 9H3z"/>
        <path v-if="currentVolume === 0" d="M17 7l6 6M23 7l-6 6"/>
        <rect v-if="currentVolume > 0" x="14" y="10" width="2" height="2" fill="currentColor" stroke="none"/>
        <rect v-if="currentVolume > 0.2" x="16" y="9" width="2" height="4" fill="currentColor" stroke="none"/>
        <rect v-if="currentVolume > 0.4" x="18" y="8" width="2" height="6" fill="currentColor" stroke="none"/>
        <rect v-if="currentVolume > 0.6" x="20" y="7" width="2" height="8" fill="currentColor" stroke="none"/>
        <rect v-if="currentVolume > 0.8" x="22" y="6" width="2" height="10" fill="currentColor" stroke="none"/>
      </svg>
    </button>

    <div
        class="rc-volume-bar-container"
        @wheel.prevent="onWheel"
        @mouseenter="showVolumeLabel = true"
        @mouseleave="showVolumeLabel = false"
    >
      <div class="rc-volume-track">
        <div class="rc-volume-fill" :style="{ width: currentVolume * 100 + '%' }"></div>
        <input
            type="range"
            class="rc-volume-input"
            min="0"
            max="100"
            :value="currentVolume * 100"
            @input="onVolumeChange"
        />
      </div>
      <span class="rc-volume-label" v-show="showVolumeLabel">{{ Math.round(currentVolume * 100) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  // 使用 model-value 而不是 v-model 的直接绑定
  modelValue: {
    type: Number,
    default: 1
  },
  // 是否记忆音量
  memoryEnabled: {
    type: Boolean,
    default: true
  },
  // 存储key
  storageKey: {
    type: String,
    default: 'rhizome-volume'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const currentVolume = ref(props.modelValue)
const lastVolume = ref(props.modelValue || 0.5)
const showVolumeLabel = ref(false)

const onWheel = (e) => {
  const step = 0.1
  const delta = e.deltaY > 0 ? -step : step
  currentVolume.value = Math.max(0, Math.min(1, currentVolume.value + delta))
  emit('change', currentVolume.value)
}

// 监听外部modelValue变化
watch(() => props.modelValue, (newVal) => {
  currentVolume.value = newVal
})

// 监听内部变化，向外发射 update:modelValue 事件
watch(currentVolume, (newVal) => {
  emit('update:modelValue', newVal)
  if (props.memoryEnabled) {
    localStorage.setItem(props.storageKey, newVal.toString())
  }
})

const onVolumeChange = (e) => {
  const newVolume = Number(e.target.value) / 100
  currentVolume.value = newVolume
  emit('change', newVolume)
}

const toggleMute = () => {
  if (currentVolume.value > 0) {
    lastVolume.value = currentVolume.value
    currentVolume.value = 0
  } else {
    currentVolume.value = lastVolume.value || 0.5
  }
  emit('change', currentVolume.value)
}

// 恢复本地存储的音量
onMounted(() => {
  if (props.memoryEnabled) {
    const saved = localStorage.getItem(props.storageKey)
    if (saved !== null) {
      currentVolume.value = Number(saved)
    }
  }
})
</script>

<style scoped>
.rc-volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 0;
  flex-shrink: 0;
}

.control-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}

.control-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.rc-volume-bar-container {
  width: 60px;
  position: relative;
}

.rc-volume-bar-container:hover .rc-volume-track {
  height: 6px;
  transition: height 0.2s;
}

.rc-volume-bar-container:hover .rc-volume-fill {
  background: var(--btn-hover-bg);
}

.rc-volume-label {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-family: monospace;
  opacity: 0.85;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
}

.rc-volume-track {
  position: relative;
  height: 4px;
  background: var(--progress-bg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.rc-volume-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--progress-fill);
  pointer-events: none;
  transition: width 0.1s ease;
}

.rc-volume-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}
</style>