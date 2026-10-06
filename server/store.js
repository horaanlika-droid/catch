import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { uid, nowIso, writeAtomic, readJsonSafe, ensureDir, log } from './util.js';
import { seed } from '../seed/data.js';
import { COPY_DEFAULT } from '../seed/copy.js';
import { LEGACY_MENU_NAMES_21 } from '../seed/legacy-2.1.js';

/*
 * Единый стор приложения.
 *  - state.json  — публичные данные приложения (меню, часы, афиша, команда, …)
 *  - private.json — приватное: заявки с сайта и подписчики бота (для пушей)
 *  - media/      — фото, загруженные через бота (сжимаются Telegram при выдаче,
 *                  мы сохраняем максимальный размер)
 * Любое изменение: rev++, debounce-save, событие 'rev' → SSE у клиентов.
 */

let idCounter = 0;
const nid = (p) => `${p}_${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ensureIds(arr, prefix) {
  if (!Array.isArray(arr)) return [];
  for (const it of arr) if (!it.id) it.id = nid(prefix);
  return arr;
}

function normItem(it) {
  it.price = it.price == null ? '' : String(it.price);
  it.name = String(it.name ?? '').trim();
  it.desc = String(it.desc ?? '').trim();
  it.image = it.image ?? '';
  it.tags = Array.isArray(it.tags) ? it.tags : [];
  it.stop = !!it.stop;
  return it;
}

/* Версия структуры данных: при загрузке старого state.json применяем миграцию,
   чтобы правки (фонотека + бар, часы, команда, ссылки) появились и там,
   где приложение уже работало. */
const STATE_VERSION = 2.2;

/** Перенос рабочих данных на текущую версию. Трогаем только дефолты — то,
 *  что бар уже переписал через бота, не затираем. */
export function migrateState(s) {
  const v = Number(s?._v || 2);
  if (v >= STATE_VERSION) return s;
  if (v < 2.1) migrate21(s);
  if (v < 2.2) migrate22(s);
  s._v = STATE_VERSION;
  return s;
}

function migrate21(s) {
  const d = seed;
  const hasBistro = (x) => /bistro|бистро/i.test(String(x || ''));

  /* 2.1 — «бистро» убрано, сверху «фонотека + бар» */
  s.meta ||= {};
  s.meta.hero ||= {};
  if (hasBistro(s.meta.sub)) s.meta.sub = d.meta.sub;
  if (hasBistro(s.meta.hero.subtitle)) s.meta.hero.subtitle = d.meta.hero.subtitle;
  if (hasBistro(s.meta.about)) s.meta.about = d.meta.about;
  if (hasBistro(s.meta.tagline)) s.meta.tagline = d.meta.tagline;
  if (hasBistro(s.meta.hero.text)) s.meta.hero.text = d.meta.hero.text;

  /* 2.1 — часы работы: вт/ср/чт/вс 16:00–00:00, пт/сб 16:00–02:00 */
  const oldHours = [['Вт – Чт, Вс', '16:00 – 01:00'], ['Пт – Сб', '16:00 – 02:00']];
  if (Array.isArray(s.hours) && s.hours.length === 3 && oldHours.every(([days, time], i) => s.hours[i]?.days === days && s.hours[i]?.time === time)) {
    s.hours = structuredClone(d.hours);
  }

  /* 2.1 — награды: Sobaka.ru (мы номинанты) и «сайт как награда» убираем */
  if (Array.isArray(s.meta.awards)) {
    s.meta.awards = s.meta.awards.filter(
      (a) => !/sobaka|собака/i.test(String(a?.title || '')) && !/catch-22-bar\.ru/i.test(String(a?.title || '')),
    );
    if (!s.meta.awards.length) s.meta.awards = structuredClone(d.meta.awards);
  }

  /* 2.1 — ссылки на сайт и инстаграм */
  s.contacts ||= {};
  if (!s.contacts.site) s.contacts.site = d.contacts.site;
  if (!s.contacts.instagram) s.contacts.instagram = d.contacts.instagram;
  if (!s.contacts.bookingUrl) s.contacts.bookingUrl = d.contacts.bookingUrl;
  s.socials = Array.isArray(s.socials) ? s.socials : [];
  for (const x of s.socials) {
    if (/inst/i.test(String(x.platform || '')) && !/catch22\.catch22\.catch22/.test(String(x.url || ''))) x.url = d.contacts.instagram;
    if (/^(сайт|site)$/i.test(String(x.platform || '')) && !x.url) x.url = d.contacts.site;
  }
  if (!s.socials.some((x) => /inst/i.test(String(x.platform || '')))) s.socials.unshift({ platform: 'Instagram', url: d.contacts.instagram });
  if (!s.socials.some((x) => /^(сайт|site)$/i.test(String(x.platform || '')))) s.socials.push({ platform: 'Сайт', url: d.contacts.site });

  /* 2.1 — мерча нет, вместо него блок «Команда» */
  if (!s.team) s.team = structuredClone(d.team);

  /* 2.1 — тексты интерфейса без мерча и кошелька */
  if (s.copy) for (const k of ['tabMerch', 'titleMerch', 'ctaMerch', 'merchSub', 'walletNote', 'titleWallet', 'ctaWallet']) delete s.copy[k];
  s._v = 2.1;
}

/* 2.2 — данные из пресс-кита бара: тексты, команда с фото, меню по официальной
   карте, фото интерьера/коктейлей. Заменяем только дефолты v2.1 — всё, что бар
   поменял через бота (свои тексты, фото из /media/, свои позиции), остаётся. */
const OLD_21 = {
  tagline: 'Винил. Коктейли. Comfort food.\nМузыка, которую хочется слушать.\nБар и фонотека Catch 22.',
  about: 'Музыкальный бар с коллекцией винила, коктейлями и comfort food. Фонотека Catch 22, наб. Фонтанки 86.',
  heroText: 'Музыкальный бар\nс коллекцией винила, коктейлями\nи comfort food.',
  awards: ['Фонотека', 'Бар', 'Кухня'],
  phone: '8 (931) 531-22-32',
  email: 'hello@catch-22-bar.ru',
  note: 'наб. реки Фонтанки, 86 — вход со двора, ищите вывеску 22',
  brunch: 'Суббота – Воскресенье\nс 16:00 до 18:00',
  teamText: 'Скоро покажем, кто ставит пластинки, мешает коктейли и готовит на кухне.',
  teamNote: 'Раздел в работе — добавим фото и имена команды.',
  images: ['/img/interior-vinyl.jpg', '/img/interior-chair.jpg', '/img/event-sept.jpg', '/img/brunch.jpg', ''],
};
const isOldImg = (x) => OLD_21.images.includes(String(x ?? ''));
const nameKey = (x) => String(x ?? '').toLowerCase().replace(/[’'`«»".,]/g, '').replace(/\s+/g, ' ').trim();

export function migrate22(s) {
  const d = seed;
  s.meta ||= {};
  s.meta.hero ||= {};
  const m = s.meta;
  if (!m.tagline || m.tagline === OLD_21.tagline) m.tagline = d.meta.tagline;
  if (!m.about || m.about === OLD_21.about) m.about = d.meta.about;
  if (!m.story) m.story = d.meta.story;
  if (!m.hero.text || m.hero.text === OLD_21.heroText) m.hero.text = d.meta.hero.text;
  if (isOldImg(m.hero.image)) m.hero.image = d.meta.hero.image;
  if (isOldImg(m.aboutImage)) m.aboutImage = d.meta.aboutImage;
  // награды: дефолтные три фишки → факты из пресс-кита; свои — оставляем,
  // но «Открытие года» Where2Drink добавляем наверх
  const aw = Array.isArray(m.awards) ? m.awards : [];
  const titles = aw.map((a) => String(a?.title || ''));
  if (!aw.length || (titles.length === OLD_21.awards.length && OLD_21.awards.every((t) => titles.includes(t)))) {
    m.awards = structuredClone(d.meta.awards);
  } else {
    // любые черновые формулировки премии (WhereToEat, W2D…) → точная из пресс-релиза
    const isW2D = (a) => /where\s*(2|to)\s*(eat|drink)|w2d|открытие года/i.test(`${a?.title || ''} ${a?.text || ''}`);
    m.awards = [structuredClone(d.meta.awards[0]), ...aw.filter((a) => !isW2D(a))];
  }

  s.contacts ||= {};
  if (s.contacts.phone === OLD_21.phone) s.contacts.phone = d.contacts.phone;
  if (s.contacts.email === OLD_21.email) s.contacts.email = d.contacts.email;
  if (s.contacts.note === OLD_21.note) s.contacts.note = d.contacts.note;
  if (isOldImg(s.contacts.image)) s.contacts.image = d.contacts.image;
  s.booking ||= {};
  if (isOldImg(s.booking.image)) s.booking.image = d.booking.image;
  s.brunch ||= {};
  if (s.brunch.text === OLD_21.brunch) s.brunch.text = d.brunch.text;
  s.jobs ||= {};
  if (isOldImg(s.jobs.image)) s.jobs.image = d.jobs.image;

  // команда: была заглушкой — ставим команду из пресс-кита
  s.team ||= {};
  if (!Array.isArray(s.team.members) || !s.team.members.length) s.team.members = structuredClone(d.team.members);
  if (!s.team.text || s.team.text === OLD_21.teamText) s.team.text = d.team.text;
  if (s.team.note === OLD_21.teamNote) s.team.note = d.team.note;
  if (isOldImg(s.team.image)) s.team.image = d.team.image;

  // галерея: если в ней только старые дефолтные кадры — меняем на фото из пресс-кита
  if (!Array.isArray(s.gallery) || s.gallery.every((g) => isOldImg(g?.src))) s.gallery = structuredClone(d.gallery);

  s.menu = migrateMenu22(s.menu, d.menu);
}

/** Меню → официальная карта. Сохраняем: стоп-лист, фото, загруженные ботом,
 *  позиции/разделы/категории, которые бар завёл сам. */
function migrateMenu22(old, fresh) {
  const next = structuredClone(fresh);
  if (!old || !Array.isArray(old.categories)) return next;
  const legacy = new Set(LEGACY_MENU_NAMES_21.map(nameKey));
  const oldItems = new Map();
  for (const c of old.categories) for (const sec of c.sections || []) for (const it of sec.items || []) oldItems.set(nameKey(it.name), it);

  // перенос состояния позиций (по названию)
  for (const c of next.categories) for (const sec of c.sections) for (const it of sec.items) {
    const prev = oldItems.get(nameKey(it.name));
    if (!prev) continue;
    if (prev.id) it.id = prev.id;
    if (prev.stop) it.stop = true;
    if (/^\/media\//.test(prev.image || '')) it.image = prev.image;
  }
  const freshNames = new Set();
  for (const c of next.categories) for (const sec of c.sections) for (const it of sec.items) freshNames.add(nameKey(it.name));

  for (const oc of old.categories) {
    const nc = next.categories.find((c) => c.id === oc.id || nameKey(c.title) === nameKey(oc.title));
    if (!nc) { next.categories.push(oc); continue; } // категория бара — целиком
    if (/^\/media\//.test(oc.cover || '')) nc.cover = oc.cover;
    if (oc.id) nc.id = oc.id;
    for (const os of oc.sections || []) {
      const own = (os.items || []).filter((it) => !legacy.has(nameKey(it.name)) && !freshNames.has(nameKey(it.name)));
      if (!own.length) continue;
      const ns = nc.sections.find((x) => nameKey(x.title) === nameKey(os.title)) || nc.sections.find((x) => nameKey(x.title).split(' ')[0] === nameKey(os.title).split(' ')[0]);
      if (ns) ns.items.push(...own);
      else nc.sections.push({ ...os, items: own });
    }
  }
  return next;
}

export function normalizeState(s) {
  s.meta ||= {};
  s.meta.awards = ensureIds(s.meta.awards || [], 'aw');
  s.meta.hero ||= {};
  s.hours = ensureIds(s.hours || [], 'h');
  s.contacts ||= {};
  s.socials = ensureIds(s.socials || [], 's');
  s.brunch ||= {};
  s.booking ||= {};
  s.menu ||= { categories: [] };
  s.menu.categories = ensureIds(s.menu.categories, 'cat');
  for (const c of s.menu.categories) {
    c.sections = ensureIds(c.sections || [], 'sec');
    for (const sec of c.sections) sec.items = ensureIds((sec.items || []).map(normItem), 'it');
  }
  s.events = ensureIds(s.events || [], 'ev');
  s.jobs ||= {};
  s.jobs.positions = Array.isArray(s.jobs.positions) ? s.jobs.positions : [];
  s.gallery = ensureIds(s.gallery || [], 'g');

  /* ── v2: оформление и тексты — всё это правится админ-ботом ── */
  // герой главной: подпись, текст, кнопка, фон
  const hero = (s.meta.hero ||= {});
  hero.text = String(hero.text ?? '');
  hero.cta = String(hero.cta ?? '');
  // обложки категорий меню + сноска под категорией
  for (const c of s.menu.categories) {
    c.cover = String(c.cover ?? '');
    c.note = String(c.note ?? '');
  }
  // фото-подложки разделов
  s.booking.image = String(s.booking.image ?? '');
  s.contacts.image = String(s.contacts.image ?? '');
  s.contacts.note = String(s.contacts.note ?? '');
  s.contacts.site = String(s.contacts.site ?? '');
  s.contacts.instagram = String(s.contacts.instagram ?? '');
  s.jobs.image = String(s.jobs.image ?? '');
  s.meta.aboutImage = String(s.meta.aboutImage ?? '');
  s.meta.story = String(s.meta.story ?? '');

  // блок «Команда» (вместо мерча): заглушка + список участников
  const t = (s.team ||= {});
  t.enabled = t.enabled !== false;
  t.title = String(t.title ?? 'КОМАНДА');
  t.text = String(t.text ?? '');
  t.note = String(t.note ?? '');
  t.image = String(t.image ?? '');
  t.members = ensureIds(t.members || [], 'tm');
  for (const m of t.members) {
    m.name = String(m.name ?? '');
    m.role = String(m.role ?? '');
    m.text = String(m.text ?? '');
    m.photo = String(m.photo ?? '');
  }

  // легаси v2.0: мерч и кошелёк из приложения убраны
  for (const legacy of ['merch', 'merchNote', 'wallet']) delete s[legacy];

  // тексты интерфейса: недостающие ключи добираем из seed/copy.js
  s.copy = Object.assign({}, COPY_DEFAULT, s.copy || {});

  s.updatedAt = nowIso();
  return s;
}

export class Store extends EventEmitter {
  constructor(dataDir) {
    super();
    this.dataDir = dataDir;
    this.stateFile = path.join(dataDir, 'state.json');
    this.privateFile = path.join(dataDir, 'private.json');
    this.mediaDir = path.join(dataDir, 'media');
    this.mediaUrlBase = '/media/';
    this.rev = 0;
    ensureDir(this.mediaDir);
    this.state = readJsonSafe(this.stateFile, null);
    if (!this.state || !this.state.menu) {
      this.state = normalizeState(structuredClone(seed));
      this.state._v = STATE_VERSION;
      this._saveNow();
    } else {
      this.rev = Number(this.state._rev) || 0;
      const raw = JSON.stringify(this.state);
      migrateState(this.state);
      const migrated = JSON.stringify(this.state) !== raw; // normalizeState трогает updatedAt, сравниваем до него
      normalizeState(this.state);
      if (migrated) {
        this.rev++;
        this.state._rev = this.rev;
        log(`store: данные перенесены на v${STATE_VERSION} — приложение обновится само`);
      }
      this._saveNow();
    }
    const pr = readJsonSafe(this.privateFile, null);
    this.private = pr && typeof pr === 'object' ? pr : { requests: [], subs: [] };
    this.private.requests ||= [];
    // подписчики бота: те, кто нажал /start — на них уходят пуши
    this.private.subs ||= [];
    // легаси: стоп-лист гостей больше не ведём (стоп-лист — только позиции меню)
    delete this.private.blocked;
    this._saveTimer = null;
  }

  _saveNow() {
    try {
      writeAtomic(this.stateFile, JSON.stringify(this.state));
    } catch (e) {
      log('store: не удалось сохранить состояние', e.message);
    }
  }

  _savePrivate() {
    try {
      writeAtomic(this.privateFile, JSON.stringify(this.private));
    } catch (e) {
      log('store: не удалось сохранить private', e.message);
    }
  }

  get etag() {
    return `W/"${this.rev}"`;
  }

  // Публичная выборка — то, что отдаётся сайту
  publicState() {
    const { meta, hours, contacts, socials, brunch, booking, menu, events, team, jobs, gallery, copy, updatedAt } = this.state;
    return { rev: this.rev, updatedAt, meta, hours, contacts, socials, brunch, booking, menu, events, team, jobs, gallery, copy };
  }

  update(label, fn) {
    try {
      fn(this.state);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    normalizeState(this.state);
    this.rev++;
    this.state._rev = this.rev;
    this.state.updatedAt = nowIso();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._saveNow(), 400);
    log(`state → обновлено (${label}), rev=${this.rev}`);
    this.emit('rev', this.rev, label);
    return { ok: true, rev: this.rev };
  }

  save() {
    clearTimeout(this._saveTimer);
    this._saveNow();
    this._savePrivate();
  }

  /* ── Медиа: приём файлов Telegram и любых буферов ─────────────────── */
  saveMedia(buffer, ext = 'jpg') {
    ensureDir(this.mediaDir);
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    fs.writeFileSync(path.join(this.mediaDir, name), buffer);
    return { name, url: this.mediaUrlBase + name };
  }

  mediaPathSafe(name) {
    const clean = path.basename(String(name || ''));
    if (!/^[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(clean)) return null;
    const p = path.join(this.mediaDir, clean);
    return fs.existsSync(p) ? p : null;
  }

  mediaCount() {
    try {
      return fs.readdirSync(this.mediaDir).length;
    } catch {
      return 0;
    }
  }

  /* ── Заявки (бронь / работа / вопрос) — только на сервере ───────────── */
  addRequest(req) {
    const entry = {
      id: nid('rq'),
      createdAt: nowIso(),
      status: 'new',
      type: String(req.type || 'question').slice(0, 20),
      fields: {},
      contact: String(req.contact || '').slice(0, 120),
      from: req.from || null,
    };
    for (const [k, v] of Object.entries(req.fields || {})) {
      if (typeof v === 'string' || typeof v === 'number') entry.fields[k] = String(v).slice(0, 400);
    }
    this.private.requests.unshift(entry);
    if (this.private.requests.length > 1000) this.private.requests.length = 1000;
    this._savePrivate();
    this.emit('request', entry);
    return entry;
  }

  setRequestStatus(id, status) {
    const r = this.private.requests.find((x) => x.id === id);
    if (!r) return null;
    r.status = status;
    this._savePrivate();
    return r;
  }

  delRequest(id) {
    const i = this.private.requests.findIndex((x) => x.id === id);
    if (i < 0) return false;
    this.private.requests.splice(i, 1);
    this._savePrivate();
    return true;
  }

  newRequestsCount() {
    return this.private.requests.filter((r) => r.status === 'new').length;
  }

  /* ── Подписчики бота: пуши гостям, которые открыли бота (/start) ────── */

  /** Записать гостя. Возвращает { entry, isNew } — isNew нужен, чтобы
   *  поздравить админов только с новым подписчиком, а не с каждым /start. */
  addSub(u) {
    const userId = Number(u?.userId || u?.id || 0);
    if (!userId) return null;
    const list = this.private.subs;
    let entry = list.find((s) => s.userId === userId);
    const isNew = !entry;
    if (!entry) {
      entry = { id: nid('sb'), userId, addedAt: nowIso(), blockedBot: false };
      list.unshift(entry);
      if (list.length > 20000) list.length = 20000;
    }
    entry.username = String(u.username || entry.username || '').slice(0, 32);
    entry.name = String(u.name || entry.name || '').slice(0, 80);
    entry.lastSeen = nowIso();
    entry.blockedBot = false;
    this._savePrivate();
    if (isNew) this.emit('sub', entry);
    return { entry, isNew };
  }

  /** Гость заблокировал бота (Telegram ответил 403) — больше не пушим. */
  markSubBlocked(userId, blocked = true) {
    const s = this.private.subs.find((x) => x.userId === Number(userId));
    if (!s) return null;
    s.blockedBot = !!blocked;
    if (blocked) s.blockedAt = nowIso();
    this._savePrivate();
    return s;
  }

  removeSub(id) {
    const i = this.private.subs.findIndex((s) => s.id === id);
    if (i < 0) return false;
    this.private.subs.splice(i, 1);
    this._savePrivate();
    return true;
  }

  /** Кому можно слать пуш: активные подписчики (не заблокировавшие бота). */
  pushTargets() {
    return this.private.subs.filter((s) => s.userId && !s.blockedBot);
  }

  subStats() {
    const all = this.private.subs.length;
    const blocked = this.private.subs.filter((s) => s.blockedBot).length;
    return { all, blocked, active: all - blocked };
  }

  /** Отметка о последней рассылке — показываем в панели. */
  setLastPush(info) {
    this.private.lastPush = { at: nowIso(), ...info };
    this._savePrivate();
    return this.private.lastPush;
  }
}
