<template>
  <div class="my-playlist" :class="[themeClass, { entered: entered }]">
    <div class="playlist-header">
      <h2>我的歌单</h2>
      <p class="desc">管理个人本地音乐歌单</p>
    </div>

    <div class="playlist-toolbar">
      <button class="rc-global-btn" @click="openCreateModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 4v16M4 12h16" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>创建歌单</span>
      </button>
    </div>

    <div class="playlist-list">
      <div class="playlist-item" v-for="(item, idx) in playlistList" :key="item.localId" :style="staggerStyle(idx)" @dblclick="goToPlaylistDetail(item)">
        <div class="playlist-index">{{ playlistList.indexOf(item) + 1 }}</div>
        <div class="playlist-cover" @click="goToPlaylistDetail(item)">
          <img v-if="item.coverUrl" :src="item.coverUrl" alt="cover" loading="lazy" decoding="async" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 4h16v16H4V4z M8 8h8M8 12h6M8 16h4" stroke-width="2"/>
          </svg>
        </div>
        <div class="playlist-info">
          <div class="playlist-name">
            {{ item.title }}
            <span v-if="item.isFavorites" class="pl-tag fav-tag">♥</span>
            <span v-if="item.isAuto" class="pl-tag auto-tag">自动</span>
          </div>
          <div class="playlist-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18V5l12-2v13" stroke-width="2"/>
              </svg>
              {{ item.songCount || 0 }}首
            </span>
          </div>
        </div>
        <div class="playlist-actions">
          <button
              v-if="item.isAuto"
              class="song-btn"
              @click="saveAutoPlaylist(item)"
              title="永久保存"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke-width="2"/>
            </svg>
          </button>
          <button class="song-btn" @click="playPlaylist(item)" title="播放">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 3l14 9-14 9V3z" stroke-width="2"/>
            </svg>
          </button>
          <button v-if="!item.isAuto" class="song-btn" @click="openAddSongModal(item)" title="添加歌曲">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" stroke-width="2"/>
            </svg>
          </button>
          <button v-if="!item.isAuto" class="song-btn" @click="editPlaylist(item)" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-width="2"/>
            </svg>
          </button>
          <button
              v-if="!item.isFavorites && !item.isAuto"
              class="song-btn"
              :class="{ 'delete-warning': confirmHint(item.localId) !== '' }"
              :style="pulseFor(item.localId)"
              @click.stop="handleDeleteClick(item)"
              @dblclick.stop
              :title="confirmHint(item.localId) || '删除'"
              data-charge-sound
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="empty" v-if="playlistList.length===0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 4h16v16H4V4zM8 8h8M8 12h6M8 16h4" stroke-width="2"/>
        </svg>
        <p>暂无歌单，点击创建歌单开始吧</p>
      </div>
    </div>

    <div class="modal-mask" v-show="showModal" @click.self="closeModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>{{ isEdit ? '编辑歌单' : '创建歌单' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">歌单名称</label>
            <input v-model="form.title" placeholder="请输入歌单名" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">歌单介绍</label>
            <textarea v-model="form.intro" placeholder="请输入简介" rows="3" class="form-textarea"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-confirm" @click="submitForm">确认保存</button>
        </div>
      </div>
    </div>

    <div class="modal-mask" v-show="showAddSongModal" @click.self="closeAddSongModal">
      <div class="modal-content" :class="[themeClass]">
        <div class="modal-header">
          <h3>添加歌曲到歌单</h3>
          <button class="close-btn" @click="closeAddSongModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">当前歌单：{{ currentAddPlaylist?.title }}</label>
          </div>
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
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">- {{ song.singer }}</span>
              </div>
              <div class="empty-select" v-if="!availableSongs.length">
                暂无本地音乐
              </div>
            </div>
          </div>
          <div class="form-group">
            <button class="folder-add-btn" @click="addFolderToPlaylist">从文件夹添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddSongModal">取消</button>
          <button class="btn-confirm" @click="addSongsToPlaylist">确认添加 ({{ selectedPathSet.size }})</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, toRaw } from "vue";
import { useGlobalTheme } from "@/composables/useGlobalTheme";
import { usePlayerStore } from "@/stores/playerStore";
import { useLocalMusicStore } from "@/stores/localMusicStore";
import { usePageEnter } from '@/composables/usePageEnter'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS } from "@/constants/storage-keys";
import { createSongFromMeta } from '@/utils/song-factory'

const { themeClass } = useGlobalTheme();
const playerStore = usePlayerStore();
const localMusicStore = useLocalMusicStore();
const router = useRouter()

const playlistList = ref([]);

const showModal = ref(false);
const isEdit = ref(false);
const editTarget = ref(null);
const form = ref({ title: "", intro: "" });
const showAddSongModal = ref(false);
const currentAddPlaylist = ref(null);
const selectedPathSet = ref(new Set());
const { entered, staggerStyle, triggerEnter } = usePageEnter();
const { confirmDelete, resetConfirm, clickCount, confirmHint, pulseFor } = useDeleteConfirm();

const handleDeleteClick = (item) => {
  // 禁止删除系统歌单
  if (item.isFavorites || item.isAuto) return
  if (!confirmDelete(item.localId)) return
  resetConfirm()
  // 真正删除
  let local = getLocalPlaylists()
  local = local.filter(i => i.localId !== item.localId);
  localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(local));
  const songs = getLocalPlaylistSongs()
  delete songs[item.localId];
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(songs));
  loadPlaylistList()
}

// 过滤已在当前歌单中的歌曲
const availableSongs = computed(() => {
  if (!currentAddPlaylist.value) return localMusicStore.songList
  const songsMap = getLocalPlaylistSongs()
  const existingKeys = new Set(songsMap[currentAddPlaylist.value.localId] || [])
  return localMusicStore.songList.filter(s => !existingKeys.has(s.path))
})

function getLocalPlaylistSongs() {
  try {
    const data = localStorage.getItem(K_PLAYLIST_SONGS)
    if (!data) return {}
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed)) {
      localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify({}))
      return {}
    }
    return parsed || {}
  } catch (e) { return {} }
}

function getLocalPlaylists() {
  try { return JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || "[]"); }
  catch (e) { return []; }
}

const loadPlaylistList = () => {
  const localList = getLocalPlaylists()
  const localSongs = getLocalPlaylistSongs()
  playlistList.value = localList.map(pl => {
    const keys = localSongs[pl.localId] || []
    // 取第一首有封面的歌曲作为歌单封面
    let cover = pl.coverUrl || ''
    if (!cover && keys.length) {
      for (const key of keys) {
        const found = localMusicStore.songList.find(x => x.path === key || x.songKey === key)
        if (found?.coverUrl) { cover = found.coverUrl; break }
      }
    }
    return { ...pl, songCount: keys.length, coverUrl: cover }
  })
};

const addSongsToPlaylist = () => {
  const keys = Array.from(selectedPathSet.value)
  if (!keys.length) return
  const pl = currentAddPlaylist.value
  const localSongs = getLocalPlaylistSongs()
  const songList = localSongs[pl.localId] || []
  const set = new Set(songList)
  keys.forEach(k => set.add(k))
  localSongs[pl.localId] = Array.from(set)
  localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(localSongs))
  closeAddSongModal()
  loadPlaylistList()
}

const addFolderToPlaylist = async () => {
  const result = await window.electron.selectAudioFolder()
  if (!result || !result.files.length) return

  const pl = currentAddPlaylist.value
  const localSongs = getLocalPlaylistSongs()
  const existing = new Set(localSongs[pl.localId] || [])

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
    localSongs[pl.localId] = Array.from(existing)
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(localSongs))
  }

  closeAddSongModal()
  loadPlaylistList()
}

const submitForm = () => {
  if (!form.value.title?.trim()) return;
  const localList = getLocalPlaylists()
  const dup = localList.find(x =>
    x.title.trim() === form.value.title.trim() &&
    (!isEdit.value || x.localId !== editTarget.value?.localId)
  )
  if (dup) { alert('歌单名称已存在，请换一个名称'); return }
  const data = { title: form.value.title, intro: form.value.intro };
  if (isEdit.value && editTarget.value) {
    const idx = localList.findIndex(x => x.localId === editTarget.value.localId);
    if (idx !== -1) {
      localList[idx] = { ...localList[idx], ...data };
      localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(localList));
    }
  } else {
    localList.unshift({ ...data, localId: Date.now() });
    localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(localList));
  }
  closeModal();
  loadPlaylistList();
};

const toggleSelectSong = (song) => {
  selectedPathSet.value.has(song.path) ? selectedPathSet.value.delete(song.path) : selectedPathSet.value.add(song.path);
};

const openCreateModal = () => { resetConfirm(); isEdit.value = false; form.value = { title: "", intro: "" }; showModal.value = true; };
const editPlaylist = (item) => { resetConfirm(); isEdit.value = true; editTarget.value = item; form.value = { ...item }; showModal.value = true; };
const closeModal = () => showModal.value = false;
const openAddSongModal = (item) => { resetConfirm(); currentAddPlaylist.value = item; selectedPathSet.value.clear(); showAddSongModal.value = true; };
const closeAddSongModal = () => showAddSongModal.value = false;

const playPlaylist = (item) => {
  const localSongsMap = getLocalPlaylistSongs()
  const songPaths = localSongsMap[item.localId] || []
  if (!songPaths.length) return
  const localMusic = toRaw(localMusicStore.songList)
  const realSongList = songPaths.map(key => {
    const found = localMusic.find(x => x.path === key || x.songKey === key)
    if (found) return { ...found, exists: true }
    return null
  }).filter(Boolean)
  if (!realSongList.length) return
  playerStore.setPlayList(realSongList)
  playerStore.playGlobalSong(realSongList[0])
}

const goToPlaylistDetail = (item) => router.push(`/player/playlist-detail/${item.localId}`)

// 永久保存自动歌单：转为普通歌单（脱离自动生成的清理）
function saveAutoPlaylist(item) {
  try {
    const local = getLocalPlaylists()
    const songs = getLocalPlaylistSongs()
    const idx = local.findIndex(p => p.localId === item.localId)
    if (idx === -1) return
    const pl = local[idx]
    const newId = `pl_${Date.now()}`
    const oldSongs = songs[item.localId] || []
    local.splice(idx, 1)
    local.unshift({
      localId: newId,
      title: pl.title,
      intro: pl.intro,
      coverUrl: pl.coverUrl,
      isAuto: false,
      createdAt: Date.now(),
    })
    songs[newId] = oldSongs
    delete songs[item.localId]
    localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(local))
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(songs))
    loadPlaylistList()
    ElMessage?.success?.({ message: '已保存为普通歌单', duration: 1500 })
  } catch {}
}

onMounted(async () => { if (!localMusicStore.loaded && !localMusicStore.loading) await localMusicStore.initFromStorage(); loadPlaylistList(); triggerEnter(); });
</script>

<style scoped>
.my-playlist {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.my-playlist::-webkit-scrollbar { display: none; }
.playlist-header { padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.playlist-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .playlist-header::after { transform: scaleX(1); }
.playlist-header h2 { font-size: 20px; margin: 0 0 4px; }
.desc { font-size: 12px; opacity: .7; margin: 0; }
.playlist-toolbar { display: flex; gap: 8px; padding: 12px; border-bottom: 2px solid transparent; position: relative; }
.playlist-toolbar::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .playlist-toolbar::after { transform: scaleX(1); }
.rc-global-btn { height: 36px; padding: 0 14px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; gap: 6px; cursor: pointer; transition: var(--motion-btn-hover); font-size: 13px; }
.rc-global-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.rc-global-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.playlist-list { margin: 0; }
.playlist-item {
  display: flex; align-items: center; padding: 0 12px; height: 52px;
  border-bottom: 1px solid var(--border-color);
  position: relative; z-index: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 52px;
}
.playlist-item::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: var(--btn-hover-bg);
  transform: scaleX(0); transform-origin: center;
  transition: transform var(--motion-duration-slow) var(--motion-easing-ease);
}
.playlist-item:hover::before { transform: scaleX(1); }
.playlist-item:hover { color: var(--btn-hover-text); }
.playlist-item:hover .playlist-index,
.playlist-item:hover .playlist-name,
.playlist-item:hover .playlist-info,
.playlist-item:hover .playlist-meta { color: inherit; }
.playlist-index { width: 40px; text-align: center; font-size: 13px; opacity: .7; }
.playlist-cover { width: 36px; height: 36px; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; background: var(--bg-secondary); margin-right: 12px; }
.playlist-cover img { width: 100%; height: 100%; object-fit: cover; }
.playlist-cover svg { width: 18px; height: 18px; stroke: currentColor; }
.playlist-info { flex: 1; padding: 0 12px; }
.playlist-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.pl-tag { font-size: 10px; padding: 1px 5px; margin-left: 6px; vertical-align: middle; }
.fav-tag { color: #e74c3c; }
.auto-tag { color: var(--text-primary); opacity: 0.5; border: 1px solid var(--border-color); }
.playlist-meta { display: flex; gap: 16px; font-size: 12px; opacity: .65; margin-bottom: 4px; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; }
.meta-item svg { width: 12px; height: 12px; }
.playlist-actions { display: flex; gap: 6px; flex-shrink: 0; }
.song-btn { width: 32px; height: 32px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: var(--motion-btn-hover); }
.song-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); border-color: var(--btn-hover-text); }
.song-btn.delete-warning { background: #ff6b6b33; border-color: #ff6b6b; color: #ff6b6b; }
.song-btn.delete-warning:hover { background: #ff6b6b; color: #fff; border-color: #ff6b6b; }
.song-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; }
.empty { padding: 60px 0; display: flex; flex-direction: column; align-items: center; opacity: .5; }
.empty svg { width: 60px; height: 60px; margin-bottom: 12px; fill: none; stroke: currentColor; }
.modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 450px; background: var(--bg-primary); border: 2px solid var(--border-color); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid var(--border-color); }
.modal-header h3 { font-size: 16px; margin: 0; }
.close-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--text-primary); }
.close-btn:hover { opacity: .7; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.form-input, .form-textarea { width: 100%; padding: 8px 10px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; font-family: inherit; }
.form-input:focus, .form-textarea:focus { outline: none; }
.form-textarea { resize: vertical; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px; border-top: 2px solid var(--border-color); }
.btn-cancel, .btn-confirm { padding: 6px 16px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: var(--motion-btn-hover); }
.btn-cancel:hover, .btn-confirm:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transform: translateY(-1px); }
.btn-confirm { background: var(--border-color); color: var(--bg-primary); }
.song-select-list { max-height: 300px; overflow-y: auto; border: 2px solid var(--border-color); scrollbar-width: none; -ms-overflow-style: none; }
.song-select-list::-webkit-scrollbar { display: none; }
.song-select-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background var(--motion-duration-normal); }
.song-select-item:hover { background: var(--bg-secondary); }
.song-select-item.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.song-name { font-size: 13px; }
.song-artist { font-size: 12px; opacity: .7; }
.empty-select { padding: 40px; text-align: center; opacity: .5; font-size: 13px; }
.folder-add-btn { width: 100%; height: 36px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: var(--motion-btn-hover); margin-top: 4px; }
.folder-add-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }

/* === 精密组装入场 === */
.playlist-header h2 {
  opacity: 0; transform: translateY(-10px); letter-spacing: 3px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard),
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard);
}
.entered .playlist-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }

.playlist-header .desc {
  opacity: 0; transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .playlist-header .desc { opacity: 1; transform: translateY(0); }

.playlist-toolbar .rc-global-btn {
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter);
}
.entered .playlist-toolbar .rc-global-btn { opacity: 1; transform: scaleX(1); }

.playlist-item {
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .playlist-item { opacity: 1; transform: translateX(0); }
/* ══════════════════════════════════════════════════════════════
   Ornate（华丽方案）页面装饰 —— 沿用设置页风格
   ══════════════════════════════════════════════════════════════ */

/* ── 鸢尾花纹（明暗两套） ── */
html[data-motion="ornate"] .my-playlist {
  --mp-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23000'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}
html[data-motion="ornate"] .my-playlist.theme-dark {
  --mp-deco: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='%23fff'%3E%3Cpath d='M50 4 C45 20 37 28 26 32 C17 36 13 45 16 53 C19 61 28 64 34 61 C27 57 25 50 29 45 C33 40 42 43 46 52 C48 57 49 63 50 70 C51 63 52 57 54 52 C58 43 67 40 71 45 C75 50 73 57 66 61 C72 64 81 61 84 53 C87 45 83 36 74 32 C63 28 55 20 50 4 Z'/%3E%3Crect x='26' y='74' width='48' height='9'/%3E%3C/g%3E%3C/svg%3E");
}

/* ── 页面头：外蕾丝 + 两侧鸢尾，标题/副标题居中 ── */
html[data-motion="ornate"] .playlist-header { position: relative; }
html[data-motion="ornate"] .playlist-header::before {
  content: '';
  position: absolute; inset: 6px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 5px),
    var(--mp-deco), var(--mp-deco), var(--mp-deco),
    var(--mp-deco), var(--mp-deco), var(--mp-deco);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%, 14px 14px, 14px 14px, 14px 14px, 14px 14px, 14px 14px, 14px 14px;
  background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%, calc(100% - 12px) 20%, calc(100% - 12px) 50%, calc(100% - 12px) 80%;
  opacity: 0;
  animation: mp-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .playlist-header::before { opacity: 0.5; }
html[data-motion="ornate"] .playlist-header h2 { text-align: center; letter-spacing: 2px; }
/* 标题两侧对称点缀（与设置页一致：3 圆点 + 双短线 + 双小弧） */
html[data-motion="ornate"] .playlist-header h2::before,
html[data-motion="ornate"] .playlist-header h2::after {
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
html[data-motion="ornate"] .entered .playlist-header h2::before,
html[data-motion="ornate"] .entered .playlist-header h2::after {
  opacity: 0.75;
  transform: scaleX(1);
}
html[data-motion="ornate"] .playlist-header .desc { text-align: center; }
@keyframes mp-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0, 12px 20%, 12px 50%, 12px 80%, calc(100% - 12px) 20%, calc(100% - 12px) 50%, calc(100% - 12px) 80%; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px, 12px 20%, 12px 50%, 12px 80%, calc(100% - 12px) 20%, calc(100% - 12px) 50%, calc(100% - 12px) 80%; }
}

/* ── 列表项：从中间向两侧浮现 ── */
html[data-motion="ornate"] .playlist-item {
  opacity: 0; transform: scaleX(0);
  transform-origin: center;
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard),
              transform var(--motion-duration-slow) var(--motion-easing-enter);
}
html[data-motion="ornate"] .entered .playlist-item { opacity: 1; transform: scaleX(1); }

/* ── hover：单层红覆盖 + 两只白蝙蝠，自中间向两侧展开 ── */
html[data-motion="ornate"] .playlist-item::before,
html[data-motion="ornate"] .playlist-item:hover::before { display: none; }
html[data-motion="ornate"] .playlist-item::after {
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
html[data-motion="ornate"] .playlist-item:hover::after {
  opacity: 1;
  clip-path: inset(0 0 0 0);
}

/* ── 弹窗卡片：内衬蕾丝 ── */
html[data-motion="ornate"] .modal-content { position: relative; }
html[data-motion="ornate"] .modal-content::before {
  content: '';
  position: absolute; inset: 5px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .entered .modal-content::before { opacity: 0.4; }
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
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
              transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
html[data-motion="ornate"] .entered .modal-content::after {
  opacity: 0.65;
  transform: scale(1);
  animation: mp-mbat 5s ease-in-out infinite;
}
@keyframes mp-mbat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* ── 按钮：hover 反色 + 四边 currentColor 延展（对齐设置页） ── */
html[data-motion="ornate"] .rc-global-btn,
html[data-motion="ornate"] .song-btn,
html[data-motion="ornate"] .btn-cancel,
html[data-motion="ornate"] .btn-confirm,
html[data-motion="ornate"] .folder-add-btn { position: relative; }
html[data-motion="ornate"] .rc-global-btn::before,
html[data-motion="ornate"] .song-btn::before,
html[data-motion="ornate"] .btn-cancel::before,
html[data-motion="ornate"] .btn-confirm::before,
html[data-motion="ornate"] .folder-add-btn::before {
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
html[data-motion="ornate"] .song-btn:hover::before,
html[data-motion="ornate"] .btn-cancel:hover::before,
html[data-motion="ornate"] .btn-confirm:hover::before,
html[data-motion="ornate"] .folder-add-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>
