const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { getUiText } = require('../packages/bruno-app/plugins/ui-translations/index.cjs');
const root = path.join(__dirname, '../packages/bruno-app/src');
const strings = new Map();

const walk = (directory) => {
  for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, file.name);
    if (file.isDirectory()) {
      walk(filename);
    } else if (/\.[jt]sx?$/.test(file.name) && !/\.(test|spec)\./.test(file.name)) {
      const source = fs.readFileSync(filename, 'utf8');
      const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
      traverse(ast, {
        'JSXText|StringLiteral|TemplateLiteral'(nodePath) {
          const text = getUiText(nodePath)?.trim();
          if (!text || !/[A-Za-z]/.test(text) || /^https?:/.test(text)) return;
          if (!strings.has(text)) strings.set(text, []);
          strings.get(text).push(path.relative(root, filename));
        }
      });
    }
  }
};
for (const folder of ['components', 'pages', 'ui', 'hooks']) walk(path.join(root, folder));
fs.writeFileSync('/tmp/bruno-ui-worklist.json', JSON.stringify(Object.fromEntries(strings), null, 2));
console.log('Unique UI strings:', strings.size);
const sorted = [...strings].sort((a, b) => b[1].length - a[1].length);
fs.writeFileSync('/tmp/bruno-ui-strings.txt', sorted.map(([text, files]) => `${files.length}\t${text}`).join('\n'));
console.log(sorted.slice(0, 70).map(([text, files]) => `${files.length}\t${text}`).join('\n'));
