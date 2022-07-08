const fs = require('fs')
const packageJson = require('../node_modules/@chainsafe/discv5/package.json')
packageJson.exports['./packet'] = { import: './lib/packet/index.js'}
fs.writeFileSync('node_modules/@chainsafe/discv5/package.json', JSON.stringify(packageJson))