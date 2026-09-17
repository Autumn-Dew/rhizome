// 播放次数档位颜色：从冷静到热烈，播放次数越多颜色越鲜艳
// 档位（min 为下界，向下取首个命中）：
//   <10 不显示；10/50/100/200/400/800/1600/3200 逐级递增
const PLAY_COUNT_TIERS = [
  { min: 3200, color: '#8BFDE8' }, // 最高：荧光青，最亮眼
  { min: 1600, color: '#FF3018' }, // 朱红，最热烈
  { min: 800,  color: '#CE3B47' }, // 绯红
  { min: 400,  color: '#6E1852' }, // 深紫红
  { min: 200,  color: '#B6A2D1' }, // 浅紫
  { min: 100,  color: '#464288' }, // 靛蓝
  { min: 50,   color: '#1C8A4E' }, // 绿
  { min: 10,   color: '#2D625E' }, // 深青绿
]

// 返回档位颜色；小于 10 次（或非法值）返回 null，表示不显示竖条
export function playCountTierColor(count) {
  const n = Number(count)
  if (!isFinite(n) || n < 10) return null
  for (const t of PLAY_COUNT_TIERS) {
    if (n >= t.min) return t.color
  }
  return null
}
