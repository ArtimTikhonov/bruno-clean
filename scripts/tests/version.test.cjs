const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkVersion, compareVersions, releaseNotes, setVersion, validateVersion } = require('../version.cjs');

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-version-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), JSON.stringify(value));
  };
  for (const filename of ['package.json', 'packages/bruno-app/package.json', 'packages/bruno-electron/package.json']) {
    write(filename, { name: filename, version: '2.1.0' });
  }
  write('package-lock.json', { version: '2.1.0', packages: {
    '': { version: '2.1.0' },
    'packages/bruno-app': { version: '2.1.0' },
    'packages/bruno-electron': { version: '2.1.0' },
    'packages/bruno-lang': { version: '0.12.0' }
  } });
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '# Changes\n\n## [Unreleased]\n\nLater\n\n## [2.2.0-beta.1] - 2026-11-14\n\nNew feature\n\n## [2.1.0] - 2026-11-13\n\nInitial release\n\n[2.1.0]: https://example.org/\n');
  const notesDirectory = path.join(root, 'packages/bruno-app/src/components/ChangelogTab');
  fs.mkdirSync(notesDirectory, { recursive: true });
  for (const name of ['CHANGELOG.md', 'CHANGELOG.ru.md']) fs.writeFileSync(path.join(notesDirectory, name), '## Bruno 2.1.0\n\nNotes\n');
  return { root, write };
};

test('current repository versions and release notes agree', () => {
  assert.doesNotThrow(() => checkVersion(path.join(__dirname, '../..')));
});

test('rejects mismatched release tags and manifest or lockfile versions', (t) => {
  const { root, write } = fixture(t);
  assert.equal(checkVersion(root, 'fork-v2.1.0'), '2.1.0');
  assert.throws(() => checkVersion(root, 'v2.1.0'), /Tag/);
  assert.throws(() => checkVersion(root, 'fork-v2.1.1'), /Tag/);
  write('packages/bruno-app/package.json', { version: '2.0.0' });
  assert.throws(() => checkVersion(root), /bruno-app/);
  write('packages/bruno-app/package.json', { version: '2.1.0' });
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  lock.packages['packages/bruno-electron'].version = '2.0.0';
  write('package-lock.json', lock);
  assert.throws(() => checkVersion(root), /bruno-electron/);
});

test('bumps all desktop versions without changing upstream package versions', (t) => {
  const { root } = fixture(t);
  setVersion(root, '2.2.0-beta.1');
  assert.equal(checkVersion(root, 'fork-v2.2.0-beta.1'), '2.2.0-beta.1');
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  assert.equal(lock.packages['packages/bruno-lang'].version, '0.12.0');
  assert.match(fs.readFileSync(path.join(root, 'packages/bruno-app/src/components/ChangelogTab/CHANGELOG.ru.md'), 'utf8'), /^## Bruno 2\.2\.0-beta\.1\n/);
  assert.throws(() => setVersion(root, '2.1.0'), /must increase/);
  assert.throws(() => setVersion(root, '2.2.0-beta.1'), /must increase/);
});

test('requires nonempty dated release notes and does not include other releases or link definitions', (t) => {
  const { root } = fixture(t);
  assert.equal(releaseNotes(root, '2.1.0'), '# Bruno 2.1.0\n\nInitial release\n');
  assert.equal(releaseNotes(root, '2.2.0-beta.1'), '# Bruno 2.2.0-beta.1\n\nNew feature\n');
  assert.throws(() => setVersion(root, '2.3.0'), /CHANGELOG/);
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## [2.1.0] - 2026-02-30\n\nInvalid date');
  assert.throws(() => checkVersion(root), /Invalid changelog date/);
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## [2.1.0] - 2026-11-13\n\n## [2.0.0] - 2026-11-12\n\nOld');
  assert.throws(() => checkVersion(root), /Empty/);
});

test('validates release identifiers and follows SemVer prerelease precedence', () => {
  for (const value of ['2.1.0', '2.2.0-beta.1', '3.0.0-rc.10', '3.0.0-alpha-beta.0']) validateVersion(value);
  for (const value of ['fork-v2.1.0', '2.1', '02.1.0', '2.1.0-01', '2.1.0+build', '2.1.0\n', undefined]) {
    assert.throws(() => validateVersion(value), /Invalid/);
  }
  const ordered = ['2.1.0-alpha', '2.1.0-alpha.1', '2.1.0-beta.2', '2.1.0-beta.11', '2.1.0-rc.1', '2.1.0', '2.1.1', '2.2.0', '3.0.0'];
  for (let i = 1; i < ordered.length; i++) assert.equal(compareVersions(ordered[i], ordered[i - 1]), 1);
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0);
});
