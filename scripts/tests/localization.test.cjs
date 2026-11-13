const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const i18next = require('i18next');
const plugin = require('../../packages/bruno-app/plugins/ui-translations/index.cjs');
const sourceRoot = path.join(__dirname, '../../packages/bruno-app/src');
const ru = require('../../packages/bruno-app/src/i18n/translation/ui.ru.json');

const transform = (source, filename = path.join(sourceRoot, 'components/Example.jsx')) => babel.transformSync(source, {
  filename,
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ['jsx', 'typescript'] },
  plugins: [plugin]
}).code;

test('translates presentation without changing payloads, identifiers, or code samples', () => {
  const output = transform(`
    const request = { name: 'Name', value: 'Save', method: 'GET', url: 'https://example.org/Save' };
    const option = { value: 'Save', label: 'Save' };
    const View = () => <div data-testid="Save"><button title="Save">Save</button><pre>Save</pre><code>secret</code><input value="Save" placeholder="Name" /></div>;
  `);
  assert.match(output, /label: _translateUi\("Save"\)/);
  assert.match(output, /placeholder=\{_translateUi\("Name"\)\}/);
  assert.match(output, /value: 'Save'/);
  assert.match(output, /name: 'Name'/);
  assert.match(output, /method: 'GET'/);
  assert.match(output, /data-testid="Save"/);
  assert.match(output, /<pre>Save<\/pre>/);
  assert.match(output, /<code>secret<\/code>/);
  assert.match(output, /value="Save"/);
  assert.match(output, /https:\/\/example.org\/Save/);
});

test('keeps implicit option values and evaluates interpolation values normally', () => {
  const output = transform('const View = ({ name }) => <><option>Save</option><span>{`Inherited from ${name}`}</span></>;');
  assert.match(output, /<option value="Save">/);
  assert.match(output, /Inherited from \{\{value0\}\}/);
  assert.match(output, /value0: name/);
});

test('leaves non-UI modules and unknown strings untouched', () => {
  assert.doesNotMatch(transform('const data = { label: "Save" };', path.join(sourceRoot, 'utils/payload.js')), /translateUi/);
  assert.doesNotMatch(transform('const View = () => <span>Untranslated custom phrase</span>;'), /translateUi/);
});

test('Russian translations preserve interpolation placeholders and contain no duplicate keys', () => {
  const filename = path.join(sourceRoot, 'i18n/translation/ui.ru.json');
  const ast = parser.parseExpression(readFileSync(filename, 'utf8'));
  const keys = ast.properties.map((property) => property.key.value);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.length > 2000);
  for (const [key, value] of Object.entries(ru)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.trim(), key);
    const placeholders = (text) => [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(placeholders(key), placeholders(value), key);
  }
  const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) =>
    typeof item === 'string' ? [`${prefix}${key}`] : flatten(item, `${prefix}${key}.`)
  ).sort();
  assert.deepEqual(
    flatten(require('../../packages/bruno-app/src/i18n/translation/en.json')),
    flatten(require('../../packages/bruno-app/src/i18n/translation/ru.json'))
  );
});

test('uses real i18next for Russian, English fallback, whitespace, and user values', () => {
  const engine = i18next.createInstance();
  engine.init({ lng: 'ru', fallbackLng: 'en', initImmediate: false, resources: {
    ru: { ui: ru, nouns: require('../../packages/bruno-app/src/i18n/translation/nouns.ru.json') }
  }, interpolation: { escapeValue: false } });
  const source = readFileSync(path.join(sourceRoot, 'i18n/ui.js'), 'utf8')
    .replace("import i18n from './index';", '')
    .replace('export const translateUi', 'const translateUi');
  const translate = vm.runInNewContext(`${source}\ntranslateUi;`, { i18n: engine });
  assert.equal(translate(' Save '), ' Сохранить ');
  assert.equal(translate('Inherited from {{value0}}', { value0: '<user>{{password}}' }), 'Наследуется из <user>{{password}}');
  assert.equal(translate('GET'), 'GET');
  for (const [count, expected] of [[1, 'запрос'], [2, 'запроса'], [5, 'запросов'], [21, 'запрос'], [22, 'запроса'], [0, 'запросов']]) {
    assert.equal(translate('{{value0}} request{{value1}} in collection', { value0: count, value1: count === 1 ? '' : 's' }), `В коллекции: ${count} ${expected}`);
  }
  engine.changeLanguage('en');
  assert.equal(translate(' Save '), ' Save ');
  assert.equal(translate('Inherited from {{value0}}', { value0: 'my collection' }), 'Inherited from my collection');
  assert.equal(translate('{{value0}} request{{value1}} in collection', { value0: 5, value1: 's' }), '5 requests in collection');
});

test('native menu localization preserves commands and does not mutate the template', () => {
  const localizeMenu = require('../../packages/bruno-electron/src/app/localize-menu');
  const click = () => {};
  const template = [{ label: 'Collection', submenu: [{ label: 'Open Collection', click }, { role: 'copy' }] }];
  const localized = localizeMenu(template, 'ru', ru);
  assert.equal(localized[0].label, 'Коллекция');
  assert.equal(localized[0].submenu[0].label, 'Открыть коллекцию');
  assert.equal(localized[0].submenu[0].click, click);
  assert.equal(localized[0].submenu[1].label, 'Копировать');
  assert.equal(localizeMenu(template, 'en', ru)[0].label, 'Collection');
  assert.equal(template[0].submenu[0].label, 'Open Collection');
});

test('all production UI files remain valid after localization', () => {
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (/\.[jt]sx?$/.test(entry.name) && !/\.(test|spec|stories)\./.test(entry.name)) {
        const output = transform(readFileSync(filename, 'utf8'), filename);
        assert.doesNotThrow(() => parser.parse(output, { sourceType: 'module', plugins: ['jsx', 'typescript'] }), filename);
      }
    }
  };
  for (const folder of ['components', 'pages', 'ui', 'hooks']) walk(path.join(sourceRoot, folder));
});
