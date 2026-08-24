const fs = require('fs');
const buf = fs.readFileSync('public/models/cushion.glb');
const s = buf.toString('ascii', 0, Math.min(buf.length, 80000));
const mats = [...s.matchAll(/"name":"([^"]+)"/g)].map(m => m[1]);
console.log([...new Set(mats)].slice(0, 40).join('\n'));
