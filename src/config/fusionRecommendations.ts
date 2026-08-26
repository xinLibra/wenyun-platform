/**
 * 融合推荐表：第二槽「可融合」推荐。
 * key = pattern 子类 id（与 patternTaxonomy 中的 subcategory id 一致），
 * value = 视觉/语义上常与第一槽一起融合的子类 id（按相关性从高到低排序）。
 * 仅需维护单向，导出时会自动镜像成对称表。
 */

const BASE_RECOMMENDATIONS: Record<string, string[]> = {
  // 凤鸟 ↔ 牡丹 / 龙纹
  phoenix_bird: ['peony', 'dragon', 'flower_bird'],
  // 鹤 ↔ 云 / 莲
  crane: ['lotus', 'deer'],
  // 蝴蝶 ↔ 花鸟 / 兰 / 牡丹
  butterfly: ['flower_bird', 'orchid', 'peony'],
  // 兰 ↔ 蝶 / 梅
  orchid: ['butterfly', 'plum', 'furong'],
  // 龙 ↔ 凤
  dragon: ['phoenix_bird', 'dragon_phoenix', 'tiger'],
  // 龙凤纹
  dragon_phoenix: ['phoenix_bird', 'dragon'],
  // 牡丹：花中之王，百搭
  peony: ['butterfly', 'phoenix_bird', 'flower_bird', 'furong'],
  // 莲花：鹤 / 花鸟
  lotus: ['crane', 'flower_bird'],
  // 梅花：兰 / 菊（梅兰竹菊文化组合）
  plum: ['orchid', 'chrysanthemum'],
  // 菊花
  chrysanthemum: ['plum', 'orchid'],
  // 花鸟：蝴蝶 / 凤鸟 / 牡丹 / 兰
  flower_bird: ['butterfly', 'phoenix_bird', 'peony', 'orchid'],
  // 芙蓉：牡丹 / 莲
  furong: ['peony', 'lotus'],
  // 石榴花：花鸟 / 牡丹
  pomegranate_flower: ['flower_bird', 'peony'],
  // 虎：狮 / 龙（瑞兽组合）
  tiger: ['lion', 'dragon'],
  // 孔雀：凤鸟 / 牡丹 / 花鸟
  peacock: ['phoenix_bird', 'peony', 'flower_bird'],
  // 鹿：鹤（瑞兽组合）
  deer: ['crane'],
  // 狮：虎 / 龙
  lion: ['tiger', 'dragon'],
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
