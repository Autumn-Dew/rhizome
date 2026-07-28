<template>
  <div class="local-music" :class="[themeClass, { entered: entered }]">
    <div class="local-header">
      <div>
        <h2>本地音乐</h2>
        <p class="desc">扫描并管理本地音频文件</p>
      </div>
      <span class="view-tabs">
        <button class="tl-entry-btn" :class="{ active: viewMode === 'folders' }" @click="viewMode = 'folders'">文件夹</button>
        <button class="tl-entry-btn" :class="{ active: viewMode === 'albums' }" @click="viewMode = 'albums'">专辑</button>
        <button class="tl-entry-btn" :class="{ active: viewMode === 'artists' }" @click="viewMode = 'artists'">艺人</button>
      </span>
    </div>

    <div class="local-toolbar">
      <button class="rc-global-btn" @click="handleAddMusic" :disabled="musicStore.loading || viewMode !== 'folders'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 4v16M4 12h16" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>添加音乐</span>
      </button>
      <button class="rc-global-btn" @click="handleAddFolder" :disabled="musicStore.loading || viewMode !== 'folders'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke-width="2"/>
        </svg>
        <span>添加文件夹</span>
      </button>
      <button class="rc-global-btn" @click="toggleMultiMode" :class="{ active: multiMode }" :disabled="viewMode !== 'folders'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span>{{ multiMode ? '退出多选' : '多选' }}</span>
      </button>
      <button class="rc-global-btn" @click="toggleSortMode" :class="{ active: sortMode }" :disabled="viewMode !== 'folders'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 8h16M4 16h16" stroke-linecap="round"/>
          <path d="M8 4l-4 4 4 4M16 20l4-4-4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ sortMode ? '完成排序' : '排序' }}</span>
      </button>
      <template v-if="multiMode">
        <button class="rc-global-btn" @click="toggleSelectAll"><span>{{ isAllSelected ? '全不选' : '全选' }}</span></button>
        <button class="rc-global-btn" @click="batchAddToPlaylist" :disabled="!selectedSet.size">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>加入歌单</span>
        </button>
        <button class="rc-global-btn" :class="{ 'delete-warning': confirmHint('__batch__') !== '' }" :style="pulseFor('__batch__')" @click="batchDelete" :disabled="!selectedSet.size" :title="confirmHint('__batch__') || '批量删除'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M10 11v6M14 11v6M5 6h14v14a2 2 0 012 2H7a2 2 0 01-2-2V6z" stroke-linecap="round"/></svg>
          <span>删除</span>
        </button>
      </template>
      <div class="toolbar-spacer"></div>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" stroke-width="2"/>
          <path d="M21 21l-4.35-4.35" stroke-width="2"/>
        </svg>
        <input
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="search-input"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="loading-box" v-if="musicStore.loading">
      <p>正在扫描本地音乐...</p>
    </div>

    <!-- 文件夹横向滚动列表 -->
    <div class="folder-strip" ref="folderStripRef" v-if="!musicStore.loading && musicStore.folders.length && viewMode === 'folders'">
      <button
          class="folder-chip"
          :class="{ active: activeFolder === null }"
          @click="activeFolder = null"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18V5l12-2v13" stroke-width="2"/>
        </svg>
        <span>全部 ({{ musicStore.songList.length }})</span>
      </button>
      <button
          v-for="folder in musicStore.folders"  
          :key="folder.path"
          class="folder-chip"
          :class="{ active: activeFolder === folder.path }"
          @click="activeFolder = folder.path"
          @click.middle.prevent="removeFolder(folder)"
          :title="folder.path"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke-width="2"/>
        </svg>
        <span>{{ folder.name }}</span>
        <span class="folder-count">{{ folder.songCount }}</span>
      </button>
    </div>

    <!-- 专辑视图 -->
    <div class="view-grid" v-if="viewMode === 'albums'">
      <div class="view-card" v-for="(a, ai) in albums" :key="a.name" @click="goAlbum(a.name)" :style="staggerStyle(ai)">
        <div class="view-card-cover"><img v-if="a.coverUrl" :src="a.coverUrl" /><svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg></div>
        <div class="view-card-name">{{ a.name }}</div>
        <div class="view-card-badge">{{ a.count }}</div>
      </div>
    </div>

    <!-- 艺人视图 -->
    <div class="view-grid" v-if="viewMode === 'artists'">
      <div class="view-card" v-for="(a, ai) in artists" :key="a.name" @click="goArtist(a.name)" :style="staggerStyle(ai)">
        <div class="view-card-cover"><img v-if="a.coverUrl" :src="a.coverUrl" /><svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg></div>
        <div class="view-card-name">{{ a.name }}</div>
        <div class="view-card-badge">{{ a.count }}</div>
      </div>
    </div>

    <div class="song-list" v-if="!musicStore.loading && viewMode === 'folders'">
      <div
          class="song-item"
          v-for="(item, idx) in filteredSongs"
          :key="item.path"
          :style="staggerStyle(idx)"
          :class="{
            selected: multiMode && selectedSet.has(item.path),
            playing: isCurrentSong(item),
            'sort-mode': sortMode,
            'dragging': sortMode && dragFromIdx === idx,
            'drag-over': sortMode && dragOverIdx === idx,
            'sort-bounce': bounceIdx === idx,
            'missing': item.exists === false
          }"
          :draggable="sortMode"
          @click="sortMode ? null : multiMode ? toggleSelect(item) : null"
          @dblclick="!sortMode && !multiMode && playItem(item)"
          @dragstart="sortMode ? onDragStart(idx, $event) : null"
          @dragover.prevent="sortMode ? onDragOver(idx) : null"
          @dragleave="sortMode ? onDragLeave() : null"
          @drop="sortMode ? onDrop(idx) : null"
          @dragend="sortMode ? onDragEnd() : null"
      >
        <div class="song-index" v-if="sortMode">
          <input
            type="text"
            class="sort-order-input"
            :value="sortOrderMap[item.path] ?? ''"
            :placeholder="idx + 1"
            @input="onSortOrderInput(item.path, $event)"
            @click.stop
            @dblclick.stop
          />
        </div>
        <div class="song-index" v-else>{{ idx + 1 }}</div>
        <div class="song-cover" v-if="item.coverUrl">
          <img :src="item.coverUrl" alt="cover" />
        </div>
        <div class="song-cover" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13" stroke-width="2"/>
          </svg>
        </div>
        <div class="song-info">
          <div class="song-name">{{ item.name }}</div>
          <div class="song-artist">{{ item.singer }}</div>
          <div class="song-album" v-if="item.album">{{ item.album }}</div>
        </div>
        <div class="song-duration">{{ item.durationFormat }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playItem(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" :class="{ 'delete-warning': confirmHint(item.path) !== '' }" :style="pulseFor(item.path)" @click="deleteSong(item)" :title="confirmHint(item.path) || '删除'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                  d="M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M10 11v6 M14 11v6 M5 6h14v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6z"
                  stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="song-btn" @click.stop="openPlaylistSelect(item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="filteredSongs.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18V5l12-2v13" stroke-width="2"/>
          <path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke-width="2"/>
        </svg>
        <p>暂无本地音乐，点击添加音乐开始导入</p>
      </div>
    </div>

    <!-- 底部浮动按钮组 -->
    <div class="float-actions" v-if="viewMode === 'folders' && (multiMode || sortMode || playerStore.currentSong)">
      <button v-if="multiMode" class="float-btn" @click="cancelMulti" title="取消多选">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <button v-if="sortMode" class="float-btn" @click="toggleSortMode" title="完成排序">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
      </button>
      <button class="float-btn" @click="scrollToCurrent" title="定位到当前播放歌曲">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
      </button>
    </div>
  </div>

  <!-- 歌单选择弹窗 -->
  <div class="modal-mask" v-if="showPlaylistSelect" @click.self="showPlaylistSelect = false">
    <div class="playlist-select-popup">
      <h4>加入歌单</h4>
      <div v-if="!playlistList.length" class="empty-hint">暂无歌单</div>
      <div v-for="pl in playlistList" :key="pl.localId" class="playlist-option" @click="addToPlaylist(pl)">
        {{ pl.title }}
      </div>
      <button class="cancel-btn" @click="showPlaylistSelect = false">取消</button>
    </div>
  </div>
</template>

<script>
export default { name: 'LocalMusic' }
</script>
<script setup>
import { computed, ref, onMounted, toRef, watch, nextTick } from "vue";
import { useRouter } from 'vue-router'
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePageEnter } from "@/composables/usePageEnter";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import { useSongList } from "@/composables/useSongList";
import FavoriteButton from "@/components/common/FavoriteButton.vue";
import { K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS } from "@/constants/storage-keys";
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { formatTime } from '@/utils/format'
import { createSongFromMeta } from '@/utils/song-factory'

const { themeClass } = useGlobalTheme();
const router = useRouter()
const playerStore = usePlayerStore();
const musicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();
const { confirmDelete, resetConfirm, clickCount, confirmHint, pulseFor } = useDeleteConfirm()

const viewMode = ref('folders')
const activeAlbum = ref(null)
const activeArtist = ref(null)
function goAlbum(name) { router.push(`/player/album/album/${encodeURIComponent(name)}`) }
function goArtist(name) { router.push(`/player/album/artist/${encodeURIComponent(name)}`) }

watch(viewMode, () => { resetEnter(); nextTick(() => { triggerEnter() }) })

const albums = computed(() => {
  const map = {}
  for (const s of musicStore.songList) {
    const key = s.album || '未知专辑'
    if (!map[key]) map[key] = { name: key, coverUrl: s.coverUrl, count: 0 }
    map[key].count++
  }
  let list = Object.values(map)
  if (viewMode.value === 'albums' && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
})
const artists = computed(() => {
  const map = {}
  for (const s of musicStore.songList) {
    const key = s.singer || '未知歌手'
    if (!map[key]) map[key] = { name: key, coverUrl: s.coverUrl, count: 0 }
    map[key].count++
  }
  let list = Object.values(map)
  if (viewMode.value === 'artists' && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
})
const albumSongs = computed(() => {
  if (!activeAlbum.value) return []
  return musicStore.songList.filter(s => (s.album || '未知专辑') === activeAlbum.value)
})
const artistSongs = computed(() => {
  if (!activeArtist.value) return []
  return musicStore.songList.filter(s => (s.singer || '未知歌手') === activeArtist.value)
})

const songListRef = toRef(musicStore, 'songList')
const {
  sortMode, dragFromIdx, dragOverIdx, sortOrderMap,
  toggleSortMode, onSortOrderInput,
  onDragStart, onDragOver, onDragLeave, onDragEnd, bounceIdx,
  multiMode, selectedSet,
  toggleMultiMode, toggleSelect, isAllSelectedFn, toggleSelectAllFn,
  cancelMulti, scrollToCurrent,
} = useSongList(songListRef, () => musicStore._saveCurrentPaths())

// 覆盖 onDrop：因为 filteredSongs 是 computed，拖拽索引需映射到 musicStore.songList 的真实索引
function onDrop(idx) {
  if (dragFromIdx.value === -1 || dragFromIdx.value === idx) {
    dragFromIdx.value = -1; dragOverIdx.value = -1; return
  }
  const list = [...musicStore.songList]
  const fromSong = filteredSongs.value[dragFromIdx.value]
  const toSong = filteredSongs.value[idx]
  const fromRealIdx = list.findIndex(s => s.path === fromSong.path)
  const toRealIdx = list.findIndex(s => s.path === toSong.path)
  if (fromRealIdx === -1 || toRealIdx === -1) {
    dragFromIdx.value = -1; dragOverIdx.value = -1; return
  }
  const [moved] = list.splice(fromRealIdx, 1)
  list.splice(toRealIdx, 0, moved)
  musicStore.songList = list
  musicStore._saveCurrentPaths()
  dragFromIdx.value = -1; dragOverIdx.value = -1
}

const activeFolder = ref(null);
const { entered, staggerStyle, triggerEnter, resetEnter } = usePageEnter();
const folderStripRef = ref(null);
const searchQuery = ref('')
const searchPlaceholder = computed(() => {
  if (viewMode.value === 'albums') return '搜索专辑...'
  if (viewMode.value === 'artists') return '搜索艺人...'
  return '搜索歌曲/艺人/专辑'
});

const isAllSelected = computed(() => isAllSelectedFn(filteredSongs.value))
const toggleSelectAll = () => toggleSelectAllFn(filteredSongs.value)

const showPlaylistSelect = ref(false);
const targetSong = ref(null);
const batchPaths = ref([]);
const batchSongKeys = ref([]);
const batchSongPaths = ref([]);
const playlistList = ref([]);

const openPlaylistSelect = (song) => {
  targetSong.value = song;
  try {
    const allPlaylists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]')
    const songsMap = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
    // 过滤掉已包含该歌曲的歌单
    playlistList.value = allPlaylists.filter(pl => {
      const keys = songsMap[pl.localId] || []
      return !keys.includes(song.path)
    })
  } catch { playlistList.value = [] }
  showPlaylistSelect.value = true;
};

const addToPlaylist = (pl) => {
  const songs = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}');
  const keys = songs[pl.localId] || [];
  const newKeys = targetSong.value ? [targetSong.value.path] : batchSongPaths.value;
  newKeys.forEach(k => { if (!keys.includes(k)) keys.push(k) });
  songs[pl.localId] = keys;
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(songs));
  showPlaylistSelect.value = false;
};

const batchDelete = () => {
  if (!confirmDelete('__batch__')) return
  resetConfirm()
  for (const path of selectedSet.value) {
    const song = musicStore.songList.find(s => s.path === path);
    if (song) musicStore.removeSong(song);
  }
  selectedSet.value.clear();
  multiMode.value = false;
  // 清理空文件夹
  for (const folder of musicStore.folders) {
    const remaining = musicStore.songList.filter(s => s.path.startsWith(folder.path))
    if (!remaining.length) {
      musicStore.removeFolder(folder.path)
      if (activeFolder.value === folder.path) activeFolder.value = null
    }
  }
};

const batchAddToPlaylist = () => {
  targetSong.value = null;
  batchSongPaths.value = [...selectedSet.value];
  try { playlistList.value = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]') } catch { playlistList.value = [] }
  showPlaylistSelect.value = true;
};

const filteredSongs = computed(() => {
  let list = musicStore.songList
  if (activeFolder.value) {
    list = list.filter(s => s.path.startsWith(activeFolder.value))
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.singer || '').toLowerCase().includes(q) ||
      (s.album || '').toLowerCase().includes(q) ||
      (s.genre || '').toLowerCase().includes(q) ||
      (s.path || '').toLowerCase().includes(q)
    )
  }
  return list
});

const handleAddMusic = async () => {
  try {
    const filePaths = await window.electron.selectAudioFiles()
    if (!filePaths.length) return

    for (const filePath of filePaths) {
      if (musicStore.songList.some(s => s.path === filePath)) continue
      const meta = await window.electron.parseAudio(filePath)
      if (!meta) continue
      await musicStore.addSong(createSongFromMeta(meta))
    }
    playerStore.setPlayList(musicStore.songList)
  } catch (err) {
    console.error("添加音乐失败", err)
  }
};

const handleAddFolder = async () => {
  try {
    if (!window.electron?.selectAudioFolder) {
      console.error("selectAudioFolder 不可用，请重启应用")
      return
    }
    const result = await window.electron.selectAudioFolder()
    if (!result || !result.files.length) {
      if (result) console.log("文件夹中未找到音频文件")
      return
    }

    const { dirPath, dirName, files } = result
    const newPaths = files.filter(p => !musicStore.songList.some(s => s.path === p))
    console.log(`[folder] 扫描到 ${files.length} 个文件，新文件 ${newPaths.length} 个`)
    if (!newPaths.length) { console.log("文件夹中无新歌曲"); return }

    const songs = []
    for (const filePath of newPaths) {
      const meta = await window.electron.parseAudio(filePath)
      if (meta) songs.push(createSongFromMeta(meta))
    }
    console.log(`[folder] 成功解析 ${songs.length} 个文件`)
    const added = await musicStore.addSongs(songs)
    if (added > 0) {
      await musicStore.addFolder(dirName, dirPath)
      playerStore.setPlayList(musicStore.songList)
    }
  } catch (err) {
    console.error("添加文件夹失败", err)
  }
};

const removeFolder = async (folder) => {
  await musicStore.removeFolder(folder.path)
  if (activeFolder.value === folder.path) activeFolder.value = null
};

const playItem = (song) => {
  const list = filteredSongs.value.length ? filteredSongs.value : musicStore.songList
  playerStore.setPlayList(list)
  playerStore.playGlobalSong(song)
}

const deleteSong = async (song) => {
  if (!confirmDelete(song.path)) return
  resetConfirm()
  await musicStore.removeSong(song);
  for (const folder of musicStore.folders) {
    const remaining = musicStore.songList.filter(s => s.path.startsWith(folder.path))
    if (!remaining.length) {
      await musicStore.removeFolder(folder.path)
      if (activeFolder.value === folder.path) activeFolder.value = null
    }
  }
};

onMounted(async () => {
  if (!musicStore.loaded && !musicStore.loading) {
    await musicStore.initFromStorage()
  }
  // 文件夹 Strip 鼠标滚轮水平滚动
  const strip = folderStripRef.value
  if (strip) {
    strip.addEventListener('wheel', (e) => {
      e.preventDefault()
      strip.scrollLeft += e.deltaY
    }, { passive: false })
  }
  // 等 splash 淡出后再播入场动效
  if (document.querySelector('.splash-screen')) {
    window.addEventListener('appReady', triggerEnter, { once: true })
  } else {
    triggerEnter()
  }
});
</script>

<style scoped>
.local-music {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.local-music::-webkit-scrollbar {
  display: none;
}

.local-header {
  padding: 16px; display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 2px solid transparent;
}

.local-header h2 {
  font-size: 20px;
  margin: 0 0 4px;
}

.desc {
  font-size: 12px;
  opacity: .7;
}

.local-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 2px solid transparent;
  align-items: center;
}

.toolbar-spacer {
  flex: 1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 8px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.search-box svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  width: 160px;
}

.search-input::placeholder {
  color: var(--text-primary);
  opacity: 0.4;
}

.search-clear {
  background: transparent;
  border: none;
  color: var(--text-primary);
  opacity: 0.5;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.rc-global-btn {
  height: 36px;
  padding: 0 14px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: var(--motion-btn-hover);
  font-size: 13px;
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

/* 文件夹横向滚动条 */
.folder-strip {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
  border-bottom: 1px solid transparent;
  background: var(--bg-secondary);
}

.folder-strip::-webkit-scrollbar {
  display: none;
}

.folder-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: all var(--motion-duration-fast);
  flex-shrink: 0;
}

.folder-chip svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  fill: none;
}

.folder-chip:hover {
  background: var(--bg-secondary);
}

.folder-chip.active {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.folder-count {
  font-size: 10px;
  opacity: .6;
  background: var(--bg-secondary);
  padding: 1px 5px;
  border-radius: 0;
}

.folder-chip.active .folder-count {
  background: rgba(0,0,0,0.15);
}

.song-list {
  margin: 0;
}

.song-item {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-color);
  gap: 0;
  position: relative;
  z-index: 0;
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

.song-item:hover {
  color: var(--btn-hover-text);
}
.song-item.sort-mode {
  cursor: grab;
}
.song-item.sort-mode:active {
  cursor: grabbing;
}
.song-item.dragging {
  opacity: 0.35;
}
.song-item.drag-over {
  border-top: 2px solid var(--btn-hover-bg);
}
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-album,
.song-item:hover .song-duration {
  color: inherit;
}

.song-index {
  width: 30px;
  text-align: center;
  font-size: 13px;
  opacity: .8;
  flex-shrink: 0;
}

.sort-order-input {
  width: 30px;
  height: 22px;
  text-align: center;
  font-size: 12px;
  font-family: monospace;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  padding: 0 2px;
  margin-left: -3px;
}
.sort-order-input::placeholder {
  color: var(--text-primary);
  opacity: 0.3;
}
.sort-order-input:focus {
  border-color: var(--btn-hover-text);
  background: var(--bg-primary);
}

.song-cover {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 10px;
  background: var(--bg-secondary);
  overflow: hidden;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-cover svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  opacity: .5;
}

.song-info {
  flex: 1;
  padding: 0 8px;
  min-width: 0;
}

.song-name {
  font-size: 13px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  opacity: .65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-album {
  font-size: 11px;
  opacity: .5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.song-duration {
  width: 60px;
  text-align: right;
  font-size: 12px;
  opacity: .75;
}


.modal-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 99999;
}
.playlist-select-popup {
  width: 280px; background: var(--bg-primary); color: var(--text-primary);
  border: 2px solid var(--border-color); padding: 16px;
}
.playlist-select-popup h4 { margin: 0 0 12px; font-size: 14px; }
.playlist-option {
  padding: 8px 10px; cursor: pointer; font-size: 13px;
  transition: background var(--motion-duration-fast);
}
.playlist-option:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.empty-hint { font-size: 12px; opacity: 0.5; padding: 20px 0; text-align: center; }
.cancel-btn {
  width: 100%; margin-top: 12px; padding: 8px;
  border: 2px solid var(--border-color); background: var(--bg-secondary);
  color: var(--text-primary); cursor: pointer; font-size: 12px;
}

.song-item.selected {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.selected .song-index,
.song-item.selected .song-name,
.song-item.selected .song-artist,
.song-item.selected .song-album,
.song-item.selected .song-duration {
  color: inherit;
}
.song-item.selected .song-cover {
  background: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
  color: var(--btn-hover-bg);
}
.song-item.selected .song-btn {
  background: var(--btn-hover-text);
  color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
}

/* 当前播放歌曲高亮 */
.song-item.playing {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.playing .song-index,
.song-item.playing .song-name,
.song-item.playing .song-artist,
.song-item.playing .song-album,
.song-item.playing .song-duration {
  color: inherit;
}
.song-item.playing .song-cover {
  background: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
  color: var(--btn-hover-bg);
}
.song-item.playing .song-btn {
  background: var(--btn-hover-text);
  color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
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
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .5;
}

.loading-box {
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: .6;
  font-size: 13px;
}

.empty svg {
  width: 50px;
  height: 50px;
  margin-bottom: 12px;
  fill: none;
  stroke: currentColor;
}

/* === 精密组装入场 === */
.local-header h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard),
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard);
}
.entered .local-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.local-header .desc {
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .local-header .desc { opacity: 1; transform: translateY(0); }

.local-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.local-toolbar .rc-global-btn:nth-child(1) { transition-delay: 0.08s; }
.local-toolbar .rc-global-btn:nth-child(2) { transition-delay: 0.13s; }
.local-toolbar .rc-global-btn:nth-child(3) { transition-delay: 0.18s; }
.local-toolbar .rc-global-btn:nth-child(4) { transition-delay: 0.23s; }
.entered .local-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

/* 搜索框入场 */
.search-box {
  opacity: 0; transform: translateX(8px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.24s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.24s;
}
.entered .search-box { opacity: 1; transform: translateX(0); }

.folder-strip {
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.2s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.2s;
}
.entered .folder-strip { opacity: 1; transform: translateY(0); }

.song-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .song-item { opacity: 1; transform: translateX(0); }

/* 分隔线从中点向两端生长 */
.local-header, .local-toolbar, .folder-strip { position: relative; }
.local-header::after, .local-toolbar::after, .folder-strip::after {
  content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
  background: var(--border-color); transform: scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.local-toolbar::after, .folder-strip::after { height: 1px; }
.entered .local-header::after,
.entered .local-toolbar::after,
.entered .folder-strip::after { transform: scaleX(1); }

/* header 操作按钮 */
.header-actions { display: flex; gap: 6px; }
.tl-entry-btn {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 2px solid var(--border-color); background: var(--bg-secondary);
  color: var(--text-primary); font-size: 12px; font-family: monospace;
  cursor: pointer; transition: var(--motion-btn-hover); flex-shrink: 0;
}
.tl-entry-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.tl-entry-btn.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.view-tabs { display: flex; gap: 0; }
.view-tabs .tl-entry-btn:not(:first-child) { border-left: none; }
.view-tabs .tl-entry-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.view-tabs .tl-entry-btn:nth-child(1) { transition-delay: 0.14s; }
.view-tabs .tl-entry-btn:nth-child(2) { transition-delay: 0.18s; }
.view-tabs .tl-entry-btn:nth-child(3) { transition-delay: 0.22s; }
.entered .view-tabs .tl-entry-btn { opacity: 1; transform: scaleX(1); }

/* 专辑/艺人网格 */
.view-grid {
  display: flex; flex-wrap: wrap; gap: 12px; padding: 12px 16px;
  overflow-y: auto; flex: 1; align-content: flex-start; justify-content: center;
}
.view-card {
  width: 140px; border: 2px solid var(--border-color); cursor: pointer;
  padding: 12px; text-align: center; position: relative;
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .view-card { opacity: 1; transform: translateX(0); }
.view-card:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transition: background var(--motion-duration-fast), color var(--motion-duration-fast) !important; }
.view-card-cover {
  width: 100%; height: 100px; overflow: hidden; border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);
  margin-bottom: 8px;
}
.view-card-cover img { width: 100%; height: 100%; object-fit: cover; }
.view-card-cover svg { width: 28px; height: 28px; opacity: 0.3; }
.view-card-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.view-card-badge {
  position: absolute; bottom: -1px; right: -1px;
  width: 22px; height: 22px;
  background: var(--btn-hover-bg); color: var(--btn-hover-text);
  font-size: 10px; font-family: monospace; line-height: 22px; text-align: center;
  border: 2px solid var(--border-color);
}

.view-back {
  display: flex; align-items: center; gap: 6px; padding: 10px 16px;
  font-size: 13px; border-bottom: 2px solid var(--border-color); cursor: pointer;
  font-family: monospace;
}
.view-back svg { width: 16px; height: 16px; }
.view-back:hover { background: var(--bg-secondary); }
</style>
