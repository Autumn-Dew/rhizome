// 从封面图片提取调色板 — 用于可视化页背景
// 使用 Canvas 2D 采样 + 色相桶聚合 + 明暗变体，轻量无依赖

const FALLBACK_PALETTE = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560']

/**
 * RGB 颜色工具
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h, s, l }
}

function hslToRgb(h, s, l) {
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

function rgbStr(r, g, b) {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * 提取调色板：返回 { primary, secondary, accent, dark, light } 五种角色色
 * @param {string} imageUrl
 * @returns {Promise<{palette: string[], dark: string, light: string, primary: string, secondary: string}>}
 */
export function extractPalette(imageUrl) {
  return new Promise((resolve) => {
    const fallback = {
      palette: FALLBACK_PALETTE,
      dark: '#0a0a1a',
      light: '#2a2a4e',
      primary: FALLBACK_PALETTE[0],
      secondary: FALLBACK_PALETTE[3]
    }
    if (!imageUrl) return resolve(fallback)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 150
        const ratio = Math.min(img.naturalHeight / img.naturalWidth, 2)
        const w = size
        const h = Math.max(Math.round(size * ratio), 20)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        const data = ctx.getImageData(0, 0, w, h).data
        const buckets = {}

        const STEP = 24 // 更细粒度
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 100) continue
          const qr = Math.floor(r / STEP), qg = Math.floor(g / STEP), qb = Math.floor(b / STEP)
          const key = (qr << 16) | (qg << 8) | qb
          if (!buckets[key]) {
            buckets[key] = { r: qr * STEP + STEP / 2, g: qg * STEP + STEP / 2, b: qb * STEP + STEP / 2, count: 0 }
          }
          buckets[key].count++
        }

        const sorted = Object.values(buckets).sort((a, b) => b.count - a.count)
        if (sorted.length === 0) return resolve(fallback)

        // 过滤极端，保留中等亮度
        let filtered = sorted.filter(c => {
          const lum = luminance(c.r, c.g, c.b)
          return lum > 25 && lum < 235
        })
        if (filtered.length < 3) filtered = sorted

        // 去重
        const deduped = []
        for (const c of filtered) {
          const dup = deduped.some(d => {
            const dr = d.r - c.r, dg = d.g - c.g, db = d.b - c.b
            return Math.sqrt(dr * dr + dg * dg + db * db) < 35
          })
          if (!dup) deduped.push(c)
          if (deduped.length >= 5) break
        }

        // 按色相排序让渐变更自然
        deduped.sort((a, b) => {
          const ha = rgbToHsl(a.r, a.g, a.b).h
          const hb = rgbToHsl(b.r, b.g, b.b).h
          return ha - hb
        })

        const colors = deduped.map(c => rgbStr(c.r, c.g, c.b))
        while (colors.length < 5) colors.push(FALLBACK_PALETTE[colors.length % FALLBACK_PALETTE.length])

        // 取最暗色作为 dark，提亮第一个作为 light
        const sortedByLum = [...deduped].sort((a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b))
        const darkest = sortedByLum[0]
        const lightest = sortedByLum[sortedByLum.length - 1]

        // 生成加深的背景色
        const darkHsl = rgbToHsl(darkest.r, darkest.g, darkest.b)
        const darkColor = hslToRgb(darkHsl.h, Math.min(1, darkHsl.s * 1.3), Math.max(0.04, darkHsl.l * 0.35))

        // 生成提亮的辅助色
        const lightHsl = rgbToHsl(lightest.r, lightest.g, lightest.b)
        const lightColor = hslToRgb(lightHsl.h, Math.min(1, lightHsl.s * 0.7), Math.min(0.55, lightHsl.l * 1.6))

        resolve({
          palette: colors,
          dark: rgbStr(darkColor.r, darkColor.g, darkColor.b),
          light: rgbStr(lightColor.r, lightColor.g, lightColor.b),
          primary: colors[0],
          secondary: colors[Math.min(3, colors.length - 1)]
        })
      } catch {
        resolve(fallback)
      }
    }
    img.onerror = () => resolve(fallback)
    img.src = imageUrl
  })
}

/**
 * 生成 Apple Music 风格的背景 CSS：模糊封面 + 径向渐变叠加
 * @param {{ palette, dark, light, primary }} paletteData
 * @returns {Object} { background, overlayGradient } 用于 CSS
 */
export function richBackground(paletteData) {
  const p = paletteData
  const c0 = p.dark || '#0a0a1a'
  const c1 = p.primary || '#1a1a2e'
  const c2 = p.light || '#2a2a4e'

  // 径向渐变：中心偏亮，边缘深暗
  const gradient = `radial-gradient(ellipse 80% 60% at 50% 40%, ${c2} 0%, ${c1} 40%, ${c0} 100%)`
  return { background: gradient, overlayGradient: gradient }
}

/**
 * 获取文字颜色（适配背景亮度）
 */
export function paletteTextColor(paletteData) {
  const c = paletteData.primary || '#1a1a2e'
  const match = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return '#ffffff'
  return luminance(+match[1], +match[2], +match[3]) > 140 ? '#000000' : '#ffffff'
}
