/* ══════════════════════════════════════════════════════════════════════════
   CATCH 22 · клиент 2.0 — тёмный стиль по референсу (docs/reference).
   Всё, что видно в приложении, живёт в состоянии стора и обновляется
   админ-ботом: правка → rev++ → SSE → мгновенный ре-рендер.
   ══════════════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const CFG = Object.assign({ apiBase: '' }, window.CATCH_CONFIG || {});
const TG = window.Telegram?.WebApp;
if (TG) { try { TG.ready(); TG.expand(); } catch {} }

const apiBase = (CFG.apiBase || '').replace(/\/+$/, '');
const sameOriginAPI = !apiBase && !(location.hostname.endsWith('github.io') || location.protocol === 'file:');

/* ── состояние ── */
const storedLanguage = (() => { try { return localStorage.getItem('catch22-language'); } catch { return ''; } })();
const S = {
  data: null, tab: 'home', sub: '', menuCat: 0, q: '', live: false, lastRev: 0,
  lang: storedLanguage === 'en' ? 'en' : 'ru',
};
const I18N = window.CATCH_I18N || {};

/* ── утилиты ── */
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = (value) => {
  if (S.lang !== 'en' || value == null) return String(value ?? '');
  const raw = String(value);
  if (Object.prototype.hasOwnProperty.call(I18N.text || {}, raw)) return I18N.text[raw];
  return raw
    .replace(/б\/а/giu, 'non-alcoholic')
    .replace(/мл/giu, 'ml')
    .replace(/[\p{Script=Cyrillic}]+/gu, (word) => {
      const translated = I18N.words?.[word.toLocaleLowerCase('ru')];
      if (!translated) return word;
      if (word === word.toLocaleUpperCase('ru')) return translated.toLocaleUpperCase('en-US');
      if (word[0] === word[0].toLocaleUpperCase('ru')) return translated[0].toLocaleUpperCase('en-US') + translated.slice(1);
      return translated;
    });
};
const api = (p) => (apiBase || '') + p;

const ICONS = {
  house: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  cutlery: '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v6m4-6v6M17 3c-1.6 1.2-2.5 3.2-2.5 5.5 0 2 .9 3.2 2.5 3.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  cal: '<rect x="4" y="5.5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  grid: '<path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  close: '<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  back: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  book: '<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 8h6M8 11.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  users: '<circle cx="9" cy="8.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 20c.6-3.4 2.7-5 5.5-5s4.9 1.6 5.5 5M16 5.6a3.1 3.1 0 0 1 0 6M18 20c-.3-2-1-3.5-2.1-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  share: '<circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="17.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.2 10.9 7.1-3.3M8.2 13.1l7.1 3.3" stroke="currentColor" stroke-width="1.8"/>',
  chev: '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  disc: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  wave: '<path d="M4 12v-2m3.2 6V8M10.4 16.5v-9M13.6 15V9M16.8 16.5v-9M20 12v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  star: '<path d="m12 4 2.3 4.9 5.2.7-3.8 3.7 1 5.3L12 16.1 7.3 18.6l1-5.3-3.8-3.7 5.2-.7L12 4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  brief: '<rect x="3.5" y="7" width="17" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 7V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6V7" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  stop: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m7.5 16.5 9-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  speaker: '<rect x="4.5" y="3.5" width="15" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="15.5" r="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  cocktail: '<path d="M4 5h16l-6.2 7.1v5.4l3.2 1.8v1.2H7v-1.2l3.2-1.8v-5.4L4 5zM7.5 9h9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m16 3 4-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  wine: '<path d="M7 3h10v5a5 5 0 0 1-10 0V3zM12 13v6m-4 2h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 8h9" stroke="currentColor" stroke-width="1.5"/>',
  trophy: '<path d="M8 4h8v4.5a4 4 0 0 1-8 0V4zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 12.5V18m-4 3h8m-6-3h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  sofa: '<path d="M5 12V8a2.5 2.5 0 0 1 5 0v3h4V8a2.5 2.5 0 0 1 5 0v4a2 2 0 0 1 2 2v5H3v-5a2 2 0 0 1 2-2zM3 16h18M6 19v2m12-2v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  bottle: '<path d="M9 3h6m-5 0v4l-2 2v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9l-2-2V3M8 12h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  spark: '<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
};
const svg = (n, w = 24) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true">${ICONS[n] || ''}</svg>`;
function categoryIcon(cat) {
  const key = `${cat?.id || ''} ${cat?.title || ''}`.toLowerCase();
  if (/food|еда/.test(key)) return 'cutlery';
  if (/bar|коктей|бар/.test(key)) return 'cocktail';
  if (/spirit|крепк/.test(key)) return 'bottle';
  if (/wine|вин/.test(key)) return 'wine';
  return 'disc';
}
function infographicIcon(a, index) {
  const key = `${a?.title || ''} ${a?.text || ''}`.toLowerCase();
  if (/where2drink|award|прем|открытие года/.test(key)) return 'trophy';
  if (/tannoy|звук|акуст|sound/.test(key)) return 'speaker';
  if (/фонотек|vinyl|винил|record/.test(key)) return 'disc';
  if (/коктейл|cocktail|бар/.test(key)) return 'cocktail';
  if (/wine|вино/.test(key)) return 'wine';
  if (/studio|cache|интерьер|interior/.test(key)) return 'sofa';
  return ['disc', 'speaker', 'cocktail', 'wine', 'sofa', 'spark'][index % 6];
}
function renderInfographic(items = []) {
  const box = el('div', 'infographic card');
  items.forEach((a, index) => {
    const item = el('article', 'infographic-item');
    const count = String(index + 1).padStart(2, '0');
    item.innerHTML = `<span class="infographic-index">${count}</span><span class="infographic-symbol">${svg(infographicIcon(a, index), 21)}</span>` +
      `<span class="infographic-copy"><span class="t">${esc(L(a.title || ''))}</span><span class="d">${esc(L(a.text || ''))}</span></span>`;
    box.appendChild(item);
  });
  return box;
}

function haptic(kind = 'light') {
  try {
    if (TG?.HapticFeedback) {
      if (kind === 'success') TG.HapticFeedback.notificationOccurred('success');
      else TG.HapticFeedback.impactOccurred(kind === 'heavy' ? 'heavy' : 'light');
    } else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 18 : 8);
  } catch {}
}

const mediaUrl = (src) => {
  if (!src) return '';
  if (/^https?:/.test(src) || src.startsWith('/img/')) return src;
  return api(src.startsWith('/') ? src : '/' + src);
};

/* ── данные: live API → статический снапшот ── */
async function loadData(showToast) {
  let next = null;
  if (sameOriginAPI || apiBase) {
    try {
      const r = await fetch(api('/api/state'), { headers: { 'If-None-Match': S.data ? `W/"${S.lastRev}"` : '' } });
      if (r.status === 304) return { changed: false };
      if (r.ok) { next = await r.json(); S.live = true; }
    } catch { S.live = false; }
  }
  if (!next) {
    try {
      const r = await fetch('data.json');
      next = await r.json();
    } catch { return { changed: false, error: true }; }
  }
  const changed = !S.data || next.rev !== S.lastRev || next.updatedAt !== S.data.updatedAt;
  S.lastRev = next.rev || 0;
  S.data = next;
  applyMeta(next);
  if (changed && S.tab) render();
  if (changed && showToast) {
    toast(L('Данные обновлены'));
    document.body.classList.add('live-flash');
    setTimeout(() => document.body.classList.remove('live-flash'), 900);
  }
  return { changed };
}

/** шапка/таббар/тайтл — тоже из данных, чтобы бар мог переименовать что угодно */
function applyMeta(d) {
  if (!d?.meta) return;
  const c = copy(d);
  document.documentElement.lang = S.lang;
  document.body.classList.toggle('menu-view', S.tab === 'menu');
  // фон-подложка приложения = фото главной (ставится ботом)
  const bg = mediaUrl(d.meta.hero?.image || d.gallery?.[0]?.image || d.gallery?.[0]?.src || '');
  document.body.style.setProperty('--hero-bg', bg ? `url("${bg}")` : 'none');
  const sub = $('#hdr-sub');
  if (sub) sub.textContent = L(d.meta.sub || '');
  const boot = $('#boot-sub');
  if (boot) boot.textContent = L(d.meta.sub || '');
  const vt = viewTitle(d);
  const brandSub = L(d.meta.sub || 'фонотека + бар');
  document.title = vt ? `${vt} · ${d.meta.name || 'CATCH 22'}` : `${d.meta.name || 'CATCH 22'} — ${brandSub}`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = S.lang === 'en'
    ? 'CATCH 22 listening bar and record library at 86 Fontanka Embankment, Saint Petersburg. Vinyl, cocktails, comfort food, events and bookings.'
    : 'CATCH 22 — фонотека + бар на наб. Фонтанки, 86. Винил, коктейли, comfort food. Меню, афиша, бронирование.';
  const tabs = { home: c.tabHome, menu: c.tabMenu, events: c.tabEvents, team: c.tabTeam, more: c.tabMore };
  document.querySelectorAll('#tabbar button').forEach((b) => {
    const lbl = tabs[b.dataset.tab];
    if (lbl) b.querySelector('span').textContent = lbl;
  });
  const lang = $('#lang-btn');
  if (lang) {
    lang.textContent = S.lang === 'en' ? 'RU' : 'EN';
    lang.title = S.lang === 'en' ? 'Switch to Russian' : 'Switch to English';
    lang.setAttribute('aria-label', lang.title);
  }
  $('#nav-btn')?.setAttribute('aria-label', L('Меню'));
  $('#back-btn')?.setAttribute('aria-label', L('Назад'));
}

function startLive() {
  if (!S.live) return;
  let es;
  try {
    es = new EventSource(api('/api/events'));
    es.addEventListener('rev', (e) => {
      try { const d = JSON.parse(e.data); if (d.rev && d.rev !== S.lastRev) loadData(true); } catch {}
    });
    es.onerror = () => { es.close(); poll(); };
  } catch { poll(); }
  let timer;
  function poll() { timer = setInterval(() => loadData(false), 15000); }
}

/* ── тосты ── */
function toast(txt) {
  const t = el('div', 'toast', esc(txt));
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ── лист (sheet) ── */
let sheetCleanup = null;
function openSheet(title, content, { onClose, logo = true } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = '';
  const scrim = el('div', 'scrim');
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('div', 'grab'));
  if (logo) sheet.appendChild(el('div', 'logo-line', '<img src="img/logo.svg" alt="CATCH 22">'));
  const close = el('button', 'x', svg('close', 14));
  sheet.appendChild(close);
  if (title) sheet.appendChild(el('h3', null, esc(title)));
  sheet.appendChild(content);
  root.append(scrim, sheet);
  requestAnimationFrame(() => root.classList.add('open'));
  const shut = () => {
    root.classList.remove('open');
    sheetCleanup?.();
    setTimeout(() => { root.innerHTML = ''; }, 380);
    onClose?.();
    if (TG?.BackButton) TG.BackButton.offClick(shut);
  };
  scrim.onclick = () => { haptic(); shut(); };
  close.onclick = () => { haptic(); shut(); };
  if (TG?.BackButton) { TG.BackButton.show(); TG.BackButton.onClick(shut); }
  sheetCleanup = shut;
  return { sheet, close: shut };
}

/* ── конструктор форм ── */
function formSheet(title, fields, submitLabel, onSubmit) {
  const wrap = el('div');
  const form = el('form', 'stack');
  const inputs = {};
  for (const f of fields) {
    if (f.type === 'note') { wrap.appendChild(el('p', 'hint', esc(L(f.text)))); continue; }
    const fd = el('div', 'field');
    fd.appendChild(el('label', null, esc(L(f.label))));
    let input;
    if (f.type === 'select') {
      input = el('select');
      for (const o of f.options) input.appendChild(el('option', null, esc(L(o))));
    } else if (f.type === 'textarea') {
      input = el('textarea');
      if (f.placeholder) input.placeholder = L(f.placeholder);
    } else if (f.type === 'stepper') {
      input = (() => {
        const box = el('div', 'stepper');
        let v = f.value ?? 2;
        const lbl = el('div', 'v', String(f.suffix ? `${v} ${L(f.suffix)}` : v));
        const mk = (d, t) => { const b = el('button', null, t); b.type = 'button'; b.onclick = () => { v = Math.max(f.min ?? 1, Math.min(f.max ?? 20, v + d)); lbl.textContent = f.suffix ? v + ' ' + L(f.suffix) : v; haptic(); }; return b; };
        box.append(mk(-1, '−'), lbl, mk(1, '+'));
        return { box, get value() { return String(v); } };
      })();
    } else if (f.type === 'slots') {
      input = (() => {
        const box = el('div', 'slots');
        let sel = f.value || f.options[0];
        f.options.forEach((o, i) => {
          const b = el('button', 'slot' + (i === 0 ? ' on' : ''), esc(L(o)));
          b.type = 'button';
          b.onclick = () => { box.querySelectorAll('.slot').forEach((x) => x.classList.remove('on')); b.classList.add('on'); sel = o; haptic(); };
          box.appendChild(b);
        });
        return { box, get value() { return sel; } };
      })();
    } else {
      input = el('input');
      input.type = f.type || 'text';
      if (f.placeholder) input.placeholder = L(f.placeholder);
      if (f.required) input.required = true;
      if (f.min) input.min = f.min;
      if (f.inputmode) input.inputMode = f.inputmode;
      if (f.autocomplete) input.autocomplete = f.autocomplete;
    }
    inputs[f.name] = input;
    fd.appendChild(input.box || input);
    form.appendChild(fd);
  }
  const btn = el('button', 'btn', esc(L(submitLabel)) + `<span class="tail">${svg('arrow', 14)}</span>`);
  btn.type = 'submit';
  form.appendChild(btn);
  wrap.appendChild(form);

  form.onsubmit = async (e) => {
    e.preventDefault();
    haptic('heavy');
    btn.setAttribute('disabled', '');
    const values = {};
    for (const [k, v] of Object.entries(inputs)) values[k] = (v.value ?? '').toString().trim();
    let ok;
    try { ok = await onSubmit(values); } catch { ok = false; }
    btn.removeAttribute('disabled');
    if (ok === false) { toast(L('Не вышло — попробуй ещё раз')); return; }
    wrap.innerHTML = '';
    const s = el('div', 'success');
    s.appendChild(el('div', 'ring', svg('check', 44)));
    s.appendChild(el('div', null, `<b>${esc(L('Заявка отправлена'))}</b>`));
    s.appendChild(el('p', null, esc(L(typeof ok === 'string' ? ok : 'Мы свяжемся с вами в ближайшее время'))));
    wrap.appendChild(s);
  };
  return wrap;
}

/* отправка заявки: API → фолбэк через бота */
async function sendRequest(type, fields, contact) {
  const payload = JSON.stringify({ type, fields, contact });
  try {
    const r = await fetch(api('/api/request'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
    const j = await r.json();
    if (j.ok) return true;
    if (r.status === 429) { toast(L('Подожди минутку')); return false; }
  } catch {}
  const bot = S.data?.meta?.bot;
  if (bot) {
    const text = `[${type}] ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('; ')}${contact ? ` · ${contact}` : ''}`;
    const link = `https://t.me/${bot}?text=${encodeURIComponent(text)}`;
    if (TG?.openTelegramLink) TG.openTelegramLink(link); else location.href = link;
    return true;
  }
  return false;
}

/* ── вычисление «открыто сейчас» ── */
const DAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
function todayStatus(hours) {
  const now = new Date();
  const day = DAY_RU[now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  let open = null; let rowTxt = '—';
  for (const h of hours || []) {
    const days = (h.days || '');
    if (!(days.includes(day) || /кажд|every|ежедн/i.test(days))) continue;
    rowTxt = `${L(h.days)} · ${L(h.time)}`;
    if (h.closed) { open = false; break; }
    const m = (h.time || '').match(/(\d{1,2}):(\d{2})\s*[–\-—]\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;
    let from = +m[1] * 60 + +m[2];
    let to = +m[3] * 60 + +m[4];
    if (to <= from) to += 24 * 60;
    open = mins >= from && mins < to;
    break;
  }
  return { open, rowTxt };
}

/* ── тексты интерфейса: значения шлёт сервер (state.copy, правится ботом),
   здесь только запасной вариант для офлайна/старого снапшота ── */
const COPY_DEFAULT = {
  tabHome: 'Главная', tabMenu: 'Меню', tabEvents: 'Афиша', tabTeam: 'Команда', tabMore: 'Ещё',
  titleMenu: 'МЕНЮ', titleEvents: 'АФИША', titleTeam: 'КОМАНДА', titleMore: 'ПРОФИЛЬ',
  titleBooking: 'БРОНИРОВАНИЕ', titleContacts: 'КОНТАКТЫ', titleJobs: 'РАБОТА',
  ctaBooking: 'Забронировать стол', ctaContacts: 'Написать в Telegram',
  ctaJobs: 'Отправить анкету', ctaGallery: 'Смотреть фото',
  ctaSite: 'Открыть сайт', ctaInstagram: 'Мы в Instagram',
  eventsSub: 'Винил, сессии и гости за пультом',
  teamSub: 'Люди, которые делают Catch 22',
  teamNote: 'Раздел в работе — добавим фото и имена команды.',
  aboutCard: 'О нас',
  tonight: 'Этим вечером',
  stopTitle: 'Сегодня не продаём',
  hoursTitle: 'Часы работы',
  socialsTitle: 'Мы на связи',
  awardsTitle: 'За что нас любят',
  galleryTitle: 'Галерея',
  jobsCard: 'Стань частью команды',
};
function copy(d) {
  const c = Object.assign({}, COPY_DEFAULT, d?.copy || {});
  if (S.lang === 'en') {
    for (const [key, value] of Object.entries(I18N.copy || {})) c[key] = value;
    for (const key of Object.keys(c)) c[key] = L(c[key]);
  }
  return c;
}

/* ── переиспользуемые куски ── */
function imgBox(cls, src, styleExtra = '') {
  const d = el('div', cls, '');
  const url = mediaUrl(src);
  if (!url) d.classList.add('on', 'empty');
  if (url) {
    d.style.backgroundImage = `url("${url}")`;
    const probe = new Image();
    probe.onload = () => { d.classList.add('on'); d.parentElement?.classList.add('done'); };
    probe.src = url;
  }
  if (styleExtra) d.setAttribute('style', (d.getAttribute('style') || '') + styleExtra);
  return d;
}
function socialIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('inst')) return 'inst';
  if (n.includes('tele') || n === 'tg') return 'tg';
  if (n.includes('vk')) return 'vk';
  if (n.includes('you') || n.includes('tube')) return 'web';
  if (n.includes('wa')) return 'phone';
  return 'web';
}
ICONS.inst = '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.2"/>';
ICONS.tg = '<path d="M21 4.5 2.8 11.6l6.2 2 1.9 6 2.5-3.7 4.8 3.6L21 4.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m9 13.6 9.2-7-6.6 7.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>';
ICONS.web = '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 9.6h16.4M3.8 14.4h16.4M12 3.6c2.4 2.3 3.6 5.2 3.6 8.4s-1.2 6.1-3.6 8.4c-2.4-2.3-3.6-5.2-3.6-8.4S9.6 5.9 12 3.6z" fill="none" stroke="currentColor" stroke-width="1.7"/>';
ICONS.vk = '<path d="M3.5 7.5c.9 5 4 9.7 8.9 9.7h1.3l-1.9-3.6c2.7.9 4.6 3 5.3 4.7H21c-.7-2.3-2.3-4.2-4.3-5.3 1.8-1.2 3.3-3 4-5.2h-3.1c-.8 2-2.2 3.5-3.9 4.4V7.5H9.9c.2 1.8-.1 4-1.2 5.5-1-1.6-2.4-3.9-3-5.5H3.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>';

/** заголовок в шапке: на подстраницах — с кнопкой «назад» */
function viewTitle(d) {
  const c = copy(d);
  return { home: '', menu: c.titleMenu, events: c.titleEvents, team: c.titleTeam, more: c.titleMore, booking: c.titleBooking, contacts: c.titleContacts, jobs: c.titleJobs }[S.tab] || '';
}

/* ────────────────── навигация ────────────────── */
const VIEWS = ['home', 'menu', 'events', 'team', 'more'];
function setTab(tab, opts = {}) {
  S.tab = tab;
  S.sub = opts.sub || '';
  const isSub = !VIEWS.includes(tab);
  $('#hdr').classList.toggle('sub', isSub);
  $('#back-btn').hidden = !isSub;
  $('#nav-btn').hidden = isSub;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (isSub ? parentOf(tab) : tab)));
  location.hash = '#/' + tab + (S.sub ? '/' + S.sub : '');
  render(opts.animate === false ? false : true);
  if (!opts.keepScroll) window.scrollTo({ top: 0 });
  haptic('light');
}
const parentOf = (tab) => ({ booking: 'home', contacts: 'more', jobs: 'more', team: 'team' }[tab] || tab);

function render(animate = true) {
  if (!S.data) return;
  const view = $('#view');
  const builders = { home: vHome, menu: vMenu, events: vEvents, team: vTeam, more: vMore, booking: vBooking, contacts: vContacts, jobs: vJobs };
  const node = (builders[S.tab] || vHome)(S.data);
  if (animate) { view.innerHTML = ''; node.classList.add('view-enter'); }
  view.innerHTML = '';
  view.appendChild(node);
  const live = $('#live-dot');
  if (live) live.hidden = !S.live;
  applyMeta(S.data);
}

function sectionHead(t, sub) {
  if (!t) return el('div');
  const w = el('div');
  w.appendChild(el('div', 'sec-title', esc(L(t)) + (sub ? `<span class="n">${esc(L(sub))}</span>` : '')));
  return w;
}
function pageHead(title, sub) {
  const w = el('div');
  if (title) w.appendChild(el('h1', 'page-title', esc(L(title))));
  if (sub) w.appendChild(el('p', 'page-sub', esc(L(sub))));
  return w;
}

/* ── боковое меню (как на референсе: список + карточка «О нас») ── */
function openDrawer() {
  const d = S.data;
  const c = copy(d);
  const wrap = el('div', 'stack');
  const rows = [
    ['cutlery', c.tabMenu, () => setTab('menu')],
    ['cal', c.tabEvents, () => setTab('events')],
    ['book', c.titleBooking, () => setTab('booking')],
    ['users', c.tabTeam, () => setTab('team')],
    ['brief', c.titleJobs, () => setTab('jobs')],
    ['pin', c.titleContacts, () => setTab('contacts')],
  ];
  const card = el('div', 'card');
  for (const [ic, t, fn] of rows) {
    if (!t) continue;
    addRow(card, ic, t, '', () => { shut(); fn(); });
  }
  const soc = el('div', 'row');
  soc.innerHTML = `<span class="ic">${svg('share', 18)}</span><span class="tx"><span class="t">${esc(c.socialsTitle)}</span></span>`;
  const box = el('div', 'socials');
  for (const s of d.socials || []) {
    if (!s.url) continue;
    const b = el('button', 'soc');
    b.innerHTML = svg(socialIcon(s.platform), 19);
    b.onclick = (e) => { e.stopPropagation(); haptic(); window.open(s.url, '_blank'); };
    box.appendChild(b);
  }
  if (d.meta.bot) {
    const b = el('button', 'soc');
    b.innerHTML = svg('tg', 19);
    b.onclick = (e) => { e.stopPropagation(); openBot(); };
    box.appendChild(b);
  }
  soc.appendChild(box);
  card.appendChild(soc);
  wrap.appendChild(card);

  // карточка «О нас» с фото (референс: кадр бара под списком)
  const about = el('button', 'photo-card');
  const img = d.meta.aboutImage || (d.gallery?.[0]?.src) || d.meta.hero?.image || '';
  about.appendChild(imgBox('ph', img));
  const b = el('div', 'b');
  b.innerHTML = `<span style="flex:1;min-width:0"><span class="t">${esc(c.aboutCard)}</span><span class="d">${esc(L(d.meta.about || d.meta.tagline || ''))}</span></span><span class="chev">${svg('chev', 16)}</span>`;
  about.appendChild(b);
  about.onclick = () => { shut(); setTab('more'); };
  wrap.appendChild(about);

  const hint = el('p', 'hint', L('Меню, афиша и цены обновляются баром сами — здесь всегда актуально.'));
  wrap.appendChild(hint);

  const { close: shut } = openSheet('', wrap, { logo: false });
}
const tel = (d) => (window.location.href = d.contacts.phoneHref || 'tel:' + String(d.contacts.phone).replace(/[^\d+]/g, ''));
function openBot() {
  const l = `https://t.me/${S.data?.meta?.bot || ''}`;
  if (TG?.openTelegramLink) TG.openTelegramLink(l); else window.open(l, '_blank');
}

/* ── Главная ─ */
function vHome(d) {
  const root = el('div', 'stack');
  const c = copy(d);
  const st = todayStatus(d.hours);
  const hero = d.meta.hero || {};

  // большой кадр с логотипом, слоганом и CTA
  const card = el('div', 'hero card');
  card.appendChild(imgBox('bgimg', hero.image || d.gallery?.[0]?.src));
  const pill = el('div', 'status-pill' + (st.open === false ? ' closed' : ''));
  pill.innerHTML = `<span class="d"></span>${esc(L(st.open ? 'Открыто сейчас' : st.open === false ? 'Закрыто' : 'Расписание'))}`;
  pill.title = st.rowTxt;
  card.appendChild(pill);
  const cont = el('div', 'c');
  cont.appendChild(el('div', 'mark', `<img src="img/logo.svg" alt="${esc(d.meta.name || 'CATCH 22')}"><div class="tagline">${esc(L(hero.subtitle || d.meta.sub || ''))}</div>`));
  const desc = hero.text || d.meta.tagline || '';
  if (desc) cont.appendChild(el('p', 'desc', esc(L(desc))));
  const actions = el('div', 'stack');
  if (d.booking?.enabled !== false) {
    const b = el('button', 'btn', `<span>${esc(L(hero.cta || c.ctaBooking))}</span>${svg('chev', 16)}`);
    b.onclick = () => setTab('booking');
    actions.appendChild(b);
  }
  const g = el('button', 'btn line', `${svg('pin', 16)}<span>${esc(L(d.contacts.address || 'Контакты'))}</span>`);
  g.onclick = () => window.open(d.contacts.maps || `https://yandex.ru/maps/?text=${encodeURIComponent(d.contacts.address || '')}`, '_blank');
  actions.appendChild(g);
  cont.appendChild(actions);
  card.appendChild(cont);
  root.appendChild(card);

  // часы + ближнее событие
  const nextEv = upcoming(d);
  const facts = el('div', 'facts');
  const f1 = el('button', 'fact');
  f1.innerHTML = `<div class="l">${esc(c.hoursTitle)}</div><div class="v">${esc(st.rowTxt)}</div><div class="s">${esc(st.open ? L('Мы готовы вас встречать') : st.open === false ? L('Откроемся чуть позже') : '')}</div>`;
  f1.onclick = () => setTab('contacts');
  const f2 = el('button', 'fact');
  f2.innerHTML = `<div class="l">${esc(L('Ближе всего'))}</div><div class="v">${nextEv.length ? esc(L(nextEv[0].title)) : esc(L('Афиша пуста'))}</div><div class="s">${nextEv.length ? fmtDate(nextEv[0].date) + ' · ' + esc(L(nextEv[0].time || '')) : esc(L('загляни позже'))}</div>`;
  f2.onclick = () => setTab('events');
  facts.append(f1, f2);
  root.appendChild(facts);

  // стоп-лист дня
  const stopped = stoppedItems(d);
  if (stopped.length) {
    const box = el('div', 'card');
    addRow(box, 'stop', c.stopTitle, stopped.map((i) => L(i.name)).slice(0, 4).join(', ') + (stopped.length > 4 ? '…' : ''), () => openStopSheet(stopped));
    root.appendChild(box);
  }

  // бранч — постер
  if (d.brunch?.enabled) {
    const p = el('button', 'promo');
    p.appendChild(imgBox('ph', d.brunch.image));
    const t = el('div', 'txt');
    t.innerHTML = `<div class="k">${esc(L(d.brunch.title || 'БРАНЧ'))}</div><p>${esc(L(d.brunch.text || ''))}</p>`;
    p.appendChild(t);
    p.onclick = () => (d.brunch.image ? openImageSheet(d.brunch.image, L(d.brunch.title || 'Бранч')) : setTab('events'));
    root.appendChild(p);
  }

  // что сегодня/завтра
  if (nextEv.length) {
    root.appendChild(sectionHead(c.tonight, `${nextEv.length}`));
    for (const e of nextEv.slice(0, 3)) root.appendChild(eventCard(e));
    const more = el('button', 'btn line sm', `${esc(L('Вся афиша'))} ${svg('chev', 15)}`);
    more.onclick = () => setTab('events');
    root.appendChild(more);
  }

  // Факты о баре собраны как фирменная инфографика с векторными пиктограммами.
  const feats = d.meta.awards || [];
  if (feats.length) {
    root.appendChild(sectionHead(c.awardsTitle));
    root.appendChild(renderInfographic(feats));
  }

  // мы на связи: сайт + инстаграм + бот
  root.appendChild(linksBlock(d, c));

  // виниловая подпись + обновлено
  root.appendChild(el('div', 'credits', brandFoot(d)));
  return root;
}
function brandFoot(d) {
  const upd = d.updatedAt ? ` · ${L('обновлено')} ${fmtRel(d.updatedAt)}` : '';
  const site = siteOf(d);
  const inst = instagramOf(d);
  const links = [site ? `<a href="${esc(site)}" target="_blank" rel="noopener">catch-22-bar.ru</a>` : '', inst ? `<a href="${esc(inst)}" target="_blank" rel="noopener">instagram</a>` : ''].filter(Boolean).join(' · ');
  return `<span class="foot-logo"><img src="img/logo.svg" alt="CATCH 22"></span>`
    + `<span class="foot-sub">${esc(L(d.meta.sub || ''))}${upd}</span>`
    + (links ? `<span class="foot-links">${links}</span>` : '')
    + `<span class="foot-credit">app by <a href="https://t.me/stonym0ntana" target="_blank" rel="noopener">@stonym0ntana</a></span>`;
}
function upcoming(d) {
  const today = new Date(new Date().toDateString());
  return [...(d.events || [])]
    .filter((e) => new Date((e.date || '') + 'T23:59') >= today)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

/* ── Меню ── */
function stoppedItems(d) {
  const out = [];
  for (const c of d.menu?.categories || []) for (const s of c.sections || []) for (const i of s.items || []) if (i.stop) out.push(i);
  return out;
}
function openStopSheet(stopped) {
  const w = el('div', 'stack');
  for (const it of stopped) {
    const row = el('div', 'row');
    row.style.cssText = 'padding:10px 4px;border-bottom:1px solid var(--line)';
    row.innerHTML = `<span class="ic">${svg('stop', 18)}</span><span class="tx"><span class="t">${esc(L(it.name))}</span><span class="d">${esc(L(it.desc || 'не продаётся сегодня'))}</span></span>`;
    w.appendChild(row);
  }
  w.appendChild(el('p', 'tiny', L('Список ведёт команда — актуальные позиции в меню зачёркнуты.')));
  openSheet(L('Сегодня не продаём'), w);
}
function vMenu(d) {
  const root = el('div');
  const c = copy(d);
  const cats = d.menu?.categories || [];
  root.appendChild(pageHead(c.titleMenu, d.menu?.note || ''));
  if (!cats.length) { root.appendChild(el('p', 'muted', L('Меню скоро появится'))); return root; }
  S.menuCat = Math.min(S.menuCat, cats.length - 1);

  const tabs = el('div', 'tabs');
  cats.forEach((cat, i) => {
    const n = cat.sections?.reduce((a, sec) => a + (sec.items?.length || 0), 0) || 0;
    const b = el('button', i === S.menuCat ? 'on' : '');
    b.innerHTML = `${svg(categoryIcon(cat), 15)}<span class="cat-title">${esc(L(cat.title))}</span><span class="n">${n}</span>`;
    b.onclick = () => { S.menuCat = i; haptic(); setTab('menu', { sub: cat.id, animate: false, keepScroll: true }); };
    tabs.appendChild(b);
  });
  root.appendChild(tabs);

  const search = el('div', 'search');
  search.innerHTML = svg('search', 17);
  const inp = el('input');
  inp.placeholder = L('Поиск по меню');
  inp.value = S.q;
  inp.oninput = () => { S.q = inp.value; clearTimeout(inp._t); inp._t = setTimeout(() => { S.qFocus = true; render(false); }, 220); };
  search.appendChild(inp);
  if (S.qFocus) {
    // курсор не должен прыгать после перерисовки
    S.qFocus = false;
    requestAnimationFrame(() => { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch {} });
  }
  root.appendChild(search);

  const cat = cats[S.menuCat];
  const q = S.q.trim().toLowerCase();
  const stopped = stoppedItems(d).length;
  if (stopped) {
    const bar = el('button', 'stop-flag');
    bar.innerHTML = `${svg('stop', 15)} ${esc(L('в стоп-листе сегодня:'))} ${stopped} ${esc(L('поз. — смотреть'))}`;
    bar.style.cssText = 'display:flex;margin:10px 2px 0';
    bar.onclick = () => openStopSheet(stoppedItems(d));
    root.appendChild(bar);
  }

  for (const sec of cat.sections || []) {
    const items = (sec.items || []).filter((it) => {
      if (!q) return true;
      const searchable = [it.name, L(it.name), it.desc || '', L(it.desc || ''), ...(it.tags || []), ...(it.tags || []).map(L)].join(' ').toLowerCase();
      return searchable.includes(q);
    });
    if (!items.length) continue;
    const p = el('div', 'menu-sec card pad');
    p.appendChild(el('h2', 'sec-title in-card', esc(L(sec.title))));
    for (const it of items) {
      const row = el('button', 'item');
      row.innerHTML =
        `<span class="tx"><span class="nm">${esc(L(it.name))}${(it.tags || []).map((t) => `<span class="tag">${esc(L(t))}</span>`).join('')}</span>${it.desc ? `<span class="ds">${esc(L(it.desc))}</span>` : ''}</span>` +
        `<span class="pr">${esc(L(it.price || ''))}</span>`;
      if (it.stop) row.classList.add('stopped');
      row.onclick = () => openItemSheet(cat, sec, it);
      p.appendChild(row);
    }
    root.appendChild(p);
  }
  if (cat.note) root.appendChild(el('div', 'menu-note', esc(L(cat.note))));
  return root;
}

function openItemSheet(cat, sec, it) {
  const w = el('div', 'stack');
  const head = el('div');
  head.innerHTML = `<div class="kicker">${esc(L(cat.title))} · ${esc(L(sec.title))}</div>
    <div class="sheet-name">${esc(L(it.name))}</div>
    ${it.desc ? `<p class="muted">${esc(L(it.desc))}</p>` : ''}
    <div class="chips">${(it.tags || []).map((t) => `<span class="chip">${esc(L(t))}</span>`).join('')}${it.stop ? `<span class="chip stop">${esc(L('не продаётся'))}</span>` : ''}</div>`;
  w.appendChild(head);
  w.appendChild(el('div', 'sheet-price', fmtPrice(it.price)));
  openSheet('', w);
}
function fmtPrice(p) {
  if (!p) return L('по запросу');
  const s = String(p);
  const nums = s.replace(/\d+/g, (m) => m.replace(/(\d)(?=(\d{3})+$)/g, '$1 '));
  return /^\d/.test(nums.trim()) ? nums + (S.lang === 'en' ? ' RUB' : ' ₽') : L(nums);
}

/* ── Афиша ── */
function fmtDate(s) {
  try {
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString(S.lang === 'en' ? 'en-GB' : 'ru-RU', { day: '2-digit', month: S.lang === 'en' ? 'short' : '2-digit' });
  } catch { return s; }
}
function fmtDayShort(s) {
  try {
    return new Date(s + 'T12:00:00').toLocaleDateString(S.lang === 'en' ? 'en-GB' : 'ru-RU', { weekday: 'short' }).toUpperCase();
  } catch { return ''; }
}
function vEvents(d) {
  const root = el('div', 'stack');
  const c = copy(d);
  root.appendChild(pageHead(c.titleEvents, c.eventsSub));
  const list = [...(d.events || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = new Date(new Date().toDateString());
  const next = list.filter((e) => new Date((e.date || '') + 'T23:59') >= today).reverse();
  const past = list.filter((e) => new Date((e.date || '') + 'T23:59') < today);
  if (!next.length && !past.length) { root.appendChild(el('div', 'card pad muted', L('Скоро анонсируем вечеринки'))); return root; }
  if (next.length) {
    const box = el('div', 'card');
    next.forEach((e) => box.appendChild(eventCard(e)));
    root.appendChild(box);
  }
  if (past.length) {
    root.appendChild(sectionHead(L('Было'), `${past.length}`));
    const box = el('div', 'card');
    past.slice(0, 6).forEach((e) => box.appendChild(eventCard(e, false, true)));
    root.appendChild(box);
  }
  root.appendChild(el('div', 'credits', brandFoot(d)));
  return root;
}
function eventCard(e, showTime = true, past = false) {
  const card = el('button', 'ev' + (past ? ' past' : ''));
  card.appendChild(el('div', 'when', `<div class="dd">${esc(fmtDate(e.date))}</div><div class="tt">${esc(fmtDayShort(e.date))}${showTime && e.time ? ' ' + esc(String(e.time).split('–')[0].trim()) : ''}</div>`));
  if (e.image) card.appendChild(imgBox('poster', e.image));
  const info = el('div', 'info');
  info.innerHTML = `<div class="ti">${esc(L(e.title))}</div>${e.subtitle ? `<div class="su">${esc(L(e.subtitle))}</div>` : ''}`;
  card.appendChild(info);
  card.appendChild(el('span', 'chev', svg('chev', 15)));
  card.onclick = () => {
    if (e.image) openImageSheet(e.image, L(e.title));
    else toast(e.subtitle ? L(String(e.subtitle).split('\n')[0]) : L('Анонс'));
  };
  return card;
}
function openImageSheet(img, title) {
  const w = el('div');
  w.appendChild(imgBox('sheet-img tall', img));
  openSheet(title || '', w);
}

/* ── Команда (сейчас заглушка: бар наполнит её из бота — 👥 Команда) ── */
function vTeam(d) {
  const root = el('div', 'stack');
  const c = copy(d);
  const t = d.team || {};
  if (t.enabled === false) {
    root.appendChild(pageHead(c.titleTeam, ''));
    root.appendChild(el('div', 'card pad muted', L('Раздел временно скрыт')));
    return root;
  }
  root.appendChild(pageHead(c.titleTeam, c.teamSub));

  const members = t.members || [];

  // обложка блока: фото ставит бар через бота
  const hero = el('div', 'team-hero');
  hero.appendChild(imgBox('bgimg', t.image || d.meta.hero?.image || d.gallery?.[0]?.src));
  const w = el('div', 'c');
  w.appendChild(el('div', 'mark', '<img src="img/mark.svg" alt="22">'));
  w.appendChild(el('h2', null, esc(L(t.title || c.titleTeam))));
  if (t.text) w.appendChild(el('p', null, esc(L(t.text))));
  hero.appendChild(w);
  root.appendChild(hero);

  if (members.length) {
    const grid = el('div', 'team-grid');
    for (const m of members) {
      const card = el('div', 'member');
      card.appendChild(imgBox('ph', m.photo));
      const b = el('div', 'b');
      b.innerHTML = `<div class="n">${esc(L(m.name || ''))}</div>${m.role ? `<div class="r">${esc(L(m.role))}</div>` : ''}${m.text ? `<div class="t">${esc(L(m.text))}</div>` : ''}`;
      card.appendChild(b);
      card.onclick = () => m.text || m.role ? openSheet(L(m.name || ''), teamSheet(m)) : null;
      grid.appendChild(card);
    }
    root.appendChild(grid);
  } else {
    // заглушка, пока команда не добавлена
    const soon = el('div', 'team-soon card pad');
    soon.appendChild(el('div', 'glyph', svg('users', 26)));
    soon.appendChild(el('div', 't', L('Скоро здесь будет команда')));
    soon.appendChild(el('p', 'd', esc(L(t.note || c.teamNote))));
    const job = el('button', 'btn line sm', `${svg('brief', 15)}<span>${esc(c.jobsCard)}</span>`);
    job.onclick = () => setTab('jobs');
    soon.appendChild(job);
    root.appendChild(soon);
  }

  root.appendChild(linksBlock(d, c));
  root.appendChild(el('div', 'credits', brandFoot(d)));
  return root;
}
function teamSheet(m) {
  const w = el('div', 'stack');
  if (m.photo) w.appendChild(imgBox('sheet-img', m.photo));
  w.appendChild(el('div', null, `<div class="kicker">${esc(L(m.role || ''))}</div><div class="sheet-name">${esc(L(m.name || ''))}</div>`));
  if (m.text) w.appendChild(el('p', 'muted', esc(L(m.text))));
  return w;
}

/* ── Сайт / Instagram / бот: блок ссылок, который переиспользуется на экранах ── */
function siteOf(d) {
  return d.contacts?.site || (d.socials || []).find((x) => /сайт|site|catch-22-bar/i.test(x.platform + ' ' + x.url))?.url || d.contacts?.bookingUrl || '';
}
function instagramOf(d) {
  return d.contacts?.instagram || (d.socials || []).find((x) => /inst/i.test(x.platform || ''))?.url || '';
}
function linksBlock(d, c) {
  const wrap = el('div');
  const rows = [];
  const site = siteOf(d);
  const inst = instagramOf(d);
  if (site) rows.push(['web', c.ctaSite, String(site).replace(/^https?:\/\//, '').replace(/\/+$/, ''), () => window.open(site, '_blank')]);
  if (inst) {
    const nick = String(inst).match(/instagram\.com\/([^/?#]+)/)?.[1] || '';
    rows.push(['inst', c.ctaInstagram, nick ? '@' + nick : '', () => window.open(inst, '_blank')]);
  }
  if (d.meta.bot) rows.push(['tg', 'Telegram-бот бара', '@' + d.meta.bot, () => openBot()]);
  if (!rows.length) return wrap;
  wrap.appendChild(sectionHead(c.socialsTitle));
  const card = el('div', 'card');
  for (const [ic, t, desc, fn] of rows) addRow(card, ic, t, desc, fn);
  wrap.appendChild(card);
  return wrap;
}

/* ── Бронирование ── */
function bookingForm(d, c) {
  const slots = [];
  for (let h = 16; h <= 23; h++) { slots.push(`${h}:00`); if (h < 23) slots.push(`${h}:30`); }
  slots.push('00:00', '00:30');
  const today = new Date().toISOString().slice(0, 10);
  return formSheet(
    '',
    [
      { name: 'date', label: 'Дата', type: 'date', min: today, required: true },
      { name: 'time', label: 'Время', type: 'slots', options: slots, required: true },
      { name: 'guests', label: 'Гостей', type: 'stepper', value: 2, min: 1, max: 12, suffix: 'чел.' },
      { name: 'name', label: 'Имя', type: 'text', required: true, autocomplete: 'name' },
      { name: 'contact', label: 'Телефон или @telegram', type: 'text', required: true, inputmode: 'tel', autocomplete: 'tel' },
      { name: 'comment', label: 'Пожелания', type: 'textarea', placeholder: 'столик у фонотеки, детский стул…' },
    ],
    c.ctaBooking,
    (v) => sendRequest('booking', { дата: v.date, время: v.time, гостей: v.guests, имя: v.name, пожелания: v.comment }, v.contact)
      .then((ok) => (ok ? L(d.booking?.text || 'Подтвердим бронь в течение 15 минут') : false))
  );
}
function vBooking(d) {
  const c = copy(d);
  const root = el('div', 'stack');
  root.appendChild(pageHead(c.titleBooking, d.booking?.title || d.meta.tagline || ''));
  const pic = d.booking?.image || d.meta.hero?.image;
  if (pic) { const p = el('div', 'page-photo'); p.appendChild(imgBox('ph', pic)); root.appendChild(p); }
  const st = todayStatus(d.hours);
  root.appendChild(el('div', 'card pad', `<div class="row" style="padding:0;border:0"><span class="ic">${svg('clock', 18)}</span><span class="tx"><span class="t">${esc(c.hoursTitle)}</span><span class="d">${esc(st.rowTxt)}</span></span></div>`));
  root.appendChild(bookingForm(d, c));
  if (d.booking?.text) root.appendChild(el('p', 'hint', esc(L(d.booking.text))));
  return root;
}

/* ── Контакты ── */
function vContacts(d) {
  const c = copy(d);
  const root = el('div', 'stack');
  root.appendChild(pageHead(c.titleContacts, d.contacts.note || ''));
  const img = d.contacts.image || '';
  if (img) { const p = el('div', 'page-photo'); p.appendChild(imgBox('ph', img)); root.appendChild(p); }
  const box = el('div', 'card');
  addRow(box, 'pin', d.contacts.address || '—', 'Открыть в картах', () => window.open(d.contacts.maps || `https://yandex.ru/maps/?text=${encodeURIComponent(d.contacts.address || '')}`, '_blank'));
  const st = todayStatus(d.hours);
  addRow(box, 'clock', c.hoursTitle, st.rowTxt, () => openHoursSheet(d, c));
  if (d.contacts.phone) addRow(box, 'phone', d.contacts.phone, 'Позвонить', () => tel(d));
  if (d.contacts.email) addRow(box, 'mail', d.contacts.email, 'Написать письмо', () => (window.location.href = 'mailto:' + d.contacts.email));
  if (d.contacts.bookingUrl) addRow(box, 'web', 'Бронирование онлайн', String(d.contacts.bookingUrl).replace(/^https?:\/\//, ''), () => window.open(d.contacts.bookingUrl, '_blank'));
  root.appendChild(box);
  const w = el('button', 'btn', `<span>${esc(c.ctaContacts)}</span>${svg('tg', 17)}`);
  w.onclick = () => (d.meta.bot ? openBot() : d.contacts.phone ? tel(d) : setTab('more'));
  root.appendChild(w);
  // сайт / инстаграм / бот — строками с адресами, чтобы ссылку было видно
  root.appendChild(linksBlock(d, c));
  return root;
}
function openHoursSheet(d, c) {
  const box = el('div', 'card');
  for (const h of d.hours || []) {
    box.appendChild(el('div', 'row', `<span class="tx"><span class="t" style="${h.closed ? 'color:var(--muted)' : ''}">${esc(L(h.days))}</span></span><span class="tiny" style="color:var(--accent-hi);font-weight:700">${esc(L(h.time))}</span>`));
  }
  box.appendChild(el('p', 'hint', L('Статус «открыто сейчас» приложение считает само.')));
  openSheet(c.hoursTitle, box);
}

/* ── Работа ── */
function jobForm(d) {
  const positions = d.jobs?.positions?.length ? d.jobs.positions : ['Официант', 'Бармен', 'Кухня'];
  return formSheet(
    '',
    [
      { name: 'name', label: 'Имя и фамилия', type: 'text', required: true },
      { name: 'contact', label: 'Телефон или @telegram', type: 'text', required: true, inputmode: 'tel' },
      { name: 'position', label: 'Позиция', type: 'select', options: positions },
      { name: 'exp', label: 'Опыт', type: 'textarea', placeholder: 'расскажите о себе' },
    ],
    copy(d).ctaJobs,
    (v) => sendRequest('job', { имя: v.name, позиция: v.position, опыт: v.exp }, v.contact)
      .then((ok) => (ok ? L('Спасибо! Мы рассмотрим анкету и напишем') : false))
  );
}
function vJobs(d) {
  const c = copy(d);
  const root = el('div', 'stack');
  if (d.jobs?.enabled === false) { root.appendChild(el('div', 'card pad muted', L('Анкета временно закрыта'))); return root; }
  const hero = el('div', 'job-hero');
  hero.appendChild(imgBox('bgimg', d.jobs.image || d.gallery?.[1]?.src || d.meta.hero?.image));
  hero.appendChild(el('h2', null, esc(L(d.jobs.title || c.jobsCard))));
  if (d.jobs.text) hero.appendChild(el('p', null, esc(L(d.jobs.text))));
  root.appendChild(hero);
  if ((d.jobs.positions || []).length) {
    const box = el('div', 'card');
    d.jobs.positions.forEach((p, i) => box.appendChild(el('div', 'row', `<span class="ic">${svg('star', 17)}</span><span class="tx"><span class="t">${esc(L(p))}</span></span><span class="tiny">#${i + 1}</span>`)));
    root.appendChild(box);
  }
  root.appendChild(jobForm(d));
  return root;
}

/* ── Ещё / профиль ── */
function vMore(d) {
  const root = el('div', 'stack');
  const c = copy(d);
  const st = todayStatus(d.hours);

  const prof = el('div', 'card pad prof');
  prof.appendChild(el('div', 'prof-logo', '<img src="img/logo.svg" alt="CATCH 22">'));
  prof.appendChild(el('div', 'tagline', esc(L(d.meta.sub || ''))));
  if (d.meta.tagline) prof.appendChild(el('p', 'muted desc', esc(L(d.meta.tagline))));
  const chips = el('div', 'chips');
  chips.appendChild(el('span', 'chip' + (st.open === false ? ' stop' : ' new'), L(st.open === false ? 'Закрыто' : 'Открыто сейчас')));
  chips.appendChild(el('span', 'chip outline', esc(st.rowTxt)));
  prof.appendChild(chips);
  root.appendChild(prof);

  // быстрые разделы — как на референсе (список с иконками)
  const nav = el('div', 'card');
  addRow(nav, 'book', c.titleBooking, d.booking?.text || 'Столы, виниловые вечеринки, бронь', () => setTab('booking'));
  addRow(nav, 'pin', c.titleContacts, d.contacts.address || '', () => setTab('contacts'));
  addRow(nav, 'users', c.titleTeam, (d.team?.members || []).length ? `${d.team.members.length} ${L('чел.')}` : d.team?.text || '', () => setTab('team'));
  addRow(nav, 'brief', c.titleJobs, d.jobs?.text || '', () => setTab('jobs'));
  root.appendChild(nav);

  // о баре
  const story = d.meta.story || d.meta.about;
  if (story) {
    root.appendChild(sectionHead(c.aboutCard));
    const about = el('div', 'card pad');
    about.appendChild(el('p', 'about', esc(L(story))));
    root.appendChild(about);
  }

  // часы
  root.appendChild(sectionHead(c.hoursTitle, L(st.open === false ? 'закрыто' : 'открыто')));
  const hours = el('div', 'card');
  for (const h of d.hours || []) {
    hours.appendChild(el('div', 'row', `<span class="tx"><span class="t" style="font-weight:${h.closed ? 500 : 600}">${esc(L(h.days))}</span></span><span class="tiny" style="color:var(--accent-hi);font-weight:700">${esc(L(h.time))}</span>`));
  }
  root.appendChild(hours);

  // мы на связи: сайт, инстаграм, бот — строками с адресами
  root.appendChild(linksBlock(d, c));

  // награды/фишки
  if ((d.meta.awards || []).length) {
    root.appendChild(sectionHead(c.awardsTitle));
    root.appendChild(renderInfographic(d.meta.awards));
  }

  // бранч
  if (d.brunch?.enabled && d.brunch.image) {
    const br = el('div', 'card');
    addRow(br, 'cutlery', d.brunch.title || 'Бранч', (d.brunch.text || '').replace(/\n/g, ' · '), () => openImageSheet(d.brunch.image, L(d.brunch.title)));
    root.appendChild(br);
  }

  // галерея
  if ((d.gallery || []).length) {
    root.appendChild(sectionHead(c.galleryTitle, `${d.gallery.length}`));
    const reel = el('div', 'reel');
    for (const g of d.gallery) {
      const f = el('figure');
      const img = el('img');
      img.loading = 'lazy';
      img.src = mediaUrl(g.src);
      img.onload = () => img.classList.add('on');
      img.alt = '';
      img.onclick = () => openImageSheet(g.src, '');
      f.appendChild(img);

      reel.appendChild(f);
    }
    root.appendChild(reel);
  }

  root.appendChild(el('div', 'credits', brandFoot(d)));
  return root;
}
function fmtRel(iso) {
  try {
    const d = new Date(iso);
    const locale = S.lang === 'en' ? 'en-GB' : 'ru-RU';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
function addRow(card, icon, title, desc, onclick, wrapDesc) {
  const r = el(onclick ? 'button' : 'div', 'row');
  const ic = el('span', 'ic');
  if (icon && ICONS[icon]) ic.innerHTML = svg(icon, 18);
  else ic.textContent = icon || '✦';
  const tx = el('span', 'tx', `<span class="t">${esc(L(title))}</span>${desc ? `<span class="d" style="${wrapDesc ? '' : 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}">${esc(L(desc))}</span>` : ''}`);
  r.append(ic, tx);
  if (onclick) { r.appendChild(el('span', 'chev', svg('chev', 15))); r.onclick = () => { haptic(); onclick(); }; }
  card.appendChild(r);
  return r;
}

/* ────────────────── шапка / boot / тема ────────────────── */
function applyChrome() {
  document.documentElement.dataset.theme = 'dark';
  $('#metatheme')?.setAttribute('content', '#0b0a09');
  try {
    TG?.setColorScheme?.('dark');
    TG?.setHeaderColor?.('#0b0a09');
    TG?.setBackgroundColor?.('#0b0a09');
  } catch {}
}
$('#nav-btn').onclick = () => { haptic(); openDrawer(); };
$('#back-btn').onclick = () => { haptic(); setTab('home'); };
$('#tg-btn').onclick = () => { haptic(); if (S.data?.meta?.bot) openBot(); else setTab('contacts'); };
$('#lang-btn').onclick = () => {
  S.lang = S.lang === 'en' ? 'ru' : 'en';
  try { localStorage.setItem('catch22-language', S.lang); } catch {}
  haptic();
  if (S.data) render(false);
  else document.documentElement.lang = S.lang;
};

document.querySelectorAll('#tabbar button').forEach((b) => {
  b.querySelector('i').outerHTML = svg({ home: 'house', menu: 'cutlery', events: 'cal', team: 'users', more: 'grid' }[b.dataset.tab] || 'grid', 22);
  b.onclick = () => setTab(b.dataset.tab);
});

/* hash router: #/tab[/sub] */
function fromHash() {
  const [, tab, sub] = (location.hash || '').split('/');
  const all = [...VIEWS, 'booking', 'contacts', 'jobs'];
  if (all.includes(tab)) return { tab, sub };
  return { tab: 'home' };
}
window.addEventListener('hashchange', () => {
  const { tab, sub } = fromHash();
  if (tab !== S.tab || sub !== S.sub) {
    S.tab = tab; S.sub = sub || '';
    const isSub = !VIEWS.includes(tab);
    $('#hdr').classList.toggle('sub', isSub);
    $('#back-btn').hidden = !isSub;
    $('#nav-btn').hidden = isSub;
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === (isSub ? parentOf(tab) : tab)));
    if (tab === 'menu' && sub) { const idx = (S.data?.menu?.categories || []).findIndex((c) => c.id === sub || c.title === sub); if (idx >= 0) S.menuCat = idx; }
    render(false);
    applyMeta(S.data);
  }
});

/* ── старт ── */
(async function main() {
  applyChrome();
  try { TG?.onEvent?.('themeChanged', () => applyChrome()); } catch {}
  await loadData(false);
  $('#boot').classList.add('gone');
  $('#app').setAttribute('aria-hidden', 'false');
  $('#app').classList.add('on');
  const { tab, sub } = fromHash();
  setTab(tab, { sub, animate: false, keepScroll: true });
  startLive();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadData(false); });
})();
})();
