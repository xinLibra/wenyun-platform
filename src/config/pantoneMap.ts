/**
 * 统一潘通色号表（全应用唯一权威来源）
 *
 * 所有推荐色（含双纹样推荐）都必须来自本表，保证「点了推荐色号 → 一定能查到 HEX」，
 * 不会出现 UI 有推荐、下方却提示「未找到该潘通色号」的情况。
 *
 * 用法：
 * - findPantoneEntry('14-3904') 与 findPantoneEntry('14-3904 TCX') 等价（短号自动补 TCX）
 * - getPantoneHex / getPantoneName 供 prompt 拼装与 UI 展示复用
 */

export interface PantoneEntry {
  /** 规范色号（带 TCX 后缀），如 '14-3904 TCX' */
  code: string
  /** 中文名，如 '淡紫' */
  name: string
  /** 英文色名（用于 prompt），如 'soft lilac' */
  englishName: string
  /** HEX，如 '#A78BBA' */
  hex: string
}

/** 本表收录 SUBCATEGORY_PANTONE_MAP 用到的全部真实色号（几何 + 花卉） */
export const PANTONE_TABLE: PantoneEntry[] = [
  // ===== 几何 =====
  { code: '19-4052 TCX', name: '深藏青', englishName: 'dark navy blue', hex: '#26364B' }, // huiwen 回纹
  { code: '18-1662 TCX', name: '宫墙红', englishName: 'palace red', hex: '#C3423F' }, // panchang 盘长纹
  { code: '12-0752 TCX', name: '金色', englishName: 'golden yellow', hex: '#D4AF37' }, // 礼品点缀色
  { code: '18-1555 TCX', name: '朱红', englishName: 'vermillion', hex: '#E63946' }, // 喜庆/盘长
  { code: '19-4006 TCX', name: '墨黑', englishName: 'ink black', hex: '#1C1C1A' }, // fangsheng 方胜纹/线稿
  // ===== 花卉 =====
  { code: '16-1450 TCX', name: '藕粉', englishName: 'light pink', hex: '#E8B4B8' }, // peony / lotus
  { code: '14-3904 TCX', name: '淡紫', englishName: 'soft lilac', hex: '#A78BBA' }, // orchid
  { code: '16-1720 TCX', name: '桃粉', englishName: 'peach pink', hex: '#F4A0B4' }, // furong
]

/** 查表字典：同时收录 '14-3904 TCX' 与短号 '14-3904'，保证短号可查 */
const PANTONE_MAP: Record<string, PantoneEntry> = {}
for (const entry of PANTONE_TABLE) {
  PANTONE_MAP[entry.code.toUpperCase()] = entry
  PANTONE_MAP[entry.code.replace(/\s*TCX\s*$/i, '').toUpperCase()] = entry
}

/**
 * 规范化潘通色号：trim + 大写；短号（如 '14-3904'）自动补 ' TCX' 后缀。
 * 供输入校验 / 查询统一使用。
 */
export function normalizePantoneCode(raw: string): string {
  let s = String(raw ?? '').trim().toUpperCase()
  if (/^\d{2}-\d{4}$/.test(s)) {
    s = `${s} TCX`
  }
  return s
}

/** 查潘通色号（'14-3904' 与 '14-3904 TCX' 等价），找不到返回 null */
export function findPantoneEntry(raw: string): PantoneEntry | null {
  const norm = normalizePantoneCode(raw)
  return PANTONE_MAP[norm] ?? null
}

/** 潘通色号 → HEX；查不到返回 null（prompt 拼装用） */
export function getPantoneHex(raw: string): string | null {
  return findPantoneEntry(raw)?.hex ?? null
}

/** 潘通色号 → 中文名；查不到返回 null（UI 展示用） */
export function getPantoneName(raw: string): string | null {
  return findPantoneEntry(raw)?.name ?? null
}
