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
  animation: slideUp 0.25s ease forwards;
  display: flex;
  flex-direction: column;
}

.rc-select-drawer.center {
  border-radius: 0;
  margin: auto;
  animation: fadeIn 0.25s ease forwards;
}

.rc-select-drawer.right {
  max-width: 400px;
  margin-left: auto;
  margin-right: 0;
  height: 100%;
  border-top: none;
  border-left: 2px solid var(--border-color);
  animation: slideRight 0.25s ease forwards;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
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
  transition: background 0.2s;
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
</style>