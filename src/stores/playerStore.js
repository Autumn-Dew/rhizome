import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { K_PLAY_MODE, K_VOLUME, K_PLAYER_STATE, K_AUDIO_DEVICE, K_PLAY_HISTORY_VIEW, K_PLAY_HISTORY_FULL, K_PLAY_COUNT_REAL } from '@/constants/storage-keys'
import { PLAY_MODE_ICONS, PLAY_MODES } from '@/constants/defaults'

// 播放器核心：当前歌曲、播放状态、播放列表、播放模式、音量

export const usePlayerStore = defineStore('player', () => {
    const currentSong = ref(null)
    const isPlaying = ref(false)
    const currentTime = ref(0)
    const duration = ref(0)
    const playList = ref([])

    const savedMode = localStorage.getItem(K_PLAY_MODE)
    const playMode = ref(savedMode || 'list')

    const modeIcon = ref(PLAY_MODE_ICONS[playMode.value])

    // ========== 伪随机播放（Fisher-Yates shuffle） ==========
    const shuffleOrder = ref([])
    let shufflePos = -1

    function regenerateShuffle() {
        const n = playList.value.length
        if (n === 0) { shuffleOrder.value = []; shufflePos = -1; return }
        const arr = Array.from({ length: n }, (_, i) => i)
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        const curIdx = getCurrentSongIndex()
        if (curIdx !== -1 && n > 1 && arr[0] === curIdx) {
            const swapIdx = 1 + Math.floor(Math.random() * (n - 1))
            ;[arr[0], arr[swapIdx]] = [arr[swapIdx], arr[0]]
        }
        shuffleOrder.value = arr
        shufflePos = 0
    }

    const audio = ref(null)
    const lastRecordPath = ref('')
    const lastCountedSong = ref('')
    const lastTickTime = ref(0)
    const accListenTime = ref(0)
    const songCounted = ref(false)

    const savePlayHistory = (song) => {
        if (!song?.path) return
        if (lastRecordPath.value === song.path) return
        lastRecordPath.value = song.path
        try {
            // 最近 30 条（现有逻辑）
            const history = JSON.parse(localStorage.getItem(K_PLAY_HISTORY_VIEW) || '[]')
            const filtered = history.filter(x => x.path !== song.path)
            filtered.unshift({ path: song.path, playAt: Date.now() })
            if (filtered.length > 30) filtered.splice(30)
            localStorage.setItem(K_PLAY_HISTORY_VIEW, JSON.stringify(filtered))

            // 全量历史（新增）
            const full = JSON.parse(localStorage.getItem(K_PLAY_HISTORY_FULL) || '[]')
            full.push({ path: song.path, playAt: Date.now(), duration: song.duration || 0 })
            if (full.length > 10000) full.splice(0, full.length - 10000)
            localStorage.setItem(K_PLAY_HISTORY_FULL, JSON.stringify(full))
        } catch (e) {}
    }

    const saveLocalPlayCount = (song) => {
        if (!song?.path) return
        if (lastCountedSong.value === song.path) return
        lastCountedSong.value = song.path
        try {
            const map = JSON.parse(localStorage.getItem(K_PLAY_COUNT_REAL) || '{}')
            const newCount = (map[song.path] || 0) + 1
            map[song.path] = newCount
            localStorage.setItem(K_PLAY_COUNT_REAL, JSON.stringify(map))
        } catch (e) {}
    }

    const getSongKey = (song) => {
        if (!song) return null
        if (song.songKey) return song.songKey
        const format = (str) => (str || '').toLowerCase().trim()
        const title = format(song.name)
        const artist = format(song.singer)
        return `${title}|${artist}`
    }

    watch(
        () => [currentSong.value, currentTime.value],
        ([song, now]) => {
            if (!song || !song.duration) return
            if (lastTickTime.value > 0 && now > lastTickTime.value) {
                const delta = Math.min(now - lastTickTime.value, 2)
                accListenTime.value += delta
            }
            lastTickTime.value = now
            const threshold = 30
            if (accListenTime.value >= threshold && !songCounted.value) {
                songCounted.value = true
                savePlayHistory(song)
                saveLocalPlayCount(song)
            }
        },
        { deep: true }
    )

    const syncMediaMetadata = () => {
        if (!currentSong.value || !('mediaSession' in navigator)) return
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.value.name || '未知歌曲',
            artist: currentSong.value.singer || '未知歌手',
            album: currentSong.value.album || 'Rhizome',
            artwork: currentSong.value.coverUrl ? [{ src: currentSong.value.coverUrl, sizes: '512x512' }] : []
        })
    }

    const syncMediaState = () => {
        if (!audio.value || !('mediaSession' in navigator)) return
        navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'
        try {
            navigator.mediaSession.setPositionState({ duration: duration.value || 0, position: currentTime.value || 0 })
        } catch {}
    }

    const initMediaControls = () => {
        if (!('mediaSession' in navigator)) return
        navigator.mediaSession.setActionHandler('play', () => togglePlay())
        navigator.mediaSession.setActionHandler('pause', () => togglePlay())
        navigator.mediaSession.setActionHandler('previoustrack', () => prevSong())
        navigator.mediaSession.setActionHandler('nexttrack', () => nextSong())
    }

    const volume = ref(1.0)
    const abLoop = ref(false)
    const loopA = ref(undefined)
    const loopB = ref(undefined)

    const savePlayerState = () => {
        if (!currentSong.value?.path) return
        try {
            const state = {
                songPath: currentSong.value.path,
                currentTime: currentTime.value,
                duration: duration.value,
                volume: volume.value,
                playMode: playMode.value,
                playlistPaths: playList.value.map(s => s.path).filter(Boolean),
            }
            localStorage.setItem(K_PLAYER_STATE, JSON.stringify(state))
        } catch {}
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', savePlayerState)
    }

    // ========== 自动保存：切歌时 + 播放中定期（解决 Electron 隐藏窗口不触发 beforeunload 的问题） ==========
    let autoSaveTimer = null

    // 切歌时立即保存，同时重置 AB 循环
    watch(currentSong, (song) => {
        if (song?.path) { savePlayerState() }
        abLoop.value = false
        loopA.value = undefined
        loopB.value = undefined
    })

    // 播放中每 15 秒自动保存；暂停时也保存一次（捕获最终进度）
    watch(isPlaying, (playing) => {
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer)
            autoSaveTimer = null
        }
        if (playing) {
            autoSaveTimer = setInterval(() => savePlayerState(), 15000)
        } else {
            // 暂停时保存一次，确保进度不丢失
            savePlayerState()
        }
    })

    const setAudioVolume = (val) => {
        const v = Math.max(0, Math.min(1, Number(val) || 0))
        volume.value = v
        if (audio.value) audio.value.volume = v
        localStorage.setItem(K_VOLUME, v)
    }

    watch(volume, (val) => {
        if (audio.value) audio.value.volume = Math.max(0, Math.min(1, val || 0))
    })

    const playGlobalSong = (song) => {
        if (!song) return
        // 切歌时重置 AB 循环
        abLoop.value = false
        loopA.value = undefined
        loopB.value = undefined
        if (audio.value) {
            audio.value.pause()
            audio.value.onloadedmetadata = null
            audio.value.ontimeupdate = null
            audio.value.onended = null
            audio.value = null
        }
        currentTime.value = 0
        duration.value = 0
        lastRecordPath.value = ''
        lastCountedSong.value = ''
        lastTickTime.value = 0
        accListenTime.value = 0
        songCounted.value = false
        currentSong.value = song

        audio.value = new Audio(song.playUrl || song.path)
        audio.value.volume = Math.max(0, Math.min(1, volume.value || 0))

        // 音频设备路由
        const devId = localStorage.getItem(K_AUDIO_DEVICE) || ''
        if (devId && audio.value.setSinkId) {
            audio.value.setSinkId(devId).catch(() => {})
        }

        audio.value.onloadedmetadata = () => {
            duration.value = audio.value.duration || 0
            syncMediaMetadata()
            syncMediaState()
        }
        audio.value.ontimeupdate = () => {
            currentTime.value = audio.value.currentTime || 0
            // AB 循环检测
            if (abLoop.value && loopB.value != null && currentTime.value >= loopB.value) {
                audio.value.currentTime = loopA.value
                currentTime.value = loopA.value
            }
            syncMediaState()
        }
        audio.value.onended = () => {
            isPlaying.value = false
            currentTime.value = 0
            syncMediaState()
            autoNextSong()
        }
        audio.value.play().catch(() => {})
        isPlaying.value = true
        syncMediaMetadata()
        syncMediaState()
        initMediaControls()
        // 切歌后异步确保 UI 层 AB 标记彻底清除
        nextTick(() => {
            abLoop.value = false
            loopA.value = undefined
            loopB.value = undefined
        })
    }

    const setPlayList = (list) => {
        playList.value = Array.isArray(list) ? [...list] : []
        if (playMode.value === 'random') regenerateShuffle()
    }

    const playSongInList = (song) => {
        if (!song || !playList.value.length) return
        const idx = playList.value.findIndex(s =>
            (s.id && song.id && s.id === song.id) || (s.path && song.path && s.path === song.path)
        )
        if (idx !== -1) playGlobalSong(song)
    }

    const togglePlay = () => {
        if (!audio.value || !currentSong.value) return
        if (isPlaying.value) {
            audio.value.pause()
        }
        else audio.value.play().catch(() => {})
        isPlaying.value = !isPlaying.value
        syncMediaState()
    }

    const getCurrentSongIndex = () => {
        if (!currentSong.value || !playList.value.length) return -1
        const key = getSongKey(currentSong.value)
        let idx = playList.value.findIndex(x => getSongKey(x) === key)
        if (idx === -1) idx = playList.value.findIndex(x => x.name === currentSong.value.name && x.singer === currentSong.value.singer)
        return idx
    }

    const nextSong = () => {
        const idx = getCurrentSongIndex()
        if (idx === -1) return
        let next
        if (playMode.value === 'random') {
            if (shuffleOrder.value.length === 0 || shufflePos < 0) {
                regenerateShuffle()
            } else {
                shufflePos++
                if (shufflePos >= shuffleOrder.value.length) {
                    regenerateShuffle()
                }
            }
            next = shuffleOrder.value[shufflePos]
        } else {
            next = (idx + 1) % playList.value.length
        }
        playGlobalSong(playList.value[next])
    }

    const prevSong = () => {
        const idx = getCurrentSongIndex()
        if (idx === -1) return
        let prev
        if (playMode.value === 'random') {
            if (shufflePos > 0) {
                shufflePos--
                prev = shuffleOrder.value[shufflePos]
            } else {
                prev = shuffleOrder.value[0]
            }
        } else {
            prev = (idx - 1 + playList.value.length) % playList.value.length
        }
        playGlobalSong(playList.value[prev])
    }

    const autoNextSong = () => {
        if (playMode.value === 'single') return
        if (playMode.value === 'singleLoop') playGlobalSong(currentSong.value)
        else nextSong()
    }

    const toggleMode = () => {
        const i = PLAY_MODES.indexOf(playMode.value)
        playMode.value = PLAY_MODES[(i + 1) % PLAY_MODES.length]
        modeIcon.value = PLAY_MODE_ICONS[playMode.value]
        localStorage.setItem(K_PLAY_MODE, playMode.value)
        if (playMode.value === 'random') regenerateShuffle()
    }

    const setPlayMode = (mode) => {
        if (!PLAY_MODES.includes(mode)) return
        playMode.value = mode
        modeIcon.value = PLAY_MODE_ICONS[mode]
        localStorage.setItem(K_PLAY_MODE, mode)
        if (mode === 'random') regenerateShuffle()
    }

    const seekTo = (time) => {
        if (audio.value) {
            audio.value.currentTime = time
            currentTime.value = time
            syncMediaState()
        }
    }

    // ── 系统托盘信息更新 ──
    if (typeof window !== 'undefined') {
        watch([currentSong, isPlaying], () => {
            const api = window.electron
            if (!api?.updateTrayInfo) return
            const song = currentSong.value
            api.updateTrayInfo({
                songName: song ? (song.name || song.title || '未知歌曲') : '',
                isPlaying: isPlaying.value,
            })
        }, { immediate: true })
    }

    function toggleABLoop(a, b) {
        if (abLoop.value) {
            abLoop.value = false; loopA.value = null; loopB.value = null
        } else if (a != null && b != null && b > a) {
            loopA.value = a; loopB.value = b; abLoop.value = true
            seekTo(a)
        }
    }

    return {
        currentSong, isPlaying, currentTime, duration,
        playList, playMode, modeIcon, audio, volume,
        abLoop, loopA, loopB, toggleABLoop,
        setAudioVolume,
        setPlayList, playSongInList, playGlobalSong,
        togglePlay, nextSong, prevSong, toggleMode, setPlayMode, seekTo,
        savePlayerState,
    }
})
