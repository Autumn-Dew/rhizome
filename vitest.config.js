import { defineConfig } from 'vitest/config'
import path from 'path'

// 独立于 vite.config.js：测试不需要 vue/element-plus 插件，但必须镜像同一套路径别名
// （独立 vitest.config.js 优先级高于 vite.config.js，别名需在此重复声明）
export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.js', 'electron/**/*.test.js'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@assets': path.resolve(__dirname, './src/assets'),
            '@components': path.resolve(__dirname, './src/components'),
            '@views': path.resolve(__dirname, './src/views'),
        }
    },
})
