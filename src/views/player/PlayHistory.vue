<template>
  <div class="play-history" :class="[themeClass, { entered: entered }]">
    <div class="history-header">
      <div class="header-row">
        <div>
          <h2>播放历史</h2>
          <p class="desc">仅显示本地歌曲播放记录</p>
        </div>
        <span class="header-actions">
        <button class="tl-entry-btn" @click="goDiary" title="听歌日记">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 11h16M4 15h10M4 19h14"/>
          </svg>
          <span>日记</span>
        </button>
        <button class="tl-entry-btn" @click="goTimeline" title="音乐时间线">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h10"/>
            <circle cx="8" cy="6" r="1.5"/>
            <circle cx="14" cy="12" r="1.5"/>
            <circle cx="10" cy="18" r="1.5"/>
          </svg>
          <span>时间线</span>
        </button>
        </span>
      </div>
    </div>

    <div class="song-list">
      <div class="song-item" v-for="(item, idx) in realHistoryList" :key="idx" @dblclick="playSong(item)" :class="{ playing: isCurrentSong(item) }" :style="staggerStyle(idx)">
        <span v-if="barColor(item)" class="pc-bar" :style="{ background: barColor(item) }"></span>
        <div class="song-index">{{ idx + 1 }}</div>
        <div class="song-cover" v-if="item.coverUrl">
          <img :src="item.coverUrl" alt="cover" loading="lazy" decoding="async" />
        </div>
        <div class="song-cover" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18V5l12-2v13" stroke-width="2"/></svg>
        </div>
        <div class="song-info">
          <div class="song-name">{{ item.name }}</div>
          <div class="song-artist">{{ item.singer || '未知歌手' }}</div>
        </div>
        <div class="song-duration">{{ item.durationFormat || '00:00' }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playSong(item)" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="realHistoryList.length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke-width="2"/>
        </svg>
        <p>暂无播放历史</p>
      </div>
    </div>

    <!-- 底部浮动按钮组 -->
    <div class="float-actions" v-if="playerStore.currentSong">
      <button class="float-btn" @click="scrollToCurrent" title="定位到当前播放歌曲">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePageEnter } from "@/composables/usePageEnter";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import FavoriteButton from "@/components/common/FavoriteButton.vue";
import { K_PLAY_HISTORY_VIEW } from "@/constants/storage-keys";
import { formatTime } from '@/utils/format'
import { useSongList } from "@/composables/useSongList";
import { usePlayCountBar } from '@/composables/usePlayCountBar'

const { themeClass } = useGlobalTheme();
const { entered, staggerStyle } = usePageEnter();
const router = useRouter();
const playerStore = usePlayerStore();
const localMusicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();
const { barColor } = usePlayCountBar()

const rawHistory = ref([]);

const { scrollToCurrent } = useSongList(ref([]), () => {})

const realHistoryList = computed(() => {
  const local = localMusicStore.songList;
  const map = {};
  rawHistory.value.forEach(i => map[i.path] = i);
  return Object.values(map).map(h => {
    const match = local.find(x => x.path === h.path);
    return match ? { ...match, durationFormat: formatTime(match.duration) } : null;
  }).filter(Boolean);
});

const playSong = (song) => {
  playerStore.setPlayList(realHistoryList.value);
  playerStore.playGlobalSong(song);
};

const removeSingle = (song) => {
  rawHistory.value = rawHistory.value.filter(x => x.path !== song.path);
  localStorage.setItem(K_PLAY_HISTORY_VIEW, JSON.stringify(rawHistory.value));
};

const clearHistory = () => {
  rawHistory.value = [];
  localStorage.setItem(K_PLAY_HISTORY_VIEW, "[]");
};

const refreshHistory = () => {
  const d = localStorage.getItem(K_PLAY_HISTORY_VIEW);
  rawHistory.value = d ? JSON.parse(d) : [];
};

const goTimeline = () => {
  router.push('/player/timeline')
};
const goDiary = () => {
  router.push('/player/diary')
};

onMounted(() => {
  refreshHistory();
});
</script>

<style scoped>
.theme-white {
  --bg: #fff;
  --text: #000;
  --border: #000;
  --btn: #f8f8f8;
  --btn-hover: #000;
  --btn-text: #fff;
  --light: #f5f5f5;
}

.theme-dark {
  --bg: #2c2c2c;
  --text: #fff;
  --border: #fff;
  --btn: #292929;
  --btn-hover: #fff;
  --btn-text: #000;
  --light: #333;
}

.play-history {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
}

.play-history::-webkit-scrollbar {
  display: none;
}

.history-header {
  padding: 16px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.history-header::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .history-header::after { transform: scaleX(1); }

.history-header h2 {
  font-size: 20px;
  margin: 0 0 4px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-actions { display: flex; gap: 6px; }

.tl-entry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  font-family: monospace;
  cursor: pointer;
  transition: var(--motion-btn-hover);
  flex-shrink: 0;
}
.header-actions .tl-entry-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.header-actions .tl-entry-btn:nth-child(1) { transition-delay: 0.10s; }
.header-actions .tl-entry-btn:nth-child(2) { transition-delay: 0.15s; }
.entered .header-actions .tl-entry-btn { opacity: 1; transform: scaleX(1); }
.tl-entry-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.tl-entry-btn svg {
  width: 15px;
  height: 15px;
}

.desc {
  font-size: 12px;
  opacity: 0.7;
}

.history-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 2px solid transparent;
  position: relative;
}
.history-toolbar::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .history-toolbar::after { transform: scaleX(1); }

.rc-global-btn {
  height: 36px;
  padding: 0 14px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.rc-global-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
}

.rc-global-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.song-list {
  margin: 0;
}

.song-item {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 48px;
}

.song-item::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform var(--motion-duration-slow) var(--motion-easing-ease);
}

.song-item:hover::before {
  transform: scaleX(1);
}

/* 当前播放歌曲高亮 */
.song-item.playing {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.playing .song-index,
.song-item.playing .song-name,
.song-item.playing .song-artist,
.song-item.playing .song-duration {
  color: inherit;
}

.song-item:hover {
  color: var(--btn-hover-text);
}
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-duration {
  color: inherit;
}

.song-index {
  width: 30px;
  text-align: center;
  font-size: 13px;
  opacity: .8;
}

.song-cover {
  width: 36px; height: 36px; flex-shrink: 0; margin-right: 10px;
  border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; background: var(--bg-secondary);
}
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: .5; }

.song-info {
  flex: 1;
  padding: 0 12px;
}

.song-name {
  font-size: 13px;
  margin-bottom: 2px;
}

.song-artist {
  font-size: 12px;
  opacity: .65;
}

.song-duration {
  width: 60px;
  text-align: right;
  font-size: 12px;
  opacity: .75;
}

.song-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.song-btn {
  width: 30px;
  height: 30px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--motion-btn-hover);
}

.song-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
}

.song-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
}


.empty {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .5;
}

.empty svg {
  width: 60px;
  height: 60px;
  margin-bottom: 12px;
}

/* 底部浮动按钮组 */
.float-actions {
  position: fixed;
  bottom: 84px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  z-index: 10;
}
.float-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--motion-btn-hover);
}
.float-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
}
.float-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

/* === 精密组装入场 === */
.history-header h2 {
  opacity: 0;
  transform: translateY(-10px);
  letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard),
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard);
}
.entered .history-header h2 {
  opacity: 1;
  transform: translateY(0);
  letter-spacing: 0;
}

.history-header .desc {
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s,
              transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .history-header .desc {
  opacity: 1;
  transform: translateY(0);
}

.history-toolbar .rc-global-btn {
  opacity: 0;
  transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease),
              transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.history-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.history-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.16s; }
.entered .history-toolbar .rc-global-btn {
  opacity: 1;
  transform: scaleX(1);
}

.song-item {
  opacity: 0;
  transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .song-item {
  opacity: 1;
  transform: translateX(0);
}
/* ══════════════════════════════════════════════════════════════
   Ornate（华丽方案）页面装饰 —— 沿用设置页风格
   （本页头部为「标题 + 右侧操作」布局，故不加标题居中）
   ══════════════════════════════════════════════════════════════ */

/* ── 鸢尾花纹（明暗两套） ── */
html[data-motion="ornate"] .play-history {
  --ph-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23000'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}
html[data-motion="ornate"] .play-history.theme-dark {
  --ph-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23fff'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}

/* ── 页面头：外蕾丝 + 两侧鸢尾 ── */
html[data-motion="ornate"] .header-row { position: relative; }
html[data-motion="ornate"] .history-header::before {
  content: '';
  position: absolute; inset: 6px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    var(--ph-deco), var(--ph-deco), var(--ph-deco);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%, 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%;
  opacity: 0;
  animation: ph-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .history-header::before { opacity: 0.5; }
/* 标题/副标题居中：三列 grid（左空 / 中标题 / 右操作）；
   标题保持在文档流内，使页头高度与其它页面一致（不再绝对居中导致高度塌陷） */
html[data-motion="ornate"] .header-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
html[data-motion="ornate"] .header-row > div { grid-column: 2; text-align: center; }
html[data-motion="ornate"] .history-header h2 { text-align: center; letter-spacing: 2px; }
html[data-motion="ornate"] .history-header .desc { text-align: center; }
html[data-motion="ornate"] .header-row > .header-actions { grid-column: 3; justify-self: end; }
@keyframes ph-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px, 12px 20%, 12px 50%, 12px 80%; }
}

/* 标题两侧对称点缀（与设置页一致：3 圆点 + 双短线 + 双小弧） */
html[data-motion="ornate"] .history-header h2::before,
html[data-motion="ornate"] .history-header h2::after {
  content: '';
  display: inline-block;
  width: 92px; height: 14px;
  vertical-align: middle;
  margin: 0 14px;
  opacity: 0;
  transform: scaleX(0);
  transform-origin: center;
  background:
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) left center / 6px 6px no-repeat,
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) center center / 6px 6px no-repeat,
    radial-gradient(circle, var(--border-color) 2px, transparent 2.5px) right center / 6px 6px no-repeat,
    linear-gradient(90deg, var(--border-color), var(--border-color)) left 3px / 28px 1px no-repeat,
    linear-gradient(90deg, var(--border-color), var(--border-color)) right 4px / 28px 1px no-repeat,
    conic-gradient(from 200deg, var(--border-color) 0 50deg, transparent 50deg 360deg) 30px center / 12px 12px no-repeat,
    conic-gradient(from 110deg, var(--border-color) 0 50deg, transparent 50deg 360deg) calc(100% - 30px) center / 12px 12px no-repeat;
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s var(--motion-easing-enter) 0.4s;
}
html[data-motion="ornate"] .entered .history-header h2::before,
html[data-motion="ornate"] .entered .history-header h2::after {
  opacity: 0.75;
  transform: scaleX(1);
}

/* ── 列表项：从中间向两侧浮现 ── */
html[data-motion="ornate"] .song-item {
  opacity: 0; transform: scaleX(0);
  transform-origin: center;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-slow) var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .song-item { opacity: 1; transform: scaleX(1); }

/* hover：单层红覆盖 + 两只白蝙蝠，自中间向两侧展开 */
html[data-motion="ornate"] .song-item::before,
html[data-motion="ornate"] .song-item:hover::before { display: none; }
html[data-motion="ornate"] .song-item::after {
  content: '';
  position: absolute; inset: 0 -18px; z-index: -1;
  pointer-events: none;
  background-color: #c0392b;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' transform='rotate(-90 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat, no-repeat;
  background-position: left center, right center;
  background-size: auto 100%, auto 100%;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  transition: opacity 0s, clip-path var(--motion-duration-glacial) var(--motion-easing-enter);
}
html[data-motion="ornate"] .song-item:hover::after {
  opacity: 1;
  clip-path: inset(0 0 0 0);
}

/* ── 按钮：hover 反色 + 四边 currentColor 延展（对齐设置页） ── */
html[data-motion="ornate"] .rc-global-btn,
html[data-motion="ornate"] .tl-entry-btn { position: relative; }
html[data-motion="ornate"] .rc-global-btn::before,
html[data-motion="ornate"] .tl-entry-btn::before {
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
html[data-motion="ornate"] .rc-global-btn:hover::before,
html[data-motion="ornate"] .tl-entry-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
/* ══ Ornate：歌曲列表小按钮四边 currentColor 延展 ══ */
html[data-motion="ornate"] .song-btn { position: relative; }
html[data-motion="ornate"] .song-btn::before {
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
html[data-motion="ornate"] .song-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>