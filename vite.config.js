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
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                'desktop-lyrics': path.resolve(__dirname, 'desktop-lyrics.html'),
            },
        },
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    }
})