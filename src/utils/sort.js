// 排序纯函数（供本地音乐视图复用）

// 排序方式：默认（按添加顺序，不排序）/ 名称 / 播放次数 / 最近播放
export const SORT_FIELDS = ['default', 'name', 'plays', 'recent']

export const SORT_FIELD_LABELS = {
  default: '默认',
  name: '名称',
  plays: '播放次数',
  recent: '时长', // key 保持 recent 以兼容已存的 K_SORT_PREF，语义为“歌曲时长”
}

// 名称分组：0=数字/英文，1=中文（含汉字），2=日语假名
// 排序优先级：英文 → 中文 → 日语
function nameGroup(s) {
  const c = (s || '').charCodeAt(0)
  if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) return 0
  if (c >= 0x3040 && c <= 0x30ff) return 2
  return 1
}

// 多语言名称比较器：先按语言分组（英文 → 中文 → 日语），组内按对应 locale 比较
export function compareNames(a, b) {
  const sa = String(a ?? '')
  const sb = String(b ?? '')
  const ga = nameGroup(sa)
  const gb = nameGroup(sb)
  if (ga !== gb) return ga - gb
  if (ga === 0) return sa.localeCompare(sb, 'en')
  if (ga === 2) return sa.localeCompare(sb, 'ja')
  return sa.localeCompare(sb, 'zh')
}

// 通用排序：getValue 返回 string 时用多语言名称比较器，否则按数值比较
// dir: 'asc' | 'desc'；不修改原数组
export function sortItems(items, getValue, dir = 'asc') {
  const d = dir === 'desc' ? -1 : 1
  return [...items].sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)
    if (typeof va === 'string' && typeof vb === 'string') {
      return compareNames(va, vb) * d
    }
    return ((Number(va) || 0) - (Number(vb) || 0)) * d
  })
}

// 按有序 path 数组重排；未列出的元素排在末尾并保持原有相对顺序
export function applyPathOrder(items, orderPaths) {
  if (!orderPaths || !orderPaths.length) return [...items]
  const idx = new Map(orderPaths.map((p, i) => [p, i]))
  const BIG = Number.MAX_SAFE_INTEGER
  return [...items].sort((a, b) => {
    const ia = idx.has(a.path) ? idx.get(a.path) : BIG
    const ib = idx.has(b.path) ? idx.get(b.path) : BIG
    return ia - ib
  })
}
