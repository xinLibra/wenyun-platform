/**
 * 解析 GLB 文件的 JSON 块，提取所有 material 名称和 mesh 名称
 * 用法: node scripts/inspect_glb_materials.js
 */
const fs = require('fs')
const path = require('path')

const modelsDir = path.join(__dirname, '..', 'public', 'models')

function parseGlbJson(filePath) {
  const buf = fs.readFileSync(filePath)
  // GLB header: magic(4) version(4) length(4)
  // Then chunk: length(4) type(4) data
  const magic = buf.readUInt32LE(0)
  if (magic !== 0x46546c67) { // 'glTF'
    return null
  }
  // First chunk starts at offset 12
  const chunkLength = buf.readUInt32LE(12)
  const chunkType = buf.readUInt32LE(16)
  // chunkType should be 0x4e4f534a = 'JSON'
  if (chunkType !== 0x4e4f534a) {
    return null
  }
  const jsonStr = buf.toString('utf8', 20, 20 + chunkLength)
  return JSON.parse(jsonStr)
}

const glbFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb'))

console.log('=== GLB 材质名 / Mesh 名对照表 ===\n')

for (const glbFile of glbFiles) {
  const fullPath = path.join(modelsDir, glbFile)
  try {
    const gltf = parseGlbJson(fullPath)
    if (!gltf) {
      console.log(`${glbFile}: [解析失败]`)
      continue
    }

    const materialNames = (gltf.materials || []).map((m, i) => `[${i}] "${m.name}"`)
    const meshNames = (gltf.meshes || []).map((m, i) => `[${i}] "${m.name}"`)
    const nodeNames = (gltf.nodes || []).map((n, i) => `[${i}] "${n.name}" mesh=${n.mesh ?? '-'}`)

    console.log(`\n--- ${glbFile} ---`)
    console.log(`  Materials (${materialNames.length}):`)
    materialNames.forEach(m => console.log(`    ${m}`))
    console.log(`  Meshes (${meshNames.length}):`)
    meshNames.forEach(m => console.log(`    ${m}`))
    if (nodeNames.length > 0 && nodeNames.length <= 20) {
      console.log(`  Nodes (${nodeNames.length}):`)
      nodeNames.forEach(n => console.log(`    ${n}`))
    }
  } catch (err) {
    console.log(`${glbFile}: [错误] ${err.message}`)
  }
}
