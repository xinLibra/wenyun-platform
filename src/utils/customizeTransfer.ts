/**
 * 创作页 → 定制页 的跨页纹样传递约定。
 * - pendingPattern：由创作页写入、定制页消费后删除（带 30 分钟有效期）。
 * - 全局选中纹样 key（customize:selectedPattern:global）：与定制页「选择纹样」列表共用的数据源。
 */

/** 创作页写入、定制页消费的「待套用纹样」session 键 */
export const PENDING_PATTERN_KEY = 'customize:pendingPattern'
/** 定制页「选择纹样」共用的全局选中 session 键 */
export const SELECTED_PATTERN_GLOBAL_KEY = 'customize:selectedPattern:global'
/** 定制页初始 state 兜底读取的旧 key（创作页旧逻辑写入） */
export const LAST_GENERATED_PATTERN_KEY = 'last_generated_pattern'
/** pendingPattern 有效期：30 分钟 */
export const PENDING_PATTERN_TTL = 30 * 60 * 1000

export interface PendingPatternPayload {
  workId: string
  imageUrl: string
  name?: string
  from?: string
  ts: number
}

/** 写入 pendingPattern（失败返回 false，不影响跳转流程） */
export function writePendingPattern(payload: PendingPatternPayload): boolean {
  try {
    sessionStorage.setItem(PENDING_PATTERN_KEY, JSON.stringify(payload))
    return true
  } catch (err) {
    console.warn(`[customizeTransfer] 写入 ${PENDING_PATTERN_KEY} 失败:`, err)
    return false
  }
}

/**
 * 读取并校验 pendingPattern：
 * - imageUrl 非空；
 * - 未过期（默认 30 分钟）。
 * 过期/损坏/不存在均返回 null。
 */
export function readPendingPattern(): PendingPatternPayload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PATTERN_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as PendingPatternPayload
    if (!payload?.imageUrl) return null
    if (payload.ts && Date.now() - payload.ts > PENDING_PATTERN_TTL) return null
    return payload
  } catch {
    return null
  }
}

/** 消费完 pendingPattern 后必须调用，避免刷新反复套用旧图 */
export function clearPendingPattern(): void {
  try {
    sessionStorage.removeItem(PENDING_PATTERN_KEY)
  } catch (err) {
    console.warn(`[customizeTransfer] 清除 ${PENDING_PATTERN_KEY} 失败:`, err)
  }
}

/** 写入定制页「选择纹样」同款全局选中数据，保证初始选中即生效 */
export function writeGlobalSelectedPattern(data: {
  id: string
  image_url: string
  title?: string
}): boolean {
  try {
    sessionStorage.setItem(SELECTED_PATTERN_GLOBAL_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    console.warn(`[customizeTransfer] 写入 ${SELECTED_PATTERN_GLOBAL_KEY} 失败:`, err)
    return false
  }
}
