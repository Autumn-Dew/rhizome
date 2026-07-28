<template>
  <div v-if="visible" class="ss-root" :class="[themeClass, { 'ss-dismissing': dismissing }]" @click.stop="startDismiss" @mousedown.prevent @contextmenu.prevent>
    <!-- �ĽǱ߿� -->
    <div class="ss-bracket bracket-tl"></div>
    <div class="ss-bracket bracket-tr"></div>
    <div class="ss-bracket bracket-bl"></div>
    <div class="ss-bracket bracket-br"></div>

    <!-- �Խ����� -->
    <div class="ss-chain chain-tl"></div>
    <div class="ss-chain chain-tr"></div>
    <div class="ss-chain chain-bl"></div>
    <div class="ss-chain chain-br"></div>

    <!-- ���е����� -->
    <div class="ss-chain2 chain2-top"></div>
    <div class="ss-chain2 chain2-bottom"></div>
    <div class="ss-chain2 chain2-left"></div>
    <div class="ss-chain2 chain2-right"></div>

    <!-- �������� -->
    <div class="ss-spark spark-tl"></div>
    <div class="ss-spark spark-tr"></div>
    <div class="ss-spark spark-bl"></div>
    <div class="ss-spark spark-br"></div>

    <!-- ������� -->
    <div class="ss-ember ember-tl-1"></div>
    <div class="ss-ember ember-tl-2"></div>
    <div class="ss-ember ember-tr-1"></div>
    <div class="ss-ember ember-tr-2"></div>
    <div class="ss-ember ember-bl-1"></div>
    <div class="ss-ember ember-bl-2"></div>
    <div class="ss-ember ember-br-1"></div>
    <div class="ss-ember ember-br-2"></div>

    <!-- ������� -->
    <div class="ss-spoke-wrap">
      <div class="ss-spoke" v-for="r in runes" :key="r.ang" :style="{ '--ang': r.ang, '--d': r.d, '--rune': `'${r.char}'` }"></div>
    </div>

    <!-- ���ķ��� -->
    <div class="ss-core-star s1"></div>
    <div class="ss-core-star s2"></div>
    <div class="ss-core-circle"></div>
    <div class="ss-core-dial-wrap">
      <div class="ss-core-dial-tick" v-for="a in dials12" :key="a.ang" :style="{ '--ang': a.ang, '--d': a.d }"></div>
    </div>
    <div class="ss-core-cross-wrap">
      <div class="ss-core-cross-line" v-for="a in dials8" :key="a.ang" :style="{ '--ang': a.ang, '--d': a.d }"></div>
    </div>
    <div class="ss-core-node" v-for="n in nodes8" :key="n.key" :style="{ top: n.top, left: n.left, '--d': n.d }"></div>

    <!-- ���⻷ -->
    <div class="ss-ring ring-1"></div>
    <div class="ss-ring ring-2"></div>
    <div class="ss-ring ring-3"></div>
    <div class="ss-ring ring-4a"></div>
    <div class="ss-ring ring-4b"></div>
    <div class="ss-ring ring-5a"></div>
    <div class="ss-ring ring-5b"></div>
    <div class="ss-ring-5-nodes">
      <div class="ss-ring-5-node" v-for="n in nodes4" :key="n.key" :style="{ top: n.top, left: n.left }"></div>
    </div>
    <div class="ss-ring ring-6"></div>
    <div class="ss-ring-6-nodes">
      <div class="ss-ring-6-node" v-for="n in nodes8_270" :key="n.key" :style="{ top: n.top, left: n.left }"></div>
    </div>

    <!-- Logo -->
    <div class="ss-logo-wrap">
      <div class="ss-logo">Rhizome</div>
      <div class="ss-sub">��Լ�ı������ֲ�����</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  visible: Boolean,
  themeClass: { type: String, default: '' }
})
const emit = defineEmits(['dismiss'])

const dismissing = ref(false)
const canDismiss = ref(false)
let showTimer = null

watch(() => props.visible, (v) => {
  if (v) {
    canDismiss.value = false
    dismissing.value = false
    clearTimeout(showTimer)
    showTimer = setTimeout(() => { canDismiss.value = true }, 600)
  } else {
    clearTimeout(showTimer)
  }
})

function startDismiss() {
  if (!canDismiss.value || dismissing.value) return
  dismissing.value = true
  setTimeout(() => emit('dismiss'), 500)
}

const runes = [
  { ang:'0deg',   d:'1.02s', char:'\u16CF' }, { ang:'30deg',  d:'1.04s', char:'\u25C8' },
  { ang:'60deg',  d:'1.06s', char:'\u16DA' }, { ang:'90deg',  d:'1.08s', char:'\u25C7' },
  { ang:'120deg', d:'1.10s', char:'\u16DE' }, { ang:'150deg', d:'1.12s', char:'\u25C6' },
  { ang:'180deg', d:'1.14s', char:'\u16DF' }, { ang:'210deg', d:'1.16s', char:'\u25CA' },
  { ang:'240deg', d:'1.18s', char:'\u16D7' }, { ang:'270deg', d:'1.20s', char:'\u2B25' },
  { ang:'300deg', d:'1.22s', char:'\u16B9' }, { ang:'330deg', d:'1.24s', char:'\u2B29' },
]
const dials12 = Array.from({length:12}, (_,i) => ({ ang: `${i*30}deg`,  d: `${0.90+i*0.01}s` }))
const dials8  = Array.from({length:8},  (_,i) => ({ ang: `${i*45}deg`,  d: `${0.86+i*0.01}s` }))
const nodes8 = [
  { key:'n0', top:'calc(50% - 90px)', left:'50%',               d:'1.02s' },
  { key:'n1', top:'calc(50% - 64px)', left:'calc(50% + 64px)',  d:'1.03s' },
  { key:'n2', top:'50%',              left:'calc(50% + 90px)',  d:'1.04s' },
  { key:'n3', top:'calc(50% + 64px)', left:'calc(50% + 64px)',  d:'1.05s' },
  { key:'n4', top:'calc(50% + 90px)', left:'50%',               d:'1.06s' },
  { key:'n5', top:'calc(50% + 64px)', left:'calc(50% - 64px)',  d:'1.07s' },
  { key:'n6', top:'50%',              left:'calc(50% - 90px)',  d:'1.08s' },
  { key:'n7', top:'calc(50% - 64px)', left:'calc(50% - 64px)',  d:'1.09s' },
]
const nodes4 = [
  { key:'a0', top:'-242px', left:'0' }, { key:'a1', top:'0', left:'242px' },
  { key:'a2', top:'242px', left:'0' },  { key:'a3', top:'0', left:'-242px' },
]
const nodes8_270 = [
  { key:'b0', top:'-270px', left:'0' },            { key:'b1', top:'-191px', left:'191px' },
  { key:'b2', top:'0', left:'270px' },             { key:'b3', top:'191px', left:'191px' },
  { key:'b4', top:'270px', left:'0' },             { key:'b5', top:'191px', left:'-191px' },
  { key:'b6', top:'0', left:'-270px' },            { key:'b7', top:'-191px', left:'-191px' },
]
</script>

<style scoped>
.ss-root {
  position: fixed; inset: 0; z-index: 99999;
  background: var(--bg-primary); overflow: hidden;
  cursor: pointer;
  animation: ss-fade-in 0.25s var(--motion-easing-ease);
  --c55: color-mix(in srgb, var(--border-color) 55%, transparent);
  --c45: color-mix(in srgb, var(--border-color) 45%, transparent);
  --c40: color-mix(in srgb, var(--border-color) 40%, transparent);
  --c30: color-mix(in srgb, var(--border-color) 30%, transparent);
  --c28: color-mix(in srgb, var(--border-color) 28%, transparent);
  --c25: color-mix(in srgb, var(--border-color) 25%, transparent);
  --c22: color-mix(in srgb, var(--border-color) 22%, transparent);
  --c20: color-mix(in srgb, var(--border-color) 20%, transparent);
  --c18: color-mix(in srgb, var(--border-color) 18%, transparent);
  --c16: color-mix(in srgb, var(--border-color) 16%, transparent);
  --c15: color-mix(in srgb, var(--border-color) 15%, transparent);
  --c12: color-mix(in srgb, var(--border-color) 12%, transparent);
  --c10: color-mix(in srgb, var(--border-color) 10%, transparent);
  --c09: color-mix(in srgb, var(--border-color) 9%, transparent);
  --c08: color-mix(in srgb, var(--border-color) 8%, transparent);
  --c07: color-mix(in srgb, var(--border-color) 7%, transparent);
  --c06: color-mix(in srgb, var(--border-color) 6%, transparent);
  --c05: color-mix(in srgb, var(--border-color) 5%, transparent);
  --c85: color-mix(in srgb, var(--border-color) 85%, transparent);
  --c70: color-mix(in srgb, var(--border-color) 70%, transparent);
  --c50: color-mix(in srgb, var(--border-color) 50%, transparent);
}
@keyframes ss-fade-in { from { opacity: 0; } to { opacity: 1; } }
.ss-dismissing {
  animation: ss-bg-fade 0.5s 0.3s var(--motion-easing-ease) forwards !important;
  pointer-events: none;
}
/* 外层光环先缩 */
.ss-dismissing .ss-ring,
.ss-dismissing .ss-ring-5-nodes,
.ss-dismissing .ss-ring-6-nodes {
  animation: ring-shrink-out 0.35s var(--shrink-delay, 0s) var(--motion-easing-leave) forwards !important;
}
.ss-dismissing .ring-6,
.ss-dismissing .ss-ring-6-nodes { --shrink-delay: 0.00s; }
.ss-dismissing .ring-5a,
.ss-dismissing .ring-5b,
.ss-dismissing .ss-ring-5-nodes { --shrink-delay: 0.04s; }
.ss-dismissing .ring-4a,
.ss-dismissing .ring-4b { --shrink-delay: 0.08s; }
.ss-dismissing .ring-3 { --shrink-delay: 0.12s; }
.ss-dismissing .ring-2 { --shrink-delay: 0.15s; }
.ss-dismissing .ring-1 { --shrink-delay: 0.18s; }
.ss-dismissing .ss-core-circle { --shrink-delay: 0.20s; }

/* 符文、刻度、节点直接淡出 */
.ss-dismissing .ss-spoke,
.ss-dismissing .ss-spoke::after,
.ss-dismissing .ss-core-dial-tick,
.ss-dismissing .ss-core-cross-line,
.ss-dismissing .ss-core-node,
.ss-dismissing .ss-core-star,
.ss-dismissing .ss-bracket,
.ss-dismissing .ss-spark,
.ss-dismissing .ss-ember {
  animation: elem-fade 0.2s var(--motion-easing-ease) forwards !important;
}

/* 锁链缩回 */
.ss-dismissing .ss-chain {
  animation: chain-shrink-out 0.3s var(--delay) var(--motion-easing-leave) forwards !important;
}
.ss-dismissing .ss-chain2 {
  animation: chain2-shrink-out 0.25s var(--motion-easing-leave) forwards !important;
}

/* Logo 上浮淡出 */
.ss-dismissing .ss-logo-wrap {
  animation: logo-up-out 0.3s 0.05s var(--motion-easing-leave) forwards !important;
}

@keyframes ss-bg-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes ring-shrink-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.3); } }
@keyframes elem-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes chain-shrink-out { from { width: 118px; opacity: 1; } to { width: 0; opacity: 0; } }
@keyframes chain2-shrink-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes logo-up-out {
  from { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
  to   { opacity: 0; transform: translate(-50%, -50%) translateY(-14px); }
}

/* ━━ 四角边框 ━━ */
.ss-bracket {
  position: fixed; width: 22px; height: 22px; z-index: 99997;
  pointer-events: none; opacity: 0;
  animation: bracket-in 0.3s var(--delay) var(--motion-easing-standard) forwards;
}
.ss-bracket::before, .ss-bracket::after { content:''; position:absolute; background:var(--c40); }
.ss-bracket::before { width:100%; height:1px; }
.ss-bracket::after  { width:1px; height:100%; }
.bracket-tl { top:14px; left:14px; --delay:0.02s; } .bracket-tl::before,.bracket-tl::after { top:0; left:0; }
.bracket-tr { top:14px; right:14px; --delay:0.04s; } .bracket-tr::before,.bracket-tr::after { top:0; right:0; }
.bracket-bl { bottom:14px; left:14px; --delay:0.06s; } .bracket-bl::before,.bracket-bl::after { bottom:0; left:0; }
.bracket-br { bottom:14px; right:14px; --delay:0.08s; } .bracket-br::before,.bracket-br::after { bottom:0; right:0; }
@keyframes bracket-in { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }

/* ━━ 对角锁链 ━━ */
.ss-chain {
  position:fixed; z-index:99999; height:2px;
  background:var(--c55); transform-origin:var(--origin);
  animation:chain-grow 0.5s var(--delay) var(--motion-easing-enter) forwards;
  pointer-events:none;
}
.chain-tl { --origin:left top; top:24px; left:24px; width:0; transform:rotate(45deg); --delay:0.30s; }
.chain-tr { --origin:right top; top:24px; right:24px; width:0; transform:rotate(-45deg); --delay:0.33s; }
.chain-bl { --origin:left bottom; bottom:24px; left:24px; width:0; transform:rotate(-45deg); --delay:0.36s; }
.chain-br { --origin:right bottom; bottom:24px; right:24px; width:0; transform:rotate(45deg); --delay:0.39s; }
@keyframes chain-grow { from { width:0; opacity:0.4; } to { width:118px; opacity:1; } }

/* ━━ 边中点锁链 ━━ */
.ss-chain2 {
  position:fixed; z-index:99998; background:var(--c45);
  pointer-events:none; animation-timing-function:var(--motion-easing-enter); animation-fill-mode:forwards;
}
.chain2-top    { top:24px; left:50%; width:2px; height:0; transform:translateX(-50%); animation:chain2-grow-v 0.5s 0.42s forwards; }
.chain2-bottom { bottom:24px; left:50%; width:2px; height:0; transform:translateX(-50%); animation:chain2-grow-v 0.5s 0.45s forwards; }
.chain2-left   { left:24px; top:50%; height:2px; width:0; transform:translateY(-50%); animation:chain2-grow-h 0.5s 0.48s forwards; }
.chain2-right  { right:24px; top:50%; height:2px; width:0; transform:translateY(-50%); animation:chain2-grow-h 0.5s 0.51s forwards; }
@keyframes chain2-grow-v { from { height:0; opacity:0.3; } to { height:108px; opacity:1; } }
@keyframes chain2-grow-h { from { width:0; opacity:0.3; } to { width:108px; opacity:1; } }

/* ━━ 锁链流光 ━━ */
.ss-spark {
  position:fixed; z-index:100000; pointer-events:none;
  width:4px; height:4px; border-radius:50%;
  background:var(--c85); box-shadow:0 0 6px 1px var(--c30);
  animation-duration:0.45s; animation-timing-function:var(--motion-easing-spark); animation-fill-mode:forwards;
}
.spark-tl { top:24px; left:24px; animation-delay:0.85s; animation-name:spark-tl; }
.spark-tr { top:24px; right:24px; animation-delay:0.88s; animation-name:spark-tr; }
.spark-bl { bottom:24px; left:24px; animation-delay:0.91s; animation-name:spark-bl; }
.spark-br { bottom:24px; right:24px; animation-delay:0.94s; animation-name:spark-br; }
@keyframes spark-tl { 0%{transform:translate(0,0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translate(83px,83px);opacity:0} }
@keyframes spark-tr { 0%{transform:translate(0,0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translate(-83px,83px);opacity:0} }
@keyframes spark-bl { 0%{transform:translate(0,0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translate(83px,-83px);opacity:0} }
@keyframes spark-br { 0%{transform:translate(0,0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translate(-83px,-83px);opacity:0} }

/* ━━ 余烬 ━━ */
.ss-ember { position:fixed; z-index:100000; pointer-events:none; width:3px; height:3px; border-radius:50%; background:var(--c70); opacity:0; }
.ember-tl-1 { top:107px; left:107px; animation:ember-tl-1 0.4s 1.32s var(--motion-easing-ease-out) forwards; }
.ember-tl-2 { top:107px; left:107px; animation:ember-tl-2 0.4s 1.34s var(--motion-easing-ease-out) forwards; }
.ember-tr-1 { top:107px; right:107px; animation:ember-tr-1 0.4s 1.36s var(--motion-easing-ease-out) forwards; }
.ember-tr-2 { top:107px; right:107px; animation:ember-tr-2 0.4s 1.38s var(--motion-easing-ease-out) forwards; }
.ember-bl-1 { bottom:107px; left:107px; animation:ember-bl-1 0.4s 1.40s var(--motion-easing-ease-out) forwards; }
.ember-bl-2 { bottom:107px; left:107px; animation:ember-bl-2 0.4s 1.42s var(--motion-easing-ease-out) forwards; }
.ember-br-1 { bottom:107px; right:107px; animation:ember-br-1 0.4s 1.44s var(--motion-easing-ease-out) forwards; }
.ember-br-2 { bottom:107px; right:107px; animation:ember-br-2 0.4s 1.46s var(--motion-easing-ease-out) forwards; }
@keyframes ember-tl-1 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(-13px,-13px)} }
@keyframes ember-tl-2 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(10px,-15px)} }
@keyframes ember-tr-1 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(13px,-13px)} }
@keyframes ember-tr-2 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(-10px,-15px)} }
@keyframes ember-bl-1 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(-13px,13px)} }
@keyframes ember-bl-2 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(10px,15px)} }
@keyframes ember-br-1 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(13px,13px)} }
@keyframes ember-br-2 { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(-10px,15px)} }

/* ━━ 符文 ━━ */
.ss-spoke-wrap { position:fixed; top:50%; left:50%; width:0; height:0; z-index:99997; pointer-events:none; }
.ss-spoke {
  position:absolute; left:-0.5px; top:0; width:0; height:0;
  transform-origin:center bottom; transform:rotate(var(--ang)) translateY(-120px);
  opacity:0; animation:spoke-in 0.3s var(--d) var(--motion-easing-ease-out) forwards;
}
.ss-spoke::after {
  content:var(--rune); position:absolute; top:50%; left:50%;
  transform:translate(-50%,-50%) rotate(calc(-1 * var(--ang)));
  color:var(--c45); font-size:13px;
  font-family:"Segoe UI Symbol","Microsoft YaHei",serif; line-height:1;
}
@keyframes spoke-in { from { opacity:0; } to { opacity:1; } }

/* ━━ 中心法阵 ━━ */
.ss-core-star { position:fixed; top:50%; left:50%; width:130px; height:130px; margin:-65px 0 0 -65px; border:1px solid var(--c22); pointer-events:none; opacity:0; }
.ss-core-star.s1 { animation:core-enter 0.45s 0.70s var(--motion-easing-standard) forwards; }
.ss-core-star.s2 { transform:rotate(45deg) scale(1); animation:core-enter-45 0.45s 0.76s var(--motion-easing-standard) forwards; }
@keyframes core-enter { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }
@keyframes core-enter-45 { from { opacity:0; transform:rotate(45deg) scale(0.6); } to { opacity:1; transform:rotate(45deg) scale(1); } }

.ss-core-circle {
  position:fixed; top:50%; left:50%; width:92px; height:92px; margin:-46px 0 0 -46px;
  border:1px dashed var(--c28); border-radius:50%; pointer-events:none; opacity:0;
  animation:core-enter 0.4s 0.82s var(--motion-easing-standard) forwards, ring-spin 12s 1.22s var(--motion-easing-linear) infinite;
}

.ss-core-dial-wrap { position:fixed; top:50%; left:50%; width:0; height:0; z-index:99997; pointer-events:none; }
.ss-core-dial-tick {
  position:absolute; left:-0.5px; top:0; width:1px; height:7px;
  background:var(--c30); transform-origin:center bottom;
  transform:rotate(var(--ang)) translateY(-58px); opacity:0;
  animation:dial-in 0.2s var(--d) var(--motion-easing-ease-out) forwards;
}
@keyframes dial-in { from { opacity:0; } to { opacity:1; } }

.ss-core-cross-wrap { position:fixed; top:50%; left:50%; width:0; height:0; z-index:99996; pointer-events:none; }
.ss-core-cross-line {
  position:absolute; left:-0.5px; top:0; width:1px; height:20px;
  background:var(--c16); transform-origin:center bottom;
  transform:rotate(var(--ang)) translateY(-38px); opacity:0;
  animation:dial-in 0.25s var(--d) var(--motion-easing-ease-out) forwards;
}

.ss-core-node {
  position:fixed; width:6px; height:6px; margin:-3px 0 0 -3px;
  border:1px solid var(--c45); pointer-events:none; opacity:0;
  animation:core-node-in 0.25s var(--d) var(--motion-easing-spring) forwards;
}
@keyframes core-node-in { from { opacity:0; transform:rotate(45deg) scale(0); } to { opacity:1; transform:rotate(45deg) scale(1); } }

/* ━━ 多层光环 ━━ */
.ss-ring { position:fixed; top:50%; left:50%; border-radius:50%; pointer-events:none; opacity:0; }
.ring-1 { width:200px; height:200px; margin:-100px 0 0 -100px; border:1px dashed var(--c20); animation:ring-enter 0.5s 0.55s var(--motion-easing-standard) forwards, ring-spin 9s 1.05s var(--motion-easing-linear) infinite; }
.ring-2 { width:260px; height:260px; margin:-130px 0 0 -130px; border:1px solid var(--c12); animation:ring-enter 0.5s 0.60s var(--motion-easing-standard) forwards, ring-spin-rev 13s 1.10s var(--motion-easing-linear) infinite; }
.ring-3 { width:320px; height:320px; margin:-160px 0 0 -160px; border:1px dotted var(--c10); animation:ring-enter 0.5s 0.65s var(--motion-easing-standard) forwards, ring-spin 18s 1.15s var(--motion-easing-linear) infinite; }
.ring-4a { width:396px; height:396px; margin:-198px 0 0 -198px; border:1px dashed var(--c10); animation:ring-enter 0.5s 1.30s var(--motion-easing-standard) forwards, ring-spin-rev 18s 1.80s var(--motion-easing-linear) infinite; }
.ring-4b { width:416px; height:416px; margin:-208px 0 0 -208px; border:1px dotted var(--c07); animation:ring-enter 0.5s 1.33s var(--motion-easing-standard) forwards, ring-spin 22s 1.83s var(--motion-easing-linear) infinite; }
.ring-5a { width:460px; height:460px; margin:-230px 0 0 -230px; border:1px solid var(--c06); animation:ring-enter 0.5s 1.36s var(--motion-easing-standard) forwards, ring-spin 28s 1.86s var(--motion-easing-linear) infinite; }
.ring-5b { width:484px; height:484px; margin:-242px 0 0 -242px; border:1px dashed var(--c08); animation:ring-enter 0.5s 1.39s var(--motion-easing-standard) forwards, ring-spin-rev 24s 1.89s var(--motion-easing-linear) infinite; }
.ring-6 { width:540px; height:540px; margin:-270px 0 0 -270px; border:2px solid var(--c08); border-radius:50%; animation:ring-enter 0.6s 1.45s var(--motion-easing-standard) forwards, ring-spin 28s 1.90s var(--motion-easing-linear) infinite; }
.ring-6::before { content:''; position:absolute; inset:-12px; border:1px dashed var(--c06); border-radius:50%; }
.ring-6::after  { content:''; position:absolute; inset:8px; border:1px dotted var(--c09); border-radius:50%; }
@keyframes ring-enter { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
@keyframes ring-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes ring-spin-rev { from { transform:rotate(0deg); } to { transform:rotate(-360deg); } }

.ss-ring-5-nodes { position:fixed; top:50%; left:50%; width:0; height:0; z-index:99995; pointer-events:none; opacity:0;
  animation:ring-enter 0.5s 1.42s var(--motion-easing-standard) forwards, ring-spin-rev 24s 1.89s var(--motion-easing-linear) infinite; }
.ss-ring-5-node { position:absolute; width:6px; height:6px; margin:-3px 0 0 -3px; border:1px solid var(--c40); transform:rotate(45deg); }

.ss-ring-6-nodes { position:fixed; top:50%; left:50%; width:0; height:0; z-index:99995; pointer-events:none; opacity:0;
  animation:ring-enter 0.5s 1.48s var(--motion-easing-standard) forwards, ring-spin-rev 22s 1.93s var(--motion-easing-linear) infinite; }
.ss-ring-6-node { position:absolute; width:8px; height:8px; margin:-4px 0 0 -4px; border:1.5px solid var(--c50); transform:rotate(45deg); box-shadow:0 0 4px var(--c15); }

/* ━━ Logo ━━ */
.ss-logo-wrap {
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:100001;
  display:flex; flex-direction:column; align-items:center; opacity:0;
  animation:logo-in 0.4s var(--motion-easing-standard) 1.20s forwards;
}
@keyframes logo-in { from { opacity:0; transform:translate(-50%,-50%) translateY(6px); } to { opacity:1; transform:translate(-50%,-50%) translateY(0); } }
.ss-logo { font-size:38px; font-weight:700; font-family:"Microsoft YaHei",sans-serif; color:var(--text-primary); letter-spacing:8px; }
.ss-sub { margin-top:8px; font-size:11px; color:var(--c25); font-family:"Microsoft YaHei",sans-serif; letter-spacing:2px; }
</style>
