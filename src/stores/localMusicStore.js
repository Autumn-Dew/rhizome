import { defineStore } from 'pinia'

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
                const p = (paths !== null) ? paths : this._readLocal('local-music-list', [])
                const f = (folders !== null) ? (folders || []) : this._readLocal('local-music-folders', [])
                this.folders = f

                if (!p.length) {
                    const legacy = this._readLocal('local-music-list', [])
                    if (legacy.length) { await this._savePaths(legacy); p.push(...legacy) }
                }

                console.log(`[localMusic] 读取到 ${p.length} 个路径，${f.length} 个文件夹`)
                if (!p.length) { this.loaded = true; return }

                // 判断格式：第一个元素是对象 → 新格式（含 mtime 缓存）；字符串 → 旧格式
                const isCached = typeof p[0] === 'object'

                const CONCURRENCY = 25
                const results = []

                if (isCached && api_?.getFileMtime) {
                    // 新格式：按 mtime 分批检查，mtime 匹配的走缓存，不匹配的重新解析
                    const needReparse = []  // mtime 变了，需要重新解析
                    for (const entry of p) {
                        if (!entry || typeof entry.path !== 'string') { needReparse.push(entry); continue }
                        const curMtime = await api_.getFileMtime(entry.path)
                        if (curMtime > 0 && curMtime === entry.mtime) {
                            // mtime 未变，直接用缓存
                            results.push({
                                path: entry.path,
                                name: entry.title || entry.name || '',
                                singer: entry.singer || '未知歌手',
                                album: entry.album || '',
                                year: entry.year || null,
                                genre: entry.genre || '',
                                track: entry.track || null,
                                composer: entry.composer || '',
                                duration: entry.duration || 0,
                                durationFormat: entry.durationFormat || '00:00',
                                playUrl: entry.path,
                                songKey: entry.songKey || '',
                                coverUrl: entry.coverUrl || '',
                                lyrics: entry.lyrics || [],
                                syncedLyrics: entry.syncedLyrics || [],
                                lyricsSource: entry.lyricsSource || null,
                                codec: entry._raw?.codec || entry.codec || '',
                                bitrate: entry._raw?.bitrate || entry.bitrate || null,
                                sampleRate: entry._raw?.sampleRate || entry.sampleRate || null,
                                channels: entry._raw?.numberOfChannels || entry.channels || null,
                                mtime: entry.mtime || 0,
                                _cached: true,
                            })
                        } else {
                            needReparse.push(entry.path)
                        }
                    }
                    console.log(`[localMusic] 缓存命中 ${results.length}，需重新解析 ${needReparse.length}`)

                    // 解析 mtime 变更的文件
                    for (let i = 0; i < needReparse.length; i += CONCURRENCY) {
                        const batch = needReparse.slice(i, i + CONCURRENCY)
                        const parsed = await Promise.all(batch.map(async (fp) => {
                            try {
                                const raw = await api_?.parseAudio?.(fp)
                                if (!raw) return null
                                return {
                                    path: raw.path, name: raw.title, singer: raw.singer,
                                    album: raw.album || '', year: raw.year || null,
                                    genre: raw.genre || '', track: raw.track || null,
                                    composer: raw.composer || '',
                                    duration: raw.duration || 0,
                                    durationFormat: raw.durationFormat || '00:00',
                                    playUrl: raw.path, songKey: raw.songKey,
                                    coverUrl: raw.coverUrl || '',
                                    lyrics: raw.lyrics || [],
                                    syncedLyrics: raw.syncedLyrics || [],
                                    lyricsSource: raw.lyricsSource,
                                    codec: raw._raw?.codec || '',
                                    bitrate: raw._raw?.bitrate || null,
                                    sampleRate: raw._raw?.sampleRate || null,
                                    channels: raw._raw?.numberOfChannels || null,
                                    mtime: raw.mtime || 0,
                                }
                            } catch { return null }
                        }))
                        results.push(...parsed.filter(Boolean))
                    }
                } else {
                    // 旧格式：全量解析
                    for (let i = 0; i < p.length; i += CONCURRENCY) {
                    const batch = p.slice(i, i + CONCURRENCY)
                    const parsed = await Promise.all(batch.map(async (fp) => {
                        try {
                            const raw = await api_?.parseAudio?.(fp)
                            if (!raw) return null
                            // 统一字段名：preload 返回 title/singer，rest 需要 name/singer
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
                } // end else (旧格式)
                console.log(`[localMusic] 成功解析 ${results.length} 个文件`)
                this.songList = results
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

        async migrateIfNeeded() {
            // 只在文件数据为空时才从 localStorage 迁移
            const api_ = api()
            if (api_?.loadMusicPaths) {
                const existing = await api_.loadMusicPaths()
                if (existing && existing.length > 0) return  // 已有文件数据，跳过迁移
            }
            const paths = this._readLocal('local-music-list', [])
            const folders = this._readLocal('local-music-folders', [])
            if (paths.length) {
                await this._savePaths(paths)
                if (folders.length) {
                    await api_?.saveMusicFolders?.(folders)
                    try { localStorage.removeItem('local-music-folders') } catch {}
                }
                try { localStorage.removeItem('local-music-list') } catch {}
            }
        },

        // === 持久化 ===
        async _savePaths(paths) {
            try {
                const plain = [...paths]
                const api_ = api()
                if (api_?.saveMusicPaths) { await api_.saveMusicPaths(plain) }
                else { localStorage.setItem('local-music-list', JSON.stringify(plain)) }
                console.log(`[localMusic] 已保存 ${plain.length} 个路径`)
            } catch (e) { console.error('[localMusic] 保存路径失败', e) }
        },

        async _saveFolders() {
            try {
                const plain = JSON.parse(JSON.stringify(this.folders))
                const api_ = api()
                if (api_?.saveMusicFolders) { await api_.saveMusicFolders(plain) }
                else { localStorage.setItem('local-music-folders', JSON.stringify(plain)) }
                console.log(`[localMusic] 已保存 ${plain.length} 个文件夹`)
            } catch (e) {
                console.error('[localMusic] 保存文件夹失败', e)
                try { localStorage.setItem('local-music-folders', JSON.stringify(this.folders)) } catch {}
            }
        },

        async _saveCurrentPaths() {
            // 保存完整元数据（含 mtime），下次启动可跳过重新解析
            const data = this.songList.map(s => ({
                path: s.path,
                title: s.name || s.title || '',
                singer: s.singer || '未知歌手',
                album: s.album || '',
                year: s.year || null,
                genre: s.genre || '',
                track: s.track || null,
                composer: s.composer || '',
                duration: s.duration || 0,
                durationFormat: s.durationFormat || '00:00',
                songKey: s.songKey || '',
                coverUrl: s.coverUrl || '',
                lyrics: s.lyrics || [],
                syncedLyrics: s.syncedLyrics || [],
                lyricsSource: s.lyricsSource || null,
                mtime: s.mtime || 0,
                _raw: {
                    codec: s.codec || '',
                    bitrate: s.bitrate || null,
                    sampleRate: s.sampleRate || null,
                    numberOfChannels: s.channels || null,
                }
            }))
            await this._savePaths(data)
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
            await Promise.all([this._saveCurrentPaths(), this._saveFolders()])
        },
    },
})
