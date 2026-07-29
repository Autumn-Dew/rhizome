import { useFavorites } from '@/composables/useFavorites'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlaylistStore } from '@/stores/playlistStore'

export const TICK = 2000
export const SPLASH_HOLD = 1500
export const SPLASH_EXIT = 1100

export class DemoEngine {
  #aborted = false

  constructor(deps, ui) {
    this.deps = deps
    this.ui = ui
  }

  get aborted() { return this.#aborted }
  abort() { this.#aborted = true }

  sleep(ms = TICK) {
    if (this.#aborted) return Promise.resolve()
    return new Promise(r => setTimeout(r, ms))
  }

  async route(path, ms = TICK) {
    if (this.#aborted) return
    await this.deps.router.push(path).catch(() => {})
    if (ms > 0) await this.sleep(ms)
  }

  tap(selector, index = 0) {
    document.querySelectorAll(selector)[index]?.click()
  }

  caption(text, duration = 1500) {
    clearTimeout(this._ct)
    this.ui.caption.value = text
    this.ui.captionVisible.value = true
    if (duration > 0) this._ct = setTimeout(() => { this.ui.captionVisible.value = false }, duration)
  }

  hideCaption() {
    clearTimeout(this._ct)
    this.ui.captionVisible.value = false
  }

  async splash() {
    if (this.#aborted) return
    this.ui.splashVisible.value = true
    await this.sleep(SPLASH_HOLD)
    this.tap('.ss-root')
    await this.sleep(SPLASH_EXIT)
    this.ui.splashVisible.value = false
    await this.sleep()
  }

  async cycleLocalViews() {
    const tab = '.local-music .view-tabs .tl-entry-btn'
    this.tap(tab, 1); await this.sleep(2000)
    this.tap(tab, 2); await this.sleep(2000)
    this.tap(tab, 0); await this.sleep()
  }

  playFirstSong() {
    const songs = useLocalMusicStore().songList
    if (!songs.length) return null
    const song = songs[0]
    const { player } = this.deps
    player.setPlayList(songs)
    player.playGlobalSong(song)
    if (!player.isPlaying) player.togglePlay()
    return song
  }

  nextSong() { this.deps.player.nextSong() }
  flipTheme() { this.deps.toggleTheme?.() }
  showDesktopLyrics() { this.deps.showLyrics?.() }
  hideDesktopLyrics() { this.deps.hideLyrics?.() }
  lockDesktopLyrics(locked) { this.deps.lockLyrics?.(locked) }
  maximizeWindow() { window.electron?.maximize?.() }

  setFavorite(path, wanted) {
    if (!path) return
    const fav = useFavorites()
    if (fav.isFavorited(path) !== wanted) fav.toggleFavorite(path)
  }

  firstPlaylistRoute() {
    const store = usePlaylistStore()
    if (!store.localPlaylists.length) store.initPlaylists()
    // 优先非收藏歌单，没有则取第一个
    const pl = store.localPlaylists.find(p => !p.isFavorites) || store.localPlaylists[0]
    if (!pl) return null
    const id = pl.playlistId || pl.localId
    if (!id) return null
    return `/player/playlist-detail/${id}`
  }

  async cycleSettingsTabs() {
    const tab = '.sp-tabs .sp-tab'
    for (const i of [1, 2, 0]) { this.tap(tab, i); await this.sleep() }
  }

  resetSideEffects() {
    this.lockDesktopLyrics(false)
    this.deps.hideLyrics?.()
  }
}
