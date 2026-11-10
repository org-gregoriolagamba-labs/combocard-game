#!/usr/bin/env node
// Controlli meccanici della documentazione contro il codice. Nessuna dipendenza.
// Uso: node check-docs.mjs [radice-del-repository]
// Esce con 1 se trova almeno un ERRORE. Gli AVVISI vanno guardati a mano.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
const read = (p) => readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const tryRead = (p) => (existsSync(path.join(root, p)) ? read(p) : '');
const findings = [];
const error = (doc, msg) => findings.push(['ERRORE', doc, msg]);
const warn = (doc, msg) => findings.push(['AVVISO', doc, msg]);

const docs = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.startsWith('.github/') && !f.startsWith('.claude/') && !f.includes('node_modules'))
  .filter((f) => existsSync(path.join(root, f)));
const text = Object.fromEntries(docs.map((d) => [d, read(d)]));
const allDocs = Object.values(text).join('\n');
const normParams = (s) => s.replace(/:[A-Za-z]+/g, ':p');

// I blocchi di codice, letti riga per riga: un'espressione regolare sfasa se una lingua non è prevista
function codeBlocks(body, langs) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const fence = line.match(/^```(\w*)/);
    if (fence && cur === null) cur = { lang: fence[1], lines: [] };
    else if (fence && cur) { if (langs.includes(cur.lang)) out.push(cur.lines.join('\n')); cur = null; }
    else if (cur) cur.lines.push(line);
  }
  return out;
}

// 1. Rotte registrate e documentate ------------------------------------------------------------
const server = tryRead('backend/src/server.js');
const mounts = {};
for (const m of server.matchAll(/app\.use\(\s*["'](\/api[^"']*)["']\s*,([^;]*?)\)\s*;/g)) {
  const last = [...m[2].matchAll(/(\w+)\s*$/g)][0]?.[1];
  if (last) (mounts[last] ??= []).push(m[1]);
}
const routesDir = 'backend/src/routes';
const routes = [];
for (const f of readdirSync(path.join(root, routesDir)).filter((n) => n.endsWith('.routes.js'))) {
  const base = f.replace('.routes.js', '');
  const prefixes = mounts[`${base}Routes`] ?? [`/api/${base}`];
  for (const m of read(`${routesDir}/${f}`).matchAll(/router\.(get|post|put|patch|delete)\(\s*["']([^"']*)["']/g)) {
    // Una rotta può essere montata con più prefissi (alias): basta che il documento ne citi uno
    routes.push({ method: m[1].toUpperCase(), urls: prefixes.map((p) => (p + (m[2] === '/' ? '' : m[2])).replace(/\/$/, '')) });
  }
}
const docRoutes = normParams(allDocs);
for (const r of routes) {
  if (!r.urls.some((u) => docRoutes.includes(normParams(u)))) error('rotte', `${r.method} ${r.urls[0]} non compare in nessun documento`);
}
// Il contrario: una rotta scritta nei documenti che il codice non ha
// Un prefisso scritto da solo (`/api/auth`) indica un gruppo di rotte, non una rotta
const allPrefixes = new Set(Object.values(mounts).flat().concat(['/api']));
const isPrefix = (u) => allPrefixes.has(u.replace(/\/$/, ''));
const known = new Set(routes.flatMap((r) => r.urls.map(normParams)));
for (const [doc, body] of Object.entries(text)) {
  for (const line of body.split('\n')) {
    if (/\b(rimoss[ae]|removed|non esiste più|no longer)\b/i.test(line)) continue; // una rotta tolta può essere ricordata
    for (const m of line.matchAll(/`(?:(?:GET|POST|PUT|PATCH|DELETE) )?(\/api\/[A-Za-z0-9/:_-]+)`/g)) {
      if (!known.has(normParams(m[1])) && !isPrefix(m[1])) error(doc, `la rotta ${m[1]} non esiste nel codice`);
    }
  }
}

// 2. Eventi socket -----------------------------------------------------------------------------
const events = new Set();
const walk = (dir) => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
for (const f of walk('backend/src').filter((n) => n.endsWith('.js'))) {
  for (const m of read(f).matchAll(/\.emit\(\s*["'](\w+)["']/g)) events.add(m[1]);
}
for (const ev of events) {
  if (ev === 'pong') continue;
  if (!allDocs.includes(ev)) error('eventi socket', `l'evento ${ev} non compare in nessun documento`);
}

// 3. Variabili d'ambiente ----------------------------------------------------------------------
const backendSrc = walk('backend/src').filter((n) => n.endsWith('.js')).map(read).join('\n');
const envExample = tryRead('backend/.env.example');
const readByCode = new Set([...backendSrc.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]));
for (const v of readByCode) {
  if (!new RegExp(`^#?\\s*${v}=`, 'm').test(envExample)) warn('backend/.env.example', `${v} è letta dal codice e non è nell'esempio`);
}
const testSrc = walk('backend/__tests__').map((f) => (f.endsWith('.js') ? read(f) : '')).join('\n');
const frontendSrc = walk('frontend/src').map((f) => (/\.(jsx?|cjs|mjs)$/.test(f) ? read(f) : '')).join('\n');
const codeEnv = new Set([...readByCode, ...[...testSrc.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]), ...[...frontendSrc.matchAll(/import\.meta\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]),
  ...[...tryRead('e2e/playwright.config.js').matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]),
  ...walk('e2e/tests').map((f) => (f.endsWith('.js') ? read(f) : '')).flatMap((t) => [...t.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1])),
  ...[...tryRead('backend/src/config/index.js').matchAll(/["']([A-Z][A-Z0-9_]{3,})["']/g)].map((m) => m[1])]);
const ignoreEnv = new Set(['NODE_ENV', 'CI', 'PATH', 'HOME', 'PORT', 'DEBUG']);
for (const [doc, body] of Object.entries(text)) {
  for (const block of codeBlocks(body, ['env', 'bash', 'sh', ''])) {
    for (const m of block.matchAll(/^(?:export\s+)?#?\s*([A-Z][A-Z0-9_]{3,})=/gm)) {
      const v = m[1];
      if (!codeEnv.has(v) && !ignoreEnv.has(v) && !/^(POSTGRES|PG|DOCKER|DB_|VITE_)/.test(v) && !tryRead('docker-compose.yml').includes(v)) {
        warn(doc, `la variabile ${v} è citata ma nessun codice la legge`);
      }
    }
  }
}

// 4. Percentuali dei premi ---------------------------------------------------------------------
const cfg = tryRead('backend/src/config/index.js');
const nameOf = { tris: 'Tris', sequenza: 'Sequenza', scopa: 'Scopa', napola: 'Napola', combocard_reale: 'Combocard Reale' };
for (const [key, label] of Object.entries(nameOf)) {
  const m = cfg.match(new RegExp(`${key}:\\s*parseFloat\\([^)]*\\)\\s*\\|\\|\\s*([0-9.]+)`));
  if (!m) continue;
  const pct = Math.round(parseFloat(m[1]) * 100);
  for (const doc of ['README.md', 'docs/GAME_DESIGN.md']) {
    const row = (text[doc] ?? '').split('\n').find((l) => l.startsWith('|') && l.includes(`**${label}`));
    const found = row?.match(/(\d+)% of (?:the )?pot/);
    if (found && Number(found[1]) !== pct) error(doc, `premio ${label}: il documento dice ${found[1]}%, il codice ${pct}%`);
  }
}

// 5. Librerie citate ---------------------------------------------------------------------------
const pkgFiles = ['package.json', 'backend/package.json', 'frontend/package.json', 'e2e/package.json'];
const deps = new Set(pkgFiles.flatMap((p) => { const j = JSON.parse(read(p)); return Object.keys({ ...j.dependencies, ...j.devDependencies }); }));
const libs = { 'React Router': 'react-router-dom', Joi: 'joi', Morgan: 'morgan', Helmet: 'helmet', 'Redux Toolkit': '@reduxjs/toolkit',
  'Lucide': 'lucide-react', 'Socket.IO': 'socket.io', Tailwind: 'tailwindcss', Vitest: 'vitest', Playwright: '@playwright/test', Jest: 'jest',
  Nodemon: 'nodemon', Zod: 'zod', Prisma: 'prisma', Mongoose: 'mongoose' };
const techDocs = ['README.md', 'docs/DEPLOYMENT.md', 'docs/GAME_DESIGN.md', 'CONTRIBUTING.md'];
for (const doc of techDocs.filter((d) => text[d])) {
  for (const [name, pkg] of Object.entries(libs)) {
    const alt = pkg === 'react-router-dom' ? deps.has('react-router') : false;
    if (new RegExp(`\\b${name}\\b`).test(text[doc]) && !deps.has(pkg) && !alt) {
      warn(doc, `cita ${name} ma ${pkg} non è una dipendenza (se è una frase tipo «non usa ${name}», ignora)`);
    }
  }
}

// 6. Script npm citati -------------------------------------------------------------------------
const scripts = { '.': JSON.parse(read('package.json')).scripts ?? {} };
for (const p of ['backend', 'frontend', 'e2e']) scripts[p] = JSON.parse(read(`${p}/package.json`)).scripts ?? {};
const builtin = new Set(['install', 'ci', 'start', 'test', 'audit', 'version', 'run', 'ls', 'install-test']);
for (const [doc, body] of Object.entries(text)) {
  for (const m of body.matchAll(/npm(?: --prefix (\w+))? run ([\w:-]+)/g)) {
    const inDoc = m[1] ?? null;
    // Senza --prefix il comando si lancia nella cartella di chi legge: basta che esista in un pacchetto
    const ok = inDoc ? scripts[inDoc]?.[m[2]] : Object.values(scripts).some((s) => s[m[2]]);
    if (!ok) error(doc, `npm run ${m[2]} non esiste ${inDoc ? `in ${inDoc}/package.json` : 'in nessun package.json'}`);
  }
}

// 7. Percorsi e collegamenti -------------------------------------------------------------------
const skipPath = /[<>*{}$]|^\/|^https?:|^~|^\.\.\.|\.\.\.$|node_modules|^api\//;
// File che il repository non tiene (.env, build/, node_modules): i documenti li citano giustamente
const isIgnored = (p) => ['', 'backend/', 'frontend/', 'e2e/'].some((pre) => {
  try { execFileSync('git', ['check-ignore', '-q', pre + p], { cwd: root, stdio: 'ignore' }); return true; } catch { return false; }
});
const exists = (p, from) => [path.join(path.dirname(from), p), p, `backend/${p}`, `frontend/${p}`, `backend/src/${p}`, `frontend/src/${p}`, `e2e/${p}`]
  .some((c) => existsSync(path.join(root, c.split('#')[0])));
for (const [doc, body] of Object.entries(text)) {
  const noFences = body.replace(/```[\s\S]*?```/g, (b) => b.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, '');
  for (const m of noFences.matchAll(/\]\(([^)#\s][^)\s]*)\)/g)) {
    if (skipPath.test(m[1]) || m[1].startsWith('#')) continue;
    if (!exists(m[1], doc)) error(doc, `il collegamento ${m[1]} non porta a un file`);
  }
  for (const m of noFences.matchAll(/`([A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+\/?)`/g)) {
    const p = m[1];
    if (skipPath.test(p) || !/\.\w{1,5}$|\/$/.test(p)) continue;
    if (!exists(p, doc) && !isIgnored(p)) warn(doc, `il percorso ${p} non esiste`);
  }
}

// 8. Tabelle del database ----------------------------------------------------------------------
const migDir = 'backend/db/migrations';
if (existsSync(path.join(root, migDir)) && text['docs/DATABASE.md']) {
  const sql = readdirSync(path.join(root, migDir)).filter((f) => f.endsWith('.sql')).map((f) => read(`${migDir}/${f}`)).join('\n');
  for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)/gi)) {
    if (m[1] !== 'schema_migrations' && !text['docs/DATABASE.md'].includes(`\`${m[1]}\``)) error('docs/DATABASE.md', `la tabella ${m[1]} non è descritta`);
  }
}

// 9. Versioni ----------------------------------------------------------------------------------
const versions = pkgFiles.map((p) => [p, JSON.parse(read(p)).version]);
if (new Set(versions.map((v) => v[1])).size > 1) warn('versioni', `i pacchetti hanno versioni diverse: ${versions.map((v) => `${v[0]}=${v[1]}`).join(', ')}`);

// Esito ----------------------------------------------------------------------------------------
console.log(`Documenti letti: ${docs.length} (${docs.join(', ')})`);
console.log(`Rotte nel codice: ${routes.length}, eventi socket: ${events.size}, versione: ${versions[0][1]}`);
for (const [level, doc, msg] of findings) console.log(`${level}  ${doc}: ${msg}`);
const errors = findings.filter((f) => f[0] === 'ERRORE').length;
console.log(`\n${errors} errori, ${findings.length - errors} avvisi`);
process.exit(errors ? 1 : 0);
