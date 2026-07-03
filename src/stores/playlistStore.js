import { defineStore } from 'pinia'
import { K_LOCAL_PLAYLISTS } from '@/constants/storage-keys'

// 用户歌单：创建、编辑、删除歌单（localStorage 持久化）

export const usePlaylistStore = defineStore('playlist', {
    state: () => ({
        localPlaylists: [],
    }),

    actions: {
        initPlaylists() {
            try {
                const local = localStorage.getItem(K_LOCAL_PLAYLISTS)
                this.localPlaylists = local ? JSON.parse(local) : []
            } catch (e) {
                this.localPlaylists = []
            }
        },

        getAllPlaylists() {
            return [...this.localPlaylists]
        },

        findPlaylistById(id) {
            return this.localPlaylists.find(item =>
                String(item.playlistId) === String(id) ||
                String(item.localId) === String(id)
            )
        },

        saveLocalPlaylists() {
            localStorage.setItem(K_LOCAL_PLAYLISTS, JSON.stringify(this.localPlaylists))
        },

        addLocalPlaylist(playlist) {
            this.localPlaylists.push(playlist)
            this.saveLocalPlaylists()
        },
    },
})