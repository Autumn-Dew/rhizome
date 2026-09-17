<template>
  <div class="settings-page" :class="[themeClass, { entered }]">
    <div class="sp-header">
      <h2>设置</h2>
      <p class="sp-desc">偏好设置与音频均衡器</p>
    </div>

    <div class="sp-body">
      <!-- 左侧：报告与操作 -->
      <div class="sp-col">

      <div class="report-card">
        <div class="report-card-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 8h10M7 12h4M7 16h2"/></svg>
          <span>播放记录报告</span>
        </div>
        <div class="report-types">
          <button v-for="t in reportTypes" :key="t.key" class="report-type-btn" :class="{ active: reportType === t.key }" @click="reportType = t.key">
            <span class="report-type-icon">{{ t.icon }}</span>
            <span class="report-type-label">{{ t.label }}</span>
          </button>
        </div>
        <div class="report-info" v-if="reportStats.total > 0">
          <span>{{ reportStats.total }} 次播放 · {{ reportStats.songs }} 首歌</span>
        </div>
        <div class="report-info" v-else>
          <span class="report-empty">暂无播放数据</span>
        </div>
        <button class="report-generate-btn" @click="handleGenerateReport" :disabled="reportStats.total === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {{ '生成' + (reportTypes.find(t => t.key === reportType)?.label || '报告') }}
        </button>
      </div>

      <div class="sp-actions">
        <button class="sp-action-btn" @click="handleBackup">保存数据（备份）</button>
        <button class="sp-action-btn" @click="handleRestore">加载数据（恢复）</button>
        <button class="sp-action-btn sp-danger" @click="handleClearAll" data-charge-sound>清除所有数据</button>
        <button class="sp-action-btn" @click="showAbout = true">关于 Rhizome</button>
      </div>
      </div>

      <!-- 右侧：选项卡 + 内容 -->
      <div class="sp-col">

      <div class="sp-tabs">
        <div class="sp-tab" :class="{ active: activeSection === 'system' }" @click="activeSection = 'system'">
          <span>系统选项</span>
        </div>
        <div class="sp-tab" :class="{ active: activeSection === 'shortcuts' }" @click="activeSection = 'shortcuts'">
          <span>快捷键</span>
        </div>
        <div class="sp-tab" :class="{ active: activeSection === 'actions' }" @click="activeSection = 'actions'">
          <span>动作链</span>
        </div>
      </div>

      <div class="sp-panel-wrapper">
        <Transition name="sp-slide" mode="out-in" appear>
      <div v-if="activeSection === 'system'" class="sp-panel-card" key="system">
      <div class="ss-inline-table">
        <div class="ss-row">
          <span class="ss-cell-label">音频输出设备</span>
          <span class="ss-cell-value">
            <select class="sp-select" v-model="audioDeviceId" @change="onDeviceChange">
              <option value="">系统默认</option>
              <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || d.deviceId }}</option>
            </select>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">歌词对齐</span>
          <span class="ss-cell-value">
            <button class="sp-btn" :class="{ active: lyricAlign === 'left' }" @click="setLyricAlign('left')">左</button>
            <button class="sp-btn" :class="{ active: lyricAlign === 'center' }" @click="setLyricAlign('center')">中</button>
            <button class="sp-btn" :class="{ active: lyricAlign === 'right' }" @click="setLyricAlign('right')">右</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">歌词字号</span>
          <span class="ss-cell-value">
            <button class="sp-btn" @click="changeLyricSize(-1)" :disabled="lyricSize <= 10">−</button>
            <span class="sp-value">{{ lyricSize }}px</span>
            <button class="sp-btn" @click="changeLyricSize(1)" :disabled="lyricSize >= 18">+</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">歌词延迟</span>
          <span class="ss-cell-value">
            <button class="sp-btn" @mousedown="startLyricOffset(-5)" @mouseup="stopLyricOffset" @mouseleave="stopLyricOffset" :disabled="lyricOffset <= -2000">−5</button>
            <span class="sp-value">{{ lyricOffset }}ms</span>
            <button class="sp-btn" @mousedown="startLyricOffset(5)" @mouseup="stopLyricOffset" @mouseleave="stopLyricOffset" :disabled="lyricOffset >= 2000">+5</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">桌面歌词背景</span>
          <span class="ss-cell-value">
            <button class="sp-btn" @click="changeLyricBg(-5)" :disabled="lyricBgOpacity <= 0">−5</button>
            <span class="sp-value">{{ lyricBgOpacity }}%</span>
            <button class="sp-btn" @click="changeLyricBg(5)" :disabled="lyricBgOpacity >= 100">+5</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">屏保触发时间</span>
          <span class="ss-cell-value">
            <button class="sp-btn" @mousedown="startIdleTimeout(-1)" @mouseup="stopIdleTimeout" @mouseleave="stopIdleTimeout" :disabled="idleTimeoutMin <= 1">−1</button>
            <span class="sp-value">{{ idleTimeoutMin }}min</span>
            <button class="sp-btn" @mousedown="startIdleTimeout(1)" @mouseup="stopIdleTimeout" @mouseleave="stopIdleTimeout" :disabled="idleTimeoutMin >= 60">+1</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">开机自启</span>
          <span class="ss-cell-value">
            <button class="sp-btn toggle-btn" :class="{ active: autoLaunch }" @click="toggleAutoLaunch">{{ autoLaunch ? 'ON' : 'OFF' }}</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">每周自动歌单</span>
          <span class="ss-cell-value">
            <button class="sp-btn toggle-btn" :class="{ active: weeklyEnabled }" @click="toggleWeekly">{{ weeklyEnabled ? 'ON' : 'OFF' }}</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">报告路径</span>
          <span class="ss-cell-value">
            <button class="sp-btn path-btn" @click="selectReportDir">{{ reportPath || '点击设置路径' }}</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">音效</span>
          <span class="ss-cell-value">
            <button class="sp-btn toggle-btn" :class="{ active: soundEnabled }" @click="toggleSound">{{ soundEnabled ? 'ON' : 'OFF' }}</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">音效音量</span>
          <span class="ss-cell-value">
            <button class="sp-btn" @click="changeSoundVolume(-0.1)" :disabled="soundVolume <= 0">−</button>
            <span class="sp-value">{{ Math.round(soundVolume * 100) }}%</span>
            <button class="sp-btn" @click="changeSoundVolume(0.1)" :disabled="soundVolume >= 1">+</button>
          </span>
        </div>
        <div class="ss-row">
          <span class="ss-cell-label">删除确认次数</span>
          <span class="ss-cell-value">
            <button v-for="n in DELETE_CONFIRM_OPTIONS" :key="n" class="sp-btn toggle-btn" :class="{ active: requiredCount === n }" @click="setRequiredCount(n)">{{ n }}</button>
          </span>
        </div>
      </div>
      </div>


          <div v-else-if="activeSection === 'shortcuts'" class="sp-panel-card" key="shortcuts">
      <div class="sp-panel-bar">
        <button class="sp-btn" style="width:auto;padding:0 10px;font-size:10px" @click="resetSC">重置</button>
      </div>
      <div class="ss-inline-table">
        <div class="ss-row ss-row-head">
          <span class="ss-cell-label">操作</span>
          <span class="ss-cell-key">本地</span>
          <span class="ss-cell-key">全局</span>
        </div>
        <div class="ss-row" v-for="(def, action) in shortcutDefs" :key="action" :class="{ 'ss-row-disabled': !def.local && !def.global }">
          <span class="ss-cell-label">{{ def.label }}</span>
          <span class="ss-cell-key" :class="{ 'ss-cell-na': !def.local, 'ss-cell-sel': captureTarget?.action === action && captureTarget?.scope === 'local' }" @click="pickShortcut(action, 'local')">{{ def.local ? comboLabel(shortcutConfig[action]?.local) : '—' }}</span>
          <span class="ss-cell-key" :class="{ 'ss-cell-na': !def.global, 'ss-cell-sel': captureTarget?.action === action && captureTarget?.scope === 'global' }" @click="pickShortcut(action, 'global')">{{ def.global ? comboLabel(shortcutConfig[action]?.global) : '—' }}</span>
        </div>
      </div>
      <div class="ss-capture" v-if="capturing">捕获按键：{{ captureDisplay || '等待...' }} <button class="sp-btn" style="width:auto;padding:0 8px;font-size:10px" @click="confirmCapture">确认</button></div>
      </div>


          <div v-else-if="activeSection === 'actions'" class="sp-panel-card" key="actions">
      <div class="sp-panel-bar">
        <button class="sp-btn" style="width:auto;padding:0 10px;font-size:10px" @click="startAddChain" :disabled="acChains.length >= 5">+ 创建</button>
      </div>
      <div class="ac-list" v-if="acChains.length">
        <div class="ac-item" v-for="(c, ci) in acChains" :key="c.id">
          <span class="ac-key">Alt+{{ ci + 1 }}</span>
          <span class="ac-name">{{ c.name }}</span>
          <span class="ac-count">{{ c.actions.length }} 动作</span>
          <button class="sp-btn" style="width:auto;padding:0 6px;font-size:10px" @click="editChain(c)">编辑</button>
          <button class="sp-btn" style="width:auto;padding:0 6px;font-size:10px" @click="executeChain(c)">执行</button>
          <button class="sp-btn" style="width:auto;padding:0 6px;font-size:10px" @click="removeChain(c.id)">×</button>
        </div>
      </div>
      <div class="ac-empty" v-else>暂无动作链，点击 + 创建（上限 5 个）</div>
      <div class="ac-editor" v-if="editing">
        <div class="ac-edit-row"><span>名称</span><input class="ac-input" v-model="editName" /></div>
        <div class="ac-actions-list">
          <div class="ac-act-row" v-for="(a, ai) in editActions" :key="ai">
            <select class="sp-select" style="flex:1;max-width:none" v-model="a.type" @change="onActTypeChange(ai)">
              <option v-for="t in ACTION_TYPES" :key="t.type" :value="t.type">{{ t.label }}</option>
            </select>
            <template v-if="getActDef(a.type)?.params.length">
              <template v-for="p in getActDef(a.type).params" :key="p.key">
                <select v-if="p.options" class="sp-select" style="width:auto;max-width:none;height:24px;font-size:10px" v-model="a.params[p.key]">
                  <option v-for="o in p.options" :key="o.value || o" :value="o.value || o">{{ o.label || o }}</option>
                </select>
                <input v-else class="ac-param" v-model.number="a.params[p.key]" :placeholder="p.label" :min="p.min" :max="p.max" :step="p.step" type="number" />
              </template>
            </template>
            <button class="sp-btn" style="width:auto;padding:0 4px;font-size:10px" @click="editActions.splice(ai,1)">×</button>
          </div>
        </div>
        <button class="sp-btn" style="width:auto;padding:0 8px;font-size:10px" @click="editActions.push({type:'play',params:{}})">+ 动作</button>
        <div class="ac-edit-btns">
          <button class="sp-btn" style="width:auto;padding:0 10px;font-size:11px" @click="saveChain">保存</button>
          <button class="sp-btn" style="width:auto;padding:0 10px;font-size:11px" @click="editing=null">取消</button>
        </div>
      </div>
      </div>
        </Transition>
      </div>
      </div>

      <div class="sp-footer" v-if="msg">{{ msg }}</div>
    </div>

    <AboutModal v-if="showAbout" @close="showAbout = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePageEnter } from '@/composables/usePageEnter'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useAudioDevice } from '@/composables/useAudioDevice'
import { isWeeklyEnabled, setWeeklyEnabled, checkAndGenerateWeekly } from '@/composables/useWeeklyPlaylists'
import { generateReportForType } from '@/composables/useReportGenerator'
import { REPORT_TYPES, getReportRangeStart, countPlaysSince, getPlayHistory } from '@/utils/report'
import { getActionDefs, getShortcutConfig, comboLabel, updateShortcut, resetShortcuts } from '@/composables/useShortcuts'
import { useActionChain, ACTION_TYPES } from '@/composables/useActionChain'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { useLyricOffset } from '@/composables/useLyricOffset'
import AboutModal from '@/components/common/AboutModal.vue'
import { K_LYRIC_SIZE, K_LYRIC_ALIGN, K_REPORT_PATH, K_DESKTOP_LYRICS_BG } from '@/constants/storage-keys'
import { idleTimeoutSec, setIdleTimeout } from '@/composables/useIdleTimeout'
import { playShortcutSound, isSoundEnabled, setSoundEnabled, getSoundVolume, setSoundVolume } from '@/composables/useSound'

const { themeClass } = useGlobalTheme()
const localStore = useLocalMusicStore()
const playerStore = usePlayerStore()
const { devices: audioDevices, selectedId: audioDeviceId, select: selectDevice, applyTo } = useAudioDevice()
const { chains: acChains, add: acAdd, update: acUpdate, remove: acRemove, execute: acExecute } = useActionChain()

const msg = ref('')
const { entered, staggerStyle, triggerEnter } = usePageEnter();
const { requiredCount, setRequiredCount, DELETE_CONFIRM_OPTIONS, confirmHardDelete } = useDeleteConfirm();
const { offsetMs: lyricOffset } = useLyricOffset();
const showAbout = ref(false)
const activeSection = ref('system')

const shortcutDefs = getActionDefs()
const shortcutConfig = ref(getShortcutConfig())
const capturing = ref(false)
const captureDisplay = ref('')
const captureTarget = ref(null)
let captureCombo = null

const editing = ref(null)
const editName = ref('')
const editActions = ref([])
let editId = null

function getActDef(type) { return ACTION_TYPES.find(t => t.type === type) }
function startAddChain() { editId = null; editName.value = ''; editActions.value = [{ type: 'play', params: {} }]; editing.value = true }
function editChain(c) { editId = c.id; editName.value = c.name; editActions.value = c.actions.map(a => ({ ...a, params: { ...a.params } })); editing.value = true }
function onActTypeChange(ai) { editActions.value[ai].params = {} }
function saveChain() {
  if (!editName.value.trim()) return
  const clean = editActions.value.map(a => ({ type: a.type, params: { ...a.params } }))
  if (editId) acUpdate(editId, editName.value.trim(), clean)
  else acAdd(editName.value.trim(), clean)
  editing.value = null
}
function removeChain(id) { acRemove(id) }
function executeChain(c) { acExecute(c) }

const lyricSize = ref(Number(localStorage.getItem(K_LYRIC_SIZE) || 14))
const lyricAlign = ref(localStorage.getItem(K_LYRIC_ALIGN) || 'center')
const autoLaunch = ref(false)
const weeklyEnabled = ref(isWeeklyEnabled())
const reportPath = ref(localStorage.getItem(K_REPORT_PATH) || '')
const soundEnabled = ref(isSoundEnabled())
const soundVolume = ref(getSoundVolume())
const reportType = ref('daily')
const reportTypes = REPORT_TYPES.map(t => ({ key: t.key, label: t.label, icon: t.label.charAt(0) }))
const reportStats = computed(() => {
  const from = getReportRangeStart(reportType.value)
  const countMap = countPlaysSince(getPlayHistory(), from)
  const entries = Object.entries(countMap)
  return {
    total: entries.reduce((s, [, c]) => s + c, 0),
    songs: entries.length,
  }
})

function changeLyricSize(d) { lyricSize.value = Math.max(10, Math.min(18, lyricSize.value + d)); localStorage.setItem(K_LYRIC_SIZE, lyricSize.value) }
function setLyricAlign(a) { lyricAlign.value = a; localStorage.setItem(K_LYRIC_ALIGN, a) }
let lyricOffsetTimer = null
function startLyricOffset(d) { lyricOffset.value = Math.max(-2000, Math.min(2000, lyricOffset.value + d)); lyricOffsetTimer = setInterval(() => { lyricOffset.value = Math.max(-2000, Math.min(2000, lyricOffset.value + d)) }, 200) }
function stopLyricOffset() { clearInterval(lyricOffsetTimer) }

const lyricBgOpacity = ref(Number(localStorage.getItem(K_DESKTOP_LYRICS_BG) || 100))
function changeLyricBg(d) {
  lyricBgOpacity.value = Math.max(0, Math.min(100, lyricBgOpacity.value + d))
  localStorage.setItem(K_DESKTOP_LYRICS_BG, lyricBgOpacity.value)
  window.dispatchEvent(new CustomEvent('lyric-bg-changed'))
}

const idleTimeoutMin = ref(Math.max(1, Math.min(60, Math.round(idleTimeoutSec.value / 60))))
function changeIdleTimeout(d) {
  idleTimeoutMin.value = Math.max(1, Math.min(60, idleTimeoutMin.value + d))
  setIdleTimeout(idleTimeoutMin.value)
}
let idleTimeoutTimer = null
function startIdleTimeout(d) {
  changeIdleTimeout(d)
  idleTimeoutTimer = setInterval(() => changeIdleTimeout(d), 200)
}
function stopIdleTimeout() { clearInterval(idleTimeoutTimer) }

async function toggleAutoLaunch() {
  autoLaunch.value = !autoLaunch.value
  window.electron?.setAutoLaunch?.(autoLaunch.value)
}

function toggleWeekly() {
  weeklyEnabled.value = !weeklyEnabled.value
  setWeeklyEnabled(weeklyEnabled.value)
  if (weeklyEnabled.value) {
    checkAndGenerateWeekly(localStore.songList)
  }
}

function onDeviceChange() {
  selectDevice(audioDeviceId.value)
  const audio = playerStore.audio
  if (audio) applyTo(audio)
}

async function selectReportDir() {
  const dir = await window.electron?.selectReportDir?.()
  if (dir) { reportPath.value = dir; localStorage.setItem(K_REPORT_PATH, dir) }
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  setSoundEnabled(soundEnabled.value)
}
function changeSoundVolume(d) {
  soundVolume.value = Math.max(0, Math.min(1, Math.round((soundVolume.value + d) * 100) / 100))
  setSoundVolume(soundVolume.value)
}

function resetSC() {
  resetShortcuts()
  shortcutConfig.value = getShortcutConfig()
}

function pickShortcut(action, scope) {
  capturing.value = true
  captureTarget.value = { action, scope }
  captureDisplay.value = ''
  captureCombo = null
}

function confirmCapture() {
  if (!captureTarget.value || !captureCombo) { capturing.value = false; return }
  updateShortcut(captureTarget.value.action, captureTarget.value.scope, captureCombo)
  shortcutConfig.value = getShortcutConfig()
  capturing.value = false
  captureTarget.value = null
  captureCombo = null
}

const onKeydown = (e) => {
  if (!capturing.value) return
  e.preventDefault(); e.stopPropagation()
  captureCombo = { code: e.code, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey }
  captureDisplay.value = comboLabel(captureCombo)
}

// Ctrl+数字键执行动作链
function onGlobalKey(e) {
  if (!e.ctrlKey || e.altKey || e.shiftKey) return
  const num = parseInt(e.key)
  if (num >= 1 && num <= 5 && acChains.value[num - 1]) {
    e.preventDefault()
    playShortcutSound()
    acExecute(acChains.value[num - 1], playerStore)
  }
}


async function handleBackup() {
  const ok = await window.electron?.backupData?.()
  msg.value = ok ? '备份已保存' : '备份失败'
  setTimeout(() => msg.value = '', 2000)
}
async function handleRestore() {
  const result = await window.electron?.restoreData?.()
  if (result?.ok) { msg.value = '数据已恢复，即将刷新'; setTimeout(() => location.reload(), 1000) }
  else msg.value = '恢复失败或取消'
  setTimeout(() => msg.value = '', 2000)
}
async function handleGenerateReport() {
  const result = await generateReportForType(reportType.value, localStore.songList, themeClass.value === 'theme-dark')
  if (!result) { msg.value = '无播放数据可生成'; setTimeout(() => msg.value = '', 1500); return }
  const dir = reportPath.value
  if (!dir) { msg.value = '请先设置报告路径'; setTimeout(() => msg.value = '', 1500); return }
  const { blob, filename } = result
  const reader = new FileReader()
  reader.onload = async () => {
    const b64 = reader.result.split(',')[1]
    const ok = await window.electron?.saveReportFile?.(dir, filename, b64)
    msg.value = ok ? '报告已保存' : '保存失败'
    setTimeout(() => msg.value = '', 2000)
    if (ok) window.electron?.openPath?.(dir)
  }
  reader.readAsDataURL(blob)
}
async function handleClearAll() {
  if (!confirmHardDelete()) return
  await window.electron?.clearAllData?.()
  localStorage.clear()
  msg.value = '数据已清除，即将刷新'
  setTimeout(() => location.reload(), 1000)
}

onMounted(async () => {
  autoLaunch.value = await window.electron?.getAutoLaunch?.() || false
  window.addEventListener('keydown', onKeydown, true)
  triggerEnter()
})
onUnmounted(() => { window.removeEventListener('keydown', onKeydown, true) })
</script>

<style scoped>
/* ═══ 主题变量 ═══ */
.theme-white { --bg: #fff; --text: #000; --border: #000; --btn: #f8f8f8; --btn-hover: #000; --btn-text: #fff; --light: #f5f5f5; }
.theme-dark  { --bg: #2c2c2c; --text: #fff; --border: #fff; --btn: #292929; --btn-hover: #fff; --btn-text: #000; --light: #333; }

.settings-page { width: 100%; height: 100%; overflow-y: auto; background: var(--bg-primary); color: var(--text-primary); }
.settings-page::-webkit-scrollbar { display: none; }

/* ═══ 页头 ═══ */
.sp-header { padding: 20px 16px 16px; border-bottom: 2px solid transparent; position: relative; }
.sp-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform var(--motion-duration-slow) var(--motion-easing-enter); }
.entered .sp-header::after { transform: scaleX(1); }
.sp-header h2 { font-size: 20px; margin: 0 0 4px; }
.sp-desc { font-size: 12px; opacity: 0.7; }

/* ═══ 精密组装入场 ═══ */
.sp-header h2 { opacity: 0; transform: translateY(-10px); letter-spacing: 3px; transition: opacity var(--motion-duration-medium) var(--motion-easing-standard), transform var(--motion-duration-medium) var(--motion-easing-standard), letter-spacing var(--motion-duration-slow) var(--motion-easing-standard); }
.entered .sp-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }
.sp-desc { opacity: 0; transform: translateY(-6px); transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s, transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s; }
.entered .sp-desc { opacity: 0.7; transform: translateY(0); }

.sp-body { padding: 8px 16px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; align-items: start; width: 100%; }
.sp-col { min-width: 0; }
.sp-footer { grid-column: 1 / -1; padding: 10px 0; font-size: 12px; text-align: center; opacity: 0; transition: opacity var(--motion-duration-fast) var(--motion-easing-ease); }
.entered .sp-footer { opacity: 0.6; }

/* ═══ 设置行（保留兼容） ═══ */
.sp-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
.sp-label { font-size: 12px; font-family: monospace; }
.sp-stepper { display: flex; align-items: center; gap: 6px; }
.sp-btn { width: 36px; height: 28px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all var(--motion-duration-normal); }
.sp-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.sp-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.sp-btn.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.toggle-btn { width: auto; min-width: 44px; padding: 0 10px; font-size: 11px; font-weight: 700; }
.path-btn { width: auto; padding: 0 8px; font-size: 10px; }
.sp-value { font-size: 13px; font-family: monospace; min-width: 36px; text-align: center; }
.sp-select { height: 28px; padding: 0 8px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 11px; font-family: monospace; cursor: pointer; outline: none; max-width: 180px; }
.sp-select option { background: var(--bg-primary); color: var(--text-primary); }

/* ═══ 列布局 ═══ */
.sp-body { gap: 24px; }
.sp-col { padding-top: 8px; }

/* ═══ 水平选项卡 ═══ */
.sp-tabs {
  display: flex; gap: 0;
  border: 2px solid var(--border-color);
  border-bottom: 2px solid var(--border-color); margin-bottom: 0;
}
.sp-tab {
  flex: 1; height: 34px; padding: 0 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-family: monospace;
  cursor: pointer; user-select: none;
  border-right: 1px solid var(--border-color);
  opacity: 0; transform: scaleX(0);
  transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter), background var(--motion-duration-normal), color var(--motion-duration-normal);
}
.entered .sp-tab { opacity: 1; transform: scaleX(1); }
.sp-tab:nth-child(1) { transition-delay: 0.24s; }
.sp-tab:nth-child(2) { transition-delay: 0.27s; }
.sp-tab:nth-child(3) { transition-delay: 0.30s; }
.sp-tab:last-child { border-right: none; }
.sp-tab:hover { background: var(--bg-secondary); }
.sp-tab.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); transition-delay: 0s !important; }

/* ═══ 面板卡片 ═══ */
.sp-panel-card {
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--border-color); margin-top: -2px;
}
/* 面板切换动效 — 淡入 + 微上移，边框保持原位 */
.sp-panel-wrapper { position: relative; }
.sp-slide-enter-active { transition: opacity var(--motion-duration-fast) var(--motion-easing-standard) 0.16s, transform var(--motion-duration-fast) var(--motion-easing-enter) 0.16s; }
.sp-slide-leave-active { transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform 0.12s var(--motion-easing-leave); position: absolute; top: 0; left: 0; width: 100%; }
.sp-slide-enter-from { opacity: 0; transform: translateY(6px); }
.sp-slide-leave-to   { opacity: 0; transform: translateY(-4px); }

.sp-panel-card .ss-inline-table,
.sp-panel-card .ac-list { padding: 8px 12px; }
.sp-panel-card .ac-empty { padding: 20px 12px; text-align: center; font-size: 11px; font-family: monospace; opacity: 0.4; }
.sp-panel-card .ac-editor { margin: 8px 12px 12px; }
.sp-panel-card .ss-capture { margin: 6px 12px 10px; }
.sp-panel-bar {
  display: flex; justify-content: flex-end; gap: 4px;
  padding: 6px 12px; border-bottom: 1px solid var(--border-color);
  height: 34px; align-items: center;
}
/* 统一面板行高 */
.sp-panel-card .ss-row { height: 40px; }
.sp-panel-card .ac-item { height: 36px; }
.sp-panel-card .ss-row-head { height: 28px; }

/* ═══ 报告卡片 ═══ */
.report-card {
  margin: 0 0 20px; padding: 16px;
  border: 2px solid var(--border-color);
  opacity: 0; transform: translateX(-20px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-standard), transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.entered .report-card { opacity: 1; transform: translateX(0); }
.report-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.report-card-header svg { width: 18px; height: 18px; opacity: 0.7; }
.report-types {
  display: flex; gap: 4px; margin-bottom: 10px;
}
.report-type-btn {
  flex: 1; height: 36px; border: 2px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-primary);
  cursor: pointer; font-size: 11px; font-family: monospace;
  display: flex; align-items: center; gap: 6px; padding: 0 10px;
  transition: all var(--motion-duration-normal);
}
.report-type-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.report-type-btn.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.report-type-icon {
  font-size: 14px; font-weight: 700; width: 20px; text-align: center;
}
.report-info {
  font-size: 11px; opacity: 0.6; margin-bottom: 10px;
  font-family: monospace;
}
.report-empty { color: #e74c3c; }
.report-generate-btn {
  width: 100%; height: 36px; border: 2px solid var(--border-color);
  background: var(--btn-hover-bg); color: var(--btn-hover-text);
  font-size: 13px; font-family: monospace; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all var(--motion-duration-normal);
}
.report-generate-btn:hover { opacity: 0.85; }
.report-generate-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.report-generate-btn svg { width: 16px; height: 16px; }

/* ═══ 操作按钮 ═══ */
.sp-actions { display: flex; flex-direction: column; gap: 6px; }
.sp-action-btn { width: 100%; height: 34px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; font-family: monospace; cursor: pointer; text-align: left; padding: 0 14px; opacity: 0; transform: scaleX(0); transition: opacity var(--motion-duration-micro) var(--motion-easing-ease), transform var(--motion-duration-btn-transform) var(--motion-easing-enter); }
.entered .sp-action-btn { opacity: 1; transform: scaleX(1); }
.sp-action-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); transition: background var(--motion-duration-normal), color var(--motion-duration-normal); }
.sp-danger:hover { background: #f44336; color: #fff; border-color: #f44336; }

/* ═══ 快捷键表格 ═══ */
.ss-inline-table { padding: 4px 0; }
.ss-inline-table .ss-row { display: flex; align-items: center; border-bottom: 1px solid var(--border-color); }
.ss-inline-table .ss-row:last-child { border-bottom: none; }
.ss-row-head { font-size: 10px; opacity: 0.5; padding: 3px 0; }
.ss-row-disabled { opacity: 0.4; }
.ss-cell-label { flex: 1; font-size: 11px; font-family: monospace; padding: 5px 4px; min-width: 0; }
.ss-cell-key { min-width: 100px; text-align: center; font-family: monospace; font-size: 10px; cursor: pointer; padding: 5px 4px; border: 2px solid transparent; transition: background 0.15s; white-space: nowrap; }
.ss-cell-key:hover { background: var(--bg-secondary); }
.ss-cell-sel { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.ss-cell-na { opacity: 0.3; cursor: default; }
.ss-cell-na:hover { background: transparent; }
.ss-cell-value { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding: 5px 0; }
.ss-cell-value .sp-select { max-width: 180px; }
.ss-cell-value .path-btn { width: auto; padding: 0 8px; font-size: 11px; min-width: 100px; }
.ss-capture { margin-top: 6px; padding: 5px 8px; border: 2px solid var(--btn-hover-bg); background: var(--bg-secondary); font-size: 11px; font-family: monospace; display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateX(-12px); transition: opacity var(--motion-duration-fast) var(--motion-easing-standard), transform var(--motion-duration-fast) var(--motion-easing-standard); }
.entered .ss-capture { opacity: 1; transform: translateX(0); }

/* ═══ 动作链 ═══ */
.ac-list { padding: 4px 0; }
.ac-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border-color); font-size: 11px; }
.ac-item:last-child { border-bottom: none; }
.ac-name { flex: 1; font-family: monospace; }
.ac-key { font-size: 10px; font-family: monospace; opacity: 0.5; min-width: 40px; }
.ac-count { font-size: 10px; opacity: 0.5; font-family: monospace; }
.ac-empty { font-size: 11px; font-family: monospace; padding: 8px 0; }

.ac-editor { margin-top: 8px; padding: 8px; border: 2px solid var(--border-color); background: var(--bg-secondary); }
.ac-edit-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; font-family: monospace; }
.ac-input { flex: 1; height: 24px; padding: 0 6px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 11px; font-family: monospace; outline: none; min-width: 100px; }
.ac-actions-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.ac-act-row { display: flex; align-items: center; gap: 4px; }
.ac-param { width: 56px; height: 24px; padding: 0 4px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 10px; font-family: monospace; outline: none; text-align: center; }
.ac-edit-btns { display: flex; gap: 6px; margin-top: 8px; }

/* ═══ 精确延迟 ═══ */
.report-card { transition-delay: 0.22s; }
.sp-action-btn:nth-child(1) { transition-delay: 0.30s; }
.sp-action-btn:nth-child(2) { transition-delay: 0.33s; }
.sp-action-btn:nth-child(3) { transition-delay: 0.36s; }
.sp-action-btn:nth-child(4) { transition-delay: 0.39s; }
</style>
