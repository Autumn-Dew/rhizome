<template>
  <div class="local-music" :class="[themeClass, { entered: entered }]">
    <div class="local-header">
      <div>
        <h2>本地音乐</h2>
        <p class="desc">扫描并管理本地音频文件</p>
      </div>
      <span class="header-controls">
        <span class="sort-controls">
          <button class="tl-entry-btn" @click="cycleSortField" :title="'按' + sortFieldLabel + '排序'">{{ sortFieldLabel }}</button>
          <button class="tl-entry-btn" :disabled="isDefaultSort" @click="toggleSortDir" :title="isDefaultSort ? '默认排序无方向' : sortDirLabel + '（点击切换）'">{{ isDefaultSort ? '⇅' : (sortDir === 'asc' ? '↑' : '↓') }}</button>
        </span>
        <span class="view-tabs">
          <button class="tl-entry-btn" :class="{ active: viewMode === 'folders' }" @click="viewMode = 'folders'">文件夹</button>
          <button class="tl-entry-btn" :class="{ active: viewMode === 'albums' }" @click="viewMode = 'albums'">专辑</button>
          <button class="tl-entry-btn" :class="{ active: viewMode === 'artists' }" @click="viewMode = 'artists'">艺人</button>
        </span>
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
      <button class="rc-global-btn" @click="toggleSortMode" :class="{ active: sortMode }" :disabled="viewMode !== 'folders' || !isDefaultSort">
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
        <button class="rc-global-btn" :class="{ 'delete-warning': confirmHint('__batch__') !== '' }" :style="pulseFor('__batch__')" @click.stop="batchDelete" :disabled="!selectedSet.size" :title="confirmHint('__batch__') || '批量删除'" data-charge-sound>
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
    <div class="folder-strip" v-if="!musicStore.loading && musicStore.folders.length && viewMode === 'folders'">
      <div class="folder-strip-scroll" ref="folderStripRef" @wheel.prevent="onFolderStripWheel">
        <button
            class="folder-chip"
            :class="{ active: activeFolder === null }"
            @click="folderSortMode ? exitFolderSort() : (activeFolder = null)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13" stroke-width="2"/>
          </svg>
          <span>全部 ({{ musicStore.songList.length }})</span>
        </button>
        <button
            v-for="(folder, idx) in displayFolders"
            :key="folder.path"
            class="folder-chip"
            :class="{
              active: activeFolder === folder.path,
              'sort-mode': folderSortMode,
              'sort-source': folderSortMode && folderSortIdx === idx,
              'sort-target': folderSortMode && folderTargetIdx === idx
            }"
            @click="onFolderChipClick(folder, idx)"
            @click.middle.prevent="removeFolder(folder)"
            @mousedown="onFolderChipMouseDown(idx)"
            @mouseup="onFolderChipMouseUp"
            @mouseenter="onFolderChipMouseEnter(idx)"
            @mouseleave="onFolderChipMouseLeave"
            :title="folder.path"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke-width="2"/>
          </svg>
          <span>{{ folder.name }}</span>
          <span class="folder-count">{{ folder.songCount }}</span>
        </button>
      </div>
    </div>

    <!-- 专辑视图 -->
    <div class="view-grid" v-if="viewMode === 'albums'">
      <div class="view-card" v-for="(a, ai) in albums" :key="a.name" @click="goAlbum(a.name)" :style="staggerStyle(ai)">
        <div class="view-card-cover"><img v-if="a.coverUrl" :src="a.coverUrl" loading="lazy" decoding="async" /><svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg></div>
        <div class="view-card-name">{{ a.name }}</div>
        <div class="view-card-badge">{{ a.count }}</div>
      </div>
    </div>

    <!-- 艺人视图 -->
    <div class="view-grid" v-if="viewMode === 'artists'">
      <div class="view-card" v-for="(a, ai) in artists" :key="a.name" @click="goArtist(a.name)" :style="staggerStyle(ai)">
        <div class="view-card-cover"><img v-if="a.coverUrl" :src="a.coverUrl" loading="lazy" decoding="async" /><svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg></div>
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
            'missing': item.exists === false
          }"
          @click="sortMode ? null : multiMode ? toggleSelect(item) : null"
          @dblclick="!sortMode && !multiMode && playItem(item)"
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
        <div class="song-index" v-else>{{ showPlayCountInIndex ? (playCountMap[item.path] || 0) : (idx + 1) }}</div>
        <div class="song-cover" v-if="item.coverUrl">
          <img :src="item.coverUrl" alt="cover" loading="lazy" decoding="async" />
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
          <button class="song-btn" :class="{ 'delete-warning': confirmHint(item.path) !== '' }" :style="pulseFor(item.path)" @click.stop="deleteSong(item)" @dblclick.stop :title="confirmHint(item.path) || '删除'" data-charge-sound>
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
import { computed, ref, onMounted, onActivated, watch, nextTick } from "vue";
import { useRouter } from 'vue-router'
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePageEnter } from "@/composables/usePageEnter";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { useCurrentSongHighlight } from "@/composables/useCurrentSongHighlight";
import { useSongList } from "@/composables/useSongList";
import FavoriteButton from "@/components/common/FavoriteButton.vue";
import { K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS, K_SORT_PREF, K_SORT_ORDERS, K_PLAY_COUNT_REAL } from "@/constants/storage-keys";
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { formatTime } from '@/utils/format'
import { createSongFromMeta } from '@/utils/song-factory'
import { usePlayCountBar } from '@/composables/usePlayCountBar'
import { playHoldSound } from '@/composables/useSound'
import { sortItems, applyPathOrder, SORT_FIELDS, SORT_FIELD_LABELS } from '@/utils/sort'

const { themeClass } = useGlobalTheme();
const router = useRouter()
const playerStore = usePlayerStore();
const musicStore = useLocalMusicStore();
const { isCurrentSong } = useCurrentSongHighlight();
const { confirmDelete, resetConfirm, clickCount, confirmHint, pulseFor } = useDeleteConfirm()
const { barColor } = usePlayCountBar()

const viewMode = ref('folders')
const activeAlbum = ref(null)
const activeArtist = ref(null)

// ── 排序偏好（默认 / 名称 / 播放次数 / 播放时间 + 升降序，三视图共用） ──
function readSortPref() {
  try {
    const p = JSON.parse(localStorage.getItem(K_SORT_PREF) || '{}')
    return {
      field: SORT_FIELDS.includes(p.field) ? p.field : 'default',
      dir: p.dir === 'desc' ? 'desc' : 'asc',
    }
  } catch { return { field: 'default', dir: 'asc' } }
}
const _sp = readSortPref()
const sortField = ref(_sp.field)
const sortDir = ref(_sp.dir)
function persistSortPref() {
  localStorage.setItem(K_SORT_PREF, JSON.stringify({ field: sortField.value, dir: sortDir.value }))
}
// 排序方式按钮：循环切换 默认 → 名称 → 播放次数 → 播放时间
function cycleSortField() {
  // 切换排序方式前先退出进行中的手动排序，避免文件夹索引错位 / 序号输入失效
  if (folderSortMode.value) exitFolderSort()
  if (sortMode.value) toggleSortMode()
  const i = SORT_FIELDS.indexOf(sortField.value)
  sortField.value = SORT_FIELDS[(i + 1) % SORT_FIELDS.length]
  persistSortPref()
}
// 升降序按钮：升降切换
function toggleSortDir() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  persistSortPref()
}
const sortFieldLabel = computed(() => SORT_FIELD_LABELS[sortField.value] || '默认')
const sortDirLabel = computed(() => (sortDir.value === 'asc' ? '升序' : '降序'))
// 默认排序（按添加顺序）不支持方向，且不支持手动排序
const isDefaultSort = computed(() => sortField.value === 'default')
// 播放次数排序时，序号列覆盖显示该歌播放次数
const showPlayCountInIndex = computed(() => sortField.value === 'plays' && !sortMode.value)

// ── 每作用域手动手动排序顺序（文件夹独立于「全部」） ──
function readSortOrders() {
  try { return JSON.parse(localStorage.getItem(K_SORT_ORDERS) || '{}') } catch { return {} }
}
const sortOrders = ref(readSortOrders())
function persistSortOrders() {
  localStorage.setItem(K_SORT_ORDERS, JSON.stringify(sortOrders.value))
}

// ── 播放次数映射（供排序取值） ──
const playCountMap = computed(() => {
  try { return JSON.parse(localStorage.getItem(K_PLAY_COUNT_REAL) || '{}') } catch { return {} }
})
// 歌曲排序取值
function songSortValue(s) {
  if (sortField.value === 'plays') return playCountMap.value[s.path] || 0
  if (sortField.value === 'recent') return s.duration || 0 // recent = 歌曲时长
  return s.name || ''
}
// 分组（专辑/艺人）排序取值
function groupSortValue(g) {
  if (sortField.value === 'plays') return g.plays
  if (sortField.value === 'recent') return g.totalDuration
  return g.name || ''
}
function goAlbum(name) { router.push(`/player/album/album/${encodeURIComponent(name)}`) }
function goArtist(name) { router.push(`/player/album/artist/${encodeURIComponent(name)}`) }

watch(viewMode, () => { exitFolderSort(); resetEnter(); nextTick(() => { triggerEnter() }) })

// keep-alive 缓存后返回时，重读可能已在设置页修改过的排序设置
onActivated(() => {
  const sp = readSortPref()
  sortField.value = sp.field
  sortDir.value = sp.dir
  sortOrders.value = readSortOrders()
})

// 文件夹 chips 顺序固定（与排序方式无关，仅支持默认下的长按手动排序）
const displayFolders = computed(() => musicStore.folders)

const albums = computed(() => {
  const map = {}
  for (const s of musicStore.songList) {
    const key = s.album || '未知专辑'
    if (!map[key]) map[key] = { name: key, coverUrl: s.coverUrl, count: 0, plays: 0, totalDuration: 0 }
    map[key].count++
    map[key].plays += playCountMap.value[s.path] || 0
    map[key].totalDuration += s.duration || 0
  }
  let list = Object.values(map)
  if (viewMode.value === 'albums' && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  return isDefaultSort.value ? list : sortItems(list, groupSortValue, sortDir.value)
})
const artists = computed(() => {
  const map = {}
  for (const s of musicStore.songList) {
    const key = s.singer || '未知歌手'
    if (!map[key]) map[key] = { name: key, coverUrl: s.coverUrl, count: 0, plays: 0, totalDuration: 0 }
    map[key].count++
    map[key].plays += playCountMap.value[s.path] || 0
    map[key].totalDuration += s.duration || 0
  }
  let list = Object.values(map)
  if (viewMode.value === 'artists' && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }
  return isDefaultSort.value ? list : sortItems(list, groupSortValue, sortDir.value)
})
const albumSongs = computed(() => {
  if (!activeAlbum.value) return []
  return musicStore.songList.filter(s => (s.album || '未知专辑') === activeAlbum.value)
})
const artistSongs = computed(() => {
  if (!activeArtist.value) return []
  return musicStore.songList.filter(s => (s.singer || '未知歌手') === activeArtist.value)
})

const activeFolder = ref(null);
// 排序作用域：当前文件夹路径，或 '__all__'（全部）
const scopeKey = computed(() => activeFolder.value ?? '__all__')
// 作用域内的歌（仅按文件夹过滤，不含搜索），作为序号排序的落点
const scopeSongs = computed(() => {
  if (!activeFolder.value) return musicStore.songList
  return musicStore.songList.filter(s => s.path.startsWith(activeFolder.value))
})

const {
  sortMode, sortOrderMap,
  toggleSortMode, onSortOrderInput,
  multiMode, selectedSet,
  toggleMultiMode, toggleSelect, isAllSelectedFn, toggleSelectAllFn,
  cancelMulti, scrollToCurrent,
} = useSongList(scopeSongs, null, (newList) => {
  // 序号排序结果按作用域保存，文件夹与「全部」相互独立
  sortOrders.value = { ...sortOrders.value, [scopeKey.value]: newList.map(s => s.path) }
  persistSortOrders()
})
const { entered, staggerStyle, triggerEnter, resetEnter } = usePageEnter();
const folderStripRef = ref(null);

// 文件夹 Strip 鼠标滚轮横向滚动（绑定在 template 上，随 v-if 渲染自动生效）
function onFolderStripWheel(e) {
  const strip = folderStripRef.value
  if (strip) strip.scrollLeft += e.deltaY
}

// ── 文件夹长按排序（光标方向 + 延时变黑） ──
const folderSortMode = ref(false)
const folderSortIdx = ref(-1)
const folderTargetIdx = ref(-1)
let folderHoldTimer = null
let folderEnterTimer = null
let folderHoverTimer = null
let folderHoldSoundFired = false
let folderSortJustEntered = false

function clearFolderHoldTimers() {
  clearTimeout(folderHoldTimer)
  clearTimeout(folderEnterTimer)
  folderHoldTimer = null
  folderEnterTimer = null
}

function clearFolderHoverTimer() {
  clearTimeout(folderHoverTimer)
  folderHoverTimer = null
}

function onFolderChipMouseDown(idx) {
  if (folderSortMode.value) return
  // 手动排序仅在「默认」排序方式下可用（预设排序方式有自己的处理逻辑）
  if (!isDefaultSort.value) return
  folderHoldSoundFired = false
  clearFolderHoldTimers()
  // 长按 1s：播放提示音效
  folderHoldTimer = setTimeout(() => {
    if (!folderHoldSoundFired) {
      folderHoldSoundFired = true
      playHoldSound()
    }
  }, 1000)
  // 长按 4s：进入排序模式
  folderEnterTimer = setTimeout(() => {
    folderSortMode.value = true
    folderSortIdx.value = idx
    folderTargetIdx.value = -1
    folderSortJustEntered = true
  }, 4000)
}

function onFolderChipMouseUp() {
  // 松手取消长按计时（已进入排序模式则保持）
  clearFolderHoldTimers()
  folderHoldSoundFired = false
  // 排序模式下，若已有变黑目标，松手确认移动
  if (folderSortMode.value && folderTargetIdx.value !== -1 && folderTargetIdx.value !== folderSortIdx.value) {
    moveFolder(folderSortIdx.value, folderTargetIdx.value)
    exitFolderSort()
    folderSortJustEntered = true // 忽略随后的 click（松手会触发一次）
    return
  }
  // 若 click 未落在 chip 上（移出后松手），兜底清除 justEntered，避免残留吞掉下次点击
  if (folderSortJustEntered) {
    setTimeout(() => { folderSortJustEntered = false }, 0)
  }
}

function onFolderChipMouseEnter(idx) {
  if (folderSortMode.value) onFolderSortHover(idx)
}

function onFolderChipMouseLeave() {
  if (folderSortMode.value) {
    onFolderSortLeave()
  } else {
    clearFolderHoldTimers()
    folderHoldSoundFired = false
  }
}

// 排序模式下，光标悬停到目标文件夹，延时 1s 后变黑（预览目标位置）
function onFolderSortHover(idx) {
  if (!folderSortMode.value) return
  if (idx === folderSortIdx.value) {
    clearFolderHoverTimer()
    folderTargetIdx.value = -1
    return
  }
  clearFolderHoverTimer()
  folderHoverTimer = setTimeout(() => {
    folderTargetIdx.value = idx
  }, 1000)
}

function onFolderSortLeave() {
  clearFolderHoverTimer()
}

function moveFolder(from, to) {
  if (from === to) return
  const list = [...musicStore.folders]
  const [moved] = list.splice(from, 1)
  let target = to
  if (from < to) target--
  list.splice(target, 0, moved)
  musicStore.folders = list
  musicStore._saveFolders()
}

function exitFolderSort() {
  folderSortMode.value = false
  folderSortIdx.value = -1
  folderTargetIdx.value = -1
  clearFolderHoldTimers()
  clearFolderHoverTimer()
  folderHoldSoundFired = false
  folderSortJustEntered = false
}

function onFolderChipClick(folder, idx) {
  // 长按进入排序模式后松手触发的 click 忽略
  if (folderSortJustEntered) {
    folderSortJustEntered = false
    return
  }
  if (folderSortMode.value) {
    // 点击变黑的目标文件夹确认移动
    if (folderTargetIdx.value !== -1 && idx === folderTargetIdx.value && idx !== folderSortIdx.value) {
      moveFolder(folderSortIdx.value, folderTargetIdx.value)
    }
    exitFolderSort()
  } else {
    activeFolder.value = folder.path
  }
}
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
  let list = scopeSongs.value
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
  // 默认排序：按添加顺序，可被该作用域的手动序号排序覆盖；其它方式按所选字段排序
  if (isDefaultSort.value) {
    const order = sortOrders.value[scopeKey.value]
    if (order && order.length) return applyPathOrder(list, order)
    return list
  }
  return sortItems(list, songSortValue, sortDir.value)
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

/* 文件夹横向滚动条（外层：分割线固定不随滚动；内层：滚动） */
.folder-strip {
  border-bottom: 1px solid transparent;
  background: var(--bg-secondary);
}

.folder-strip-scroll {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
}

.folder-strip-scroll::-webkit-scrollbar {
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

/* 文件夹长按排序模式 */
.folder-chip.sort-mode {
  cursor: pointer;
  border-style: dashed;
}
.folder-chip.sort-source {
  border-style: solid;
  border-color: var(--btn-hover-bg);
}
.folder-chip.sort-target {
  background: #000;
  border-color: #000;
  color: #fff;
}
.folder-chip.sort-target .folder-count {
  background: rgba(255, 255, 255, 0.25);
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
  /* 屏外行跳过布局/绘制（等效轻量虚拟滚动），减少长列表开销 */
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
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

/* ── 加入歌单弹窗：四角蝙蝠 ── */
html[data-motion="ornate"] .playlist-select-popup { position: relative; }
html[data-motion="ornate"] .playlist-select-popup::after {
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
  animation: lm-bat2 5s ease-in-out infinite;
}
@keyframes lm-bat2 {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
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

/* ornate：列表项从中间向两侧浮现（替代 classic 的左侧滑入） */
html[data-motion="ornate"] .song-item {
  opacity: 0; transform: scaleX(0);
  transform-origin: center;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-slow) var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .song-item { opacity: 1; transform: scaleX(1); }

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
.tl-entry-btn:disabled { opacity: .45; cursor: default; }
.tl-entry-btn:disabled:hover { background: var(--bg-secondary); color: var(--text-primary); }
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

/* 排序控件（视图控件左侧：排序方式 + 升降序） */
.header-controls { display: flex; align-items: center; gap: 12px; }
.sort-controls { display: flex; gap: 0; }
.sort-controls .tl-entry-btn:not(:first-child) { border-left: none; }
.sort-controls .tl-entry-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.sort-controls .tl-entry-btn:nth-child(1) { transition-delay: 0.06s; }
.sort-controls .tl-entry-btn:nth-child(2) { transition-delay: 0.10s; }
.entered .sort-controls .tl-entry-btn { opacity: 1; transform: scaleX(1); }

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
  /* 屏外卡片跳过布局/绘制 */
  content-visibility: auto;
  contain-intrinsic-size: auto 160px;
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
/* ══════════════════════════════════════════════════════════════
   Ornate（华丽方案）页面装饰 —— 沿用设置页风格
   （本页头部为「左标题 + 右控制」布局，故不加标题居中）
   ══════════════════════════════════════════════════════════════ */

/* ── 鸢尾花纹（明暗两套） ── */
html[data-motion="ornate"] .local-music {
  --lm-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23000'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}
html[data-motion="ornate"] .local-music.theme-dark {
  --lm-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23fff'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}

/* ── 页面头：外蕾丝 + 两侧鸢尾 ── */
html[data-motion="ornate"] .local-header { position: relative; }
html[data-motion="ornate"] .local-header::before {
  content: '';
  position: absolute; inset: 6px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    var(--lm-deco), var(--lm-deco), var(--lm-deco);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%, 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%;
  opacity: 0;
  animation: lm-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .local-header::before { opacity: 0.5; }
/* 标题/副标题居中：三列 grid（左空 / 中标题 / 右控制）；
   标题保持在文档流内，使页头高度与其它页面一致（不再绝对居中导致高度塌陷） */
html[data-motion="ornate"] .local-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
html[data-motion="ornate"] .local-header > div { grid-column: 2; text-align: center; }
html[data-motion="ornate"] .local-header h2 { text-align: center; letter-spacing: 2px; }
html[data-motion="ornate"] .local-header .desc { text-align: center; }
html[data-motion="ornate"] .local-header > .header-controls { grid-column: 3; justify-self: end; }
@keyframes lm-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px, 12px 20%, 12px 50%, 12px 80%; }
}

/* 标题两侧对称点缀（与设置页一致：3 圆点 + 双短线 + 双小弧） */
html[data-motion="ornate"] .local-header h2::before,
html[data-motion="ornate"] .local-header h2::after {
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
html[data-motion="ornate"] .entered .local-header h2::before,
html[data-motion="ornate"] .entered .local-header h2::after {
  opacity: 0.75;
  transform: scaleX(1);
}

/* ── 列表项：hover 单层红覆盖 + 两只白蝙蝠，自中间向两侧展开 ── */
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

/* ── 文件夹芯片：轻内衬蕾丝 ── */
html[data-motion="ornate"] .folder-chip { position: relative; }
html[data-motion="ornate"] .folder-chip::before {
  content: '';
  position: absolute; inset: 2px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px);
  background-repeat: no-repeat;
  background-size: 100% 2px, 100% 2px, 2px 100%, 2px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0.35;
}

/* ── 按钮：hover 反色 + 四边 currentColor 延展（对齐设置页） ── */
html[data-motion="ornate"] .rc-global-btn,
html[data-motion="ornate"] .tl-entry-btn,
html[data-motion="ornate"] .folder-chip { position: relative; }
html[data-motion="ornate"] .rc-global-btn::before,
html[data-motion="ornate"] .tl-entry-btn::before,
html[data-motion="ornate"] .folder-chip::after {
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
html[data-motion="ornate"] .tl-entry-btn:hover::before,
html[data-motion="ornate"] .folder-chip:hover::after {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}

/* ══ 专辑 / 艺人视图卡片：蕾丝内衬 + 四角蝙蝠 + hover 红覆盖 ══ */
html[data-motion="ornate"] .view-card {
  position: relative;
  transform: scale(0.6);
  transition: opacity 0.5s var(--motion-easing-standard),
              transform 1.15s cubic-bezier(0.34, 1.8, 0.64, 1);
}
html[data-motion="ornate"] .entered .view-card { transform: scale(1); }
/* 内衬蕾丝框 */
html[data-motion="ornate"] .view-card::before {
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
  animation: lm-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .view-card::before { opacity: 0.4; }
/* 四角蝙蝠（闪烁 + 偶发变红） */
html[data-motion="ornate"] .view-card::after {
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
html[data-motion="ornate"] .entered .view-card::after {
  opacity: 0.65;
  transform: scale(1);
  animation: lm-bat 5s ease-in-out infinite;
}
@keyframes lm-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}
/* hover：红色覆盖 */
html[data-motion="ornate"] .view-card:hover {
  background: #c0392b !important;
  color: #fff !important;
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
