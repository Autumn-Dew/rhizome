<template>
  <div class="not-found" :class="{ entered }">
    <div class="nf-header">
      <h2>404</h2>
      <p class="desc">该页面暂未开发</p>
    </div>
    <div class="nf-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    </div>
    <div class="nf-footer">
      <span>Rhizome · 音乐播放器</span>
    </div>
  </div>
</template>

<script setup>
import { usePageEnter } from '@/composables/usePageEnter'
const { entered } = usePageEnter()
</script>

<style scoped>
.not-found {
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  overflow: hidden;
}

/* === 精密入场 === */
.nf-header h2 {
  font-size: 64px;
  font-weight: 700;
  margin: 0;
  opacity: 0;
  transform: translateY(-10px);
  letter-spacing: 8px;
  transition: opacity var(--motion-duration-medium) var(--motion-easing-standard),
              transform var(--motion-duration-medium) var(--motion-easing-standard),
              letter-spacing var(--motion-duration-slow) var(--motion-easing-standard);
}
.entered .nf-header h2 {
  opacity: 1;
  transform: translateY(0);
  letter-spacing: 4px;
}

.nf-header .desc {
  text-align: center;
  font-size: 13px;
  margin: 6px 0 0;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.04s,
              transform var(--motion-duration-fast) var(--motion-easing-ease) 0.04s;
}
.entered .nf-header .desc {
  opacity: 0.5;
  transform: translateY(0);
}

/* 分隔线 */
.nf-header {
  position: relative;
  padding-bottom: 24px;
  margin-bottom: 24px;
}
.nf-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 60px;
  height: 2px;
  background: var(--border-color);
  transform: translateX(-50%) scaleX(0);
  transition: transform var(--motion-duration-slow) var(--motion-easing-enter);
}
.entered .nf-header::after {
  transform: translateX(-50%) scaleX(1);
}

/* 图标 */
.nf-icon {
  opacity: 0;
  transform: scale(0.6);
  transition: opacity var(--motion-duration-normal) var(--motion-easing-standard) 0.12s,
              transform var(--motion-duration-normal) var(--motion-easing-standard) 0.12s;
}
.entered .nf-icon {
  opacity: 0.3;
  transform: scale(1);
}
.nf-icon svg {
  width: 80px;
  height: 80px;
}

/* 页脚 */
.nf-footer {
  margin-top: 40px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--motion-duration-fast) var(--motion-easing-ease) 0.28s,
              transform var(--motion-duration-fast) var(--motion-easing-ease) 0.28s;
}
.entered .nf-footer {
  opacity: 0.25;
  transform: translateY(0);
}
.nf-footer span {
  font-size: 11px;
  font-family: monospace;
}
</style>
