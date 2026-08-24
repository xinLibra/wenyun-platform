# 数据库结构文档

最后更新时间: 2026-07-15
维护人: (系统平台负责人)

> 本文档记录 Supabase 项目当前的数据表、外键关系、RLS 策略、触发器情况。
> **任何人要新建表 / 改字段 / 加策略 / 加触发器,请先在这里更新记录，再通知另外两位同学。**

---

## 一、数据表清单

| 表名 | 说明 |
|---|---|
| profiles | 用户资料(昵称、头像等) |
| generations | AI 生成的纹样作品 |
| styles | 纹样风格/分类 |
| patterns | 纹样(具体用途待补充说明) |
| products | 可定制的产品(书签、T恤等) |
| cart_items | 购物车 |
| orders | 订单 |
| favorites | 收藏关系表 |

---

## 二、外键关系

| 表 | 字段 | 指向 | 备注 |
|---|---|---|---|
| cart_items | generation_id | generations.id | |
| favorites | generation_id | generations.id | ⚠️ 已设置 ON DELETE CASCADE(删除作品时自动清理收藏记录) |
| favorites | user_id | profiles.id | |
| generations | user_id | profiles.id | |
| generations | style_id | styles.id | |
| orders | product_id | products.id | |
| orders | generation_id | generations.id | ⚠️ 已设置 ON DELETE SET NULL(删除作品时订单保留,只是关联字段清空) |
| orders | user_id | profiles.id | |

---

## 三、RLS 策略摘要

### cart_items(购物车)
- 用户只能读取/更新/插入/删除**自己**的购物车记录(`auth.uid() = user_id`)

### favorites(收藏)
- 用户只能插入/删除**自己**的收藏记录(`auth.uid() = user_id`)
- **允许任何人(包括匿名用户)读取所有收藏记录**(`SELECT ... USING (true)`),这是为了让"收藏数"能够被所有人看到 —— 收藏数是通过对本表做 `COUNT(*)` 实时统计得到的,不依赖任何冗余字段
- 相关策略名:
  - `users can delete own favorites`
  - `users can insert own favorites`
  - `Allow anonymous users to read favorites`
  - `Allow anyone to read favorites count`
  - `users can view own favorites`(⚠️ 这条和上面两条"允许任何人读取"的策略有重叠，理论上可以只保留"允许任何人读取"这一条，其余可考虑清理，见下方"待办")

### generations(作品)
- 用户只能查看/更新/删除**自己**的作品(`auth.uid() = user_id`)
- 公开作品任何人可查看(`is_public = true` 或 `is_public = true` 的多条重复策略,见"待办")
- 用户只能插入**自己**的作品

### orders(订单)
- 用户只能查看/插入**自己**的订单

### patterns(纹样)
- 所有人可查看(`SELECT true`)
- 用户只能插入/更新/删除**自己**的纹样

### products(产品)
- 所有人可查看(`SELECT true`)

### profiles(用户资料)
- 所有人可查看(`SELECT true`)
- 用户只能更新**自己**的资料(`auth.uid() = id`)

### styles(风格)
- 所有人可查看(`SELECT true`)

### storage.objects(头像等文件存储)
- 头像文件公开可读
- 用户只能上传/更新**自己文件夹下**的头像

---

## 四、触发器清单

**当前只有 Supabase 系统自带的触发器，没有任何人为自定义的触发器：**

| 触发器名 | 所在表 | 说明 |
|---|---|---|
| tr_check_filters | realtime.subscription | 系统自带，实时订阅用 |
| update_objects_updated_at | storage.objects | 系统自带，文件存储用 |
| enforce_bucket_name_length_trigger | storage.buckets | 系统自带 |
| protect_buckets_delete | storage.buckets | 系统自带 |
| protect_objects_delete | storage.objects | 系统自带 |
| on_auth_user_created | auth.users | 系统自带，新用户注册时的钩子 |

> ⚠️ **重要教训**：之前项目里曾经存在一个人为添加的触发器 `trigger_update_favorite_count`（配合函数 `update_favorite_count()`），试图在 favorites 表插入/删除时自动维护 generations 表的 favorite_count 字段。但由于该字段实际不存在于 schema 中，导致收藏功能长期失效且难以排查。已于 2026-07 彻底删除该触发器和函数（已验证 `SELECT proname FROM pg_proc WHERE prosrc ILIKE '%favorite_count%'` 返回 0 行）。
>
> **以后新增任何触发器/函数前，必须先更新本文档并让另外两位同学知晓，评审是否真的需要 —— 优先考虑用前端实时 COUNT 查询代替"冗余字段 + 触发器"的方案。**

---

## 五、patterns 表结构

推测用途：**存放"生成纹样时使用的参数"**（风格、色彩方案、复杂度等），与下面 generations 表（推测存"最终生成结果"）配合使用。⚠️ 这只是根据字段名的推测，**未经团队确认**，请找最初设计这张表的同学核实。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid | 主键 |
| user_id | uuid | 关联用户 |
| style | text | 风格 |
| color_scheme | text | 配色方案 |
| complexity | integer | 复杂度 |
| detail | integer | 细节度 |
| symmetry | text | 对称方式 |
| image_url | text | 生成的图片地址 |
| created_at | timestamp with time zone | 创建时间 |
| style_abstract | integer | 风格倾向：抽象化程度 |
| style_modern | integer | 风格倾向：现代化程度 |
| style_complexity | integer | 风格倾向：复杂度 |
| style_digital | integer | 风格倾向：数字化/科技感程度 |

## 六、products 表结构

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid | 主键 |
| name | text | 产品名称（如"书签""T恤"） |
| category | text | 产品分类（如"文创""服饰"） |
| materials | jsonb | 材质选项（如["木质","纸张"]） |
| price | numeric | 价格 |

> ⚠️ 之前反馈过"鞋子和帽子没有从产品列表删除"的问题，已通过统一的 `src/lib/products.ts` 配置文件移除。但这张数据库表里如果还残留着鞋子/帽子的行记录，建议执行下面查询确认一下，数据库层面也清理掉，避免以后又从某个直接查表的接口里冒出来：
> ```sql
> SELECT id, name, category FROM products;
> ```

## 七、待办 / 需要人工确认的事项

- [ ] `favorites` 表存在 3 条 SELECT 策略（`users can view own favorites` / `Allow anonymous users to read favorites` / `Allow anyone to read favorites count`），语义有重叠，建议确认是否可以精简为 1-2 条，避免策略冲突或维护混乱
- [ ] `generations` 表也存在多条相似的 SELECT 策略（`users can view own generations` / `users can view own or public generations` / `public generations are viewable by anyone`），同样建议梳理精简
- [ ] **`patterns` 表和 `generations` 表的关系需要团队确认**：目前推测 patterns 存"生成参数"、generations 存"最终作品"，但两张表之间没有查到直接的外键关联，需要向最初设计的同学确认这两张表具体是怎么配合使用的，是否存在冗余
- [ ] 确认 products 表里是否还残留鞋子/帽子的行记录（见上方六、products 表结构 的提示）

---

## 八、常用体检查询（保留备用）

```sql
-- 1. 所有表
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;

-- 2. 所有外键关系
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- 3. 所有 RLS 策略
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies ORDER BY tablename;

-- 4. 所有触发器（防止再埋雷）
SELECT tgname AS trigger_name, tgrelid::regclass AS table_name,
       pg_get_triggerdef(oid) AS definition
FROM pg_trigger WHERE NOT tgisinternal;
```

---

## 九、性能优化：查询索引（建议在 Supabase SQL Editor 执行）

Postgres 日志曾出现 `canceling statement due to statement timeout`，前端列表查询（「我的作品」「订单」）按 `user_id` 过滤 + `created_at` 倒序，若表数据量大且缺少复合索引，会触发全表扫描 + 排序导致超时。请在 Supabase Dashboard → SQL Editor 执行以下语句：

```sql
-- 我的作品：按用户过滤 + 按时间倒序，覆盖列表查询
CREATE INDEX IF NOT EXISTS idx_generations_user_created
  ON generations (user_id, created_at DESC);

-- 我的订单：按用户过滤 + 按时间倒序，覆盖列表查询
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON orders (user_id, created_at DESC);

-- 收藏数统计：按作品统计收藏数（我的作品页 favorites 查询）
CREATE INDEX IF NOT EXISTS idx_favorites_generation_id
  ON favorites (generation_id);
```

查询侧已同步优化（`src/pages/MyWorks.tsx` / `src/pages/Orders.tsx`）：

1. 禁止 `select *`，只选列表必需列；
2. `generations` 用 JSON 投影 `params->>title` / `params->tags`，不拉整个 `params`（其中可能含 base64 预览图、完整 prompt / DNA 等大字段）；
3. `orders` 用 JSON 投影只取 `customization` / `shipping_info` 的渲染所需小字段，明确排除 `previewImage`（可能是 base64 大图）；
4. `limit`：作品 50、订单 20，均按 `created_at desc`；
5. 均带 `user_id` 过滤，超时 / 错误日志打印 `message` 而非空 `Error {}`。
