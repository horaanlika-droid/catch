import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJsonSafe, writeAtomic, log, sleep } from './util.js';
import { Store } from './store.js';
import { BotClient } from './tg.js';
import { Panel } from './admin/panel.js';
import { createApp } from './http.js';

/* ───────── конфигурация: на bothost.ru нужны ТОЛЬКО BOT_TOKEN и ADMIN_IDS ───────── */

function detectDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const appData = '/app/data'; // bothost.ru: персистентная папка между деплоями
  try {
    if (fs.existsSync('/app')) { ensureDir(appData); fs.accessSync(appData, fs.constants.W_OK); return appData; }
  } catch {}
  return path.join(process.cwd(), 'data');
}

function detectPublicUrl() {
  // 1. явный override
  const direct = process.env.PUBLIC_URL || process.env.WEBAPP_URL || process.env.APP_URL;
  if (direct) return direct.replace(/\/+$/, '');
  // 2. bothost.ru: домен в env DOMAIN
  const { DOMAIN, BOT_ID, USER_ID } = process.env;
  if (DOMAIN) return `https://${String(DOMAIN).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  // 3. bothost.ru: авто-поддомен из ID проекта (docs: подчёркивания → дефисы)
  if (BOT_ID && USER_ID) {
    const host = `bot-${BOT_ID}-${USER_ID}-user.bothost.tech`.replace(/_/g, '-');
    return `https://${host}`;
  }
  return '';
}

const parseAdminIds = () =>
  (process.env.ADMIN_IDS || '')
    .split(/[\s,;]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0);

async function reachable(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(url + '/health', { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/* ───────── boot ───────── */

const cfg = {
  token: process.env.BOT_TOKEN || process.env.API_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
  adminIds: parseAdminIds(),
  port: Number(process.env.PORT || 3000),
  dataDir: detectDataDir(),
  publicUrl: detectPublicUrl(),
  mode: (process.env.BOT_MODE || 'auto').toLowerCase(), // auto | webhook | polling
};

const store = new Store(cfg.dataDir);
const adminIds = new Set(cfg.adminIds);
let bot = null;
let panel = null;

const getAppUrl = () => cfg.publicUrl || '';

if (!cfg.token) {
  log('⚠️  BOT_TOKEN не задан — запускаюсь в демо-режиме: только веб-приложение (без бота).');
} else {
  bot = new BotClient(cfg.token);
  panel = new Panel({ store, bot, adminIds, getAppUrl });

  // заявки с сайта → админам
  store.on('request', (entry) => {
    const icon = { merch: '🧢', booking: '📅', job: '💼', message: '💬' }[entry.type] || '🧾';
    const blocked = entry.from?.userId ? store.isBlocked(entry.from.userId) : false;
    const lines = Object.entries(entry.fields).map(([k, v]) => `${k}: ${v}`);
    panel
      .notifyAdmins(
        `${icon} <b>Новая заявка · ${entry.type}</b>${blocked ? ' ⚠️ <b>ГОСТЬ В СТОП-ЛИСТЕ</b>' : ''}\n${lines.join('\n')}\nконтакт: <code>${entry.contact || '—'}</code>`,
        { inline_keyboard: [[{ text: '🧾 Открыть заявки', callback_data: 's:requests' }], [{ text: (blocked ? '✅ Разблокировать' : '⛔ В стоп-лист'), callback_data: 'a:reqtoggle:' + entry.id }]] },
      )
      .catch(() => {});
  });
}

// статус-строка для /api + панели
const status = { mode: 'web-only', webhook: '', publicUrl: cfg.publicUrl, dataDir: cfg.dataDir, secret: ensureWebhookSecret() };
if (bot) bot._status = status;

/* ───────── диспетчер Telegram-апдейтов (общий для webhook и polling) ───────── */
async function handleUpdate(upd) {
  if (!bot || !panel) return;
  if (upd.callback_query) {
    if (upd.callback_query.data?.startsWith('a:reqtoggle:')) {
      // кнопка из уведомления о заявке
      const id = upd.callback_query.data.split(':')[2];
      const q = upd.callback_query;
      const r = store.private.requests.find((x) => x.id === id);
      if (r?.from?.userId) {
        if (store.isBlocked(r.from.userId)) store.unblockUser(store.private.blocked.find((b) => b.userId === r.from.userId)?.id);
        else store.blockUser({ userId: r.from.userId, handle: r.from.username ? '@' + r.from.username : '', name: r.from.name || '' });
        await bot.answerCallback(q.id, store.isBlocked(r.from.userId) ? '⛔ внесён' : '✅ убран');
      } else await bot.answerCallback(q.id, 'нет контакта в заявке');
      return;
    }
    await panel.onCallback(upd.callback_query);
    return;
  }
  const msg = upd.message;
  if (!msg?.from) return;
  const from = msg.from;
  const isAdmin = panel.isAdmin(from.id);

  // команды
  const text = (msg.text || '').trim();
  if (text.startsWith('/start')) return panel.publicStart(msg.chat.id, from);
  if (text.startsWith('/panel')) {
    if (!isAdmin) return;
    return panel.render(msg.chat.id, 'home');
  }
  if (text.startsWith('/requests')) { if (isAdmin) await panel.render(msg.chat.id, 'requests'); return; }
  if (text.startsWith('/status')) { if (isAdmin) await panel.render(msg.chat.id, 'status'); return; }
  if (text.startsWith('/stop')) { if (isAdmin) await panel.render(msg.chat.id, 'stop'); return; }
  if (text.startsWith('/help')) {
    return bot.sendMessage(msg.chat.id,
      isAdmin
        ? '<b>Команды админа</b>\n/panel — панель · /requests — заявки · /stop — стоп-лист · /status — диагностика\nФото, отправленное боту, обрабатывается сразу и попадает в приложение.'
        : 'Привет! Меню, афиша, цены и часы — в веб-приложении. Здесь можно оставить заявку: напиши сообщение бату.');
  }
  if (text.startsWith('/block')) {
    if (!isAdmin) return;
    const mm = text.match(/@([A-Za-z][A-Za-z0-9_]{3,31})/) || text.match(/\b(\d{5,20})\b/);
    if (!mm) return bot.sendMessage(msg.chat.id, 'Используй: <code>/block @username</code> или <code>/block 123456789</code>');
    const entry = mm[1]?.length >= 3 && isNaN(+mm[1])
      ? store.blockUser({ userId: null, handle: '@' + mm[1], name: '@' + mm[1] })
      : store.blockUser({ userId: Number(mm[1]), handle: '', name: String(mm[1]) });
    return bot.sendMessage(msg.chat.id, entry ? `⛔ ${entry.handle || entry.userId} в стоп-листе` : 'уже там');
  }

  // админские сообщения/фото → в панель (pending-редакторы, свободные фото)
  if (isAdmin) {
    const consumed = await panel.onMessage(msg);
    if (consumed) return;
    if (/^\//.test(text)) return; // прочие слэш-команды игнор
  }

  // гость написал текст боту → превращаем в заявку
  if (msg.from && text && !isAdmin) {
    if (store.isBlocked(from.id)) return bot.sendMessage(msg.chat.id, 'Твоя заявка не может быть принята 🙏');
    const entry = store.addRequest({
      type: 'message',
      fields: { 'сообщение': text.slice(0, 400) },
      contact: from.username ? '@' + from.username : String(from.id),
      from: { userId: from.id, username: from.username || '', name: [from.first_name, from.last_name].filter(Boolean).join(' ') },
    });
    void entry;
    return bot.sendMessage(msg.chat.id, 'Записал ✅ Переведу бару, они свяжутся.', {
      reply_markup: getAppUrl() ? { inline_keyboard: [[{ text: '📱 Открыть приложение', url: getAppUrl() }]] } : undefined,
    });
  }
  // админ пишет текст без pending → тоже превращаем в "message"? Нет, тихо игнор.
}

/* ───────── HTTP + запуск ───────── */

const { server } = createApp({
  store,
  mode: () => status.mode,
  hookSecret: status.secret,
  onWebhook: async (upd) => {
    await handleUpdate(upd);
  },
});

server.listen(cfg.port, '0.0.0.0', async () => {
  log(`✅ web: http://0.0.0.0:${cfg.port} · данные: ${cfg.dataDir}${cfg.publicUrl ? ' · ' + cfg.publicUrl : ''}`);
  if (!bot) return;

  try {
    const me = await bot.init();
    log(`bot: @${me.username} (id ${me.id})`);
    status.botUsername = me.username;
    if (store.state.meta.bot !== me.username) {
      store.update('bot-username', (s) => { s.meta.bot = me.username; });
    }
  } catch (e) {
    log('❌ getMe не удался:', e.message);
    return;
  }

  // путь /webhook/<secret> уже защищён секретом из файла
  status.secret = ensureWebhookSecret();
  const candidates = [cfg.publicUrl].filter(Boolean);
  let webhookOk = false;

  if (candidates.length && cfg.mode !== 'polling') {
    const base = candidates[0];
    const hookUrl = `${base}/webhook/${status.secret}`;
    const alive = await reachable(base);
    if (alive) {
      try {
        await bot.call('setWebhook', { url: hookUrl, secret_token: status.secret, drop_pending_updates: false, allowed_updates: ['message', 'callback_query'] });
        status.mode = 'webhook';
        status.webhook = hookUrl;
        webhookOk = true;
        log('🪝 webhook установлен:', hookUrl);
      } catch (e) {
        log('webhook set failed:', e.message);
      }
    } else {
      log('ℹ️ Домен', base, 'пока не отвечает — перехожу на polling (после включения домена на bothost просто пересобери проект).');
    }
  }

  await bot.setupMiniApp(candidates[0] || '').catch(() => {});

  if (!webhookOk) {
    try { await bot.call('deleteWebhook', { drop_pending_updates: false }); } catch {}
    status.mode = 'polling';
    startPolling();
  }
});

function ensureWebhookSecret() {
  const f = path.join(cfg.dataDir, 'hook-secret');
  try {
    const v = fs.readFileSync(f, 'utf8').trim();
    if (v) return v;
  } catch {}
  const v = require_random();
  try { writeAtomic(f, v); } catch {}
  return v;
}
function require_random() {
  return Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
}

async function startPolling() {
  let offset = readJsonSafe(path.join(cfg.dataDir, 'tg-offset.json'), { o: 0 }).o;
  log('🔄 polling запущен');
  while (true) {
    try {
      const ups = await bot.getUpdates(offset + 1);
      if (ups?.length) {
        for (const u of ups) {
          try { await handleUpdate(u); } catch (e) { log('update error', e.message); }
          offset = Math.max(offset, u.update_id);
        }
        writeAtomic(path.join(cfg.dataDir, 'tg-offset.json'), JSON.stringify({ o: offset }));
      }
    } catch (e) {
      log('polling err:', e.message);
      await sleep(3000);
    }
  }
}

process.on('SIGTERM', () => { store.save(); process.exit(0); });
process.on('SIGINT', () => { store.save(); process.exit(0); });
process.on('unhandledRejection', (e) => log('unhandled:', e?.stack || e));
