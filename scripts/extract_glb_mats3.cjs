const fs = require('fs');
const buf = fs.readFileSync('public/models/cushion.glb');
const chunk0Len = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
const json = JSON.parse(jsonStr);

console.log(JSON.stringify(json, null, 2));
