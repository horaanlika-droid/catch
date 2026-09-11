// Генерирует public/data.json — статический снапшот состояния для GitHub Pages
//   node server/export-static.js          — из seed (дефолт)
//   node server/export-static.js --live   — из рабочих данных (data/state.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from '../seed/data.js';
import { normalizeState } from './store.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let state;
if (process.argv.includes('--live')) {
  const dir = process.env.DATA_DIR || (fs.existsSync('/app/data/state.json') ? '/app/data' : path.join(ROOT, 'data'));
  state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
} else {
  state = structuredClone(seed);
}

state = normalizeState(state);
const out = { rev: 0, static: true, updatedAt: new Date().toISOString(), ...strip(state) };
fs.writeFileSync(path.join(ROOT, 'public', 'data.json'), JSON.stringify(out));
console.log('public/data.json обновлён, категорий меню:', state.menu.categories.length);

function strip(s) {
  const { meta, hours, contacts, socials, brunch, booking, menu, events, merch, merchNote, jobs, gallery, updatedAt } = s;
  return { meta, hours, contacts, socials, brunch, booking, menu, events, merch, merchNote, jobs, gallery, updatedAt };
}
