<template>
  <div class="settings-page" :class="[themeClass, { entered }]">
    <div class="sp-header">
      <h2>设置</h2>
      <p class="sp-desc">偏好设置与音频均衡器</p>
    </div>

    <div class="sp-body">
      <!-- 左列：常规设置 -->
      <div class="sp-col">
      <div class="sp-row">
        <span class="sp-label">歌词字号</span>
        <div class="sp-stepper">
          <button class="sp-btn" @click="changeLyricSize(-1)" :disabled="lyricSize <= 10">−</button>
          <span class="sp-value">{{ lyricSize }}px</span>
          <button class="sp-btn" @click="changeLyricSize(1)" :disabled="lyricSize >= 18">+</button>
        </div>
      </div>

      <div class="sp-row">
        <span class="sp-label">歌词对齐</span>
        <div class="sp-stepper">
          <button class="sp-btn" :class="{ active: lyricAlign === 'left' }" @click="setLyricAlign('left')">左</button>
          <button class="sp-btn" :class="{ active: lyricAlign === 'center' }" @click="setLyricAlign('center')">中</button>
          <button class="sp-btn" :class="{ active: lyricAlign === 'right' }" @click="setLyricAlign('right')">右</button>
        </div>
      </div>

      <div class="sp-row">
        <span class="sp-label">开机自启</span>
        <div class="sp-stepper">
          <button class="sp-btn toggle-btn" :class="{ active: autoLaunch }" @click="toggleAutoLaunch">{{ autoLaunch ? 'ON' : 'OFF' }}</button>
        </div>
      </div>

      <div class="sp-row">
        <span class="sp-label">音频输出设备</span>
        <select class="sp-select" v-model="audioDeviceId" @change="onDeviceChange">
          <option value="">系统默认</option>
          <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || d.deviceId }}</option>
        </select>
      </div>

      <div class="sp-row">
        <span class="sp-label">每周自动歌单</span>
        <div class="sp-stepper">
          <button class="sp-btn toggle-btn" :class="{ active: weeklyEnabled }" @click="toggleWeekly">{{ weeklyEnabled ? 'ON' : 'OFF' }}</button>
        </div>
      </div>

      <div class="sp-row">
        <span class="sp-label">报告路径</span>
        <div class="sp-stepper">
          <button class="sp-btn path-btn" @click="selectReportDir">{{ reportPath || '点击设置路径' }}</button>
        </div>
      </div>

      <div class="sp-actions">
        <button class="sp-action-btn" @click="handleBackup">保存数据（备份）</button>
        <button class="sp-action-btn" @click="handleRestore">加载数据（恢复）</button>
        <button class="sp-action-btn" @click="handleImage">生成播放记录</button>
        <button class="sp-action-btn sp-danger" @click="handleClearAll">清除所有数据</button>
        <button class="sp-action-btn" @click="showAbout = true">关于 Rhizome</button>
      </div>
      </div>

      <!-- 右列：均衡器 -->
      <!-- 右列 -->
      <div class="sp-col">
      <!-- ═══ 均衡器（暂未启用） ═══
      <div class="sp-section-title sp-section-first">
        <span>均衡器</span>
        <div class="sp-title-actions">
          <select class="sp-select" v-model="eqPreset" @change="applyPreset" style="width:auto;min-width:80px">
            <option value="">预设</option>
            <option v-for="(gains, name) in eqPresets" :key="name" :value="name">{{ name }}</option>
          </select>
          <button class="sp-btn" style="width:auto;padding:0 8px;font-size:10px" @click="resetEQ">重置</button>
        </div>
      </div>
      <div class="eq-bands">
        <div class="eq-band" v-for="(b, i) in eqBands" :key="i">
          <span class="eq-freq">{{ formatFreq(b.freq) }}</span>
          <div class="eq-slider-wrap">
            <input type="range" class="eq-slider" min="-12" max="12" :value="b.gain" @input="setBand(i, $event.target.value)" orient="vertical" />
          </div>
          <span class="eq-db">{{ b.gain > 0 ? '+' : '' }}{{ b.gain }}dB</span>
        </div>
      </div>
      -->

      <div class="sp-section-title" @click="showShortcuts = !showShortcuts" style="cursor:pointer">
        <span>快捷键 {{ showShortcuts ? '▾' : '▸' }}</span>
        <button class="sp-btn" style="width:auto;padding:0 8px;font-size:10px" @click.stop="resetSC">重置</button>
      </div>
      <template v-if="showShortcuts">
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
      </template>

      <!-- ═══ 动作链 ═══ -->
      <div class="sp-section-title" @click="showActions = !showActions" style="cursor:pointer">
        <span>动作链 {{ showActions ? '▾' : '▸' }}</span>
        <button class="sp-btn" style="width:auto;padding:0 8px;font-size:10px" @click.stop="startAddChain" :disabled="acChains.length >= 5">+</button>
      </div>
      <template v-if="showActions">
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
      </template>
      </div>

      <div class="sp-footer" v-if="msg">{{ msg }}</div>
    </div>

    <AboutModal v-if="showAbout" @close="showAbout = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useLocalMusicStore } from '@/stores/localMusicStore'
import { usePlayerStore } from '@/stores/playerStore'
import { useAudioDevice } from '@/composables/useAudioDevice'
import { isWeeklyEnabled, setWeeklyEnabled } from '@/composables/useWeeklyPlaylists'
import { generateReportBlob } from '@/composables/useReportGenerator'
import { getActionDefs, getShortcutConfig, comboLabel, updateShortcut, resetShortcuts } from '@/composables/useShortcuts'
import { useActionChain, ACTION_TYPES } from '@/composables/useActionChain'
import AboutModal from '@/components/common/AboutModal.vue'

const { themeClass } = useGlobalTheme()
const localStore = useLocalMusicStore()
const playerStore = usePlayerStore()
const { devices: audioDevices, selectedId: audioDeviceId, select: selectDevice, applyTo } = useAudioDevice()
const { chains: acChains, add: acAdd, update: acUpdate, remove: acRemove, execute: acExecute } = useActionChain()

const msg = ref('')
const entered = ref(false)
const showAbout = ref(false)
const showShortcuts = ref(false)
const showActions = ref(false)

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

const lyricSize = ref(Number(localStorage.getItem('rhizome-lyric-size') || 14))
const lyricAlign = ref(localStorage.getItem('rhizome-lyric-align') || 'center')
const autoLaunch = ref(false)
const weeklyEnabled = ref(isWeeklyEnabled())
const reportPath = ref(localStorage.getItem('rhizome-report-path') || '')

function changeLyricSize(d) { lyricSize.value = Math.max(10, Math.min(18, lyricSize.value + d)); localStorage.setItem('rhizome-lyric-size', lyricSize.value) }
function setLyricAlign(a) { lyricAlign.value = a; localStorage.setItem('rhizome-lyric-align', a) }

async function toggleAutoLaunch() {
  autoLaunch.value = !autoLaunch.value
  window.electron?.setAutoLaunch?.(autoLaunch.value)
}

function toggleWeekly() {
  weeklyEnabled.value = !weeklyEnabled.value
  setWeeklyEnabled(weeklyEnabled.value)
}

function onDeviceChange() {
  selectDevice(audioDeviceId.value)
  const audio = playerStore.audio
  if (audio) applyTo(audio)
}

async function selectReportDir() {
  const dir = await window.electron?.selectReportDir?.()
  if (dir) { reportPath.value = dir; localStorage.setItem('rhizome-report-path', dir) }
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
async function handleImage() {
  const blob = await generateReportBlob(playerStore, localStore)
  if (!blob) { msg.value = '无播放数据可生成'; setTimeout(() => msg.value = '', 1500); return }
  const dir = reportPath.value
  if (!dir) { msg.value = '请先设置报告路径'; setTimeout(() => msg.value = '', 1500); return }
  const reader = new FileReader()
  reader.onload = async () => {
    const b64 = reader.result.split(',')[1]
    const ok = await window.electron?.saveReportFile?.(dir, `rhizome-report-${Date.now()}.png`, b64)
    msg.value = ok ? '报告已保存' : '保存失败'
    setTimeout(() => msg.value = '', 2000)
  }
  reader.readAsDataURL(blob)
}
async function handleClearAll() {
  await window.electron?.clearAllData?.()
  localStorage.clear()
  msg.value = '数据已清除，即将刷新'
  setTimeout(() => location.reload(), 1000)
}

onMounted(async () => {
  autoLaunch.value = await window.electron?.getAutoLaunch?.() || false
  window.addEventListener('keydown', onKeydown, true)
  requestAnimationFrame(() => { entered.value = true })
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
.sp-header { padding: 16px; border-bottom: 2px solid transparent; position: relative; }
.sp-header::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: var(--border-color); transform: scaleX(0); transition: transform 0.25s cubic-bezier(0.25, 0, 0, 1); }
.entered .sp-header::after { transform: scaleX(1); }
.sp-header h2 { font-size: 20px; margin: 0 0 4px; }
.sp-desc { font-size: 12px; opacity: 0.7; }

/* ═══ 精密组装入场 ═══ */
.sp-header h2 { opacity: 0; transform: translateY(-10px); letter-spacing: 3px; transition: opacity 0.18s cubic-bezier(0.2,0,0.2,1), transform 0.18s cubic-bezier(0.2,0,0.2,1), letter-spacing 0.25s cubic-bezier(0.2,0,0.2,1); }
.entered .sp-header h2 { opacity: 1; transform: translateY(0); letter-spacing: 0; }
.sp-desc { opacity: 0; transform: translateY(-6px); transition: opacity 0.15s ease 0.04s, transform 0.15s ease 0.04s; }
.entered .sp-desc { opacity: 0.7; transform: translateY(0); }

.sp-body { padding: 0 16px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 48px; align-items: start; width: 100%; max-width: 860px; margin: 0 auto; }
.sp-col { min-width: 0; overflow: hidden; }
.sp-footer { grid-column: 1 / -1; padding: 10px 0; font-size: 12px; text-align: center; opacity: 0; transition: opacity 0.15s ease; }
.entered .sp-footer { opacity: 0.6; }

/* ═══ 设置行 ═══ */
.sp-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); opacity: 0; transform: translateX(-20px); transition: opacity 0.15s cubic-bezier(0.2,0,0.2,1), transform 0.15s cubic-bezier(0.2,0,0.2,1); }
.entered .sp-row { opacity: 1; transform: translateX(0); }
.sp-label { font-size: 12px; font-family: monospace; }
.sp-stepper { display: flex; align-items: center; gap: 6px; }
.sp-btn { width: 28px; height: 28px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.sp-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.sp-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.sp-btn.active { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.toggle-btn { width: auto; min-width: 44px; padding: 0 10px; font-size: 11px; font-weight: 700; }
.path-btn { width: auto; padding: 0 8px; font-size: 10px; }
.sp-value { font-size: 13px; font-family: monospace; min-width: 36px; text-align: center; }
.sp-select { height: 28px; padding: 0 8px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 11px; font-family: monospace; cursor: pointer; outline: none; max-width: 180px; }
.sp-select option { background: var(--bg-primary); color: var(--text-primary); }

/* ═══ 分区标题 ═══ */
.sp-section-title { font-size: 14px; font-weight: 600; margin: 20px 0 10px; padding-top: 12px; border-top: 2px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; opacity: 0; transform: translateX(-12px); transition: opacity 0.15s cubic-bezier(0.2,0,0.2,1), transform 0.15s cubic-bezier(0.2,0,0.2,1); }
.entered .sp-section-title { opacity: 1; transform: translateX(0); }
.sp-title-actions { display: flex; align-items: center; gap: 6px; }

/* ═══ 操作按钮 ═══ */
.sp-actions { display: flex; flex-direction: column; gap: 6px; padding-top: 20px; }
.sp-action-btn { width: 100%; height: 34px; border: 2px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 12px; font-family: monospace; cursor: pointer; text-align: left; padding: 0 14px; opacity: 0; transform: scaleX(0); transition: opacity 0.12s ease, transform 0.13s cubic-bezier(0.25,0,0,1), background 0.2s, color 0.2s; }
.entered .sp-action-btn { opacity: 1; transform: scaleX(1); }
.sp-action-btn:hover { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.sp-danger:hover { background: #f44336; color: #fff; border-color: #f44336; }

/* ═══ 快捷键表格 ═══ */
.ss-inline-table { padding: 4px 0; }
.ss-inline-table .ss-row { display: flex; align-items: center; border-bottom: 1px solid var(--border-color); opacity: 0; transform: translateX(-20px); transition: opacity 0.15s cubic-bezier(0.2,0,0.2,1), transform 0.15s cubic-bezier(0.2,0,0.2,1); }
.entered .ss-inline-table .ss-row { opacity: 1; transform: translateX(0); }
.ss-row-head { font-size: 10px; opacity: 0.5; padding: 3px 0; }
.ss-row-disabled { opacity: 0.4; }
.ss-cell-label { flex: 1; font-size: 11px; font-family: monospace; padding: 5px 4px; }
.ss-cell-key { width: 64px; text-align: center; font-family: monospace; font-size: 10px; cursor: pointer; padding: 5px 2px; border: 2px solid transparent; transition: background 0.15s; }
.ss-cell-key:hover { background: var(--bg-secondary); }
.ss-cell-sel { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.ss-cell-na { opacity: 0.3; cursor: default; }
.ss-cell-na:hover { background: transparent; }
.ss-capture { margin-top: 6px; padding: 5px 8px; border: 2px solid var(--btn-hover-bg); background: var(--bg-secondary); font-size: 11px; font-family: monospace; display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateX(-12px); transition: opacity 0.15s cubic-bezier(0.2,0,0.2,1), transform 0.15s cubic-bezier(0.2,0,0.2,1); }
.entered .ss-capture { opacity: 1; transform: translateX(0); }

/* ═══ 动作链 ═══ */
.ac-list { padding: 4px 0; }
.ac-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border-color); font-size: 11px; opacity: 0; transform: translateX(-20px); transition: opacity 0.15s cubic-bezier(0.2,0,0.2,1), transform 0.15s cubic-bezier(0.2,0,0.2,1); }
.entered .ac-item { opacity: 1; transform: translateX(0); }
.ac-item:nth-child(1) { transition-delay: 0.40s; }
.ac-item:nth-child(2) { transition-delay: 0.42s; }
.ac-item:nth-child(3) { transition-delay: 0.44s; }
.ac-name { flex: 1; font-family: monospace; }
.ac-key { font-size: 10px; font-family: monospace; opacity: 0.5; min-width: 40px; }
.ac-count { font-size: 10px; opacity: 0.5; font-family: monospace; }
.ac-empty { font-size: 11px; opacity: 0.4; padding: 8px 0; font-family: monospace; opacity: 0; transition: opacity 0.15s ease 0.40s; }
.entered .ac-empty { opacity: 0.4; }

.ac-editor { margin-top: 8px; padding: 8px; border: 2px solid var(--border-color); background: var(--bg-secondary); }
.ac-edit-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; font-family: monospace; }
.ac-input { flex: 1; height: 24px; padding: 0 6px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 11px; font-family: monospace; outline: none; min-width: 100px; }
.ac-actions-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.ac-act-row { display: flex; align-items: center; gap: 4px; }
.ac-param { width: 56px; height: 24px; padding: 0 4px; border: 2px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 10px; font-family: monospace; outline: none; text-align: center; }
.ac-edit-btns { display: flex; gap: 6px; margin-top: 8px; }

/* ═══ 精确延迟 ═══ */
.sp-col:first-child .sp-row:nth-child(1) { transition-delay: 0.24s; }
.sp-col:first-child .sp-row:nth-child(2) { transition-delay: 0.263s; }
.sp-col:first-child .sp-row:nth-child(3) { transition-delay: 0.286s; }
.sp-col:first-child .sp-row:nth-child(4) { transition-delay: 0.309s; }
.sp-col:first-child .sp-row:nth-child(5) { transition-delay: 0.332s; }
.sp-col:first-child .sp-row:nth-child(6) { transition-delay: 0.355s; }
.sp-section-title { transition-delay: 0.26s; }
.ss-inline-table .ss-row:nth-child(1) { transition-delay: 0.30s; }
.ss-inline-table .ss-row:nth-child(2) { transition-delay: 0.32s; }
.ss-inline-table .ss-row:nth-child(3) { transition-delay: 0.34s; }
.ss-inline-table .ss-row:nth-child(4) { transition-delay: 0.36s; }
.ss-inline-table .ss-row:nth-child(5) { transition-delay: 0.38s; }
.ss-inline-table .ss-row:nth-child(6) { transition-delay: 0.40s; }
.ss-inline-table .ss-row:nth-child(7) { transition-delay: 0.42s; }
.ss-inline-table .ss-row:nth-child(8) { transition-delay: 0.44s; }
.ss-inline-table .ss-row:nth-child(9) { transition-delay: 0.46s; }
.sp-action-btn:nth-child(1) { transition-delay: 0.38s; }
.sp-action-btn:nth-child(2) { transition-delay: 0.41s; }
.sp-action-btn:nth-child(3) { transition-delay: 0.44s; }
.sp-action-btn:nth-child(4) { transition-delay: 0.47s; }
.sp-action-btn:nth-child(5) { transition-delay: 0.50s; }
.sp-footer { transition-delay: 0.55s; }
</style>
