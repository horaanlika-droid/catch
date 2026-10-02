import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './util.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
};

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, headers);
  res.end(body);
};
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });

/* простейший rate limiter для публичных POST */
const buckets = new Map();
function rateOk(ip, perMin = 6) {
  const now = Date.now();
  const b = buckets.get(ip) || [];
  const fresh = b.filter((t) => now - t < 60_000);
  if (fresh.length >= perMin) { buckets.set(ip, fresh); return false; }
  fresh.push(now);
  buckets.set(ip, fresh);
  return true;
}

export function createApp({ store, onWebhook, mode, hookSecret = '' }) {
  const clients = new Set(); // SSE

  store.on('rev', (rev, label) => {
    const payload = `event: rev\ndata: ${JSON.stringify({ rev, label })}\n\n`;
    for (const c of clients) c.write(payload);
  });

  const server = http.createServer((req, res) => {
    try { route(req, res); } catch (e) { log('http error', e); send(res, 500, 'error'); }
  });

  async function route(req, res) {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    cors(res);
    if (req.method === 'OPTIONS') return send(res, 204, '');

    /* API */
    if (p === '/api/state') {
      const body = JSON.stringify(store.publicState());
      const etag = store.etag;
      if (req.headers['if-none-match'] === etag) return send(res, 304, '', { etag });
      return send(res, 200, body, { 'content-type': 'application/json; charset=utf-8', etag, 'cache-control': 'no-cache' });
    }
    if (p === '/api/rev') return json(res, 200, { rev: store.rev, updatedAt: store.state.updatedAt });

    if (p === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write(`event: rev\ndata: ${JSON.stringify({ rev: store.rev, hello: true })}\n\n`);
      const beat = setInterval(() => res.write(': beat\n\n'), 25_000);
      clients.add(res);
      req.on('close', () => { clearInterval(beat); clients.delete(res); });
      return;
    }

    if (p === '/api/request' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
      if (!rateOk(ip)) return json(res, 429, { ok: false, error: 'Слишком часто. Подожди минутку 🙏' });
      const body = await readBody(req, 64 * 1024);
      let data;
      try { data = JSON.parse(body || '{}'); } catch { return json(res, 400, { ok: false, error: 'bad json' }); }
      const allowed = ['booking', 'job', 'message', 'team'];
      const type = allowed.includes(data.type) ? data.type : 'message';
      const entry = store.addRequest({
        type,
        fields: sanitizeFields(data.fields),
        contact: String(data.contact || '').trim(),
        from: data.from && Number.isFinite(+data.from.userId) ? { userId: +data.from.userId, username: String(data.from.username || '').slice(0, 32), name: String(data.from.name || '').slice(0, 80) } : null,
      });
      json(res, 200, { ok: true, id: entry.id });
      return;
    }

    if (p === '/media/' || p.startsWith('/media/')) {
      const f = store.mediaPathSafe(p.slice('/media/'.length));
      if (!f) return send(res, 404, 'not found');
      const ext = path.extname(f).toLowerCase();
      return send(res, 200, fs.readFileSync(f), { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' });
    }

    if (p === '/health') return json(res, 200, { ok: true, rev: store.rev, mode: mode() });

    /* Telegram webhook (путь с секретом: /webhook/<secret>) */
    if (p.startsWith('/webhook')) {
      if (hookSecret && p !== '/webhook/' + hookSecret) return send(res, 404, '');
      const body = await readBody(req, 512 * 1024);
      let upd = null;
      try { upd = JSON.parse(body); } catch {}
      if (upd && (upd.update_id || upd.message || upd.callback_query)) {
        setImmediate(() => onWebhook(upd).catch((e) => log('webhook handler:', e.message)));
        return send(res, 200, 'ok');
      }
      return send(res, 404, '');
    }

    /* статика public/ */
    let file = p === '/' ? '/index.html' : decodeURIComponent(p);
    if (!path.extname(file)) file += '/index.html'; // SPA fallback
    const full = path.normalize(path.join(PUB, file));
    if (!full.startsWith(PUB)) return send(res, 403, '');
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = path.extname(full).toLowerCase();
      const cache = file.startsWith('/img/') || file.startsWith('/media/') ? 'public, max-age=86400' : 'no-cache';
      return send(res, 200, fs.readFileSync(full), { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': cache });
    }
    return send(res, 404, 'not found');
  }

  server.on('request', () => {});
  return { server, clients };
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too big')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sanitizeFields(f) {
  const out = {};
  if (!f || typeof f !== 'object') return out;
  for (const [k, v] of Object.entries(f)) {
    if (Object.keys(out).length >= 12) break;
    if (/^[\w -]{1,40}$/.test(k) && (typeof v === 'string' || typeof v === 'number')) out[k] = String(v).slice(0, 400);
  }
  return out;
}
