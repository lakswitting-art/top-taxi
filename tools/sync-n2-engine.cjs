'use strict';
// Run from a checked-out customer-site repository. Never touches the N2 source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Usage: node tools/sync-n2-engine.cjs <N2-source-directory>');
const source = path.resolve(sourceDir, 'n2-fare-engine.js');
const engine = require(source);
if (!/^\d{8}-[a-z0-9-]+$/.test(engine.RELEASE) || typeof engine.googleRoutes !== 'function' ||
    typeof engine.selectSurfaceRoute !== 'function' || engine.calculateDriverFare(0, 0) !== 500)
  throw new Error('Invalid N2 shared engine');
const data = fs.readFileSync(source);
fs.writeFileSync(path.join(root, 'n2-fare-engine.js'), data);
for (const name of ['ride.html', 'index.html', 'fare.html', 'errand.html']) {
  const file = path.join(root, name), html = fs.readFileSync(file, 'utf8');
  const matches = html.match(/https:\/\/lakswitting-art\.github\.io\/top-taxi\/n2-fare-engine\.js\?v=[a-z0-9-]+/g) || [];
  if (matches.length !== 1) throw new Error(name + ': expected one shared N2 script');
  fs.writeFileSync(file, html.replace(matches[0], 'https://lakswitting-art.github.io/top-taxi/n2-fare-engine.js?v=' + engine.RELEASE));
}
fs.writeFileSync(path.join(root, 'n2-engine-release.json'), JSON.stringify({
  revision: engine.RELEASE,
  sha256: crypto.createHash('sha256').update(data).digest('hex'),
  sourceModule: 'N2/n2-fare-engine.js',
  pages: ['ride.html', 'index.html', 'fare.html', 'errand.html']
}, null, 2) + '\n');
const result = spawnSync(process.execPath, ['--test', 'test/n2-web.test.cjs'], {cwd: root, stdio: 'inherit'});
if (result.status !== 0) throw new Error('N2 web acceptance failed; do not publish these files');
console.log('N2 web module verified: ' + engine.RELEASE);
