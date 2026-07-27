/**
 * 从 parseAudio 返回的元数据构造 song 对象。
 * 消除 LocalMusic / MyPlaylist / PlaylistDetail 中的重复构造逻辑。
 */
import { formatTime } from '@/utils/format'

export function createSongFromMeta(meta) {
  return {
    path: meta.path,
    name: meta.title,
    singer: meta.singer,
    album: meta.album || '',
    year: meta.year || null,
    genre: meta.genre || '',
    track: meta.track || null,
    composer: meta.composer || '',
    duration: meta.duration || 0,
    durationFormat: meta.durationFormat || formatTime(meta.duration),
    playUrl: meta.path,
    songKey: meta.songKey,
    coverUrl: meta.coverUrl || '',
    lyrics: meta.lyrics || [],
    syncedLyrics: meta.syncedLyrics || [],
    lyricsSource: meta.lyricsSource,
    codec: meta._raw?.codec || '',
    bitrate: meta._raw?.bitrate || null,
    sampleRate: meta._raw?.sampleRate || null,
    channels: meta._raw?.numberOfChannels || null,
  }
}
