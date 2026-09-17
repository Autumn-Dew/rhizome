<template>
  <div class="play-stats" :class="{ entered: entered }">
    <div class="stats-header">
      <h2>听歌统计</h2>
      <p class="desc">本地音乐播放数据一览</p>
    </div>

    <div class="stats-summary">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalPlays }}</div>
        <div class="stat-label">总播放次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalSongs }}</div>
        <div class="stat-label">本地歌曲</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatDuration(stats.totalTime) }}</div>
        <div class="stat-label">总播放时长</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.topArtist }}</div>
        <div class="stat-label">最爱歌手</div>
      </div>
    </div>

    <div class="top-section">
      <div class="section-header">
        <h3 class="section-title">歌曲排行</h3>
        <button class="rc-global-btn play-all-btn" @click="playAll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
          </svg>
          <span>播放全部</span>
        </button>
      </div>
      <div class="song-list">
        <div class="song-item" v-for="(item, idx) in songTop" :key="idx" :style="staggerStyle(idx)" @dblclick="playSong(item)" :class="{ playing: isCurrentSong(item) }">
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
            <div class="song-artist">{{ item.singer || item.artist || '未知' }}</div>
          </div>
          <div class="song-count">{{ item.playCount || 0 }} 次</div>
          <div class="song-actions">
            <button class="song-btn" @click="playSong(item)" title="播放">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
              </svg>
            </button>
            <FavoriteButton :song="item" />
          </div>
        </div>
        <div class="empty" v-if="songTop.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13" stroke-width="2"/>
          </svg>
          <p>暂无播放数据</p>
        </div>
      </div>
    </div>

    <div class="top-section">
      <div class="section-header">
        <h3 class="section-title">歌手排行</h3>
      </div>
      <div class="song-list">
        <div class="song-item" v-for="(item, idx) in artistTop" :key="item.artist" :style="staggerStyle(idx)">
          <div class="song-index">{{ idx + 1 }}</div>
          <div class="song-info">
            <div class="song-name">{{ item.artist }}</div>
            <div class="song-artist">歌手</div>
          </div>
          <div class="song-count">{{ item.count }} 次</div>
        </div>
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
import { ref, onMounted } from "vue";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import { usePageEnter } from '@/composables/usePageEnter'
import FavoriteButton from "@/components/common/FavoriteButton.vue";
import { ElMessage } from "element-plus";
import { K_PLAY_COUNT_REAL } from "@/constants/storage-keys";
import { formatDuration } from '@/utils/format'
import { useSongList } from "@/composables/useSongList";
import { usePlayCountBar } from '@/composables/usePlayCountBar'

const playerStore = usePlayerStore();
const localMusicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();

const stats = ref({ totalPlays: 0, totalSongs: 0, totalTime: 0, topArtist: "未知" });
const songTop = ref([]);
const artistTop = ref([]);
const { entered, staggerStyle } = usePageEnter();
const { barColor } = usePlayCountBar()

const { scrollToCurrent } = useSongList(ref([]), () => {})

function getPlayCount() {
  try { const d = localStorage.getItem(K_PLAY_COUNT_REAL); return d ? JSON.parse(d) : {} } catch { return {} }
}

function getTotalTime() {
    const countMap = getPlayCount()
    let total = 0
    for (const song of localMusicStore.songList) {
        const count = countMap[song.path] || 0
        total += (song.duration || 0) * count
    }
    return total
}

function refreshStats() {
  const countMap = getPlayCount()
  const songs = localMusicStore.songList.map(s => ({
    ...s,
    playCount: countMap[s.path] || 0
  }))
  songs.sort((a, b) => b.playCount - a.playCount)
  songTop.value = songs.slice(0, 20)

  const totalPlays = songs.reduce((s, n) => s + n.playCount, 0)
  const artistMap = {}
  songs.forEach(s => { const n = s.singer || "未知"; artistMap[n] = (artistMap[n] || 0) + s.playCount })
  artistTop.value = Object.entries(artistMap).map(([a, c]) => ({ artist: a, count: c })).sort((a, b) => b.count - a.count).slice(0, 10)

  stats.value = {
    totalPlays,
    totalSongs: songs.length,
    totalTime: getTotalTime(),
    topArtist: artistTop.value[0]?.artist || "未知"
  }
}

const playSong = (song) => {
  playerStore.setPlayList(songTop.value)
  playerStore.playGlobalSong(song)
}
const playAll = () => {
  if (!songTop.value.length) return ElMessage.warning("暂无歌曲")
  playerStore.setPlayList(songTop.value)
  playerStore.playGlobalSong(songTop.value[0])
}

onMounted(() => {
  refreshStats();
})
</script>

<style scoped>
.play-stats { width: 100%; height: 100%; background: var(--bg-primary); color: var(--text-primary); overflow-y: auto; }
.play-stats::-webkit-scrollbar { display: none; }

.stats-header { padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.stats-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .stats-header::after { transform: scaleX(1); }
.stats-header h2 { font-size: 20px; margin: 0 0 4px; }
.desc { font-size: 12px; opacity: 0.7; }

.stats-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px; border-bottom: 2px solid transparent; position: relative; }
.stats-summary::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .stats-summary::after { transform: scaleX(1); }
.stat-card { height: 60px; text-align: center; border: 2px solid var(--border-color); background: var(--bg-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.stat-value { font-size: 16px; font-weight: bold; }
.stat-label { font-size: 11px; opacity: .6; margin-top: 2px; }

.top-section { padding: 0 20px 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 0; padding-bottom: 8px; border-bottom: 2px solid transparent; position: relative; }
.section-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .section-header::after { transform: scaleX(1); }
.section-title { font-size: 16px; margin: 0; font-weight: 600; }

.rc-global-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; transition: var(--motion-btn-hover); }
.rc-global-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.rc-global-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.play-all-btn { background: var(--border-color); color: var(--bg-primary); }

.song-list { margin: 0; }
.song-item {
  height: 48px; display: flex; align-items: center; padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  position: relative; z-index: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 48px;
}
.song-item::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform var(--motion-duration-slow) var(--motion-easing-ease);
}
.song-item:hover::before { transform: scaleX(1); }
.song-item:hover { color: var(--btn-hover-text); }
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-count,
.song-item:hover .song-duration { color: inherit; }
.song-index { width: 30px; text-align: center; font-size: 13px; opacity: .8; }
.song-cover { width: 36px; height: 36px; flex-shrink: 0; margin-right: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--bg-secondary); }
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: .5; }
.song-info { flex: 1; padding: 0 12px; }
.song-name { font-size: 13px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-artist { font-size: 12px; opacity: .65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-count { width: 80px; text-align: right; font-size: 12px; opacity: .75; }
.song-actions { display: flex; gap: 4px; margin-left: 8px; }
.song-btn { width: 30px; height: 30px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--motion-btn-hover); }
.song-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); border-color: var(--btn-hover-text); }
.song-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; }

.empty { padding: 60px 0; display: flex; flex-direction: column; align-items: center; opacity: .5; }
.empty svg { width: 60px; height: 60px; margin-bottom: 12px; }

/* 当前播放歌曲高亮 */
.song-item.playing {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.playing .song-index,
.song-item.playing .song-name,
.song-item.playing .song-artist,
.song-item.playing .song-count,
.song-item.playing .song-duration {
  color: inherit;
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
.stats-header h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard),
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard);
}
.entered .stats-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.stats-header .desc {
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .stats-header .desc { opacity: 1; transform: translateY(0); }

.stat-card {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease),
              transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.entered .stat-card { opacity: 1; transform: scaleX(1); }

.top-section .section-header {
  opacity: 0; transform: translateX(-8px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.top-section:nth-child(2) .section-header { transition-delay: 0.28s; }
.top-section:nth-child(3) .section-header { transition-delay: 0.32s; }
.entered .top-section .section-header { opacity: 1; transform: translateX(0); }

.song-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .song-item { opacity: 1; transform: translateX(0); }
</style>
