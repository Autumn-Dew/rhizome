import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { useMotionScheme } from '@/composables/useMotionScheme'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import './assets/css/motion-tokens.css'
import './assets/css/global-theme.css'

// 启动即恢复「主题」与「动画方案」（这两个 composable 是模块级单例，
// import 时会把 theme-*/motion-* 与 data-theme/data-motion 同步到根元素；
// 若不在此显式调用，动画方案只有进入设置页后才生效）
useGlobalTheme()
useMotionScheme()

const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(router)

// 清理旧插件残留数据（避免干扰）
try { localStorage.removeItem('localMusic') } catch {}
try { localStorage.removeItem('player') } catch {}
try { localStorage.removeItem('playlist') } catch {}
try { localStorage.removeItem('user') } catch {}

app.mount('#app')
