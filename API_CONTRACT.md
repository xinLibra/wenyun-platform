\# 纹韵平台 - AI创新功能 API 接口约定



本文档定义方向2（纹样DNA）、方向3（纹样融合）、方向4（文化语义推荐）三个新功能

的前后端接口格式。前端会先用本文档里的假数据结构进行UI开发，后端/算法完成后按

此格式对接，双方不需要等待彼此即可并行开发。



\---



\## 一、纹样DNA接口



\### GET /api/pattern-dna/:patternId



获取某个纹样的AI分析DNA数据。



\*\*请求参数\*\*

| 参数 | 类型 | 说明 |

|---|---|---|

| patternId | string (uuid) | 纹样ID，从URL路径获取 |



\*\*成功响应\*\* `200 OK`

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "patternId": "a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx",

&#x20;   "dna": {

&#x20;     "geometricScore": 78,

&#x20;     "symmetryScore": 85,

&#x20;     "curvatureScore": 67,

&#x20;     "repetitionScore": 90,

&#x20;     "traditionalScore": 93,

&#x20;     "modernFitScore": 71,

&#x20;     "colorComplexity": 60

&#x20;   },

&#x20;   "inputParams": {

&#x20;     "complexity": 70,

&#x20;     "symmetry": 80,

&#x20;     "styleAbstract": 50,

&#x20;     "styleModern": 40

&#x20;   },

&#x20;   "updatedAt": "2026-07-22T10:00:00Z"

&#x20; }

}

```



\*\*未找到时响应\*\* `404 Not Found`

```json

{

&#x20; "success": false,

&#x20; "error": "该纹样暂无DNA分析数据"

}

```



\*\*字段说明\*\*：`dna` 下的7个字段全部是 0-100 的数字（对应 `pattern\_dna` 表里的

`\*\_score` 和 `color\_complexity` 字段），`inputParams` 是用户当初设定的生成参数快照

（对应 `input\_\*` 字段），前端做"雷达图"用 `dna` 这部分数据，做"设定vs实际"对比图用

两部分数据一起。



\---



\### GET /api/pattern-dna/similar/:patternId



获取与某个纹样最相似的纹样列表。



\*\*请求参数\*\*

| 参数 | 类型 | 说明 |

|---|---|---|

| patternId | string (uuid) | 纹样ID |

| limit | number (可选，query参数) | 返回条数，默认5 |



\*\*成功响应\*\* `200 OK`

```json

{

&#x20; "success": true,

&#x20; "data": \[

&#x20;   {

&#x20;     "patternId": "b2c3d4e5-xxxx",

&#x20;     "patternName": "敦煌卷草纹",

&#x20;     "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/patterns/xxx.png",

&#x20;     "similarityScore": 87

&#x20;   },

&#x20;   {

&#x20;     "patternId": "c3d4e5f6-xxxx",

&#x20;     "patternName": "云雷纹",

&#x20;     "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/patterns/yyy.png",

&#x20;     "similarityScore": 72

&#x20;   }

&#x20; ]

}

```



\---



\## 二、纹样融合接口



\### POST /api/pattern-fusion



提交一个融合请求，AI按比例融合两个纹样并生成新图案。



\*\*请求体\*\*

```json

{

&#x20; "patternIdA": "a1b2c3d4-xxxx",

&#x20; "patternIdB": "b2c3d4e5-xxxx",

&#x20; "fusionRatioA": 70,

&#x20; "fusionRatioB": 30

}

```



\*\*说明\*\*：`fusionRatioA + fusionRatioB` 必须等于100，前端滑块交互时要保证这一点

（比如A滑块拖到70，B自动变成30，不需要用户手动凑）。



\*\*成功响应\*\* `202 Accepted`（因为生成是异步的，不会立即返回结果图）

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "fusionId": "f1e2d3c4-xxxx",

&#x20;   "status": "processing"

&#x20; }

}

```



\---



\### GET /api/pattern-fusion/:fusionId



轮询查询某次融合任务的生成状态和结果。



\*\*成功响应\*\* `200 OK`（生成中）

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "fusionId": "f1e2d3c4-xxxx",

&#x20;   "status": "processing",

&#x20;   "resultImageUrl": null

&#x20; }

}

```



\*\*成功响应\*\* `200 OK`（生成完成）

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "fusionId": "f1e2d3c4-xxxx",

&#x20;   "status": "completed",

&#x20;   "resultImageUrl": "https://xxx.supabase.co/storage/v1/object/public/patterns/fusion\_result.png"

&#x20; }

}

```



\*\*status 可能的值\*\*：`pending` / `processing` / `completed` / `failed`



\*\*前端建议\*\*：提交融合请求后，每隔2-3秒轮询一次这个接口，直到 `status` 变成

`completed` 或 `failed` 再停止轮询、展示结果。



\---



\## 三、文化语义推荐接口



\### POST /api/semantic-match



根据用户输入的场景描述文字，推荐匹配的纹样。



\*\*请求体\*\*

```json

{

&#x20; "query": "毕业礼物"

}

```



\*\*成功响应\*\* `200 OK`

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "matchedTags": \["毕业", "成长"],

&#x20;   "recommendations": \[

&#x20;     {

&#x20;       "patternId": "d4e5f6g7-xxxx",

&#x20;       "patternName": "竹纹",

&#x20;       "imageUrl": "https://xxx.supabase.co/storage/v1/object/public/patterns/zhuwen.png",

&#x20;       "meaning": "节节高升，寓意成长与坚韧",

&#x20;       "region": "江南地区传统纹样",

&#x20;       "matchScore": 95

&#x20;     }

&#x20;   ]

&#x20; }

}

```



\*\*如果没有匹配结果\*\*：

```json

{

&#x20; "success": true,

&#x20; "data": {

&#x20;   "matchedTags": \[],

&#x20;   "recommendations": \[]

&#x20; }

}

```

（前端需要处理空结果的情况，展示"暂无匹配推荐，试试其他关键词"之类的提示，

不要展示空白页面）



\---



\## 四、前端Mock数据使用说明



在真实后端接口完成前，前端可以在 `src/mock/` 目录下建立同名的假数据文件，

返回结构完全对照本文档，例如：



```typescript

// src/mock/patternDna.ts

export const mockPatternDna = {

&#x20; success: true,

&#x20; data: {

&#x20;   patternId: 'mock-id-001',

&#x20;   dna: {

&#x20;     geometricScore: 78,

&#x20;     symmetryScore: 85,

&#x20;     curvatureScore: 67,

&#x20;     repetitionScore: 90,

&#x20;     traditionalScore: 93,

&#x20;     modernFitScore: 71,

&#x20;     colorComplexity: 60,

&#x20;   },

&#x20;   inputParams: {

&#x20;     complexity: 70,

&#x20;     symmetry: 80,

&#x20;     styleAbstract: 50,

&#x20;     styleModern: 40,

&#x20;   },

&#x20;   updatedAt: '2026-07-22T10:00:00Z',

&#x20; },

}

```



等真实接口开发完成后，把调用 mock 数据的地方替换成真实的 `fetch`/`supabase` 调用，

由于响应结构完全一致，组件内部逻辑不需要改动。



\---



\## 五、字段命名约定



\- 数据库字段用 `snake\_case`（如 `geometric\_score`），API 响应统一转换成

&#x20; `camelCase`（如 `geometricScore`），前端组件按 camelCase 使用，保持和现有

&#x20; 项目代码风格一致

\- 所有分数类字段统一是 0-100 的数字，不用0-1小数，避免前后端换算出错

\- 所有ID字段统一用 `patternId`、`fusionId` 这种"实体名+Id"的命名方式，不要

&#x20; 简写成 `id`（避免多个实体的id混在一起时难以区分）

