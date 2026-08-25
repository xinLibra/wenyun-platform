#!/usr/bin/env node
/**
 * 迁移脚本：把 generations.image_url 中 data: base64 的大字段
 * 解码上传到 Public 桶 pattern-images，并把 image_url 更新为公开 https 短链。
 *
 * 目的：0.5~0.7MB 的 base64 塞在 DB 行里导致列表查询/逐条下载极慢；
 * 迁移后列表只需读几十字节的 http 短链，直接当 <img src> 显示。
 *
 * 用法：
 *   node scripts/migrate_generation_images.mjs [--dry-run] [--limit N] [--id <uuid>] [--page-size N] [--verbose]
 *
 * 环境变量（优先级：系统环境变量 > .env > .env.local）：
 *   SUPABASE_URL   或 VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY （推荐：绕过 RLS，可更新所有用户的 generations 行）
 *   或 SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY（受 RLS 限制，只能改本人行，迁移会大量失败）
 *
 * 示例：
 *   node scripts/migrate_generation_images.mjs --dry-run           # 只统计不写库
 *   node scripts/migrate_generation_images.mjs --limit 20          # 只迁移前 20 条
 *   node scripts/migrate_generation_images.mjs --id <uuid>         # 只迁移指定 id
 *   node scripts/migrate_generation_images.mjs --verbose           # 全量迁移，逐条打印
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------- 参数解析 ----------
const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const has = (name) => args.includes(name)
const DRY_RUN = has('--dry-run')
const LIMIT = parseInt(flag('--limit', '0'), 10)
const ONLY_ID = flag('--id', '')
const PAGE_SIZE = Math.max(1, parseInt(flag('--page-size', '100'), 10) || 100)
const VERBOSE = has('--verbose')

// ---------- .env 简单解析（不引入 dotenv） ----------
function loadDotEnv(file) {
  const out = {}
  const abs = resolve(ROOT, file)
  if (!existsSync(abs)) return out
  for (const line of readFileSync(abs, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m && m[2] !== '') out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}
const env = { ...loadDotEnv('.env'), ...loadDotEnv('.env.local'), ...process.env }
const URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY
const IS_SERVICE_ROLE = !!env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('[migrate] 缺少 SUPABASE_URL / key。请设置环境变量或项目根目录 .env 文件。')
  process.exit(1)
}

const BUCKET = 'pattern-images'

// ---------- 工具函数 ----------
/** 解析 data URL → { buffer, mime } */
function parseDataUrl(dataUrl) {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx < 0) throw new Error('不是合法的 data URL')
  const meta = dataUrl.slice(0, commaIdx)
  const b64 = dataUrl.slice(commaIdx + 1).trim()
  if (!/^data:/i.test(meta)) throw new Error('不是 data: 开头的地址')
  const mime = /data:([^;,]+)/i.exec(meta)?.[1] || ''
  const buffer = Buffer.from(b64, 'base64')
  if (buffer.length === 0) throw new Error('base64 解码结果为空')
  return { buffer, mime }
}

/** 根据 mime / 魔数判断扩展名 */
function detectExt(buffer, mime) {
  const m = (mime || '').toLowerCase()
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('webp')) return 'webp'
  if (m.includes('gif')) return 'gif'
  if (m.includes('png')) return 'png'
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg'
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
  ) {
    if (
      buffer.length >= 12 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) return 'webp'
  }
  if (buffer.length >= 2 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'png'
  return 'png'
}

// ---------- 主体 ----------
const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(BUCKET)
  if (error) {
    console.error(`[migrate] 找不到 Storage 桶 "${BUCKET}": ${error.message}`)
    console.error('[migrate] 请先在 Supabase Dashboard → Storage 创建 Public 桶 pattern-images，再运行本脚本。')
    process.exit(1)
  }
  if (!data?.public) {
    console.warn(`[migrate] 警告：桶 "${BUCKET}" 不是 Public，生成的短链可能无法匿名访问。`)
  }
}

async function fetchRows(offset) {
  let query = supabase
    .from('generations')
    .select('id, user_id, image_url')
    .ilike('image_url', 'data:%')
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)
  if (ONLY_ID) query = query.eq('id', ONLY_ID)
  const { data, error } = await query
  if (error) throw new Error(`查询失败: ${error.message}`)
  return data ?? []
}

/** 迁移单行：上传 → 更新短链。返回 { status: 'ok'|'fail'|'skip', ... } */
async function migrateRow(row) {
  const { id, user_id: userId, image_url: imageUrl } = row
  let buffer, mime
  try {
    ;({ buffer, mime } = parseDataUrl(imageUrl))
  } catch (e) {
    return { status: 'skip', reason: `解码失败: ${e.message}` }
  }
  const ext = detectExt(buffer, mime)
  const filePath = `${userId}/${id}.${ext}`
  let publicUrl
  try {
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: mime || 'image/png',
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) {
      const msg = upErr.message || upErr.error || ''
      // 文件已存在说明之前迁移过（幂等）：直接取 public URL
      if (/already exists|Duplicate/i.test(msg)) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
        publicUrl = urlData.publicUrl
      } else {
        return { status: 'fail', reason: `上传失败: ${msg}` }
      }
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
      publicUrl = urlData.publicUrl
    }
  } catch (e) {
    return { status: 'fail', reason: `上传异常: ${e.message}` }
  }
  if (DRY_RUN) return { status: 'ok-dry', publicUrl, filePath, size: buffer.length }
  try {
    const { error: updErr } = await supabase
      .from('generations')
      .update({ image_url: publicUrl })
      .eq('id', id)
    if (updErr) return { status: 'fail', reason: `UPDATE 失败: ${updErr.message}` }
    return { status: 'ok', publicUrl, filePath, size: buffer.length }
  } catch (e) {
    return { status: 'fail', reason: `UPDATE 异常: ${e.message}` }
  }
}

async function main() {
  await ensureBucket()
  if (!IS_SERVICE_ROLE) {
    console.warn('[migrate] 警告：未设置 SUPABASE_SERVICE_ROLE_KEY，将使用 anon key。')
    console.warn('[migrate] generations 的 RLS 只允许更新本人行，anon key 迁移会大量失败；建议改用 service_role key。')
  }
  if (DRY_RUN) console.log('[migrate] DRY-RUN 模式：只解码统计，不上传、不写库')
  if (LIMIT > 0) console.log(`[migrate] 最多处理 ${LIMIT} 条`)
  if (ONLY_ID) console.log(`[migrate] 仅迁移 id = ${ONLY_ID}`)

  const stats = { ok: 0, failed: 0, skipped: 0 }
  let offset = 0
  let scanned = 0
  let processed = 0
  let pageNo = 0

  while (true) {
    let rows
    try {
      rows = await fetchRows(offset)
    } catch (e) {
      console.error(`[migrate] 查询第 ${pageNo + 1} 页失败: ${e.message}`)
      break
    }
    if (rows.length === 0) break
    scanned += rows.length
    pageNo += 1

    for (const row of rows) {
      if (LIMIT > 0 && processed >= LIMIT) break
      processed += 1
      const r = await migrateRow(row)
      if (r.status === 'ok') {
        stats.ok += 1
        if (VERBOSE) {
          console.log(`[migrate] OK   ${row.id} → ${r.publicUrl} (${(r.size / 1024).toFixed(1)} KB)`)
        }
      } else if (r.status === 'ok-dry') {
        if (VERBOSE) {
          console.log(`[migrate] DRY  ${row.id} → ${r.publicUrl} (${(r.size / 1024).toFixed(1)} KB)`)
        }
      } else if (r.status === 'skip') {
        stats.skipped += 1
        console.warn(`[migrate] SKIP ${row.id}: ${r.reason}`)
      } else {
        stats.failed += 1
        console.warn(`[migrate] FAIL ${row.id}: ${r.reason}`)
      }
    }

    console.log(
      `[migrate] 第 ${pageNo} 页完成（${rows.length} 条）：累计 成功 ${stats.ok} / 失败 ${stats.failed} / 跳过 ${stats.skipped}`
    )
    if (LIMIT > 0 && processed >= LIMIT) break
    offset += PAGE_SIZE
  }

  console.log('----------------------------------------')
  console.log(
    `[migrate] 完成：扫描 ${scanned} 条，处理 ${processed} 条，成功 ${stats.ok}，失败 ${stats.failed}，跳过 ${stats.skipped}`
  )
  if (DRY_RUN) {
    console.log('[migrate] DRY-RUN 未做任何写操作；去掉 --dry-run 后再跑一次即真正迁移。')
  }
  if (stats.failed > 0) {
    console.log('[migrate] 有失败行：可用 --id <uuid> 单独重跑，或查看上方 FAIL 日志定位原因。')
  }
  process.exit(stats.failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('[migrate] 意外错误:', e?.message ?? e)
  process.exit(1)
})
