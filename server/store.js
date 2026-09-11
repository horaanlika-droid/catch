import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { uid, nowIso, writeAtomic, readJsonSafe, ensureDir, log } from './util.js';
import { seed } from '../seed/data.js';

/*
 * Единый стор приложения.
 *  - state.json  — публичные данные приложения (меню, часы, афиша, мерч, …)
 *  - private.json — приватное: заявки с сайта, стоп-лист пользователей
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
  s.merch = ensureIds(s.merch || [], 'mr');
  s.jobs ||= {};
  s.jobs.positions = Array.isArray(s.jobs.positions) ? s.jobs.positions : [];
  s.gallery = ensureIds(s.gallery || [], 'g');
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
      this._saveNow();
    } else {
      this.rev = Number(this.state._rev) || 0;
    }
    const pr = readJsonSafe(this.privateFile, null);
    this.private = pr && typeof pr === 'object' ? pr : { requests: [], blocked: [] };
    this.private.requests ||= [];
    this.private.blocked ||= [];
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
    const { meta, hours, contacts, socials, brunch, booking, menu, events, merch, merchNote, jobs, gallery, updatedAt } = this.state;
    return { rev: this.rev, updatedAt, meta, hours, contacts, socials, brunch, booking, menu, events, merch, merchNote, jobs, gallery };
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

  /* ── Заявки (мерч / бронь / работа) — только на сервере ───────────── */
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

  /* ── Стоп-лист пользователей (для бота) ───────────────────────────── */
  blockUser(u) {
    if (u.userId && this.private.blocked.some((b) => b.userId === u.userId)) return null;
    const entry = { id: nid('bl'), addedAt: nowIso(), ...u };
    this.private.blocked.unshift(entry);
    this._savePrivate();
    return entry;
  }

  unblockUser(id) {
    const i = this.private.blocked.findIndex((b) => b.id === id);
    if (i < 0) return false;
    this.private.blocked.splice(i, 1);
    this._savePrivate();
    return true;
  }

  isBlocked(userId) {
    if (!userId) return false;
    return this.private.blocked.some((b) => b.userId === Number(userId));
  }
}
