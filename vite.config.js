import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig({
    base: './',
    plugins: [
        vue(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@assets': path.resolve(__dirname, './src/assets'),
            '@components': path.resolve(__dirname, './src/components'),
            '@views': path.resolve(__dirname, './src/views'),
        }
    },
    server: {
        port: 9000,
        open: false,
        cors: true,
    },
    optimizeDeps: {
        include: ['vue', 'pinia', 'vue-router', 'dayjs']
    },
    // 全局 CSS 压缩（缩小产物）—— 诊断期临时关闭：验证 build 与 dev 行为差异是否来自压缩构建
  cssMinify: false,
  build: {
        outDir: 'dist',
        assetsDir: 'assets',
        // 诊断期临时关闭 JS 压缩（minify:false）——验证 build/dev 行为差异是否来自压缩构建
        minify: false,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                'desktop-lyrics': path.resolve(__dirname, 'desktop-lyrics.html'),
            },
        },
        terserOptions: {
            compress: {
                // 保留 console：打包环境下 renderer 的 console 会经 main 的
                // console-message 落盘到 userData/logs，用于诊断渲染/性能问题。
                drop_console: false,
                drop_debugger: true
            }
        }
    }
})