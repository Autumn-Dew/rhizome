import { K_LOCAL_PLAYLISTS, K_PLAYLIST_SONGS } from '@/constants/storage-keys'

const FAVORITES_ID = '__favorites__'

// Ensure favorites playlist exists
function ensureFavorites() {
  try {
    const playlists = JSON.parse(localStorage.getItem(K_LOCAL_PLAYLISTS) || '[]')
    if (!playlists.find(p => p.localId === FAVORITES_ID)) {
      playlists.unshift({
        localId: FAVORITES_ID,
        title: '我喜欢',
        intro: '收藏的歌曲',
        isFavorites: true,
        createdAt: Date.now()
      })
      localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(playlists))
    }
  } catch {}
}

// Check if a song is in favorites
function isFavorited(songPath) {
  try {
    const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
    const keys = map[FAVORITES_ID] || []
    return keys.includes(songPath)
  } catch { return false }
}

// Toggle a song in/out of favorites
function toggleFavorite(songPath) {
  try {
    const map = JSON.parse(localStorage.getItem(K_PLAYLIST_SONGS) || '{}')
    if (!map[FAVORITES_ID]) map[FAVORITES_ID] = []
    const idx = map[FAVORITES_ID].indexOf(songPath)
    if (idx >= 0) {
      map[FAVORITES_ID].splice(idx, 1)
    } else {
      map[FAVORITES_ID].push(songPath)
    }
    localStorage.setItem(K_PLAYLIST_SONGS, JSON.stringify(map))
    return idx < 0 // true = added, false = removed
  } catch { return false }
}

export function useFavorites() {
  ensureFavorites()
  return { isFavorited, toggleFavorite, FAVORITES_ID }
}
