const fs = require('fs');
const buf = fs.readFileSync('public/models/cushion.glb');
// GLB header: 12 bytes (magic + version + length)
// Chunk 0 header: 8 bytes (length + type)
// Chunk 0 type should be 0x4E4F534A ('JSON')
const chunk0Len = buf.readUInt32LE(12);
const chunk0Type = buf.readUInt32LE(16);
console.log('Chunk0 length:', chunk0Len, 'type:', chunk0Type.toString(16));
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
const json = JSON.parse(jsonStr);

// Print materials
if (json.materials) {
  console.log('=== Materials ===');
  json.materials.forEach((m, i) => {
    console.log(i, m.name || '(no name)');
  });
}

// Print meshes
if (json.meshes) {
  console.log('=== Meshes ===');
  json.meshes.forEach((m, i) => {
    console.log(i, m.name || '(no name)');
  });
}

// Print nodes
if (json.nodes) {
  console.log('=== Nodes ===');
  json.nodes.forEach((n, i) => {
    console.log(i, n.name || '(no name)', n.mesh !== undefined ? 'has mesh' : '');
  });
}
