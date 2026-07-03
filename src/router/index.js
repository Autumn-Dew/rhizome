import { createRouter, createWebHashHistory } from 'vue-router'

// ========== 懒加载 ==========
const MainLayout = () => import('@/views/MainLayout.vue')
const NotFound = () => import('@/views/NotFound.vue')

// 播放器模块容器
const Player = () => import('@/views/player/index.vue')

// 播放器子页面
const LocalMusic = () => import('@/views/player/LocalMusic.vue')
const MyPlaylist = () => import('@/views/player/MyPlaylist.vue')
const PlayHistory = () => import('@/views/player/PlayHistory.vue')
const PlayStats = () => import('@/views/player/PlayStats.vue')
const PlaylistDetail = () => import('@/views/player/PlaylistDetail.vue')
const SongDetail = () => import('@/views/player/SongDetail.vue')
const MusicTimeline = () => import('@/views/player/MusicTimeline.vue')
const SettingsPage = () => import('@/views/player/SettingsPage.vue')

// ========== 路由 ==========
const routes = [
    { path: '/', redirect: '/player' },

    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: 'player',
                component: Player,
                children: [
                    { path: '', component: LocalMusic },
                    { path: 'local', component: LocalMusic },
                    { path: 'playlist', component: MyPlaylist },
                    { path: 'playlist-detail/:id', component: PlaylistDetail },
                    { path: 'detail', component: SongDetail },
                    { path: 'timeline', component: MusicTimeline },
                    { path: 'settings', component: SettingsPage },
                    { path: 'history', component: PlayHistory },
                    { path: 'stats', component: PlayStats },
                ]
            },
        ]
    },

    { path: '/:pathMatch(.*)*', component: NotFound }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
