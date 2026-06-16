<!-- src/components/common/Timestamp.vue -->
<template>
  <span :class="['rc-timestamp', customClass]" :style="customStyle">{{ formattedTime }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 时间戳（秒或毫秒）
  timestamp: {
    type: [Number, String, Date],
    required: true
  },
  // 格式类型：'auto' | 'date' | 'datetime' | 'time'
  format: {
    type: String,
    default: 'auto'
  },
  // 自定义类名
  customClass: {
    type: String,
    default: ''
  },
  // 自定义样式
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

const formatTime = (date) => {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000) // 秒差

  if (props.format === 'auto') {
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
    return formatDate(date, 'MM-dd')
  }

  if (props.format === 'date') return formatDate(date, 'yyyy-MM-dd')
  if (props.format === 'time') return formatDate(date, 'HH:mm')
  return formatDate(date, 'yyyy-MM-dd HH:mm')
}

const formatDate = (date, pattern) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return pattern
      .replace('yyyy', year)
      .replace('MM', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
}

const formattedTime = computed(() => {
  let date = props.timestamp
  if (typeof date === 'string') date = new Date(date)
  if (typeof date === 'number') {
    // 判断是秒还是毫秒
    date = new Date(date < 10000000000 ? date * 1000 : date)
  }
  return formatTime(date)
})
</script>

<style scoped>
.rc-timestamp {
  font-size: 11px;
  font-family: monospace;
  opacity: 0.7;
}
</style>