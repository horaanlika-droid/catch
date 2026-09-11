// ══════════════════════════════════════════════════════════════════════════
// Генератор фирменной графики CATCH 22 (v2.1 — знак с фото-референса).
//
// Логотип — векторная копия знака с референса: контуры сняты трассировкой
// docs/reference/IMG_1995.jpeg (кадр с логотипом в высоком качестве) и лежат
// в scripts/logo-data.js, поэтому «CATCH 22» в приложении повторяет оригинал:
//   «C» — залитый диск с замочной прорезью (винил + тонарм),
//   «A» — срезанная вершина и треугольная выемка снизу,
//   «T» — широкое навершие, толстая ножка,
//   «H» — блок с двумя узкими щелями,
//   «22» — купол, диагональ, плашка (он же — круглый знак в иконке).
//
//   node scripts/logo.js      → public/img/logo*.svg, mark.svg, favicon.svg,
//                               icon.svg + png-иконки (если доступен растеризатор)
//
// Переснять контуры с другого кадра: python3 scripts/trace-logo.py
// (он же проверяет качество `--check` и рисует png-иконки `--icons`
// без resvg/ImageMagick).
//
// Растеризация png (по порядку поиска): @resvg/resvg-js → ImageMagick с
// SVG-делегатом. Нужна только для иконок, svg не требует.
// ══════════════════════════════════════════════════════════════════════════
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

import { rings, twos, WORDMARK_W, CAP } from './logo-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img');

/* ── палитра референса ────────────────────────────────────────────────────── */
const ACCENT = '#c2664a';   // терракота (логотип, акценты)
const CREAM = '#f4ece1';    // светлый вариант (для тёмной подложки)
const INK = '#100e0d';      // фон/подложка знака
const RING = '#d9a45f';     // золотое кольцо в круглом знаке

const d = (list = rings) => list.map((r) => r.d).join('');

/** Слово «CATCH 22» одной дорожкой (evenodd даёт прорези и выемки) */
function wordmark(fill, { trim = 0 } = {}) {
  const W = WORDMARK_W - trim * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(W)} ${CAP}" width="${round(W * 2)}" height="${CAP * 2}" role="img" aria-label="CATCH 22">
  <title>CATCH 22 — listening bar &amp; bistro</title>
  <path fill="${fill}" fill-rule="evenodd" transform="translate(${-trim},0)" d="${d()}"/>
</svg>
`;
}

/**
 * Круглый знак «22» — как аватар в соцсетях бара: тёмный диск, золотое
 * кольцо, две «2» из того же шрифта, вторая чуть ниже (диагональный сдвиг).
 */
function mark({ size = 512, square = false, bg = INK, ring = RING, pad = 0.3, dx = -12, dy = 10 } = {}) {
  const bx = twos.map((t) => t.box);
  const x0 = Math.min(...bx.map((b) => b[0]));
  const x1 = Math.max(...bx.map((b) => b[2])) + dx; // вторую «2» подтягиваем влево
  const y0 = Math.min(...bx.map((b) => b[1]));
  const y1 = Math.max(...bx.map((b) => b[3])) + dy; // …и опускаем
  const w = x1 - x0;
  const h = y1 - y0;
  const s = (size * (1 - pad)) / Math.max(w, h);
  const tx = size / 2 - s * (x0 + w / 2);
  const ty = size / 2 - s * (y0 + h / 2);
  const inner = twos
    .map(
      (t, i) =>
        `<path fill="${ACCENT}" fill-rule="evenodd" transform="translate(${round(tx)},${round(ty)}) scale(${round(s)})${i ? ` translate(${dx},${dy})` : ''}" d="${t.d}"/>`,
    )
    .join('\n  ');
  const shape = square
    ? `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.223)}" fill="${bg}"/>`
    : `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${bg}"/>`;
  const ringEl = ring
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${round(size / 2 - size * 0.055)}" fill="none" stroke="${ring}" stroke-width="${round(size * 0.017)}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Catch 22">
  <title>Catch 22</title>
  ${shape}
  ${ringEl}
  ${inner}
</svg>
`;
}

const round = (v) => Math.round(v * 1000) / 1000;

/* ── запись svg ───────────────────────────────────────────────────────────── */
const files = {
  'logo.svg': wordmark(ACCENT, { trim: 0 }),
  'logo-light.svg': wordmark(CREAM, { trim: 0 }),
  'logo-dark.svg': wordmark(INK, { trim: 0 }),
  'mark.svg': mark({ size: 160, square: false, pad: 0.46 }),
  'favicon.svg': mark({ size: 64, square: true, pad: 0.46, ring: RING }),
  'icon.svg': mark({ size: 512, square: true, pad: 0.44, ring: RING }),
};
for (const [name, src] of Object.entries(files)) {
  writeFileSync(join(OUT, name), src);
  console.log('✓ public/img/' + name, `(${(src.length / 1024).toFixed(1)} kB)`);
}

/* ── png-иконки: растеризатор опционален ──────────────────────────────────── */
let done = false;
try {
  const require = createRequire(import.meta.url);
  const { Resvg } = require(process.env.RESVG || '@resvg/resvg-js');
  const png = (svg, out, height) => {
    const r = new Resvg(svg, { fitTo: { mode: 'height', value: height } });
    writeFileSync(out, r.render().asPng());
  };
  png(files['icon.svg'], join(OUT, 'icon.png'), 512);
  png(files['icon.svg'], join(OUT, 'apple-touch-icon.png'), 180);
  png(files['favicon.svg'], join(OUT, 'favicon.png'), 64);
  console.log('✓ public/img/icon.png, apple-touch-icon.png, favicon.png (resvg)');
  done = true;
} catch { /* нет resvg — пробуем ImageMagick */ }

if (!done) {
  try {
    execSync(`convert ${join(OUT, 'icon.svg')} -resize 512x512 ${join(OUT, 'icon.png')}`, { stdio: 'ignore' });
    execSync(`convert ${join(OUT, 'icon.svg')} -resize 180x180 ${join(OUT, 'apple-touch-icon.png')}`, { stdio: 'ignore' });
    execSync(`convert ${join(OUT, 'favicon.svg')} -resize 64x64 ${join(OUT, 'favicon.png')}`, { stdio: 'ignore' });
    console.log('✓ png-иконки через ImageMagick');
  } catch {
    console.warn('! png не обновлены: нужен @resvg/resvg-js или ImageMagick с SVG-делегатом (svg в порядке)');
  }
}
