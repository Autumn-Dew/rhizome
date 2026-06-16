import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/css/global-theme.css'

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
