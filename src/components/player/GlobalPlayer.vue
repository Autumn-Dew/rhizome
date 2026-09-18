<!-- src/components/player/GlobalPlayer.vue -->
<template>
  <div class="rc-global-player" v-if="currentSong" :class="{ switching }">
    <!-- 左侧：歌曲信息 -->
    <div class="player-left">
      <div class="album-thumb" @click="onGoToDetail">
        <img
            v-if="displaySong.coverUrl"
            :src="displaySong.coverUrl"
            alt="封面"
            style="width:100%;height:100%;object-fit:cover;"
        />
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke-width="2"/>
        </svg>
      </div>
      <div class="player-info">
        <div class="song-name">{{ displaySong.name }}</div>
        <div class="song-artist">{{ displaySong.singer }}</div>
      </div>
    </div>

    <!-- 中间：播放控制 + 频谱 -->
    <div class="player-center">
      <PlaybackControls
          :is-playing="isPlaying"
          @prev="onPrev"
          @next="onNext"
          @toggle-play="onTogglePlay"
      />
      <canvas ref="spectrumCanvas" class="gp-spectrum" :class="{ 'gp-spectrum--hidden': !isPlaying }"></canvas>
      <ProgressBar
          :key="displaySong?.path"
          :current-value="currentTime"
          :max-value="duration"
          :loop-a="loopA"
          :loop-b="loopB"
          :ab-loop="abLoop"
          @update="onSeek"
          @change="onSeek"
          @setABPoint="(v) => emit('setABPoint', v)"
      />
    </div>

    <!-- 右侧：音量 + 模式 + 列表 -->
    <div class="player-right">
      <VolumeControl
          :model-value="volume"
          @update:model-value="onVolumeUpdate"
          @change="onVolumeChange"
      />

      <button class="control-btn mode-btn rc-has-tooltip" @click="onToggleMode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path :d="modeIcon" stroke-width="2"/>
        </svg>
        <span class="rc-tooltip">{{ modeTooltip }}</span>
      </button>

      <button class="control-btn desktop-lyric-btn rc-has-tooltip"
              @click.left="onToggleDesktopLyrics"
              @click.right.prevent="onToggleLyricLock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="14" rx="2"/>
          <path d="M3 9h18"/>
          <path d="M7 13h10M7 16.5h7" stroke-linecap="round"/>
        </svg>
        <span class="rc-tooltip">{{ lyricTooltip }}</span>
      </button>

      <button class="control-btn list-btn" @click="onOpenPlaylist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <FavoriteButton class="gp-fav-btn" :song="displaySong" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import PlaybackControls from './PlaybackControls.vue'
import ProgressBar from './ProgressBar.vue'
import VolumeControl from './VolumeControl.vue'
import FavoriteButton from '@/components/common/FavoriteButton.vue'

const props = defineProps({
  currentSong: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  currentTime: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0
  },
  playMode: {
    type: String,
    default: 'list' // list, single, listLoop, singleLoop, random
  },
  volume: {
    type: Number,
    default: 1
  },
  desktopLyricsVisible: {
    type: Boolean,
    default: false
  },
  desktopLyricsLocked: {
    type: Boolean,
    default: false
  },
  loopA: { type: Number, default: null },
  loopB: { type: Number, default: null },
  abLoop: { type: Boolean, default: false },
})

const emit = defineEmits([
  'prev', 'next', 'togglePlay', 'seek',
  'toggleMode', 'openPlaylist', 'goToDetail',
  'update:volume',
  'toggleDesktopLyrics', 'toggleLyricLock',
  'setABPoint',
])

// 播放模式图标映射
const modeIconMap = {
  list: 'M4 7h14 M4 12h12 M4 17h16',
  single: 'M12 7v10 M9 16h6',
  listLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2',
  singleLoop: 'M6 6h12v12H6z M16 6l2 2-2 2 M8 18l-2-2 2-2 M12 9v6 M10 14h4',
  random: 'M4 8h8v6h8 M20 16h-8v-6H4',
}

const modeTooltipMap = {
  list: '列表播放',
  single: '单曲播放',
  listLoop: '列表循环',
  singleLoop: '单曲循环',
  random: '随机播放'
}

const modeIcon = computed(() => modeIconMap[props.playMode] || modeIconMap.list)
const modeTooltip = computed(() => modeTooltipMap[props.playMode] || '播放模式')

const onPrev = () => emit('prev')
const onNext = () => emit('next')
const onTogglePlay = () => emit('togglePlay')
const onSeek = (value) => emit('seek', value)
const onToggleMode = () => emit('toggleMode')
const onOpenPlaylist = () => emit('openPlaylist')
const onGoToDetail = () => emit('goToDetail')
const onVolumeUpdate = (val) => emit('update:volume', val)
const onVolumeChange = (val) => console.log('音量变化:', val)
const onToggleDesktopLyrics = () => emit('toggleDesktopLyrics')
const onToggleLyricLock = () => emit('toggleLyricLock')

const lyricTooltip = computed(() => {
  if (props.desktopLyricsLocked) return '桌面歌词 (已锁定)'
  if (props.desktopLyricsVisible) return '隐藏桌面歌词'
  return '显示桌面歌词'
})

// ========== 切歌动效 ==========
const switching = ref(false)
const displaySong = ref({ ...props.currentSong })

watch(() => props.currentSong, (song) => {
  if (song) {
    switching.value = true
    setTimeout(() => {
      displaySong.value = song
      switching.value = false
    }, 180)
  }
})
</script>

<style scoped>
.rc-global-player {
  height: 72px;
  border-top: 2px solid var(--border-color);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
}

.player-left {
  flex: 0 0 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 150px;
}

.album-thumb {
  width: 44px;
  height: 44px;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: var(--motion-control-hover);
  position: relative;
}

.album-thumb:hover {
  transform: scale(1.05);
  border-color: var(--btn-hover-bg);
}

.album-thumb svg {
  width: 24px;
  height: 24px;
  stroke: currentColor;
}

.player-info {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.song-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 11px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  justify-content: flex-start;
}

.player-right {
  flex: 0 0 260px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
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
  transition: var(--motion-control-hover);
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
  transform: scale(1.05);
}

.mode-btn svg,
.list-btn svg {
  width: 18px;
  height: 18px;
}

.gp-spectrum {
  width: 60px;
  height: 40px;
  flex-shrink: 0;
  opacity: 1;
  transition: opacity var(--motion-duration-slow) var(--motion-easing-ease);
}
.gp-spectrum--hidden {
  opacity: 0;
  pointer-events: none;
}

.mode-btn .rc-tooltip {
  top: auto;
  bottom: calc(100% + 6px);
}

.desktop-lyric-btn {
  position: relative;
}

.desktop-lyric-btn .rc-tooltip {
  top: auto;
  bottom: calc(100% + 6px);
}

/* 收藏按钮在播放栏中的样式 */
.gp-fav-btn {
  width: 36px !important;
  height: 36px !important;
  border-radius: 0;
}

/* ========== 切歌动效 ========== */

/* 封面：四角收拢再展开 */
.album-thumb {
  clip-path: inset(0 0 0 0);
  transition: clip-path 0.18s var(--motion-easing-enter);
}
.switching .album-thumb {
  clip-path: inset(50% 50% 50% 50%);
}

/* 歌名/歌手：左侧色条擦除 */
.player-info {
  position: relative;
  overflow: hidden;
}
.player-info::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--border-color);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--motion-duration-medium) var(--motion-easing-swipe);
  z-index: 2;
  pointer-events: none;
}
.switching .player-info::after {
  transform: scaleX(1);
}

/* 进度条脉冲 */
.rc-progress-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--border-color);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}
.switching .rc-progress-track::after {
  animation: mt-pulse 0.36s ease-out;
}
/* 注：mt-pulse 定义在 motion-tokens.css（原 gp-progress-pulse） */

/* ══ Ornate：底部播放栏——仅四角蝙蝠（不要内衬） ══ */
html[data-motion="ornate"] .rc-global-player { position: relative; }
html[data-motion="ornate"] .rc-global-player::after {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  background: var(--border-color);
  -webkit-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  opacity: 0.6;
  transform: scale(1);
  animation: gp-bat 5s ease-in-out infinite;
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
    transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
@keyframes gp-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* ══ Ornate：播放栏控制按钮——四边 currentColor 延展（hover 反色沿用 classic）
   注：喜欢按钮（FavoriteButton 根元素 .fav-btn）的延展已在子组件内部声明，此处不再重复。 */
html[data-motion="ornate"] .control-btn::before,
html[data-motion="ornate"] .mode-btn::before,
html[data-motion="ornate"] .desktop-lyric-btn::before,
html[data-motion="ornate"] .list-btn::before {
  content: '';
  position: absolute; inset: 1px;
  pointer-events: none;
  background:
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat,
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat;
  background-size: 0 2px, 0 2px, 0 2px, 0 2px, 2px 0, 2px 0, 2px 0, 2px 0;
  transition: background-size var(--motion-time-interaction) var(--motion-easing-standard);
}
html[data-motion="ornate"] .control-btn:hover::before,
html[data-motion="ornate"] .mode-btn:hover::before,
html[data-motion="ornate"] .desktop-lyric-btn:hover::before,
html[data-motion="ornate"] .list-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>