<!-- src/components/player/PlaybackControls.vue -->
<template>
  <div class="rc-playback-controls">
    <button class="control-btn" @click="onPrev" :disabled="disabled">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M19 20L9 12 19 4v16z" stroke-width="2"/>
      </svg>
    </button>

    <button class="control-btn play-btn" @click="onTogglePlay" :disabled="disabled">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" v-if="!isPlaying">
        <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" v-else>
        <rect x="6" y="4" width="4" height="16" stroke-width="2"/>
        <rect x="14" y="4" width="4" height="16" stroke-width="2"/>
      </svg>
    </button>

    <button class="control-btn" @click="onNext" :disabled="disabled">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M5 4l10 8-10 8V4z" stroke-width="2"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['prev', 'next', 'togglePlay'])

const onPrev = () => emit('prev')
const onNext = () => emit('next')
const onTogglePlay = () => emit('togglePlay')
</script>

<style scoped>
.rc-playback-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
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

.control-btn:hover:not(:disabled) {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  transform: scale(1.05);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn {
  width: 36px;
  height: 36px;
}
</style>