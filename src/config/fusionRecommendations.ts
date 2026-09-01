/**
 * 融合推荐表：第二槽「可融合」推荐。
 * key = pattern 子类 id（与 patternTaxonomy 中的 subcategory id 一致），
 * value = 视觉/语义上常与第一槽一起融合的子类 id（按相关性从高到低排序）。
 * 仅需维护单向，导出时会自动镜像成对称表。
 *
 * 主题：几何（回纹/盘长纹/锦地纹/方胜纹）+ 花卉。瑞兽相关已全部移除。
 */

const BASE_RECOMMENDATIONS: Record<string, string[]> = {
  // ===== 几何 =====
  // 回纹 ↔ 锦地 / 方胜 / 盘长（几何互融），再叠花卉点缀
  huiwen: ['jindi', 'fangsheng', 'panchang', 'plum', 'lotus'],
  // 盘长 ↔ 方胜 / 回纹 / 锦地（单纹样与连续均适配）
  panchang: ['fangsheng', 'huiwen', 'jindi', 'peony'],
  // 锦地 ↔ 回纹 / 盘长 / 菊花（满铺底纹百搭）
  jindi: ['huiwen', 'panchang', 'fangsheng', 'chrysanthemum'],
  // 方胜 ↔ 回纹 / 盘长 / 牡丹（方正吉祥）
  fangsheng: ['huiwen', 'panchang', 'jindi', 'peony'],
  // ===== 花卉 =====
  // 兰 ↔ 蝶 / 梅
  orchid: ['plum', 'furong'],
  // 牡丹：花中之王，百搭
  peony: ['furong', 'panchang', 'fangsheng'],
  // 莲花：菊 / 回纹
  lotus: ['chrysanthemum', 'huiwen'],
  // 梅花：兰 / 菊 / 回纹（梅兰竹菊 + 几何组合）
  plum: ['orchid', 'chrysanthemum', 'huiwen'],
  // 菊花
  chrysanthemum: ['plum', 'orchid', 'jindi'],
  // 芙蓉：牡丹 / 莲
  furong: ['peony', 'lotus'],
  // 石榴花：牡丹 / 菊
  pomegranate_flower: ['peony', 'chrysanthemum'],
}

function mirror(record: Record<string, string[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(record)) {
    result[key] = [...(result[key] ?? []), ...values]
  }
  // 反向补全（对称化）：a 推荐 b ⇒ b 也推荐 a
  for (const [key, values] of Object.entries(record)) {
    for (const value of values) {
      if (!result[value]) result[value] = []
      if (!result[value].includes(key)) result[value].push(key)
    }
  }
  return result
}

/** 对称的融合推荐表：FUSION_RECOMMENDATIONS[a] 包含 b ⇔ FUSION_RECOMMENDATIONS[b] 包含 a */
export const FUSION_RECOMMENDATIONS: Record<string, string[]> = mirror(BASE_RECOMMENDATIONS)

/** 获取某子类对应的「可融合」推荐子类列表（无推荐时返回空数组） */
export function getFusionRecommendations(subcategoryId: string): string[] {
  return FUSION_RECOMMENDATIONS[subcategoryId] ?? []
}

import { getPantoneForSubcategory } from './generationPresets'
import { findPantoneEntry, PantoneEntry } from './pantoneMap'

/** 计算双纹样推荐色列表（按交集优先排序），供融合预设 fallback 使用 */
export function getDualPantoneRecommendations(subcategoryIds: string[]): PantoneEntry[] {
  const recs: PantoneEntry[] = []
  subcategoryIds.forEach((id) => {
    const sp = getPantoneForSubcategory(id)
    if (!sp?.pantoneCode) return
    const entry = findPantoneEntry(sp.pantoneCode)
    if (entry) recs.push(entry)
  })

  const codeCount: Record<string, number> = {}
  subcategoryIds.forEach((id) => {
    const sp = getPantoneForSubcategory(id)
    if (!sp?.pantoneCode) return
    const entry = findPantoneEntry(sp.pantoneCode)
    if (entry) codeCount[entry.code] = (codeCount[entry.code] || 0) + 1
  })

  return Array.from(
    new Map(recs.map((p) => [p.code, p])).values()
  ).sort((a, b) => (codeCount[b.code] || 0) - (codeCount[a.code] || 0))
}
