#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════════════════
# Трассировка логотипа CATCH 22 с фото-референса (docs/reference/IMG_1995.jpeg).
#
# Фото содержит знак в высоком качестве: белый «CATCH 22» на чёрном. Скрипт
# снимает с него векторные контуры и пишет scripts/logo-data.js — источник
# данных для генератора `node scripts/logo.js` (logo.svg, mark.svg, favicon…).
#
# Пайплайн:
#   кроп строки «CATCH 22» → апскейл 6× (lanczos) → бинаризация 50% →
#   чистка мелких крапин → контуры (cv2.RETR_CCOMP) → сглаживание замкнутой
#   полилинии → поиск углов (излом < 138°) → интерполяция кубическими Безье
#   по методу Шнайдера (Graphics Gems, tol 1.2 px @6×) → нормировка к
#   cap = 100 → scripts/logo-data.js (совместим по формату с прежним файлом).
#
# Проверка качества:   python3 scripts/trace-logo.py --check
#   — растеризует снятые контуры обратно и считает IoU с исходной маской
#     (норма ≥ 0.98), печатает ASCII-превью для контроля на глаз.
#
# PNG-иконки:          python3 scripts/trace-logo.py --icons
#   — растеризует public/img/icon.svg и favicon.svg (те же файлы, что в
#     приложении) в icon.png / apple-touch-icon.png / favicon.png.
#     Альтернатива без Python: @resvg/resvg-js (см. scripts/logo.js).
#
# Зависимости (только для этого скрипта, приложению не нужны):
#   pip install pillow numpy opencv-python-headless
# ══════════════════════════════════════════════════════════════════════════
import argparse
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC_DEFAULT = ROOT / 'docs/reference/IMG_1995.jpeg'

# ── параметры пайплайна ─────────────────────────────────────────────────────
BAND = dict(x=155, y=159, w=603, h=85)   # кроп строки «CATCH 22» на референсе
UP = 6                                    # апскейл перед трассировкой
DESPECKLE = 40                            # мин. площадь связной области (px @6×)
SMOOTH_SIGMA = 1.35                       # сглаживание полилинии (px @6×)
RDP_EPS = 1.0                             # огрубление для поиска углов (px @6×)
CORNER_DEG = 138                          # внутренний угол ниже этого = излом
FIT_TOL = 1.2                             # допуск интерполяции Безье (px @6×)
CAP = 100                                 # высота буквы в единицах logo-data


# ── 1. битовая маска слова ──────────────────────────────────────────────────
def wordmark_mask(src):
    import cv2
    from PIL import Image

    im = Image.open(src).convert('L')
    a = np.asarray(im)
    crop = a[BAND['y']:BAND['y'] + BAND['h'], BAND['x']:BAND['x'] + BAND['w']]
    big = np.asarray(
        Image.fromarray(crop).resize((crop.shape[1] * UP, crop.shape[0] * UP), Image.LANCZOS)
    )
    mask = (big > 128).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    clean = np.zeros_like(mask)
    kept = 0
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= DESPECKLE:
            clean[lab == i] = 1
            kept += 1
    if kept != 7:
        print(f'! предупреждение: найдено букв {kept}, ожидалось 7', file=sys.stderr)
    cnts, hier = cv2.findContours(clean, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    hier = hier[0]
    groups = []
    for i, c in enumerate(cnts):
        if hier[i][3] == -1:  # внешний контур
            kids = [cnts[j] for j in range(len(cnts)) if hier[j][3] == i]
            groups.append((c, kids))
    groups.sort(key=lambda g: cv2.boundingRect(g[0])[0])
    return groups, clean


# ── 2. геометрия: сглаживание, углы, фиты ───────────────────────────────────
def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else np.array([1.0, 0.0])


def poly_smooth(pts, sigma=SMOOTH_SIGMA, passes=3):
    """циклическое гауссово сглаживание замкнутого контура"""
    k = 7
    ker = np.exp(-0.5 * ((np.arange(k) - (k - 1) / 2) / sigma) ** 2)
    ker /= ker.sum()
    p = pts.astype(float).copy()
    for _ in range(passes):
        ext = np.vstack([p[-(k // 2):], p, p[:k // 2]])
        for d in range(2):
            p[:, d] = np.convolve(ext[:, d], ker, mode='valid')
    return p


def rdp(pts, eps):
    import cv2
    poly = cv2.approxPolyDP(pts.reshape(-1, 1, 2).astype(np.float32), eps, True)
    return poly.reshape(-1, 2).astype(float)


def angle_at(poly, i):
    n = len(poly)
    a, b, c = poly[(i - 2) % n], poly[i], poly[(i + 2) % n]
    v1, v2 = a - b, c - b
    cos = np.dot(v1, v2) / np.sqrt(np.dot(v1, v1) * np.dot(v2, v2) + 1e-12)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))


def pick_corners(poly):
    """индексы вершин-изломов; близкие сливаются в самую острую"""
    n = len(poly)
    idx = [i for i in range(n) if angle_at(poly, i) < CORNER_DEG]
    if not idx:
        return [0]
    merged, used = [], [False] * len(idx)
    for k, i in enumerate(idx):
        if used[k]:
            continue
        cluster, used[k] = [i], True
        for m in range(k + 1, len(idx)):
            if idx[m] <= cluster[-1] + 2:
                cluster.append(idx[m])
                used[m] = True
            else:
                break
        merged.append(min(cluster, key=lambda q: angle_at(poly, q % n)))
    return sorted({m % n for m in merged})


def bez(p0, p1, p2, p3, t):
    mt = 1 - t
    return mt**3 * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t**3 * p3


def gen_bezier(pts, u, t1, t2):
    """МНК: p1 = p0 + a·t1, p2 = p3 + b·t2 (t2 направлен внутрь, к началу)"""
    p0, p3 = pts[0], pts[-1]
    a00 = a01 = a11 = x0 = x1 = 0.0
    td = float(np.dot(t1, t2))
    for i in range(len(pts)):
        ui = u[i]
        f, g = 3 * ui * (1 - ui) ** 2, 3 * ui * ui * (1 - ui)
        r = (
            pts[i]
            - ((1 - ui) ** 3 + 3 * ui * (1 - ui) ** 2) * p0
            - (ui**3 + 3 * ui * ui * (1 - ui)) * p3
        )
        a00 += f * f
        a01 += f * g * td
        a11 += g * g
        x0 += f * np.dot(r, t1)
        x1 += g * np.dot(r, t2)
    det = a00 * a11 - a01 * a01
    if abs(det) < 1e-9:
        return [p0, p0.copy(), p3.copy(), p3]
    al = (x0 * a11 - x1 * a01) / det
    be = (x1 * a00 - x0 * a01) / det
    return [p0, p0 + al * t1, p3 + be * t2, p3]


def reparam(pts, u, b):
    """Ньютоновская репараметризация u_i для лучшего прилегания"""
    p0, p1, p2, p3 = b
    for _ in range(4):
        for i in range(len(pts)):
            t = u[i]
            d = bez(p0, p1, p2, p3, t) - pts[i]
            d1 = 3 * (1 - t) ** 2 * (p1 - p0) + 6 * (1 - t) * t * (p2 - p1) + 3 * t**2 * (p3 - p2)
            den = 2 * np.dot(d1, d1)
            if den > 1e-9:
                u[i] = t - np.dot(d, d1) / den
        u = np.clip(u, 0, 1)
    return u


def maxerr(pts, u, b):
    e, idx = 0.0, 0
    for i in range(len(pts)):
        d = np.linalg.norm(bez(*b, u[i]) - pts[i])
        if d > e:
            e, idx = d, i
    return e, idx


def chord_params(pts):
    d = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    u = np.concatenate([[0], np.cumsum(d)])
    return u / u[-1] if u[-1] > 0 else np.linspace(0, 1, len(pts))


def fit_run(pts, t1, t2, tol, depth=0):
    """цепочка ('L'|'C', value) от pts[0] до pts[-1]"""
    if len(pts) <= 2:
        return [('L', pts[-1])]
    chord_v = pts[-1] - pts[0]
    length = np.linalg.norm(chord_v)
    if length > 1e-9:
        rel = pts[1:-1] - pts[0]
        dev = np.max(np.abs(chord_v[0] * rel[:, 1] - chord_v[1] * rel[:, 0])) / length
        if dev <= tol and np.dot(chord_v, t1) > 0 and np.dot(-chord_v, t2) > 0:
            return [('L', pts[-1])]
    u = chord_params(pts)
    b = gen_bezier(pts, u, t1, t2)
    u = reparam(pts, u, b)
    e, idx = maxerr(pts, u, b)
    if e <= tol or depth > 14 or len(pts) < 4:
        return [('C', b)]
    v = unit(pts[min(idx + 1, len(pts) - 1)] - pts[max(idx - 1, 0)])
    return fit_run(pts[: idx + 1], t1, -v, tol, depth + 1) + fit_run(pts[idx:], v, t2, tol, depth + 1)


def contour_parts(cnt):
    """замкнутый контур → [(kind, value)], начинается с 'M' в первом изломе"""
    raw = cnt.reshape(-1, 2).astype(float)
    sm = poly_smooth(raw)
    poly = rdp(sm, RDP_EPS)
    corners = pick_corners(poly)
    n = len(sm)
    pos = []
    for q in corners:
        pos.append(int(np.argmin(np.linalg.norm(sm - poly[q], axis=1))))
    pos = sorted(set(pos))
    parts = [('M', sm[pos[0]].copy())]
    for k in range(len(pos)):
        i0, i1 = pos[k], pos[(k + 1) % len(pos)]
        run = np.vstack([sm[i0:], sm[: i1 + 1]]) if i1 <= i0 else sm[i0 : i1 + 1]
        t1 = unit(sm[(i0 + 1) % n] - sm[(i0 - 1) % n])
        t2 = unit(sm[(i1 - 1) % n] - sm[(i1 + 1) % n])
        parts.extend(fit_run(run, t1, t2, FIT_TOL))
    return parts


# ── 3. нормировка и запись logo-data.js ─────────────────────────────────────
def fmt(v):
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


def path_d(parts, scale, ox, oy):
    out = []
    for kind, val in parts:
        if kind == 'M':
            out.append(f'M{fmt(val[0] * scale + ox)},{fmt(val[1] * scale + oy)}')
        elif kind == 'L':
            out.append(f'L{fmt(val[0] * scale + ox)},{fmt(val[1] * scale + oy)}')
        else:  # 'C'
            p0, c1, c2, p3 = val
            out.append(
                f'C{fmt(c1[0] * scale + ox)},{fmt(c1[1] * scale + oy)}'
                f' {fmt(c2[0] * scale + ox)},{fmt(c2[1] * scale + oy)}'
                f' {fmt(p3[0] * scale + ox)},{fmt(p3[1] * scale + oy)}'
            )
    return ''.join(out) + 'Z'


def trace(src):
    import cv2

    groups, mask = wordmark_mask(src)
    letters = []
    for c, kids in groups:
        letters.append([contour_parts(c)] + [contour_parts(k) for k in kids])
    # нормировка: cap → 100, первая буква → x=0, верх букв → y=0
    boxes = [cv2.boundingRect(c) for c, _ in groups]
    kid_boxes = [[cv2.boundingRect(k) for k in kids] for _, kids in groups]
    y0 = min(b[1] for b in boxes)
    y1 = max(b[1] + b[3] for b in boxes)
    x0 = min(b[0] for b in boxes)
    scale = CAP / (y1 - y0)
    rings = []
    for ls, b, kbs in zip(letters, boxes, kid_boxes):
        bx0 = min([b[0]] + [kb[0] for kb in kbs])
        bx1 = max([b[0] + b[2]] + [kb[0] + kb[2] for kb in kbs])
        by0 = min([b[1]] + [kb[1] for kb in kbs])
        by1 = max([b[1] + b[3]] + [kb[1] + kb[3] for kb in kbs])
        d = ''.join(path_d(p, scale, -x0 * scale, -y0 * scale) for p in ls)
        rings.append(
            dict(
                box=[
                    round((bx0 - x0) * scale, 1),
                    round((by0 - y0) * scale, 1),
                    round((bx1 - x0) * scale, 1),
                    round((by1 - y0) * scale, 1),
                ],
                d=d,
            )
        )
    wordmark_w = round((max(b[0] + b[2] for b in boxes) - x0) * scale, 1)
    return rings, wordmark_w, mask, letters


def write_logo_data(rings, wordmark_w):
    letters = 'CATCH22'
    lines = []
    for ch, r in zip(letters, rings):
        lines.append(f"  {{ box: [{', '.join(fmt(v) for v in r['box'])}], d: '{r['d']}' }},  // {ch}")
    body = '\n'.join(lines)
    out = f'''// ─────────────────────────────────────────────────────────────────────────────
// Геометрия фирменного логотипа CATCH 22 — один в один с референсом.
//
// Контуры сняты с docs/reference/IMG_1995.jpeg (белый «CATCH 22» на чёрном,
// 595×77 px): кроп строки → 6× lanczos → бинаризация 50% → контуры →
// сглаживание → изломы (<138°) → кубические Безье (метод Шнайдера) →
// нормировка к cap = 100. Пайплайн целиком: scripts/trace-logo.py
// (`--check` — контроль качества по IoU, `--icons` — png-иконки).
//
// Кольца идут слева направо: C A T C H 2 2. Прорезь «C», выемка «A» и щели
// «H» — части внешнего контура, поэтому заливаем fill-rule="evenodd".
// «22» (последние два кольца) используется и в круглом знаке — иконке.
// ─────────────────────────────────────────────────────────────────────────────
export const CAP = {CAP};
export const WORDMARK_W = {fmt(wordmark_w)};
export const rings = [
{body}
];

// «22» — те же два последних кольца, для круглого знака (иконка приложения)
export const twos = rings.slice(-2);
'''
    (ROOT / 'scripts' / 'logo-data.js').write_text(out, encoding='utf-8')
    return out


# ── 4. контроль качества: IoU + ASCII-превью ────────────────────────────────
def flatten(parts, seg=24):
    polys, cur, pos = [], None, None
    for kind, val in parts:
        if kind == 'M':
            if cur and len(cur) > 2:
                polys.append(np.array(cur))
            pos = np.array(val, float)
            cur = [pos.copy()]
        elif kind == 'L':
            pos = np.array(val, float)
            cur.append(pos.copy())
        else:
            c1, c2, p3 = [np.array(x, float) for x in val[1:4]]
            for i in range(1, seg + 1):
                t = i / seg
                mt = 1 - t
                cur.append(mt**3 * pos + 3 * mt * mt * t * c1 + 3 * mt * t * t * c2 + t**3 * p3)
            pos = p3
    if cur and len(cur) > 2:
        polys.append(np.array(cur))
    return polys


def render_letters(letters, shape):
    from PIL import Image, ImageDraw

    out = np.zeros(shape, np.uint8)
    for letter in letters:
        acc = None
        for parts in letter:
            m = Image.new('L', (shape[1], shape[0]), 0)
            d = ImageDraw.Draw(m)
            for poly in flatten(parts):
                d.polygon([tuple(p) for p in poly], fill=255)
            a = np.asarray(m)
            acc = a if acc is None else acc ^ a  # evenodd
        out |= acc
    return out > 127


def check(mask, letters):
    rendered = render_letters(letters, mask.shape)
    src = mask > 0
    iou = (rendered & src).sum() / (rendered | src).sum()
    print(f'IoU с исходной маской: {iou:.4f} (норма ≥ 0.98)')
    segs = sum(sum(1 for k, _ in p if k != 'M') for ls in letters for p in ls)
    print(f'сегментов Безье/линий: {segs}')

    def pool(a, w=110):
        h0, w0 = a.shape
        sy = max(1, h0 * 2 // 26)
        sx = max(1, round(w0 / w))
        hh, ww = h0 // sy, w0 // sx
        return a[: hh * sy, : ww * sx].reshape(hh, sy, ww, sx).any(axis=(1, 3))

    pr, pm = pool(rendered), pool(src)
    print('превью (# = совпало, + = лишнее у трассы, . = пропущено):')
    for ra, ma in zip(pr, pm):
        print(''.join('#' if (ra and ma) else ('+' if ra else ('.' if ma else ' ')) for ra, ma in zip(ra, ma)))
    if iou < 0.98:
        print('! IoU ниже нормы — проверьте параметры', file=sys.stderr)
        sys.exit(1)


# ── 5. растеризация svg-иконок (диалект scripts/logo.js) ────────────────────
NUM = r'-?\d+(?:\.\d+)?'
HEX = lambda s: tuple(int(s.lstrip('#')[i : i + 2], 16) for i in (0, 2, 4))  # noqa: E731


def parse_path(d):
    """«M…L…C…Z» → список замкнутых полилиний"""
    tokens = re.findall(r'[MLCZ]|' + NUM, d.replace(',', ' '))
    polys, cur, pos = [], [], None
    i = 0

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        t = tokens[i]
        i += 1
        if t == 'M':
            if cur:
                polys.append(cur)
            pos = np.array([num(), num()])
            cur = [pos.copy()]
        elif t == 'L':
            pos = np.array([num(), num()])
            cur.append(pos.copy())
        elif t == 'C':
            c1 = np.array([num(), num()])
            c2 = np.array([num(), num()])
            p3 = np.array([num(), num()])
            for k in range(1, 25):
                tt = k / 24
                mt = 1 - tt
                cur.append(mt**3 * pos + 3 * mt * mt * tt * c1 + 3 * mt * tt * tt * c2 + tt**3 * p3)
            pos = p3
        elif t == 'Z' and cur:
            polys.append(cur)
            cur = []
    if cur:
        polys.append(cur)
    return polys


def parse_transform(s):
    """translate(tx,ty) scale(s) translate(dx,dy) → матрица аффинного преобразования

    Возвращает (a, b, c, d, e, f): x' = a·x + c·y + e, y' = b·x + d·y + f
    (диалект генератора: сначала позиционный translate, затем scale,
    затем сдвиг в координатах пути — у второй «2» в круглом знаке).
    """
    a, d = 1.0, 1.0
    e = f = 0.0  # noqa: E741
    seen_scale = False
    dx = dy = 0.0
    for name, argstr in re.findall(r'(translate|scale)\(([^)]*)\)', s):
        args = [float(v) for v in re.findall(NUM, argstr)]
        if name == 'translate' and not seen_scale:
            e, f = args[0], args[1] if len(args) > 1 else 0
        elif name == 'translate':
            dx, dy = args[0], args[1] if len(args) > 1 else 0
        else:
            a = d = args[0]
            seen_scale = True
    return a, 0.0, 0.0, d, e + a * dx, f + d * dy


def rasterize_svg(svg_path, size, ss=4):
    """png-иконка из svg генератора (rect / circle / path, fill | stroke)"""
    from PIL import Image, ImageDraw

    text = Path(svg_path).read_text(encoding='utf-8')
    W = size * ss
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    # масштаб viewBox → холст (иконки генератора квадратные)
    vb = re.search(r'viewBox="([\d.\s-]+)"', text)
    k = W / float(vb.group(1).split()[2]) if vb else 1.0

    for m in re.finditer(r'<(rect|circle|path)\b([^>]*)/?>', text):
        tag, attrs_s = m.group(1), m.group(2)
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', attrs_s))
        a, _, _, d_, e, f_ = parse_transform(attrs.get('transform', ''))
        a, d_, e, f_ = a * k, d_ * k, e * k, f_ * k  # noqa: E741

        def pt(x, y):
            return (a * x + e, d_ * y + f_)

        layer = Image.new('L', (W, W), 0)
        dr = ImageDraw.Draw(layer)
        fill = attrs.get('fill', '#000000')
        stroke = attrs.get('stroke')
        if tag == 'rect':
            x, y = pt(float(attrs.get('x', 0)), float(attrs.get('y', 0)))
            w_, h_ = float(attrs['width']) * a, float(attrs['height']) * d_
            dr.rounded_rectangle([x, y, x + w_, y + h_], radius=float(attrs.get('rx', 0)) * a, fill=255)
        elif tag == 'circle':
            cx, cy = pt(float(attrs['cx']), float(attrs['cy']))
            r = float(attrs['r']) * a
            if fill == 'none':
                w = max(1, round(float(attrs.get('stroke-width', 1)) * a))
                dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=255, width=w)
            else:
                dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        else:  # path
            acc = None
            for poly in parse_path(attrs['d']):
                pm = Image.new('L', (W, W), 0)
                ImageDraw.Draw(pm).polygon([pt(p[0], p[1]) for p in poly], fill=255)
                a2 = np.asarray(pm)
                acc = a2 if acc is None else acc ^ a2  # fill-rule="evenodd"
            if acc is not None:
                layer = Image.fromarray(acc)
        rgb = HEX(stroke if fill == 'none' and stroke else fill)
        img.paste(Image.new('RGBA', (W, W), rgb + (255,)), (0, 0), layer)
    return img.resize((size, size), Image.LANCZOS)


def icons():
    img_dir = ROOT / 'public' / 'img'
    jobs = [
        ('icon.svg', 'icon.png', 512),
        ('icon.svg', 'apple-touch-icon.png', 180),
        ('favicon.svg', 'favicon.png', 64),
    ]
    for src, dst, size in jobs:
        rasterize_svg(img_dir / src, size).save(img_dir / dst)
        print(f'✓ public/img/{dst} ({size}×{size})')


# ── cli ─────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--src', default=str(SRC_DEFAULT), help='референс с логотипом')
    ap.add_argument('--check', action='store_true', help='IoU + ASCII-превью после трассировки')
    ap.add_argument('--icons', action='store_true', help='растеризовать png-иконки из готовых svg')
    ap.add_argument('--dry-run', action='store_true', help='не писать logo-data.js')
    args = ap.parse_args()

    if args.icons:
        icons()
        return

    rings, wordmark_w, mask, letters = trace(args.src)
    if not args.dry_run:
        out = write_logo_data(rings, wordmark_w)
        print(f'✓ scripts/logo-data.js ({len(out) / 1024:.1f} kB, {len(rings)} букв)')
    if args.check:
        check(mask, letters)


if __name__ == '__main__':
    main()
