import { ref, computed, onMounted, onUnmounted, unref } from 'vue'

/**
 * 轻量虚拟滚动（固定行高）。
 *
 * 背景：Rhizome 的列表可能上千条（实测 1319 首），全量渲染会产生
 * 200–670ms 的 longtask 并拖低帧率。本 composable 只渲染「视口内 + overscan」
 * 的行，滚动时按行高换算出窗口。
 *
 * 适配现有布局：列表随**页面**滚动（不是列表自身滚动），因此用列表容器的
 * `getBoundingClientRect().top` 相对**滚动容器顶**计算已滚过距离，无需改布局。
 * 传入的 `scrollRef` 为滚动容器（默认 window/视口）；若列表在某个可滚动元素内，
 * 传入该元素引用即可。
 */

/** 纯函数：由滚动量算出可见行区间（便于单测） */
export function computeRange({ scrollTop, viewportHeight, itemHeight, total, overscan = 8 }) {
  if (!itemHeight || itemHeight <= 0 || total <= 0) return { start: 0, end: 0, offsetY: 0, totalHeight: 0 }
  const totalHeight = total * itemHeight
  const scrolled = Math.max(0, scrollTop)
  let start = Math.floor(scrolled / itemHeight) - overscan
  if (start < 0) start = 0
  let end = Math.ceil((scrolled + viewportHeight) / itemHeight) + overscan
  if (end > total) end = total
  if (end < start) end = start
  return { start, end, offsetY: start * itemHeight, totalHeight }
}

/** 从列表容器向上找最近的可纵向滚动祖先（找不到则返回 null = 用 window 滚动） */
export function findScrollHost(el) {
  if (!el || typeof getComputedStyle !== 'function') return null
  let p = el.parentElement
  while (p && p !== document.body && p !== document.documentElement) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return null
}

/**
 * @param {import('vue').Ref<Array>|Function} source 列表数据（ref / computed / getter）
 * @param {object} opts
 * @param {number} opts.itemHeight 行高（px，需与 CSS 一致）
 * @param {number} [opts.overscan=8] 视口外预渲染行数
 * @param {import('vue').Ref<HTMLElement|null>} [opts.listRef] 列表容器的 ref（用于测相对位置）
 * @param {number} [opts.gap=0] 行间距（px）
 */
export function useVirtualList(source, opts = {}) {
  const itemHeight = Math.max(1, opts.itemHeight || 52)
  const step = itemHeight + (opts.gap || 0)
  const overscan = opts.overscan ?? 8
  const listRef = opts.listRef || ref(null)
  let lastDiag = 0

  const scrollTop = ref(0)     // 列表顶部相对滚动视口顶「已滚过」的距离
  const viewportH = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
  let scrollHost = null        // 实际滚动容器（null 表示用 window 滚动）

  function resolveHost() {
    if (opts.scrollEl) return opts.scrollEl
    return findScrollHost(listRef.value)
  }

  function measure() {
    if (typeof window === 'undefined') return
    const el = listRef.value
    if (el) {
      if (!scrollHost) scrollHost = resolveHost()
      if (scrollHost) {
        // 列表相对滚动容器「内容顶」的偏移 = 容器已滚距离 + 两者顶部差
        const hostRect = scrollHost.getBoundingClientRect()
        const listRect = el.getBoundingClientRect()
        scrollTop.value = Math.max(0, scrollHost.scrollTop + (hostRect.top - listRect.top))
        viewportH.value = scrollHost.clientHeight || window.innerHeight
      } else {
        scrollTop.value = Math.max(0, -el.getBoundingClientRect().top)
        viewportH.value = window.innerHeight || 800
      }
    } else {
      scrollHost = null
      scrollTop.value = window.scrollY || document.documentElement.scrollTop || 0
      viewportH.value = window.innerHeight || 800
    }
  }

  let raf = 0
  function onScroll() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      measure()
      // 诊断：每秒最多一次，输出虚拟窗口状态（回传日志可判定虚拟滚动是否真的生效）
      const now = performance.now()
      if (now - lastDiag > 1000) {
        lastDiag = now
        console.log(`[vlist] items=${list.value.length} visible=${range.value.end - range.value.start} start=${range.value.start} scrollTop=${Math.round(scrollTop.value)} host=${scrollHost ? (scrollHost.className || scrollHost.tagName) : 'window'}`)
      }
    })
  }

  const list = computed(() => {
    const s = unref(typeof source === 'function' ? source() : source) || []
    return s
  })

  const range = computed(() => computeRange({
    scrollTop: scrollTop.value,
    viewportHeight: viewportH.value,
    itemHeight: step,
    total: list.value.length,
    overscan,
  }))

  /** 便于模板循环：{ item, index } */
  const visible = computed(() => {
    const { start, end } = range.value
    const out = []
    for (let i = start; i < end; i++) out.push({ item: list.value[i], index: i })
    return out
  })

  const offsetY = computed(() => range.value.offsetY)
  const totalHeight = computed(() => range.value.totalHeight)

  const scrollTarget = () => scrollHost || opts.scrollEl || window

  // 渲染后多帧重试：列表容器可能因 v-if 在 mounted 时尚未存在（如 loading 中）
  let retryFrames = 0
  function retryMeasure() {
    measure()
    if (!scrollHost && retryFrames < 30) {
      retryFrames++
      requestAnimationFrame(retryMeasure)
    }
  }

  onMounted(() => {
    retryMeasure()
    // 用捕获阶段监听 document：无论滚动发生在 window 还是某个 overflow 容器，都能收到
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    // 启动后输出一次初始状态
    setTimeout(() => {
      console.log(`[vlist] init items=${list.value.length} visible=${range.value.end - range.value.start} start=${range.value.start} scrollTop=${Math.round(scrollTop.value)} host=${scrollHost ? (scrollHost.className || scrollHost.tagName) : 'window'}`)
    }, 500)
  })
  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
    document.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onScroll)
  })

  return { visible, offsetY, totalHeight, measure, listRef }
}
