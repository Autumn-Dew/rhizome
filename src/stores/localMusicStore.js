import { defineStore } from 'pinia'
import { K_LOCAL_MUSIC_LIST, K_LOCAL_MUSIC_FOLDERS, K_SONG_CACHE } from '@/constants/storage-keys'

// 本地音乐库：歌曲列表、文件夹管理、路径持久化
const api = () => window.electron

export const useLocalMusicStore = defineStore('localMusic', {
    state: () => ({
        songList: [],
        folders: [],
        loaded: false,
        loading: false,
    }),

    actions: {
        // === 启动加载 ===
        async initFromStorage() {
            if (this.loaded || this.loading) return
            this.loading = true
            try {
                const api_ = api()
                const [paths, folders] = await Promise.all([
                    api_?.loadMusicPaths?.() ?? Promise.resolve(null),
                    api_?.loadMusicFolders?.() ?? Promise.resolve(null),
                ])
                // IPC 不可用则回退 localStorage
                const p = (paths !== null) ? paths : this._readLocal(K_LOCAL_MUSIC_LIST, [])
                const f = (folders !== null) ? (folders || []) : this._readLocal(K_LOCAL_MUSIC_FOLDERS, [])
                this.folders = f

                if (!p.length) {
                    const legacy = this._readLocal(K_LOCAL_MUSIC_LIST, [])
                    if (legacy.length) { await this._savePaths(legacy); p.push(...legacy) }
                }

                console.log(`[localMusic] 读取到 ${p.length} 个路径，${f.length} 个文件夹`)
                if (!p.length) {
                    // paths 为空时也同步清空缓存，避免残留脏 cache 被 mergeSongCache 加回
                    this._saveSongCache()
                    this.loaded = true
                    return
                }

                const CONCURRENCY = 25
                const results = []
                for (let i = 0; i < p.length; i += CONCURRENCY) {
                    const batch = p.slice(i, i + CONCURRENCY)
                    const parsed = await Promise.all(batch.map(async (fp) => {
                        try {
                            const raw = await api_?.parseAudio?.(fp)
                            if (!raw) return null
                            return {
                                path: raw.path,
                                name: raw.title,
                                singer: raw.singer,
                                album: raw.album || '',
                                year: raw.year || null,
                                genre: raw.genre || '',
                                track: raw.track || null,
                                composer: raw.composer || '',
                                duration: raw.duration || 0,
                                durationFormat: raw.durationFormat || '00:00',
                                playUrl: raw.path,
                                songKey: raw.songKey,
                                coverUrl: raw.coverUrl || '',
                                lyrics: raw.lyrics || [],
                                syncedLyrics: raw.syncedLyrics || [],
                                lyricsSource: raw.lyricsSource,
                                codec: raw._raw?.codec || '',
                                bitrate: raw._raw?.bitrate || null,
                                sampleRate: raw._raw?.sampleRate || null,
                                channels: raw._raw?.numberOfChannels || null,
                            }
                        } catch { return null }
                    }))
                    results.push(...parsed.filter(Boolean))
                }
                console.log(`[localMusic] 成功解析 ${results.length} 个文件`)
                this.songList = results
                this._saveSongCache()
                this.loaded = true
            } catch (e) {
                console.error('[localMusic] 加载失败', e)
                this.songList = []
                this.loaded = true
            } finally {
                this.loading = false
            }
        },

        _readLocal(key, fallback) {
            try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback } catch { return fallback }
        },

        // 保存轻量元数据缓存（去掉封面/歌词等大字段，供备份恢复使用）
        _saveSongCache() {
            try {
                const light = this.songList.map(s => ({
                    path: s.path, name: s.name, singer: s.singer,
                    album: s.album, year: s.year, genre: s.genre,
                    track: s.track, composer: s.composer,
                    duration: s.duration, durationFormat: s.durationFormat,
                    songKey: s.songKey, bitrate: s.bitrate,
                    sampleRate: s.sampleRate, channels: s.channels, codec: s.codec,
                }))
                localStorage.setItem(K_SONG_CACHE, JSON.stringify(light))
            } catch {}
        },

        // 恢复时合并缓存：对于文件不存在的歌曲，用缓存的元数据显示（灰色+删除线）
        mergeSongCache() {
            try {
                const cache = JSON.parse(localStorage.getItem(K_SONG_CACHE) || '[]')
                if (!cache.length) return
                const existingPaths = new Set(this.songList.map(s => s.path))
                const merged = []
                for (const c of cache) {
                    if (!existingPaths.has(c.path)) {
                        merged.push({ ...c, playUrl: c.path, exists: false, coverUrl: '', lyrics: [], syncedLyrics: [] })
                    }
                }
                if (merged.length) {
                    this.songList = [...this.songList, ...merged]
                    this._saveCurrentPaths()
                }
            } catch {}
        },

        async migrateIfNeeded() {
            // 只在文件数据为空时才从 localStorage 迁移
            const api_ = api()
            if (api_?.loadMusicPaths) {
                const existing = await api_.loadMusicPaths()
                if (existing && existing.length > 0) return  // 已有文件数据，跳过迁移
            }
            const paths = this._readLocal(K_LOCAL_MUSIC_LIST, [])
            const folders = this._readLocal(K_LOCAL_MUSIC_FOLDERS, [])
            if (paths.length) {
                await this._savePaths(paths)
                if (folders.length) {
                    await api_?.saveMusicFolders?.(folders)
                    try { localStorage.removeItem(K_LOCAL_MUSIC_FOLDERS) } catch {}
                }
                try { localStorage.removeItem(K_LOCAL_MUSIC_LIST) } catch {}
            }
        },

        // === 持久化 ===
        async _savePaths(paths) {
            try {
                const plain = [...paths]
                const api_ = api()
                if (api_?.saveMusicPaths) { await api_.saveMusicPaths(plain) }
                else { localStorage.setItem(K_LOCAL_MUSIC_LIST, JSON.stringify(plain)) }
                console.log(`[localMusic] 已保存 ${plain.length} 个路径`)
            } catch (e) { console.error('[localMusic] 保存路径失败', e) }
        },

        async _saveFolders() {
            try {
                const plain = JSON.parse(JSON.stringify(this.folders))
                const api_ = api()
                if (api_?.saveMusicFolders) { await api_.saveMusicFolders(plain) }
                else { localStorage.setItem(K_LOCAL_MUSIC_FOLDERS, JSON.stringify(plain)) }
                console.log(`[localMusic] 已保存 ${plain.length} 个文件夹`)
            } catch (e) {
                console.error('[localMusic] 保存文件夹失败', e)
                try { localStorage.setItem(K_LOCAL_MUSIC_FOLDERS, JSON.stringify(this.folders)) } catch {}
            }
        },

        async _saveCurrentPaths() {
            await this._savePaths(this.songList.map(s => s.path))
        },

        // === 歌曲操作 ===
        async addSong(song) {
            if (this.loading || !song?.path) return false
            if (!this.songList.some(s => s.path === song.path)) {
                this.songList.push(song)
                await this._saveCurrentPaths()
                return true
            }
            return false
        },

        async addSongs(songs) {
            if (this.loading) return 0
            let added = 0
            for (const s of songs) {
                if (s?.path && !this.songList.some(x => x.path === s.path)) { this.songList.push(s); added++ }
            }
            if (added > 0) {
                await this._saveCurrentPaths()
                console.log(`[localMusic] 批量添加 ${added} 首，总计 ${this.songList.length} 首`)
            }
            return added
        },

        async removeSong(song) {
            if (!song?.path) return
            this.songList = this.songList.filter(s => s.path !== song.path)
            this._saveSongCache()
            await this._saveCurrentPaths()
        },

        // === 文件夹操作 ===
        async addFolder(name, folderPath) {
            if (this.loading) return false
            if (!this.folders.some(f => f.path === folderPath)) {
                this.folders.push({ name, path: folderPath })
                await this._saveFolders()
                console.log(`[localMusic] 添加文件夹: ${name}`)
                return true
            }
            return false
        },

        async removeFolder(folderPath) {
            this.folders = this.folders.filter(f => f.path !== folderPath)
            this.songList = this.songList.filter(s => !s.path.startsWith(folderPath))
            // 同步清理缓存，避免重启后 mergeSongCache 把已删除文件夹的歌曲加回（导致无法重新添加）
            this._saveSongCache()
            await Promise.all([this._saveCurrentPaths(), this._saveFolders()])
        },
    },
})
