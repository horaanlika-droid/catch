import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const uid = (p = 'x') =>
  p + '_' + Date.now().toString(36).slice(-6) + crypto.randomBytes(3).toString('hex');

export const nowIso = () => new Date().toISOString();

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function writeAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

export function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Простые HTML-теги в тексте сообщений (мы сами всё экранируем)
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// path вида "menu.categories.0.sections.1.items.2.price"
export function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, p, value) {
  const keys = p.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export function delPath(obj, p) {
  const keys = p.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o?.[keys[i]];
  if (!o) return;
  const last = keys[keys.length - 1];
  if (Array.isArray(o) && /^\d+$/.test(last)) o.splice(Number(last), 1);
  else delete o[last];
}

export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
