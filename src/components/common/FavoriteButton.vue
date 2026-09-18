<template>
  <button
    class="fav-btn"
    :class="{ active: liked }"
    @click.stop="toggle"
    title="我喜欢"
  >
    <svg viewBox="0 0 24 24" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </button>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFavorites } from '@/composables/useFavorites'

const props = defineProps({
  song: { type: Object, default: null }
})

const { isFavorited, toggleFavorite } = useFavorites()
const liked = ref(false)

watch(() => props.song, (s) => {
  liked.value = s?.path ? isFavorited(s.path) : false
}, { immediate: true })

const toggle = () => {
  if (!props.song?.path) return
  liked.value = toggleFavorite(props.song.path)
}
</script>

<style scoped>
.fav-btn {
  width: 30px;
  height: 30px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--motion-control-hover);
  flex-shrink: 0;
  position: relative;
}
.fav-btn svg {
  width: 14px;
  height: 14px;
}
/* hover 与其它小按钮一致：反色 + 边框也随反色（与 .song-btn:hover 对齐） */
.fav-btn:hover,
.fav-btn.active:hover {
  background: var(--btn-hover-bg);
  color: var(--btn-hover-text);
  border-color: var(--btn-hover-text);
}
/* 已喜欢：仅用红色标记状态（hover 时上面规则统一覆盖） */
.fav-btn.active {
  color: #e74c3c;
  border-color: #e74c3c;
}

/* ══ Ornate：喜欢按钮四边 currentColor 延展（与其它按钮统一） ══ */
html[data-motion="ornate"] .fav-btn::before {
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
html[data-motion="ornate"] .fav-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>
