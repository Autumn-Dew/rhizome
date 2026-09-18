<template>
  <div class="playlist-detail" :class="[themeClass, { entered: entered }]">
    <div class="detail-header">
      <div class="detail-header-info">
        <div class="playlist-cover">
          <img v-if="playlistInfo.coverUrl" :src="playlistInfo.coverUrl" alt="cover" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
          </svg>
        </div>
        <div class="playlist-text">
          <h2>{{ playlistInfo.title }}</h2>
          <p class="desc">{{ playlistInfo.intro || '暂无简介' }}</p>
          <div class="playlist-stats">
            <span class="stat-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18V5l12-2v13" stroke-width="2"/>
              </svg>
              {{ realSongList.length }}首
            </span>
          </div>
        </div>
      </div>
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke-width="2"/>
        </svg>
        <span>返回</span>
      </button>
    </div>

    <div class="detail-toolbar">
      <button class="rc-global-btn play-all-btn" @click="playAll">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
        </svg>
        <span>播放全部</span>
      </button>
      <button class="rc-global-btn" @click="openAddSongModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" stroke-width="2"/>
        </svg>
        <span>添加歌曲</span>
      </button>
      <button class="rc-global-btn" @click="toggleMultiMode" :class="{ active: multiMode }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <span>{{ multiMode ? '退出多选' : '多选' }}</span>
      </button>
      <button class="rc-global-btn" @click="toggleSortMode" :class="{ active: sortMode }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 8h16M4 16h16" stroke-linecap="round"/>
          <path d="M8 4l-4 4 4 4M16 20l4-4-4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ sortMode ? '完成排序' : '排序' }}</span>
      </button>
      <template v-if="multiMode">
        <button class="rc-global-btn" @click="toggleSelectAll"><span>{{ isAllSelected ? '全不选' : '全选' }}</span></button>
        <button class="rc-global-btn" :class="{ 'delete-warning': confirmHint('__batch__') !== '' }" :style="pulseFor('__batch__')" @click.stop="batchRemove" :disabled="!selectedSet.size" :title="confirmHint('__batch__') || '批量移除'" data-charge-sound>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/></svg>
          <span>移除</span>
        </button>
      </template>
    </div>

    <div class="song-list">
      <div
          class="song-item"
          v-for="(item, idx) in realSongList"
          :key="item.path || idx"
          :style="staggerStyle(idx)"
          :class="{
            'sort-mode': sortMode,
            'selected': multiMode && selectedSet.has(item.path),
            playing: isCurrentSong(item),
            'missing': item.exists === false
          }"
          @click="multiMode ? toggleSelect(item) : null"
          @dblclick="!sortMode && !multiMode && playSong(item)"
      >
        <span v-if="barColor(item)" class="pc-bar" :style="{ background: barColor(item) }"></span>
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
          <img :src="item.coverUrl" alt="cover" loading="lazy" decoding="async" />
        </div>
        <div class="song-cover" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13" stroke-width="2"/>
          </svg>
        </div>
        <div class="song-info">
          <div class="song-name">{{ item.name || item.title || '未知歌曲' }}</div>
          <div class="song-artist">{{ item.singer || '未知歌手' }}</div>
        </div>
        <div class="song-duration">{{ formatTime(item.duration) }}</div>
        <div class="song-actions">
          <button class="song-btn" @click="playSong(item)" :disabled="!item.exists" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" :class="{ 'delete-warning': confirmHint(item.path) !== '' }" :style="pulseFor(item.path)" @click.stop="removeFromPlaylist(item)" @dblclick.stop :disabled="!item.exists" :title="confirmHint(item.path) || '从歌单移除'" data-charge-sound>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click.stop="openPlaylistSelect(item)" title="加入歌单">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg>
          </button>
          <FavoriteButton :song="item" />
        </div>
      </div>

      <div class="empty" v-if="realSongList.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
        </svg>
        <p>暂无歌曲，点击添加歌曲</p>
      </div>
    </div>

    <!-- 底部浮动按钮组 -->
    <div class="float-actions" v-if="multiMode || sortMode || playerStore.currentSong">
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

    <!-- 添加歌曲弹窗 -->
    <div class="modal-mask" v-show="showAddSongModal" @click.self="closeAddSongModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>添加歌曲到「{{ playlistInfo.title }}」</h3>
          <button class="close-btn" @click="closeAddSongModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择本地音乐</label>
            <div class="song-select-list">
              <div
                  class="song-select-item"
                  v-for="song in availableSongs"
                  :key="song.path"
                  @click="toggleSelectSong(song)"
                  :class="{ active: selectedPathSet.has(song.path) }"
              >
                <span class="select-indicator"></span>
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">- {{ song.singer }}</span>
              </div>
              <div class="empty-select" v-if="!availableSongs.length">暂无本地音乐</div>
            </div>
          </div>
          <div class="form-group">
            <button class="folder-add-btn" @click="addFolderToPlaylist">从文件夹添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddSongModal">取消</button>
          <button class="btn-confirm" @click="confirmAddSongs">确认添加 ({{ selectedPathSet.size }})</button>
        </div>
      </div>
    </div>

    <div class="modal-mask" v-if="showPlaylistSelectPd" @click.self="showPlaylistSelectPd = false">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header"><h3>加入歌单</h3><button class="close-btn" @click="showPlaylistSelectPd = false">×</button></div>
        <div class="modal-body"><div class="song-select-list"><div class="song-select-item" v-for="pl in playlistListAll" :key="pl.localId" @click="confirmAddToPlaylistPd(pl)">{{ pl.title }}</div></div></div>
        <div class="modal-footer"><button class="btn-cancel" @click="showPlaylistSelectPd = false">取消</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { usePlayerStore } from '@/stores/playerStore'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { useCurrentSongHighlight } from '@/composables/useCurrentSongHighlight'
import { usePageEnter } from '@/composables/usePageEnter'
import FavoriteButton from '@/components/common/FavoriteButton.vue'
import { ElMessage } from 'element-plus'
import { K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS } from "@/constants/storage-keys";
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { formatTime } from '@/utils/format'
import { createSongFromMeta } from '@/utils/song-factory'
import { usePlayCountBar } from '@/composables/usePlayCountBar'

import { useSongList } from "@/composables/useSongList";

const route = useRoute()
const router = useRouter()
const { themeClass } = useGlobalTheme()
const playerStore = usePlayerStore()
const localMusicStore = useLocalMusicStore()
const { isCurrentSong } = useCurrentSongHighlight()
const { confirmDelete, resetConfirm, clickCount, confirmHint, pulseFor } = useDeleteConfirm()
const { barColor } = usePlayCountBar()

const playlistInfo = ref({})
const realSongList = ref([])
const showAddSongModal = ref(false)
const selectedPathSet = ref(new Set())
const { entered, staggerStyle, triggerEnter } = usePageEnter();

// 过滤已在当前歌单中的歌曲
const availableSongs = computed(() => {
  const pl = playlistInfo.value
  if (!pl?.localId) return localMusicStore.songList
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  const existingKeys = new Set(map[pl.localId] || [])
  return localMusicStore.songList.filter(s => !existingKeys.has(s.path))
})

const persistSongOrder = () => {
  const pl = playlistInfo.value
  if (!pl?.localId) return
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  map[pl.localId] = realSongList.value.map(s => s.path).filter(Boolean)
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
}

const {
  sortMode, sortOrderMap,
  toggleSortMode, onSortOrderInput,
  multiMode, selectedSet,
  toggleMultiMode, toggleSelect, isAllSelectedFn, toggleSelectAllFn,
  cancelMulti, scrollToCurrent,
} = useSongList(realSongList, persistSongOrder)

const isAllSelected = computed(() => isAllSelectedFn(realSongList.value))
const toggleSelectAll = () => toggleSelectAllFn(realSongList.value)

const batchRemove = () => {
  if (!confirmDelete('__batch__')) return
  resetConfirm()
  const pl = playlistInfo.value
  if (!pl?.localId || !selectedSet.value.size) return
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  if (map[pl.localId]) {
    const removeSet = selectedSet.value
    map[pl.localId] = map[pl.localId].filter(k => !removeSet.has(k))
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
  }
  selectedSet.value.clear()
  multiMode.value = false
  loadPlaylistDetail()
}

const loadPlaylistDetail = () => {
  const id = route.params.id
  const localList = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]')
  const target = localList.find(it => String(it.localId) === String(id))
  if (!target) { ElMessage.error('歌单不存在'); router.back(); return }
  // 解析封面
  const songsMap = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  const songPaths = songsMap[target.localId] || []
  let cover = target.coverUrl || ''
  if (!cover && songPaths.length) {
    for (const key of songPaths) {
      const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
      if (found?.coverUrl) { cover = found.coverUrl; break }
    }
  }
  playlistInfo.value = { ...target, coverUrl: cover }
  realSongList.value = songPaths.map(key => {
    const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
    if (found) return { ...found, exists: true }
    return { path: key, title: '【未下载】', singer: '未知歌手', duration: 0, exists: false }
  })
}

const playAll = () => {
  const list = realSongList.value.filter(i => i.exists)
  if (!list.length) return ElMessage.warning('无可播放歌曲')
  playerStore.setPlayList(list)
  playerStore.playGlobalSong(list[0])
}

const playSong = (song) => {
  if (!song.exists) { ElMessage.warning('本地无此歌曲'); return }
  playerStore.setPlayList(realSongList.value.filter(i => i.exists))
  playerStore.playGlobalSong(song)
}

const removeFromPlaylist = (song) => {
  if (!song.path) return
  if (!confirmDelete(song.path)) return
  resetConfirm()
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  if (map[pl.localId]) {
    map[pl.localId] = map[pl.localId].filter(k => k !== song.path)
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
  }
  loadPlaylistDetail()
}

// === 添加歌曲 ===
const openAddSongModal = () => {
  selectedPathSet.value.clear()
  showAddSongModal.value = true
}
const closeAddSongModal = () => showAddSongModal.value = false

const showPlaylistSelectPd = ref(false)
const pendingPathPd = ref('')
const playlistListAll = computed(() => JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]'))
function openPlaylistSelect(item) { pendingPathPd.value = item.path; showPlaylistSelectPd.value = true }
function confirmAddToPlaylistPd(pl) {
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  const existing = new Set(map[pl.localId] || [])
  existing.add(pendingPathPd.value)
  map[pl.localId] = [...existing]
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
  showPlaylistSelectPd.value = false
}

const toggleSelectSong = (song) => {
  selectedPathSet.value.has(song.path) ? selectedPathSet.value.delete(song.path) : selectedPathSet.value.add(song.path)
}

const confirmAddSongs = () => {
  const keys = Array.from(selectedPathSet.value)
  if (!keys.length) return
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  const existing = new Set(map[pl.localId] || [])
  keys.forEach(k => existing.add(k))
  map[pl.localId] = Array.from(existing)
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
  closeAddSongModal()
  loadPlaylistDetail()
}

const addFolderToPlaylist = async () => {
  const result = await window.electron.selectAudioFolder()
  if (!result || !result.files.length) return
  const pl = playlistInfo.value
  const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
  const existing = new Set(map[pl.localId] || [])
  const newSongs = []
  for (const filePath of result.files) {
    const meta = await window.electron.parseAudio(filePath)
    if (meta?.path && !existing.has(meta.path)) {
      existing.add(meta.path)
      newSongs.push(createSongFromMeta(meta))
    }
  }
  if (newSongs.length) {
    localMusicStore.addSongs(newSongs)
    localMusicStore.addFolder(result.dirName, result.dirPath)
    map[pl.localId] = Array.from(existing)
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
  }
  closeAddSongModal()
  loadPlaylistDetail()
}

const goBack = () => router.back()

onMounted(async () => { if (!localMusicStore.loaded && !localMusicStore.loading) await localMusicStore.initFromStorage(); loadPlaylistDetail(); triggerEnter(); })
</script>

<style scoped>
.playlist-detail { width: 100%; height: 100%; background: var(--bg-primary); color: var(--text-primary); overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
.playlist-detail::-webkit-scrollbar { display: none; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.detail-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .detail-header::after { transform: scaleX(1); }
.detail-header-info { display: flex; gap: 20px; flex: 1; }
.playlist-cover { width: 100px; height: 100px; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--bg-secondary); }
.playlist-cover img { width: 100%; height: 100%; object-fit: cover; }
.playlist-cover svg { width: 50px; height: 50px; stroke: currentColor; }
.playlist-text { flex: 1; }
.playlist-text h2 { font-size: 20px; margin: 0 0 4px; }
.desc { font-size: 12px; opacity: .7; margin: 0 0 8px; }
.playlist-stats { display: flex; gap: 16px; margin-top: 8px; }
.stat-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; opacity: .75; }
.stat-item svg { width: 14px; height: 14px; }
.back-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: var(--motion-btn-hover); flex-shrink: 0; }
.back-btn svg { width: 14px; height: 14px; }
.back-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.detail-toolbar { display: flex; gap: 8px; padding: 12px; border-bottom: 2px solid transparent; position: relative; }
.detail-toolbar::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .detail-toolbar::after { transform: scaleX(1); }
.rc-global-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: var(--motion-btn-hover); }
.rc-global-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.rc-global-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.play-all-btn { background: var(--border-color); color: var(--bg-primary); }
.play-all-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.song-list { margin: 0; }
.song-item {
  height: 52px; display: flex; align-items: center;
  padding: 0 12px; border-bottom: 1px solid var(--border-color);
  position: relative; z-index: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}
.song-item::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform var(--motion-duration-slow) var(--motion-easing-ease);
}
.song-item:hover::before { transform: scaleX(1); }
.song-item:hover { color: var(--btn-hover-text); }
.song-item.selected {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.song-item.selected .song-index,
.song-item.selected .song-name,
.song-item.selected .song-artist,
.song-item.selected .song-duration {
  color: inherit;
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
.song-item:hover .song-index,
.song-item:hover .song-name,
.song-item:hover .song-artist,
.song-item:hover .song-duration { color: inherit; 
}
.song-index { width: 30px; text-align: center; font-size: 13px; opacity: .8; flex-shrink: 0; }
.sort-order-input {
  width: 30px; height: 22px; text-align: center;
  font-size: 12px; font-family: monospace;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-primary);
  outline: none; padding: 0 2px;
  margin-left: -3px;
}
.sort-order-input::placeholder {
  color: var(--text-primary); opacity: 0.3;
}
.sort-order-input:focus {
  border-color: var(--btn-hover-text);
  background: var(--bg-primary);
}
.song-cover { width: 36px; height: 36px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 10px; background: var(--bg-secondary); overflow: hidden; }
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-cover svg { width: 18px; height: 18px; stroke: currentColor; opacity: .5; }
.song-info { flex: 1; padding: 0 8px; min-width: 0; }
.song-name { font-size: 13px; margin-bottom: 2px; }
.song-artist { font-size: 12px; opacity: .65; }
.song-duration { width: 60px; text-align: right; font-size: 12px; opacity: .75; }
.song-actions { display: flex; gap: 4px; margin-left: 8px; }
.song-btn { width: 30px; height: 30px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--motion-btn-hover); }
.song-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); border-color: var(--btn-hover-text); }
.song-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; }
.song-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.empty { padding: 40px 0; display: flex; flex-direction: column; align-items: center; opacity: .5; }
.empty svg { width: 50px; height: 50px; margin-bottom: 12px; fill: none; stroke: currentColor; }
/* 弹窗 */
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 450px; background: var(--bg-primary); border: 2px solid var(--border-color); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid var(--border-color); }
.modal-header h3 { font-size: 16px; margin: 0; }
.close-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--text-primary); }
.close-btn:hover { opacity: .7; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 2px solid var(--border-color); }

/* ── 添加歌曲/加入歌单弹窗：四角蝙蝠 ── */
html[data-motion="ornate"] .modal-content { position: relative; }
html[data-motion="ornate"] .modal-content::after {
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
  animation: pd-mbat 5s ease-in-out infinite;
}
@keyframes pd-mbat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}
.btn-cancel, .btn-confirm { padding: 6px 16px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: var(--motion-btn-hover); }
.btn-cancel:hover, .btn-confirm:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.btn-confirm { background: var(--border-color); color: var(--bg-primary); }
.song-select-list { max-height: 300px; overflow-y: auto; border: 2px solid var(--border-color); scrollbar-width: none; }
.song-select-list::-webkit-scrollbar { display: none; }
.song-select-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background var(--motion-duration-normal); }
.song-select-item:hover { background: var(--bg-secondary); }
.song-select-item.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.select-indicator { width: 16px; height: 16px; border: 2px solid var(--border-color); display: inline-block; flex-shrink: 0; }
.song-select-item.active .select-indicator { background: currentColor; }
.empty-select { padding: 40px; text-align: center; opacity: .5; font-size: 13px; }
.folder-add-btn { width: 100%; height: 36px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: var(--motion-btn-hover); margin-top: 4px; }
.folder-add-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

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
.playlist-cover {
  opacity: 0; transform: translateX(-40px);
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard);
}
.entered .playlist-cover { opacity: 1; transform: translateX(0); }

.playlist-text h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard) 0.06s,
              transform var(--motion-duration-medium) var(--motion-easing-standard) 0.06s,
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard) 0.06s;
}
.entered .playlist-text h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.playlist-text .desc,
.playlist-text .playlist-stats {
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .playlist-text .desc,
.entered .playlist-text .playlist-stats { opacity: 1; transform: translateY(0); }

.back-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
  transition-delay: 0.12s;
}
.entered .back-btn { opacity: 1; transform: scaleX(1); }

.detail-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.entered .detail-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

.song-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .song-item { opacity: 1; transform: translateX(0); }

/* ══ Ornate：歌曲列表项（对齐 PlayStats 样板）══ */
html[data-motion="ornate"] .song-item {
  opacity: 0; transform: scaleX(0);
  transform-origin: center;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-slow) var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .song-item { opacity: 1; transform: scaleX(1); }

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

/* ══ Ornate：详情头部 + 封面方块装饰（对齐 PlayStats 样板）══ */

/* ── 鸢尾花纹（明暗两套，根 .playlist-detail.theme-dark 切换） ── */
html[data-motion="ornate"] .playlist-detail {
  --pd-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23000'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}
html[data-motion="ornate"] .playlist-detail.theme-dark {
  --pd-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23fff'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}

/* ── 详情头部：蕾丝内衬 + 左侧 3 鸢尾（inset 6px，5px 密度） ── */
html[data-motion="ornate"] .detail-header::before {
  content: '';
  position: absolute; inset: 6px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    var(--pd-deco), var(--pd-deco), var(--pd-deco);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%, 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%;
  opacity: 0;
  animation: pd-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .detail-header::before { opacity: 0.5; }

/* 标题两侧对称点缀（与设置页一致：3 圆点 + 双短线 + 双小弧） */
html[data-motion="ornate"] .detail-header .playlist-text h2::before,
html[data-motion="ornate"] .detail-header .playlist-text h2::after {
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
html[data-motion="ornate"] .entered .detail-header .playlist-text h2::before,
html[data-motion="ornate"] .entered .detail-header .playlist-text h2::after {
  opacity: 0.75;
  transform: scaleX(1);
}
@keyframes pd-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px, 12px 20%, 12px 50%, 12px 80%; }
}

@keyframes pd-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* ── 封面方块：蕾丝内衬（inset 3px，7px 密度） ── */
html[data-motion="ornate"] .playlist-cover { position: relative; }
html[data-motion="ornate"] .playlist-cover::before {
  content: '';
  position: absolute; inset: 3px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0;
  animation: pd-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .playlist-cover::before { opacity: 0.4; }

/* ── 封面方块：四角蝙蝠（缩放入场 + 闪烁 + 偶发变红） ── */
html[data-motion="ornate"] .playlist-cover::after {
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
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
html[data-motion="ornate"] .entered .playlist-cover::after {
  opacity: 0.65;
  transform: scale(1);
  animation: pd-bat 5s ease-in-out infinite;
}

/* 按钮：hover 反色 + 四边 currentColor 延展（对齐设置页） */
html[data-motion="ornate"] .back-btn,
html[data-motion="ornate"] .detail-toolbar .rc-global-btn { position: relative; }
html[data-motion="ornate"] .back-btn::before,
html[data-motion="ornate"] .detail-toolbar .rc-global-btn::before {
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
html[data-motion="ornate"] .back-btn:hover::before,
html[data-motion="ornate"] .detail-toolbar .rc-global-btn:hover::before {
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
