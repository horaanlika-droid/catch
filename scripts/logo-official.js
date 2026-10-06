// ══════════════════════════════════════════════════════════════════════════
// Официальный логотип из пресс-кита → scripts/logo-data.js
//
// Исходник: PRESS PACK → Logo → CATCH_22_main_black_full.pdf (вектор), сохранён
// как docs/brand/catch22-logo-official.svg (pdftocairo -svg). Скрипт берёт
// контуры букв, нормирует их к высоте 100 и пишет scripts/logo-data.js —
// дальше `node scripts/logo.js` собирает logo*.svg, mark.svg, favicon, icon.
//
//   node scripts/logo-official.js && node scripts/logo.js
// ══════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'docs/brand/catch22-logo-official.svg'), 'utf8');
const paths = [...src.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);

const nums = (d) => (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
const boxOf = (d) => {
  const n = nums(d);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const boxes = paths.map(boxOf);
const X0 = Math.min(...boxes.map((b) => b[0])), Y0 = Math.min(...boxes.map((b) => b[1]));
const Y1 = Math.max(...boxes.map((b) => b[3])), X1 = Math.max(...boxes.map((b) => b[2]));
const CAP = 100;
const k = CAP / (Y1 - Y0);
const r = (v) => Math.round(v * 100) / 100;

// все команды в исходнике абсолютные (M/L/C/Z) — достаточно пересчитать пары чисел
const norm = (d) => {
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (m) => String(r((Number(m) - (i++ % 2 === 0 ? X0 : Y0)) * k)))
    .replace(/\s+/g, ' ').replace(/ ?([MLCZ]) ?/g, '$1').trim();
};

// порядок слева направо: C A T C H 2 2
const glyphs = paths
  .map((d, i) => ({ d: norm(d), box: boxes[i].map((v, j) => r((v - (j % 2 === 0 ? X0 : Y0)) * k)) }))
  .sort((a, b) => a.box[0] - b.box[0]);

const out = `// ─────────────────────────────────────────────────────────────────────────────
// Геометрия логотипа CATCH 22 — официальный вектор из пресс-кита бара
// (PRESS PACK → Logo → CATCH_22_main_black_full.pdf → docs/brand/*.svg).
// Сгенерировано: node scripts/logo-official.js — руками не править.
// Нормировка: высота букв (cap) = ${CAP}, начало координат — левый верх «C».
// ─────────────────────────────────────────────────────────────────────────────
export const CAP = ${CAP};
export const WORDMARK_W = ${r((X1 - X0) * k)};
export const rings = [
${glyphs.map((g) => `  { box: ${JSON.stringify(g.box)}, d: ${JSON.stringify(g.d)} },`).join('\n')}
];
export const twos = rings.slice(-2);
`;
writeFileSync(join(ROOT, 'scripts/logo-data.js'), out);
console.log(`✓ scripts/logo-data.js — ${glyphs.length} глифов, ${r((X1 - X0) * k)}×${CAP}`);
