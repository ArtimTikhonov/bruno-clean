const fs = require('node:fs');
const path = require('node:path');

const manifests = ['package.json', 'packages/bruno-app/package.json', 'packages/bruno-electron/package.json'];
const appNotes = ['CHANGELOG.md', 'CHANGELOG.ru.md'].map((name) => `packages/bruno-app/src/components/ChangelogTab/${name}`);
const numeric = '(?:0|[1-9]\\d*)';
const identifier = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const versionPattern = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?$`);
const readJson = (root, filename) => JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));

const validateVersion = (version) => {
  if (typeof version !== 'string' || version !== version.trim() || !versionPattern.test(version)) {
    throw new Error(`Invalid release version: ${version}. Use X.Y.Z or X.Y.Z-beta.N, without build metadata.`);
  }
  return version;
};

const compareVersions = (left, right) => {
  const [leftCore, ...leftPre] = validateVersion(left).split('-');
  const [rightCore, ...rightPre] = validateVersion(right).split('-');
  const a = leftCore.split('.').map(BigInt);
  const b = rightCore.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  if (!leftPre.length || !rightPre.length) return Number(!leftPre.length) - Number(!rightPre.length);
  const ap = leftPre.join('-').split('.');
  const bp = rightPre.join('-').split('.');
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    if (ap[i] === undefined) return -1;
    if (bp[i] === undefined) return 1;
    if (ap[i] === bp[i]) continue;
    const an = /^\d+$/.test(ap[i]);
    const bn = /^\d+$/.test(bp[i]);
    if (an && bn) return BigInt(ap[i]) > BigInt(bp[i]) ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    return ap[i] > bp[i] ? 1 : -1;
  }
  return 0;
};

const releaseNotes = (root, version) => {
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  const escaped = validateVersion(version).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^## \\[${escaped}\\] - (\\d{4}-\\d{2}-\\d{2})\\r?$`, 'm');
  const match = heading.exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md must contain: ## [${version}] - YYYY-MM-DD`);
  const parsedDate = new Date(`${match[1]}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== match[1]) {
    throw new Error(`Invalid changelog date: ${match[1]}`);
  }
  const rest = changelog.slice(match.index + match[0].length);
  const end = rest.search(/^## |^\[[^\]]+\]: /m);
  const section = (end === -1 ? rest : rest.slice(0, end)).trim();
  if (!section) throw new Error(`Empty changelog entry for ${version}`);
  return `# Bruno ${version}\n\n${section}\n`;
};

const checkVersion = (root, tag) => {
  const version = validateVersion(readJson(root, manifests[0]).version);
  for (const filename of manifests) {
    if (readJson(root, filename).version !== version) throw new Error(`Version mismatch in ${filename}; expected ${version}`);
  }
  const lock = readJson(root, 'package-lock.json');
  if (lock.version !== version) throw new Error(`Version mismatch in package-lock.json; expected ${version}`);
  for (const key of ['', 'packages/bruno-app', 'packages/bruno-electron']) {
    if (lock.packages?.[key]?.version !== version) throw new Error(`Version mismatch in package-lock.json packages[${key}]; expected ${version}`);
  }
  if (tag !== undefined && tag !== `fork-v${version}`) throw new Error(`Tag ${tag} does not match fork-v${version}`);
  for (const filename of appNotes) {
    if (fs.readFileSync(path.join(root, filename), 'utf8').split(/\r?\n/)[0] !== `## Bruno ${version}`) {
      throw new Error(`Version mismatch in ${filename}; expected heading ## Bruno ${version}`);
    }
  }
  releaseNotes(root, version);
  return version;
};

const setVersion = (root, next) => {
  validateVersion(next);
  const current = checkVersion(root);
  if (compareVersions(next, current) <= 0) throw new Error(`Version must increase from ${current}; got ${next}`);
  releaseNotes(root, next);
  const documents = manifests.map((filename) => [filename, readJson(root, filename)]);
  for (const [, document] of documents) document.version = next;
  const lock = readJson(root, 'package-lock.json');
  lock.version = next;
  for (const key of ['', 'packages/bruno-app', 'packages/bruno-electron']) lock.packages[key].version = next;
  documents.push(['package-lock.json', lock]);
  const notes = appNotes.map((filename) => [filename,
    fs.readFileSync(path.join(root, filename), 'utf8').replace(/^## Bruno [^\r\n]+/, `## Bruno ${next}`)
  ]);
  for (const [filename, document] of documents) fs.writeFileSync(path.join(root, filename), `${JSON.stringify(document, null, 2)}\n`);
  for (const [filename, content] of notes) fs.writeFileSync(path.join(root, filename), content);
  return next;
};

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const command = process.argv[2] || 'check';
    if (command === 'set') {
      console.log(`Version updated to ${setVersion(root, process.argv[3])}`);
    } else if (command === 'check' || command === 'notes') {
      const version = checkVersion(root, process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined);
      if (command === 'notes') process.stdout.write(releaseNotes(root, version));
      else console.log(`Desktop manifests, lockfile and changelog agree: ${version}`);
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=fork-v${version}\nprerelease=${version.includes('-')}\n`);
      }
    } else throw new Error('Usage: node scripts/version.cjs check|set VERSION|notes');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { checkVersion, compareVersions, releaseNotes, setVersion, validateVersion };
