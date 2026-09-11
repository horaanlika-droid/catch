/* ═══════ CATCH 22 · клиент. iOS-like, live-обновления от админ-бота ═══════ */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const CFG = Object.assign({ apiBase: '' }, window.CATCH_CONFIG || {});
const TG = window.Telegram?.WebApp;
if (TG) { try { TG.ready(); TG.expand(); } catch {} }

const apiBase = (CFG.apiBase || '').replace(/\/+$/, '');
const sameOriginAPI = !apiBase && !(location.hostname.endsWith('github.io') || location.protocol === 'file:');

/* ── состояние ─ */
const S = {
  data: null, tab: 'home', menuCat: 0, q: '', live: false, lastRev: 0,
  theme: localStorage.getItem('catch22-theme') || (TG?.colorScheme === 'light' ? 'light' : 'dark'),
};

/* ── утилиты ── */
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = (p) => (apiBase || '') + p;

const ICONS = {
  house: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  cutlery: '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v6m4-6v6M17 3c-1.6 1.2-2.5 3.2-2.5 5.5 0 2 .9 3.2 2.5 3.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  cal: '<rect x="4" y="5.5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  tee: '<path d="M8.5 4 6 5.5 3.5 8.5l3 2.2L8 9.4V20h8V9.4l1.5 1.3 3-2.2L18 5.5 15.5 4a3.6 3.6 0 0 1-7 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  dots: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  inst: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.2"/>',
  tg: '<path d="M21 4.5 2.8 11.6l6.2 2 1.9 6 2.5-3.7 4.8 3.6L21 4.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m9 13.6 9.2-7-6.6 7.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  vk: '<path d="M3.5 7.5c.9 5 4 9.7 8.9 9.7h1.3l-1.9-3.6c2.7.9 4.6 3 5.3 4.7H21c-.7-2.3-2.3-4.2-4.3-5.3 1.8-1.2 3.3-3 4-5.2h-3.1c-.8 2-2.2 3.5-3.9 4.4V7.5H9.9c.2 1.8-.1 4-1.2 5.5-1-1.6-2.4-3.9-3-5.5H3.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  web: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.8c-2.6 2.2-4 5-4 8.2s1.4 6 4 8.2c2.6-2.2 4-5 4-8.2s-1.4-6-4-8.2zM4 12h16" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  chev: '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m15.5 15.5 4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  disc: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  send: '<path d="M21 4.5 2.8 11.6l6.2 2 1.9 6 2.5-3.7 4.8 3.6L21 4.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  brief: '<rect x="3.5" y="7" width="17" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 7V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6V7" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
};
const svg = (n, w = 24) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}">${ICONS[n] || ''}</svg>`;

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
      const r = await fetch(apiBase ? 'data.json' : 'data.json');
      next = await r.json();
    } catch { return { changed: false, error: true }; }
  }
  const changed = !S.data || next.rev !== S.lastRev || next.updatedAt !== S.data.updatedAt;
  S.lastRev = next.rev || 0;
  S.data = next;
  if (changed && S.tab) render();
  if (changed && showToast) {
    toast('🔄 Данные обновлены');
    document.body.classList.add('live-flash');
    setTimeout(() => document.body.classList.remove('live-flash'), 900);
  }
  return { changed };
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
function openSheet(title, content, { onClose } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = '';
  const scrim = el('div', 'scrim');
  const sheet = el('div', 'sheet');
  sheet.appendChild(el('div', 'grab'));
  const close = el('button', 'x', '✕');
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
    if (f.type === 'note') { wrap.appendChild(el('p', 'tiny', esc(f.text))); continue; }
    const fd = el('div', 'field');
    fd.appendChild(el('label', null, esc(f.label)));
    let input;
    if (f.type === 'select') {
      input = el('select');
      for (const o of f.options) input.appendChild(el('option', null, esc(o)));
    } else if (f.type === 'textarea') {
      input = el('textarea');
      if (f.placeholder) input.placeholder = f.placeholder;
    } else if (f.type === 'stepper') {
      input = (() => {
        const box = el('div', 'stepper');
        let v = f.value ?? 2;
        const lbl = el('div', 'v', String(v));
        const mk = (d, t) => { const b = el('button', null, t); b.type = 'button'; b.onclick = () => { v = Math.max(f.min ?? 1, Math.min(f.max ?? 20, v + d)); lbl.textContent = f.suffix ? v + ' ' + f.suffix : v; haptic(); }; return b; };
        box.append(mk(-1, '−'), lbl, mk(1, '+'));
        return { box, get value() { return String(v); } };
      })();
    } else if (f.type === 'slots') {
      input = (() => {
        const box = el('div', 'slots');
        let sel = f.value || f.options[0];
        f.options.forEach((o, i) => {
          const b = el('button', 'slot' + (i === 0 ? ' on' : ''), esc(o));
          b.type = 'button';
          b.onclick = () => { box.querySelectorAll('.slot').forEach((x) => x.classList.remove('on')); b.classList.add('on'); sel = o; haptic(); };
          box.appendChild(b);
        });
        return { box, get value() { return sel; } };
      })();
    } else {
      input = el('input');
      input.type = f.type || 'text';
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.required) input.required = true;
      if (f.min) input.min = f.min;
      if (f.inputmode) input.inputMode = f.inputmode;
      if (f.autocomplete) input.autocomplete = f.autocomplete;
    }
    inputs[f.name] = input;
    fd.appendChild(input.box || input);
    form.appendChild(fd);
  }
  const btn = el('button', 'btn', esc(submitLabel));
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
    if (ok === false) { toast('⚠️ Не вышло — попробуй ещё раз'); return; }
    // экран успеха
    wrap.innerHTML = '';
    const s = el('div', 'success');
    s.appendChild(el('div', 'ring', svg('check', 44)));
    s.appendChild(el('div', null, '<b>Заявка отправлена</b>'));
    s.appendChild(el('p', null, esc(typeof ok === 'string' ? ok : 'Мы свяжемся с вами в ближайшее время 🤝')));
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
    if (r.status === 429) { toast('Подожди минутку ⏳'); return false; }
  } catch {}
  // нет бэкенда (чистый Pages) → уходим в бота
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
    rowTxt = `${h.days} · ${h.time}`;
    if (h.closed) { open = false; break; }
    const m = (h.time || '').match(/(\d{1,2}):(\d{2})\s*[–\-—]\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;
    let from = +m[1] * 60 + +m[2];
    let to = +m[3] * 60 + +m[4];
    if (to <= from) to += 24 * 60;
    const inside = mins >= from && mins < to;
    open = inside;
    break;
  }
  return { open, rowTxt };
}

/* ── переиспользуемые куски ── */
function imgBox(cls, src, styleExtra = '') {
  const d = el('div', cls, '');
  const url = mediaUrl(src);
  if (url) {
    d.style.backgroundImage = `url("${url}")`;
    const probe = new Image();
    probe.onload = () => d.style.opacity = 1;
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
  if (n.includes('wa')) return 'phone';
  return 'web';
}

/* ────────────────── Вкладки ────────────────── */
function setTab(tab, opts = {}) {
  S.tab = tab;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  location.hash = '#/' + tab + (opts.sub ? '/' + opts.sub : '');
  render(opts.animate === false ? false : true);
  if (!opts.keepScroll) window.scrollTo({ top: 0 });
  haptic('light');
  if (TG?.BackButton && tab === 'home') TG.BackButton.hide();
}

function render(animate = true) {
  const view = $('#view');
  const builders = { home: vHome, menu: vMenu, events: vEvents, merch: vMerch, more: vMore };
  const node = (builders[S.tab] || vHome)(S.data);
  if (animate) { view.innerHTML = ''; node.classList.add('view-enter'); }
  view.innerHTML = '';
  view.appendChild(node);
  const live = $('#live-dot');
  if (live) live.hidden = !S.live;
  const title = { home: S.data.meta.name, menu: 'МЕНЮ', events: 'АФИША', merch: 'МЕРЧ', more: 'ЕЩЁ' }[S.tab];
  document.title = `${title} · ${S.data.meta.name || 'CATCH 22'}`;
}

function sectionHead(t, sub) {
  const w = el('div');
  w.appendChild(el('div', 'sec-title', esc(t)));
  if (sub) w.appendChild(el('div', 'tiny', esc(sub)));
  w.style.marginBottom = '2px';
  return w;
}

/* ── Главная ── */
function vHome(d) {
  const root = el('div', 'stack');
  const st = todayStatus(d.hours);
  // hero
  const hero = el('div', 'hero card');
  hero.appendChild(imgBox('bgimg', d.meta.hero?.image, ''));
  const pill = el('div', 'status-pill' + (st.open === false ? ' closed' : ''));
  pill.innerHTML = `<span class="d"></span>${st.open ? 'Открыто сейчас' : st.open === false ? 'Закрыто' : 'Расписание'}`;
  hero.appendChild(pill);
  const c = el('div', 'c');
  c.innerHTML = `<h2>${esc(d.meta.hero?.title || d.meta.name)}</h2>` +
    (d.meta.hero?.subtitle ? `<div class="tiny" style="letter-spacing:.3em;text-transform:uppercase;color:#bfae9b">${esc(d.meta.hero.subtitle)}</div>` : '') +
    `<p>${esc(d.meta.tagline || '')}</p>`;
  const actions = el('div', 'stack');
  if (d.booking?.enabled !== false) {
    const b = el('button', 'btn', 'Забронировать стол ' + svg('chev', 16));
    b.onclick = () => openSheet('Бронирование', bookingForm());
    actions.appendChild(b);
  }
  const g = el('button', 'btn ghost', '📍 ' + esc(d.contacts.address || 'Контакты'));
  g.onclick = () => window.open(d.contacts.maps || `https://yandex.ru/maps/?text=${encodeURIComponent(d.contacts.address || '')}`, '_blank');
  actions.appendChild(g);
  c.appendChild(actions);
  hero.appendChild(c);
  root.appendChild(hero);

  // мини-карточки
  const mini = el('div', 'mini-cards');
  const m1 = el('div', 'mini');
  m1.innerHTML = `<div class="l">Часы работы</div><div class="v">${esc(st.rowTxt)}</div><div class="s">${st.open ? 'Идём к гостям 🍸' : st.open === false ? 'Откроемся чуть позже' : ''}</div>`;
  m1.onclick = () => setTab('more');
  const nextEv = (d.events || []).filter((e) => new Date((e.date || '') + 'T00:00') >= new Date(new Date().toDateString())).slice(0, 2);
  const m2 = el('div', 'mini');
  m2.innerHTML = `<div class="l">Ближе всего</div><div class="v">${nextEv.length ? esc(nextEv[0].title) : 'Афиша пуста'}</div><div class="s">${nextEv.length ? fmtDate(nextEv[0].date) + ' · ' + esc(nextEv[0].time || '') : 'загляни позже'}</div>`;
  m2.onclick = () => setTab('events');
  mini.append(m1, m2);
  root.appendChild(mini);

  // стоп-лист плашка
  const stopped = stoppedItems(d);
  if (stopped.length) {
    const w = el('button', 'card');
    w.style.cssText = 'display:flex;gap:12px;align-items:center;padding:14px 16px;text-align:left;color:inherit';
    w.innerHTML = `<span style="font-size:20px">⛔</span><span><b>Сегодня не продаём</b><div class="d" style="color:var(--muted)">${stopped.map((i) => esc(i.name)).slice(0, 4).join(', ')}${stopped.length > 4 ? '…' : ''}</div></span>`;
    w.onclick = () => openStopSheet(stopped);
    root.appendChild(w);
  }

  // бранч
  if (d.brunch?.enabled) {
    const p = el('div', 'promo');
    p.appendChild(imgBox('ph', d.brunch.image));
    const t = el('div', 'txt');
    t.innerHTML = `<div class="k">${esc(d.brunch.title || 'БРАНЧ')}</div><p>${esc(d.brunch.text || '')}</p>`;
    p.appendChild(t);
    p.onclick = () => { if (d.brunch.image) openImageSheet(d.brunch.image, d.brunch.title || 'Бранч'); };
    root.appendChild(p);
  }

  // ближайшие события списком
  if (nextEv.length) {
    root.appendChild(sectionHead('Этим вечером'));
    for (const e of nextEv) root.appendChild(eventCard(e, true));
  }

  // о баре
  const about = el('div', 'card');
  const row = el('button', 'row');
  row.innerHTML = `<span class="ic">${svg('disc', 18)}</span><span class="tx"><span class="t">О Catch 22</span><span class="d">${esc((d.meta.about || '').slice(0, 120))}</span></span><span class="chev">${svg('chev', 16)}</span>`;
  row.onclick = () => setTab('more');
  about.appendChild(row);
  root.appendChild(about);
  return root;
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
    row.innerHTML = `<span class="ic">⛔</span><span class="tx"><span class="t">${esc(it.name)}</span><span class="d">${esc(it.desc || 'не продаётся сегодня')}</span></span>`;
    w.appendChild(row);
  }
  w.appendChild(el('p', 'tiny', 'Список ведёт команда — актуальные позиции в меню зачёркнуты.'));
  openSheet('Сегодня не продаём', w);
}
function vMenu(d) {
  const root = el('div');
  const cats = d.menu?.categories || [];
  if (!cats.length) { root.appendChild(el('p', 'muted', 'Меню скоро появится')); return root; }
  S.menuCat = Math.min(S.menuCat, cats.length - 1);
  const seg = el('div', 'seg');
  const segIn = el('div', 'seg-in');
  const thumb = el('i', 'seg-thumb');
  segIn.appendChild(thumb);
  cats.forEach((c, i) => {
    const b = el('button', i === S.menuCat ? 'on' : '', esc(`${c.icon || ''} ${c.title}`.trim()));
    b.onclick = () => { S.menuCat = i; haptic(); render(false); setTimeout(() => render(false), 0); };
    segIn.appendChild(b);
  });
  seg.appendChild(segIn);
  root.appendChild(seg);

  const search = el('div', 'search');
  search.innerHTML = svg('search', 17);
  const inp = el('input');
  inp.placeholder = 'Поиск по меню';
  inp.value = S.q;
  inp.oninput = () => { S.q = inp.value; clearTimeout(inp._t); inp._t = setTimeout(() => render(false), 220); };
  search.appendChild(inp);
  root.appendChild(search);

  const cat = cats[S.menuCat];
  const q = S.q.trim().toLowerCase();
  const stopped = stoppedItems(d).length;
  if (stopped) {
    const bar = el('button', 'tiny', `⛔ В стоп-листе сегодня: ${stopped} поз. — смотреть`);
    bar.style.cssText = 'display:block;padding:6px 4px 14px;color:var(--muted)';
    bar.onclick = () => openStopSheet(stoppedItems(d));
    root.appendChild(bar);
  }
  for (const sec of cat.sections || []) {
    const items = (sec.items || []).filter((it) => !q || (it.name + ' ' + (it.desc || '')).toLowerCase().includes(q));
    if (!items.length) continue;
    const p = el('div', 'paper');
    p.appendChild(el('h3', null, esc(sec.title)));
    if (q) p.appendChild(el('div', 'sub', `найдено: ${items.length}`));
    for (const it of items) {
      const row = el('button', 'item');
      let left = `<div class="nm">${esc(it.name)}${it.tags?.length ? it.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('') : ''}</div>${it.desc ? `<div class="ds">${esc(it.desc)}</div>` : ''}`;
      row.innerHTML = (it.image ? '' : '') + `<span class="tx" style="flex:1">${left}</span><span class="pr">${esc(it.price || '')}</span>`;
      if (it.stop) row.classList.add('stopped');
      if (it.image) row.insertBefore(imgBox('item-thumb', it.image), row.firstChild);
      row.onclick = () => openItemSheet(cat, sec, it);
      p.appendChild(row);
    }
    if (cat.title === 'Вино') p.appendChild(el('div', 'note', esc('Цены указаны за 125 мл / 750 мл')));
    root.appendChild(p);
  }
  requestAnimationFrame(placeThumb);
  return root;
}

function openItemSheet(cat, sec, it) {
  const w = el('div', 'stack');
  if (it.image) {
    const img = imgBox('', it.image, 'aspect-ratio:4/3;border-radius:18px;background-size:cover;background-position:center');
    w.appendChild(img);
  }
  const head = el('div');
  head.innerHTML = `<div style="font-family:'Playfair Display',serif;font-style:italic;color:var(--muted);font-size:13px">${esc(cat.title)} · ${esc(sec.title)}</div>
    <div style="font-size:21px;font-weight:800;margin-top:4px;text-transform:uppercase">${esc(it.name)}</div>
    ${it.desc ? `<p class="muted" style="font-size:14px;line-height:1.5">${esc(it.desc)}</p>` : ''}
    <div class="chips" style="margin-top:8px">${(it.tags || []).map((t) => `<span class="chip outline">${esc(t)}</span>`).join('')}${it.stop ? '<span class="chip stop">⛔ не продаётся</span>' : ''}</div>`;
  w.appendChild(head);
  const price = el('div');
  price.style.cssText = 'font-size:24px;font-weight:800;color:var(--accent-hi);font-variant-numeric:tabular-nums';
  price.textContent = fmtPrice(it.price);
  w.appendChild(price);
  openSheet('', w);
}
function fmtPrice(p) {
  const n = parseInt(String(p).replace(/[^\d]/g, ''), 10);
  if (!p) return 'по запросу';
  if (String(p).includes('/')) return String(p).replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' ₽';
  return String(p).replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' ₽';
}

/* ── Афиша ── */
function fmtDate(s) {
  try {
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', weekday: 'short' }).replace(',', '');
  } catch { return s; }
}
function vEvents(d) {
  const root = el('div', 'stack');
  root.appendChild(el('h1', 'big', 'Афиша'));
  root.appendChild(el('p', 'muted', 'Винил, сессии и гости за пультом'));
  const list = [...(d.events || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = new Date(new Date().toDateString());
  const upcoming = list.filter((e) => new Date((e.date || '') + 'T23:59') >= today).reverse();
  const past = list.filter((e) => new Date((e.date || '') + 'T23:59') < today);
  if (!upcoming.length && !past.length) { root.appendChild(el('div', 'card pad muted', 'Скоро анонсируем вечеринки 🎧')); return root; }
  if (upcoming.length) { root.appendChild(sectionHead('Скоро')); upcoming.forEach((e) => root.appendChild(eventCard(e, true))); }
  if (past.length) { root.appendChild(sectionHead('Было')); past.slice(0, 6).forEach((e) => root.appendChild(eventCard(e, false, true))); }
  return root;
}
function eventCard(e, showTime = true, past = false) {
  const card = el('button', 'event' + (past ? ' past' : ''));
  card.appendChild(imgBox('poster', e.image));
  const info = el('div', 'info');
  info.innerHTML = `<div class="dt">${esc(fmtDate(e.date))}${showTime && e.time ? ' · ' + esc(e.time) : ''}</div>
    <div class="ti">${esc(e.title)}</div>
    ${e.subtitle ? `<div class="su">${esc(e.subtitle)}</div>` : ''}`;
  card.appendChild(info);
  card.onclick = () => {
    if (e.image) openImageSheet(e.image, e.title);
    else toast(e.subtitle ? String(e.subtitle).split('\n')[0] : 'Анонс');
  };
  return card;
}
function openImageSheet(img, title) {
  const w = el('div');
  w.appendChild(imgBox('', img, 'width:100%;aspect-ratio:3/4;border-radius:18px;background-size:cover;background-position:center top'));
  openSheet(title || '', w);
}

/* ── Мерч (заглушки + заявки, без оплаты) ── */
function vMerch(d) {
  const root = el('div', 'stack');
  root.appendChild(el('h1', 'big', 'Мерч'));
  root.appendChild(el('p', 'muted', esc(d.merchNote || 'Фирменные вещи Catch 22. Оплата пока не подключена — оставляйте заявку, свяжемся.')));
  const grid = el('div', 'merch-grid');
  for (const m of d.merch || []) {
    const card = el('div', 'merch');
    const ph = imgBox('ph', m.image);
    if (m.tag) { const soon = el('div', 'soon', esc(m.tag)); ph.appendChild(soon); }
    card.appendChild(ph);
    const b = el('div', 'b');
    b.innerHTML = `<div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc || '')}</div><div class="p">${esc(m.price || '')}</div>`;
    const req = el('button', 'btn ghost', 'Оставить заявку');
    req.style.padding = '10px 12px';
    req.style.fontSize = '13.5px';
    req.onclick = () => openSheet(m.name, merchForm(m));
    b.appendChild(req);
    card.appendChild(b);
    grid.appendChild(card);
  }
  if (!(d.merch || []).length) grid.appendChild(el('div', 'card pad muted', 'Скоро здесь появятся фирменные вещи — подпишись, чтобы не пропустить.'));
  root.appendChild(grid);
  root.appendChild(el('p', 'tiny', '🧢 Заглушки: как только привезём принты и фото — обновим через админ-панель, приложение подхватит само.'));
  return root;
}
function merchForm(m) {
  return formSheet(
    '',
    [
      { name: 'item', label: 'Что интересует', type: 'text', value: m.name, required: true },
      { name: 'size', label: 'Размер / вариант', type: 'text', placeholder: 'M, L…' },
      { name: 'name', label: 'Ваше имя', type: 'text', required: true, autocomplete: 'name' },
      { name: 'contact', label: 'Телефон или @telegram', type: 'text', required: true, inputmode: 'tel', autocomplete: 'tel' },
      { name: 'comment', label: 'Комментарий', type: 'textarea', placeholder: 'по желанию' },
    ],
    'Отправить заявку',
    (v) => sendRequest('merch', { товар: v.item, размер: v.size, имя: v.name, комментарий: v.comment }, v.contact)
  );
}

/* ── Бронирование ── */
function bookingForm() {
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
    'Забронировать',
    (v) => sendRequest('booking', { дата: v.date, время: v.time, гостей: v.guests, имя: v.name, пожелания: v.comment }, v.contact)
      .then((ok) => (ok ? 'Подтвердим бронь в течение 15 минут ⏱' : false))
  );
}

/* ── Работа ── */
function jobForm() {
  const positions = S.data.jobs?.positions || ['Официант', 'Бармен', 'Кухня'];
  return formSheet(
    '',
    [
      { name: 'name', label: 'Имя и фамилия', type: 'text', required: true },
      { name: 'contact', label: 'Телефон или @telegram', type: 'text', required: true, inputmode: 'tel' },
      { name: 'position', label: 'Позиция', type: 'select', options: positions },
      { name: 'exp', label: 'Опыт', type: 'textarea', placeholder: 'по желанию' },
    ],
    'Отправить анкету',
    (v) => sendRequest('job', { имя: v.name, позиция: v.position, опыт: v.exp }, v.contact)
      .then((ok) => (ok ? 'Спасибо! Мы перечитаем и напишем 🤍' : false))
  );
}

/* ── Ещё ─ */
function vMore(d) {
  const root = el('div', 'stack');
  // профиль
  const prof = el('div', 'card pad');
  prof.style.textAlign = 'center';
  prof.innerHTML = `<div style="font-size:30px"><span class="brand-mark small" style="font-size:26px">${esc(d.meta.name)}</span></div>
    <div class="tiny" style="letter-spacing:.28em;text-transform:uppercase;color:var(--muted);margin-top:6px">${esc(d.meta.sub || '')}</div>
    <p class="muted" style="font-size:13.5px;white-space:pre-line;margin:10px 0 0">${esc(d.meta.tagline || '')}</p>`;
  root.appendChild(prof);

  // о нас
  const about = el('div', 'card');
  addRow(about, '📖', 'О баре', d.meta.about || '', null, true);
  root.appendChild(about);

  // часы
  const hours = el('div', 'card');
  hours.appendChild(el('div', 'row', `<span class="ic">${svg('clock', 18)}</span><span class="tx"><span class="t">Часы работы</span></span>`));
  for (const h of d.hours || []) {
    hours.appendChild(el('div', 'row', `<span class="tx" style="padding-left:6px"><span class="t" style="font-weight:${h.closed ? 500 : 600};font-size:14px;${h.closed ? 'color:var(--muted)' : ''}">${esc(h.days)}</span></span><span class="tiny" style="color:var(--accent-hi);font-weight:700">${esc(h.time)}</span>`));
  }
  root.appendChild(hours);

  // контакты
  const cont = el('div', 'card');
  addRow(cont, 'pin', 'Адрес', d.contacts.address || '', () => window.open(d.contacts.maps || `https://yandex.ru/maps/?text=${encodeURIComponent(d.contacts.address || '')}`, '_blank'));
  addRow(cont, 'phone', 'Телефон', d.contacts.phone || '', () => window.location.href = d.contacts.phoneHref || 'tel:' + String(d.contacts.phone || '').replace(/[^\d+]/g, ''));
  addRow(cont, 'mail', 'Почта', d.contacts.email || '', () => (window.location.href = 'mailto:' + (d.contacts.email || '')));
  if (d.contacts.bookingUrl) addRow(cont, 'web', 'Бронирование', d.contacts.bookingUrl.replace(/^https?:\/\//, ''), () => window.open(d.contacts.bookingUrl, '_blank'));
  const soc = el('div', 'row');
  soc.innerHTML = `<span class="tx"><span class="t">Соцсети</span></span><div class="socials"></div>`;
  const box = soc.querySelector('.socials');
  for (const s of d.socials || []) {
    if (!s.url) continue;
    const b = el('button', 'soc');
    b.innerHTML = svg(socialIcon(s.platform), 20);
    b.onclick = () => { haptic(); window.open(s.url, '_blank'); };
    box.appendChild(b);
  }
  if (d.meta.bot) {
    const b = el('button', 'soc');
    b.innerHTML = svg('tg', 20);
    b.onclick = () => { const l = `https://t.me/${d.meta.bot}`; TG?.openTelegramLink ? TG.openTelegramLink(l) : window.open(l, '_blank'); };
    box.appendChild(b);
  }
  cont.appendChild(soc);
  root.appendChild(cont);

  // награды/фишки
  if ((d.meta.awards || []).length) {
    const aw = el('div', 'card');
    d.meta.awards.forEach((a) => addRow(aw, a.icon && a.icon.length <= 4 ? null : 'disc', a.title || '', a.text || '', null, true, a.icon));
    root.appendChild(aw);
  }

  // бранч
  if (d.brunch?.enabled && d.brunch.image) {
    const br = el('div', 'card');
    addRow(br, '🍳', d.brunch.title || 'Бранч', (d.brunch.text || '').replace(/\n/g, ' · '), () => openImageSheet(d.brunch.image, d.brunch.title));
    root.appendChild(br);
  }

  // работа
  if (d.jobs?.enabled) {
    const jb = el('div', 'card');
    addRow(jb, 'brief', 'Работа в Catch 22', d.jobs.text || 'Оставь анкету', () => openSheet(d.jobs.title || 'Стань частью команды', jobForm()));
    root.appendChild(jb);
  }

  // галерея
  if ((d.gallery || []).length) {
    root.appendChild(sectionHead('Галерея'));
    const reel = el('div', 'reel');
    for (const g of d.gallery) {
      const f = el('figure');
      const img = el('img');
      img.loading = 'lazy';
      img.src = mediaUrl(g.src);
      img.onload = () => img.classList.add('on');
      img.onclick = () => openImageSheet(g.src, g.caption || '');
      f.appendChild(img);
      if (g.caption) f.appendChild(el('figcaption', null, esc(g.caption)));
      reel.appendChild(f);
    }
    root.appendChild(reel);
  }

  const cred = el('p', 'tiny');
  cred.style.cssText = 'text-align:center;padding:10px 0 2px';
  cred.innerHTML = `app by <a href="https://t.me/stonym0ntana" target="_blank">@stonym0ntana</a>${d.updatedAt ? ' · обновлено ' + fmtRel(d.updatedAt) : ''}`;
  root.appendChild(cred);
  return root;
}
function fmtRel(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
function addRow(card, icon, title, desc, onclick, wrapDesc, emojiIcon) {
  const r = el(onclick ? 'button' : 'div', 'row');
  const ic = el('span', 'ic');
  if (icon && ICONS[icon]) ic.innerHTML = svg(icon, 17);
  else if (icon) ic.textContent = icon;
  else ic.textContent = emojiIcon || '✦';
  const tx = el('span', 'tx', `<span class="t">${esc(title)}</span>${desc ? `<span class="d">${esc(desc)}</span>` : ''}`);
  r.append(ic, tx);
  if (onclick) { r.appendChild(el('span', 'chev', svg('chev', 15))); r.onclick = () => { haptic(); onclick(); }; }
  card.appendChild(r);
  return r;
}

/* ────────────────── тема / шапка / boot ────────────────── */
function applyTheme(t) {
  S.theme = t;
  document.documentElement.dataset.theme = t;
  localStorage.setItem('catch22-theme', t);
  $('#metatheme')?.setAttribute('content', t === 'dark' ? '#0e0b09' : '#f4eee4');
  try { TG?.setColorScheme?.(t === 'dark' ? 'dark' : 'light'); } catch {}
}
$('#theme-btn').onclick = () => { applyTheme(S.theme === 'dark' ? 'light' : 'dark'); haptic(); };

/* табы */
document.querySelectorAll('#tabbar button').forEach((b) => {
  b.querySelector('i').outerHTML = svg(b.dataset.tab === 'more' ? 'dots' : b.dataset.tab === 'home' ? 'house' : b.dataset.tab === 'menu' ? 'cutlery' : b.dataset.tab === 'events' ? 'cal' : 'tee');
  b.onclick = () => setTab(b.dataset.tab);
});

/* hash router */
function fromHash() {
  const [, tab, sub] = (location.hash || '').split('/');
  if (['home', 'menu', 'events', 'merch', 'more'].includes(tab)) return { tab, sub };
  return { tab: 'home' };
}
window.addEventListener('hashchange', () => { const { tab, sub } = fromHash(); if (tab !== S.tab) setTab(tab); if (tab === 'menu' && sub) { const idx = (S.data.menu?.categories || []).findIndex((c) => c.id === sub); if (idx >= 0) { S.menuCat = idx; render(false); } } });

/* ── старт ── */
(async function main() {
  applyTheme(S.theme);
  if (TG?.initDataUnsafe?.user) { /* можно персонифицировать */ }
  try { TG?.onEvent?.('themeChanged', (p) => { if (!localStorage.getItem('catch22-theme')) applyTheme(p.colorScheme || 'dark'); }); } catch {}
  await loadData(false);
  $('#boot').classList.add('gone');
  $('#app').setAttribute('aria-hidden', 'false');
  $('#app').classList.add('on');
  const { tab, sub } = fromHash();
  setTab(tab === 'home' ? 'home' : tab, { sub, animate: false, keepScroll: true });
  if (tab === 'menu' && sub) { const idx = (S.data.menu?.categories || []).findIndex((c) => c.id === sub || c.title === sub); if (idx >= 0) { S.menuCat = idx; render(false); } }
  startLive();
  // аккуратная пере-загрузка, если страница вернулась из фона
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadData(false); });
})();

/* segmented thumb position */
function placeThumb() {
  const seg = $('.seg-in');
  if (!seg) return;
  const active = seg.querySelector('button.on');
  const thumb = seg.querySelector('.seg-thumb');
  if (!active || !thumb) return;
  const pad = 3;
  thumb.style.left = active.offsetLeft + 'px';
  thumb.style.width = active.offsetWidth - 0 + 'px';
  void pad;
}
let thumbQueued = false;
new MutationObserver(() => {
  if (thumbQueued) return;
  thumbQueued = true;
  requestAnimationFrame(() => { thumbQueued = false; placeThumb(); });
}).observe(document.body, { childList: true, subtree: true });
window.addEventListener('resize', placeThumb);
})();
