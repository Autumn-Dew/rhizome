<template>
  <div id="app-main" :class="{ revealed: appReady }">
    <router-view />
  </div>
</template>

<script setup>
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlayerStore } from '@/stores/playerStore'
import { ref, onMounted } from "vue";
import { generateReportForType, getReportSavePath, blobToBase64 } from '@/composables/useReportGenerator'
import { checkAndGenerateAuto } from '@/composables/useWeeklyPlaylists'
import { initGlobalUiSound, playCursorSound, preloadSfx, CLICKABLE_SELECTOR } from '@/composables/useSound'
import { REPORT_TYPES, reportFilename, isReportGenerated, markReportGenerated, previousPeriodDate } from '@/utils/report'
import { K_REPORT_AUTO } from '@/constants/storage-keys'

// 报告自动生成开关（默认开启）
function isReportAuto() {
  return localStorage.getItem(K_REPORT_AUTO) !== 'false'
}


const appReady = ref(false)
const playerStore = usePlayerStore()
let localStoreRef = null

// 写报告 PNG 到报告目录
async function saveReportBlob(savePath, blob, filename) {
  const base64 = await blobToBase64(blob)
  const ok = await window.electron?.saveReportFile?.(savePath, filename, base64)
  return !!ok
}

// 生成"当前周期"（当天/本周/本月/本年）的报告，同名覆盖
async function generateCurrentReports() {
  try {
    if (!isReportAuto()) return
    if (!localStoreRef) return
    const savePath = getReportSavePath()
    if (!savePath) return
    const isDark = document.documentElement.classList.contains('theme-dark')
    for (const t of REPORT_TYPES) {
      const result = await generateReportForType(t.key, localStoreRef.songList, isDark)
      if (!result) continue
      await saveReportBlob(savePath, result.blob, result.filename)
      markReportGenerated(result.filename)
    }
  } catch {}
}

// 启动时：补上一周期（昨天/上周/上月/去年）的遗漏报告
async function backfillMissedReports() {
  try {
    if (!isReportAuto()) return
    if (!localStoreRef) return
    const savePath = getReportSavePath()
    if (!savePath) return
    const isDark = document.documentElement.classList.contains('theme-dark')
    for (const t of REPORT_TYPES) {
      const date = previousPeriodDate(t.key)
      const filename = reportFilename(t.key, date)
      if (isReportGenerated(filename)) continue
      const result = await generateReportForType(t.key, localStoreRef.songList, isDark, 10, date)
      if (!result) continue
      await saveReportBlob(savePath, result.blob, result.filename)
      markReportGenerated(result.filename)
    }
  } catch {}
}

// 整点检测：用户进行过至少一次操作时，若跨小时则生成当前周期报告
let lastHourCheck = new Date().getHours()
function onUserActivity() {
  if (!isReportAuto()) return
  const h = new Date().getHours()
  if (h !== lastHourCheck) {
    lastHourCheck = h
    generateCurrentReports()
  }
}

// 光标悬停音效：未播放状态下，光标经过可交互元素播放 ui_cursor_29.wav（进入新元素即触发，不去重）
let lastHoverEl = null
function initCursorSound() {
  document.addEventListener('mouseover', (e) => {
    if (playerStore.isPlaying) return
    const el = e.target instanceof Element ? e.target.closest(CLICKABLE_SELECTOR) : null
    if (el && el !== lastHoverEl) {
      lastHoverEl = el
      playCursorSound()
    } else if (!el) {
      lastHoverEl = null
    }
  })
}

onMounted(async () => {
  const localStore = useLocalMusicStore()
  localStoreRef = localStore
  await localStore.migrateIfNeeded()
  await localStore.initFromStorage()
  localStore.mergeSongCache()

  // 全局 UI 音效：点击任意可交互元素播放通用音效
  initGlobalUiSound()
  // 预加载常用音效（Web Audio）
  preloadSfx()
  // 光标悬停音效（未播放状态）
  initCursorSound()

  // 自动歌单（周/月/年，三种独立）
  checkAndGenerateAuto(localStore.songList)

  // 每 30 分钟检测是否需要更新智能歌单
  setInterval(() => {
    if (localStore.loaded && localStore.songList.length) {
      checkAndGenerateAuto(localStore.songList)
    }
  }, 30 * 60 * 1000)

  // 报告：启动补遗漏 + 生成当前周期
  backfillMissedReports().then(() => generateCurrentReports())

  // 整点检测（用户进行过至少一次操作时触发）
  document.addEventListener('click', onUserActivity)
  document.addEventListener('keydown', onUserActivity)

  // 关闭应用时生成报告（主进程 prepare-quit 握手，完成后回 quit-ready 再退出）
  window.electron?.onPrepareQuit?.(async () => {
    await generateCurrentReports()
    await backfillMissedReports()
    window.electron?.sendQuitReady?.()
  })

  // 隐藏启动动画（确保至少显示 800ms）
  const splash = document.getElementById('rhizome-splash')
  if (splash) {
    const elapsed = performance.now()
    // 正向动画 ~2.5s，停留 1s 后倒放
    const minShow = 3500
    const delay = Math.max(0, minShow - elapsed)
    setTimeout(() => {
      // 开始倒放
      splash.classList.add('reversing')
      // 倒放 ~0.7s 后隐藏并显示主界面
      setTimeout(() => {
        splash.classList.add('hidden')
        setTimeout(() => {
          appReady.value = true
          window.dispatchEvent(new CustomEvent('splash-done'))
        }, 300)
      }, 750)
    }, delay)
  } else {
    // 无 splash（二次进入等场景），直接显示
    appReady.value = true
    window.dispatchEvent(new CustomEvent('splash-done'))
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #121212;
  color: #fff;
  font-family: "Microsoft YaHei", sans-serif;
}
/* 统一全局：Element 弹窗样式 → 直角黑白硬朗风格 */
.rc-modal {
  border-radius: 0 !important;
  border: 2px solid var(--border-color) !important;
  backdrop-filter: blur(10px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(10px) saturate(1.2) !important;
  color: var(--text-primary) !important;
}

/* 弹窗标题 */
.rc-modal .el-message-box__header {
  border-bottom: 2px solid var(--border-color) !important;
  color: var(--text-primary) !important;
}
.rc-modal .el-message-box__title {
  color: var(--text-primary) !important;
  font-weight: 700 !important;
}

/* 弹窗内容 */
.rc-modal .el-message-box__content {
  color: var(--text-primary) !important;
}

/* 按钮区域 */
.rc-modal .el-message-box__btns {
  display: flex;
  gap: 8px;
}

/* 按钮全部直角 + 粗边框 */
.rc-modal .el-button {
  border-radius: 0 !important;
  border: 2px solid var(--border-color) !important;
  font-weight: 600 !important;
  transition: all var(--motion-duration-normal) !important;
}

/* 确认按钮 */
.rc-modal .el-button--primary {
  background: var(--border-color) !important;
  color: var(--bg-primary) !important;
}

/* 取消按钮 */
.rc-modal .el-button:not(.el-button--primary) {
  background: transparent !important;
  color: var(--text-primary) !important;
}

/* 按钮 hover 动效 */
.rc-modal .el-button:hover {
  background: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}

* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE */
}
*::-webkit-scrollbar {
  display: none !important; /* Chrome / Edge / Safari */
}

/* 主界面：splash 结束后与入场动效同步淡入 */
#app-main {
  opacity: 0;
  transition: opacity var(--motion-duration-slower) var(--motion-easing-ease);
}
#app-main.revealed {
  opacity: 1;
}

/* 播放次数档位竖条（各歌曲列表 song-item 左侧） */
.pc-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  pointer-events: none;
  z-index: 1;
}
</style>
