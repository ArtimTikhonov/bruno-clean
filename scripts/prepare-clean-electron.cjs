const fs = require('node:fs');
const path = require('node:path');

const web = path.join(__dirname, '../packages/bruno-electron/web');
fs.cpSync(path.join(__dirname, '../packages/bruno-app/dist'), web, { recursive: true });

// Match the upstream desktop build: file:// pages need relative asset URLs.
for (const name of fs.readdirSync(web)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(web, name);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\/static/g, './static'));
}
const css = path.join(web, 'static/css');
for (const name of fs.readdirSync(css)) {
  if (!name.endsWith('.css')) continue;
  const file = path.join(css, name);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\/static\/font/g, '../../static/font'));
}
