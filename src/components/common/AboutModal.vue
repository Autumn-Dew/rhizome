<template>
  <Teleport to="body">
    <div class="about-mask" @click.self="$emit('close')">
      <div class="about-modal" :class="[themeClass]">
        <div class="about-header">
          <h3>关于 Rhizome</h3>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="about-body">
          <div class="about-logo"><img src="/img.png" alt="Rhizome" style="filter: var(--logo-filter);" /></div>
          <h2 class="about-name">Rhizome</h2>
          <p class="about-version">v{{ version }}</p>
          <p class="about-desc">简约的本地音乐播放器</p>
          <div class="about-divider"></div>
          <div class="about-meta">
            <div class="about-row">
              <span class="about-label">作者</span>
              <span>AutumnDew</span>
            </div>
            <div class="about-row">
              <span class="about-label">构建</span>
              <span>Electron · Vue 3</span>
            </div>
            <div class="about-row">
              <span class="about-label">年份</span>
              <span>2026</span>
            </div>
            <div class="about-row">
              <span class="about-label">联系</span>
              <span >B站 @AutumnDew</span>
            </div>
          </div>
          <p class="about-thanks-label">特别感谢</p>
          <p class="about-thanks-name">Oud-香水</p>
          <p class="about-thanks">由 AutumnDew 独立开发</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'

defineEmits(['close'])
const { themeClass } = useGlobalTheme()
const version = '1.0.82'
</script>

<style scoped>
.about-mask {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); display: flex; align-items: center;
  justify-content: center; z-index: 9999;
  animation: mt-fade-in var(--motion-duration-normal) var(--motion-easing-ease);
}
/* 注：mt-fade-in 定义在 motion-tokens.css（原 aboutMaskIn） */
.about-modal {
  width: 300px; background: var(--bg-primary); color: var(--text-primary);
  border: 2px solid var(--border-color);
  animation: mt-modal-in var(--motion-duration-slow) var(--motion-easing-standard);
}
/* 注：mt-modal-in 定义在 motion-tokens.css（原 aboutModalIn） */
.about-header {
  padding: 14px 20px; border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
}
.about-header h3 { margin: 0; font-size: 14px; }
.close-btn { background: transparent; border: none; color: var(--text-primary); font-size: 16px; cursor: pointer; }
.about-body { padding: 24px 20px; text-align: center; }
.about-logo { font-size: 40px; margin-bottom: 8px; }
.about-logo img { width: 64px; height: 64px; object-fit: contain; }
.about-name { font-size: 20px; margin: 0 0 4px; }
.about-version { font-size: 12px; opacity: 0.5; margin: 0 0 12px; font-family: monospace; }
.about-desc { font-size: 13px; opacity: 0.7; margin: 0 0 16px; }
.about-divider { width: 60px; height: 1px; background: var(--border-color); margin: 0 auto 16px; opacity: 0.4; }
.about-meta { text-align: left; padding: 0 20px; }
.about-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
.about-label { opacity: 0.5; }
.about-thanks { font-size: 12px; opacity: 0.4; margin: 20px 0 0; }
.about-thanks-label { font-size: 11px; opacity: 0.35; margin: 16px 0 2px; }
.about-thanks-name { font-size: 13px; margin: 0; }

/* ══ Ornate：弹窗装帧（蕾丝内衬 + 四角蝙蝠） ══ */
html[data-motion="ornate"] .about-modal { position: relative; }
html[data-motion="ornate"] .about-modal::before {
  content: '';
  position: absolute; inset: 5px;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(90deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(0deg, var(--border-color) 0 1px, transparent 1px 8px);
  background-repeat: no-repeat;
  background-size: 100% 3px, 100% 3px, 3px 100%, 3px 100%;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  opacity: 0;
  animation: about-lace 8s linear infinite;
  transition: opacity 0.9s var(--motion-easing-standard) 0.3s;
}
html[data-motion="ornate"] .about-modal::before { opacity: 0.4; }
@keyframes about-lace {
  0%   { background-position: 0 0, 0 100%, 0 0, 100% 0; }
  100% { background-position: 8px 0, -8px 100%, 0 -8px, 100% 8px; }
}
html[data-motion="ornate"] .about-modal::after {
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
  opacity: 0;
  transform: scale(0.6);
  animation: about-bat 5s ease-in-out infinite;
  transition: opacity 0.8s var(--motion-easing-standard) 0.4s,
    transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) 0.4s;
}
html[data-motion="ornate"] .about-modal::after { opacity: 0.65; transform: scale(1); }
@keyframes about-bat {
  0%, 100% { opacity: 0.7;  background-color: var(--border-color); }
  20%      { opacity: 0.18; background-color: var(--border-color); }
  40%      { opacity: 0.85; background-color: #c0392b; }
  62%      { opacity: 0.25; background-color: var(--border-color); }
  82%      { opacity: 0.9;  background-color: #c0392b; }
}
/* 标题居中 + 拉开字距 */
html[data-motion="ornate"] .about-header h3 { text-align: center; letter-spacing: 2px; }
html[data-motion="ornate"] .about-name { text-align: center; letter-spacing: 2px; }

/* ── 关闭按钮：四边 currentColor 延展（写法同 SelectModal .rc-close-btn） ── */
html[data-motion="ornate"] .close-btn { position: relative; }
html[data-motion="ornate"] .close-btn::before {
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
html[data-motion="ornate"] .close-btn:hover::before {
  background-size: 45% 2px, 45% 2px, 45% 2px, 45% 2px, 2px 45%, 2px 45%, 2px 45%, 2px 45%;
}
</style>
