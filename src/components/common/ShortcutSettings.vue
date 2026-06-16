<template>
  <Teleport to="body">
    <div class="ss-mask" @click.self="$emit('close')">
      <div class="ss-modal" :class="[themeClass]">
        <div class="ss-header">
          <h3>快捷键设置</h3>
          <button class="ss-close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="ss-table">
          <div class="ss-row ss-row-header">
            <span class="ss-cell ss-cell-action">操作</span>
            <span class="ss-cell ss-cell-scope">本地快捷键</span>
            <span class="ss-cell ss-cell-scope">全局快捷键</span>
          </div>
          <div
            class="ss-row"
            v-for="(def, action) in actionDefs"
            :key="action"
            :class="{ 'ss-row-disabled': !def.local && !def.global }"
          >
            <span class="ss-cell ss-cell-action">{{ def.label }}</span>
            <span
              class="ss-cell ss-cell-scope"
              :class="{
                'ss-cell-selected': selected === action + '-local',
                'ss-cell-na': !def.local,
              }"
              @click="selectCell(action, 'local')"
            >{{ def.local ? comboLabel(config[action].local) : '—' }}</span>
            <span
              class="ss-cell ss-cell-scope"
              :class="{
                'ss-cell-selected': selected === action + '-global',
                'ss-cell-na': !def.global,
              }"
              @click="selectCell(action, 'global')"
            >{{ def.global ? comboLabel(config[action].global) : '—' }}</span>
          </div>
        </div>

        <div class="ss-capture-bar" v-if="capturing">
          <span class="ss-capture-label">捕获按键：</span>
          <span class="ss-capture-display">{{ captureDisplay || '等待按键...' }}</span>
        </div>

        <div class="ss-bottom">
          <button class="ss-btn" :disabled="!selected || capturing" @click="startCapture">修改</button>
          <button class="ss-btn ss-btn-primary" :disabled="!selected || !capturing" @click="confirmCapture">确认</button>
          <div class="ss-spacer"></div>
          <button class="ss-btn" @click="handleReset">恢复默认</button>
          <button class="ss-btn" @click="$emit('close')">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import {
  getActionDefs,
  getShortcutConfig,
  comboLabel,
  updateShortcut,
  resetShortcuts,
} from '@/composables/useShortcuts'

defineEmits(['close'])
const { themeClass } = useGlobalTheme()

const actionDefs = getActionDefs()
const config = ref(getShortcutConfig())
const selected = ref(null)      // "togglePlay-local" 或 "prevSong-global"
const capturing = ref(false)
const captureDisplay = ref('')
const captureCombo = ref(null)

function selectCell(action, scope) {
  if (capturing.value) return
  selected.value = action + '-' + scope
}

function refresh() {
  config.value = getShortcutConfig()
}

function startCapture() {
  if (!selected.value) return
  capturing.value = true
  captureDisplay.value = ''
  captureCombo.value = null
}

const onKeydown = (e) => {
  if (!capturing.value) return
  e.preventDefault()
  e.stopPropagation()
  const parts = e.code
  captureDisplay.value = comboLabel({
    code: e.code,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  })
  captureCombo.value = {
    code: e.code,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  }
}

function confirmCapture() {
  if (!selected.value || !captureCombo.value) return
  const [action, scope] = selected.value.split('-')
  updateShortcut(action, scope, captureCombo.value)
  selected.value = null
  capturing.value = false
  captureCombo.value = null
  refresh()
}


function handleReset() {
  resetShortcuts()
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<style scoped>
.ss-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 99999;
}
.ss-modal {
  width: 520px; background: var(--bg-primary); color: var(--text-primary);
  border: 2px solid var(--border-color);
}
.ss-header {
  padding: 14px 20px; border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
}
.ss-header h3 { margin: 0; font-size: 14px; }
.ss-close-btn { background: transparent; border: none; color: var(--text-primary); font-size: 16px; cursor: pointer; }

.ss-table { padding: 8px 12px; }
.ss-row { display: flex; align-items: center; }
.ss-row-header { font-size: 11px; opacity: 0.5; padding: 4px 0; }
.ss-row + .ss-row { border-top: 1px solid var(--border-color); }
.ss-row-disabled { opacity: 0.4; }
.ss-cell { padding: 8px 6px; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.ss-cell:hover { background: var(--bg-secondary); }
.ss-cell-action { flex: 1; }
.ss-cell-scope {
  width: 120px; text-align: center; font-family: monospace;
  border: 2px solid transparent;
}
.ss-cell-selected {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}
.ss-cell-na { opacity: 0.3; cursor: default; }
.ss-cell-na:hover { background: transparent; }

.ss-capture-bar {
  margin: 8px 12px; padding: 8px 12px;
  border: 2px solid var(--btn-hover-bg);
  background: var(--bg-secondary);
  display: flex; align-items: center; gap: 8px;
}
.ss-capture-label { font-size: 12px; opacity: 0.6; }
.ss-capture-display { font-size: 14px; font-family: monospace; font-weight: bold; }

.ss-bottom {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; border-top: 1px solid var(--border-color);
}
.ss-spacer { flex: 1; }
.ss-btn {
  padding: 5px 12px; border: 2px solid var(--border-color);
  background: var(--bg-secondary); color: var(--text-primary);
  cursor: pointer; font-size: 12px; transition: all 0.15s;
}
.ss-btn:hover:not(:disabled) { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.ss-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ss-btn-primary { background: var(--btn-hover-bg); color: var(--btn-hover-text); }
.ss-btn-primary:hover:not(:disabled) { opacity: 0.85; }
</style>
