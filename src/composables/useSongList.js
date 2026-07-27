/**
 * useSongList — 歌曲列表排序 / 多选 / 拖拽 通用逻辑
 *
 * 消除 LocalMusic.vue 和 PlaylistDetail.vue 中的重复代码。
 *
 * @param {Ref<Array>} listRef     - 歌曲列表 ref（会被直接修改）
 * @param {Function}   onPersist   - 变更后持久化回调
 * @returns 所有排序/多选/拖拽相关的状态和方法
 */
import { ref, computed } from 'vue'

export function useSongList(listRef, onPersist) {
  // ── 排序模式 ──
  const sortMode = ref(false)
  const dragFromIdx = ref(-1)
  const dragOverIdx = ref(-1)
  const sortOrderMap = ref({})

  function toggleSortMode() {
    if (sortMode.value) {
      applySortOrder()
      sortMode.value = false
      dragFromIdx.value = -1
      dragOverIdx.value = -1
      sortOrderMap.value = {}
    } else {
      sortMode.value = true
      multiMode.value = false
      selectedSet.value.clear()
      dragFromIdx.value = -1
      dragOverIdx.value = -1
      sortOrderMap.value = {}
    }
  }

  function onSortOrderInput(path, e) {
    const raw = e.target.value.trim()
    if (raw === '') { delete sortOrderMap.value[path]; return }
    const num = parseInt(raw, 10)
    if (!isNaN(num) && num > 0 && String(num) === raw) sortOrderMap.value[path] = num
    e.target.value = sortOrderMap.value[path] ?? ''
  }

  function applySortOrder() {
    const map = sortOrderMap.value
    const entries = Object.entries(map)
    if (!entries.length) return

    const list = [...listRef.value]
    const toMove = []; const toKeep = []
    for (const song of list) {
      const target = map[song.path]
      if (target !== undefined && target !== null && target !== '') {
        toMove.push({ song, targetIdx: Number(target) - 1 })
      } else { toKeep.push(song) }
    }
    toMove.sort((a, b) => a.targetIdx - b.targetIdx)

    const total = list.length
    const newList = new Array(total).fill(null)
    const usedPositions = new Set()
    for (const item of toMove) {
      let pos = item.targetIdx
      if (pos < 0) pos = 0
      if (pos >= total) pos = total - 1
      while (usedPositions.has(pos) && pos >= 0) pos--
      if (pos < 0) { pos = item.targetIdx; while (usedPositions.has(pos) && pos < total) pos++ }
      if (pos >= 0 && pos < total && !usedPositions.has(pos)) { newList[pos] = item.song; usedPositions.add(pos) }
    }
    let ki = 0
    for (let i = 0; i < total; i++) { if (!newList[i] && ki < toKeep.length) newList[i] = toKeep[ki++] }

    listRef.value = newList.filter(Boolean)
    onPersist?.()
  }

  const bounceIdx = ref(-1)

  // ── 拖拽 ──
  function onDragStart(idx, e) {
    dragFromIdx.value = idx
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  function onDragOver(idx) { if (dragFromIdx.value !== -1) dragOverIdx.value = idx }
  function onDragLeave() {}
  function onDrop(idx) {
    if (dragFromIdx.value === -1 || dragFromIdx.value === idx) { dragFromIdx.value = -1; dragOverIdx.value = -1; return }
    const list = [...listRef.value]
    const [moved] = list.splice(dragFromIdx.value, 1)
    list.splice(idx, 0, moved)
    listRef.value = list
    onPersist?.()
    // spring 弹性反馈
    bounceIdx.value = idx
    setTimeout(() => { bounceIdx.value = -1 }, 350)
    dragFromIdx.value = -1; dragOverIdx.value = -1
  }
  function onDragEnd() { dragFromIdx.value = -1; dragOverIdx.value = -1 }

  // ── 多选 ──
  const multiMode = ref(false)
  const selectedSet = ref(new Set())

  function toggleMultiMode() {
    multiMode.value = !multiMode.value
    if (multiMode.value) { sortMode.value = false; dragFromIdx.value = -1; dragOverIdx.value = -1 }
    else { selectedSet.value.clear() }
  }

  function toggleSelect(song) {
    const s = selectedSet.value
    s.has(song.path) ? s.delete(song.path) : s.add(song.path)
  }

  // 注意：isAllSelected / toggleSelectAll 需要在组件中用 computed 包装，因为 filteredSongs 是组件级别的
  function isAllSelectedFn(displayList) {
    return displayList.length > 0 && displayList.every(s => selectedSet.value.has(s.path))
  }

  function toggleSelectAllFn(displayList) {
    if (isAllSelectedFn(displayList)) { selectedSet.value.clear() }
    else { selectedSet.value = new Set(displayList.map(s => s.path)) }
  }

  function cancelMulti() { multiMode.value = false; selectedSet.value.clear() }

  function scrollToCurrent() {
    const el = document.querySelector('.song-item.playing')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return {
    // 排序
    sortMode, dragFromIdx, dragOverIdx, sortOrderMap,
    toggleSortMode, onSortOrderInput, applySortOrder,
    // 拖拽
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, bounceIdx,
    // 多选
    multiMode, selectedSet,
    toggleMultiMode, toggleSelect, isAllSelectedFn, toggleSelectAllFn,
    cancelMulti, scrollToCurrent,
  }
}
