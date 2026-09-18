<!-- src/components/common/SelectModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="visible" class="rc-select-modal" @click.self="handleClose">
      <div class="rc-select-drawer" :class="[position]" :style="{ maxHeight: maxHeight }">
        <div class="rc-select-header">
          <h3>{{ title }} <span v-if="showCount">({{ items.length }})</span></h3>
          <button class="rc-close-btn" @click="handleClose">✕</button>
        </div>

        <div class="rc-select-search" v-if="searchable">
          <input
              type="text"
              v-model="searchText"
              :placeholder="searchPlaceholder"
              class="rc-search-input"
          />
        </div>

        <div class="rc-select-body" ref="bodyRef">
          <div
              v-for="(item, index) in filteredItems"
              :key="getItemKey(item, index)"
              class="rc-select-item"
              :class="{ active: isActive(item) }"
              @click="handleSelect(item)"
          >
            <div class="rc-item-index" v-if="showIndex">{{ index + 1 }}</div>
            <div class="rc-item-content">
              <slot name="item-content" :item="item" :index="index">
                <div class="rc-item-default">
                  <div class="rc-item-title">{{ getItemTitle(item) }}</div>
                  <div class="rc-item-subtitle" v-if="getItemSubtitle(item)">{{ getItemSubtitle(item) }}</div>
                </div>
              </slot>
            </div>
            <div class="rc-item-extra" v-if="getItemExtra(item)">
              <slot name="item-extra" :item="item" :index="index">
                <span class="rc-item-time">{{ getItemExtra(item) }}</span>
              </slot>
            </div>
          </div>

          <div v-if="filteredItems.length === 0" class="rc-select-empty">
            {{ emptyText }}
          </div>
        </div>

        <div class="rc-select-footer" v-if="showFooter">
          <slot name="footer">
            <button class="rc-confirm-btn" @click="handleConfirm">确认</button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '选择'
  },
  items: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: [Object, Array, String, Number],
    default: null
  },
  // 单选/多选
  multiple: {
    type: Boolean,
    default: false
  },
  // 是否显示数量
  showCount: {
    type: Boolean,
    default: true
  },
  // 是否显示序号
  showIndex: {
    type: Boolean,
    default: false
  },
  // 是否显示底部
  showFooter: {
    type: Boolean,
    default: false
  },
  // 是否可搜索
  searchable: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: '搜索...'
  },
  // 弹窗位置
  position: {
    type: String,
    default: 'bottom' // 'bottom' | 'center' | 'right'
  },
  maxHeight: {
    type: String,
    default: '50vh'
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  // 字段映射
  titleField: {
    type: String,
    default: 'name'
  },
  subtitleField: {
    type: String,
    default: 'singer'
  },
  extraField: {
    type: String,
    default: 'duration'
  },
  keyField: {
    type: String,
    default: 'id'
  },
  // 激活比较函数
  isActiveFn: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'update:modelValue', 'select', 'confirm', 'close'])

const searchText = ref('')
const selectedValue = ref(props.modelValue)
const bodyRef = ref(null)

// 自动滚动到当前播放歌曲
watch(() => props.visible, async (v) => {
  if (v) {
    await nextTick()
    const el = bodyRef.value?.querySelector('.rc-select-item.active')
    if (el) el.scrollIntoView({ block: 'center' })
  }
})

// 监听外部modelValue变化
watch(() => props.modelValue, (newVal) => {
  selectedValue.value = newVal
})

const filteredItems = computed(() => {
  if (!props.searchable || !searchText.value) return props.items
  const search = searchText.value.toLowerCase()
  return props.items.filter(item => {
    const title = getItemTitle(item).toLowerCase()
    const subtitle = getItemSubtitle(item).toLowerCase()
    return title.includes(search) || subtitle.includes(search)
  })
})

const getItemTitle = (item) => {
  if (typeof item === 'string') return item
  return item[props.titleField] || ''
}

const getItemSubtitle = (item) => {
  if (typeof item === 'string') return ''
  return item[props.subtitleField] || ''
}

const getItemExtra = (item) => {
  if (typeof item === 'string') return ''
  const extra = item[props.extraField]
  if (typeof extra === 'number') {
    const m = Math.floor(extra / 60)
    const s = Math.floor(extra % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return extra || ''
}

const getItemKey = (item, index) => {
  if (typeof item === 'string') return item
  return item[props.keyField] || item.id || index
}

const isActive = (item) => {
  if (props.isActiveFn) return props.isActiveFn(item, selectedValue.value)

  if (props.multiple) {
    if (!Array.isArray(selectedValue.value)) return false
    const key = getItemKey(item)
    return selectedValue.value.some(v => getItemKey(v) === key)
  } else {
    const key = getItemKey(item)
    const selectedKey = selectedValue.value ? getItemKey(selectedValue.value) : null
    return key === selectedKey
  }
}

const handleSelect = (item) => {
  if (props.multiple) {
    let newValue = Array.isArray(selectedValue.value) ? [...selectedValue.value] : []
    const key = getItemKey(item)
    const index = newValue.findIndex(v => getItemKey(v) === key)
    if (index > -1) {
      newValue.splice(index, 1)
    } else {
      newValue.push(item)
    }
    selectedValue.value = newValue
    emit('update:modelValue', newValue)
    emit('select', newValue)
  } else {
    selectedValue.value = item
    emit('update:modelValue', item)
    emit('select', item)
    // 单选模式下点击后自动关闭
    handleClose()
  }
}

const handleConfirm = () => {
  emit('confirm', selectedValue.value)
  handleClose()
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
  searchText.value = ''
}
</script>

<style scoped>
.rc-select-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
}

.rc-select-drawer {
  width: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  border-top: 2px solid var(--border-color);
  animation: mt-slide-up var(--motion-duration-slow) var(--motion-easing-ease) forwards;
  display: flex;
  flex-direction: column;
}

.rc-select-drawer.center {
  border-radius: 0;
  margin: auto;
  animation: mt-fade-in var(--motion-duration-slow) var(--motion-easing-ease) forwards;
}

.rc-select-drawer.right {
  max-width: 400px;
  margin-left: auto;
  margin-right: 0;
  height: 100%;
  border-top: none;
  border-left: 2px solid var(--border-color);
  animation: mt-slide-right var(--motion-duration-slow) var(--motion-easing-ease) forwards;
}

.rc-select-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rc-select-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.rc-close-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
}

.rc-select-search {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
}

.rc-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
}

.rc-select-body {
  flex: 1;
  overflow-y: auto;
  max-height: 60vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.rc-select-body::-webkit-scrollbar {
  display: none;
}

.rc-select-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background var(--motion-duration-normal);
}

.rc-select-item:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.rc-select-item.active {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

.rc-item-index {
  width: 24px;
  text-align: center;
  font-size: 12px;
  opacity: 0.6;
}

.rc-item-content {
  flex: 1;
  min-width: 0;
}

.rc-item-default {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rc-item-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rc-item-subtitle {
  font-size: 11px;
  opacity: 0.6;
}

.rc-item-extra {
  font-size: 11px;
  opacity: 0.6;
  min-width: 40px;
  text-align: right;
}

.rc-select-empty {
  padding: 40px;
  text-align: center;
  opacity: 0.6;
}

.rc-select-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.rc-confirm-btn {
  padding: 8px 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.rc-confirm-btn:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
}

/* ══════════════════════════════════════════════════════════════
   Ornate（华丽方案）选择弹窗装饰 —— 对齐 PlayStats 统计卡：
   面板蕾丝内衬 + 四角蝙蝠（闪烁 + 偶发变红）+ 标题居中；
   按钮四边 currentColor 延展。仅 transform/opacity/background/
   mask/text-align/letter-spacing，classic 行为不变。
   ══════════════════════════════════════════════════════════════ */

html[data-motion="ornate"] .rc-select-drawer { position: relative; }

/* ── 面板：蕾丝内衬 ── */
html[data-motion="ornate"] .rc-select-drawer::before {
  content: '';
  position: absolute; inset: 5px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 7px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0.4;
  animation: sel-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
@keyframes sel-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0; }
  100% { background-position: 7px 0, -7px 100%, 0 -7px, 100% 7px; }
}

/* ── 面板：四角蝙蝠（闪烁 + 偶发变红） ── */
html[data-motion="ornate"] .rc-select-drawer::after {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  background: var(--border-color);
  -webkit-mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  mask:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(315 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(45 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right top / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(225 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") left bottom / 16px 16px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath transform='rotate(135 12 12)' d='M12 3C11 5 9 6 7 6 5 6 3 5 2 4 3 7 4 10 7 11 5 12 3 12 1 11 3 14 6 16 10 16L11 10 12 10 13 10 14 16C18 16 21 14 23 11 21 12 19 12 17 11 20 10 21 7 22 4 21 5 19 6 17 6 15 6 13 5 12 3Z'/%3E%3C/svg%3E") right bottom / 16px 16px no-repeat;
  opacity: 0.65;
  transform: scale(1);
  animation: sel-bat 5s ease-in-out infinite;
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
    transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
@keyframes sel-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}

/* ── 标题居中 ── */
html[data-motion="ornate"] .rc-select-header h3 { text-align: center; letter-spacing: 2px; }

/* ── 按钮：四边 currentColor 延展 ── */
html[data-motion="ornate"] .rc-confirm-btn,
html[data-motion="ornate"] .rc-close-btn { position: relative; }
html[data-motion="ornate"] .rc-confirm-btn::before,
html[data-motion="ornate"] .rc-close-btn::before {
  content: '';
  position: absolute; inset: 1px;
  pointer-events: none;
  background:
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat,
    linear-gradient(currentColor, currentColor) left top no-repeat,
    linear-gradient(currentColor, currentColor) left bottom no-repeat,
    linear-gradient(currentColor, currentColor) right top no-repeat,
    linear-gradient(currentColor, currentColor) right bottom no-repeat;
  background-size: 0 2px, 0 2px, 0 2px, 0 2px, 2px 0, 2px 0, 2px 0, 2px 0;
  transition: background-size var(--motion-time-interaction) var(--motion-easing-standard);
}
html[data-motion="ornate"] .rc-confirm-btn:hover::before,
html[data-motion="ornate"] .rc-close-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>