import { esc } from '../util.js';
import { COPY_DEFAULT, COPY_LABELS } from '../../seed/copy.js';

/*
 * Админ-панель CATCH 22 прямо в Telegram.
 * Каждый блок приложения = экран; любое изменение мгновенно долетает
 * до веб-клиента (store → SSE → плавный ре-рендер без перезагрузки).
 * Фото: бот скачивает вложение (максимальный размер), кладёт в data/media
 * и сразу прописывает в выбранный блок. Никаких file_id в ответах.
 */

const kb = (rows) => ({ inline_keyboard: rows.filter(Boolean) });
const btn = (text, cb) => ({ text, callback_data: cb });
const urlBtn = (text, u) => ({ text, url: u });
const NAV = (back) => btn('⬅️ Назад', back);

export class Panel {
  constructor({ store, bot, adminIds, getAppUrl }) {
    this.store = store;
    this.bot = bot;
    this.adminIds = adminIds;
    this.getAppUrl = getAppUrl || (() => '');
    this.sessions = new Map();
  }

  isAdmin(id) {
    return this.adminIds.has(Number(id));
  }
  sess(chatId) {
    let s = this.sessions.get(chatId);
    if (!s) this.sessions.set(chatId, (s = { screen: { name: 'home' }, pending: null, msgId: null }));
    return s;
  }

  /* ────────────── render ────────────── */
  async render(chatId, screen, params = {}) {
    const s = this.sess(chatId);
    s.screen = { name: screen, ...params };
    const view = await this.view(chatId, s.screen);
    if (!view) return;
    let msg = null;
    if (s.msgId) {
      await this.bot.editMessage(chatId, s.msgId, view.text, { reply_markup: view.kb });
      msg = { message_id: s.msgId };
    } else {
      msg = await this.bot.sendMessage(chatId, view.text, { reply_markup: view.kb });
    }
    if (msg?.message_id) s.msgId = msg.message_id;
  }

  async view(chatId, screen) {
    const st = this.store.state;
    const S = this.store;

    switch (screen.name) {
      case 'home':
        return {
          text:
            `<b>🛠 Админ-панель ${esc(st.meta.name)}</b>\n` +
            `rev <code>${S.rev}</code> · новых заявок: <b>${S.newRequestsCount()}</b>\n\n` +
            `<i>Кидайте фото в любой момент — спрошу, куда поставить, и обновлю приложение сразу.</i>`,
          kb: kb([
            [btn('📱 Ссылка на приложение', 's:app'), btn('📊 Статус', 's:status')],
            [btn('🏷 О заведении', 's:meta'), btn('🕐 Часы работы', 's:hours')],
            [btn(' Меню', 's:menu'), btn('📅 Афиша', 's:events')],
            [btn('🥂 Бранч', 's:brunch'), btn('🧢 Мерч', 's:merch')],
            [btn('🖼 Галерея', 's:gallery'), btn('📞 Контакты', 's:contacts')],
            [btn('💼 Работа', 's:jobs'), btn('🧾 Заявки', 's:requests')],
            [btn('🅰️ Тексты UI', 's:copy'), btn('💳 Кошелёк', 's:wallet')],
            [btn('⛔ Стоп-лист', 's:stop'), btn('✖️ Сбросить ввод', 'a:cancel')],
          ]),
        };

      case 'app': {
        const url = this.getAppUrl();
        return {
          text:
            `<b>📱 Веб-приложение</b>\n` +
            (url ? `<a href="${esc(url)}">${esc(url)}</a>` : 'URL ещё не определён — bothost выдаст домен, я подхвачу его сам.') +
            `\n\nДля Telegram это кнопка «Открыть приложение» в меню бота.\nДля GitHub Pages пропишите этот URL в <code>public/config.js</code> (необязательно).`,
          kb: kb([url ? [urlBtn('🌐 Открыть', url)] : [], [NAV('s:home')]]),
        };
      }

      case 'status': {
        const b = this.bot._status || {};
        return {
          text:
            `<b>📊 Статус</b>\n` +
            `Режим бота: <b>${esc(b.mode || 'n/a')}</b>\n` +
            `Публичный URL: <code>${esc(b.publicUrl || '—')}</code>\n` +
            `Данные: <code>${esc(S.dataDir)}</code> · медиа: ${S.mediaCount()} файл(ов)\n` +
            `Заявок: ${S.private.requests.length} (новых ${S.newRequestsCount()}) · в стоп-листе: ${S.private.blocked.length}\n` +
            `rev состояния: ${S.rev}`,
          kb: kb([[btn('🔁 Проверить webhook', 'a:rehook'), btn('📤 Пинг-обновление', 'a:ping')], [NAV('s:home')]]),
        };
      }

      case 'meta': {
        const m = st.meta;
        const aw = m.awards.map((a, i) => [btn(`${a.icon || '🏆'} ${esc(a.title)}`, `aw:${i}`)]).slice(0, 8);
        return {
          text:
            `<b>🏷 О заведении</b>\n` +
            `Название: <b>${esc(m.name)}</b>\nПодпись: ${esc(m.sub)}\n\n` +
            `Слоган:\n<i>${esc(m.tagline)}</i>\n\nОписание:\n${esc(m.about)}\n\n` +
            `Герой главной: ${m.hero?.image ? '🖼 фото есть' : '— без фото'} · текст: <i>${esc((m.hero?.text || '').replace(/\n/g, ' '))}</i>\n` +
            `Кнопка: <b>${esc(m.hero?.cta || 'Забронировать стол')}</b> · Наград/фишек: ${m.awards.length}`,
          kb: kb([
            [btn('✏️ Название', 'f:meta:name'), btn('✏️ Подпись', 'f:meta:sub')],
            [btn('✏️ Слоган', 'f:meta:tagline'), btn('✏️ Описание', 'f:meta:about')],
            [btn('🖼 Фото главной', 'p:meta'), btn('🧹 Убрать фото', 'a:meta:herodel')],
            [btn('✏️ Текст героя', 'f:hero:text'), btn('✏️ Подпись героя', 'f:hero:subtitle')],
            [btn('✏️ Кнопка на главной', 'f:hero:cta'), btn('🖼 Фото «О нас»', 'p:about')],
            [btn('➕ Награда/блок', 'a:aw:add'), btn('🗑 Последняя', 'a:aw:del')],
            ...aw,
            [NAV('s:home')],
          ]),
        };
      }

      case 'hours': {
        const rows = st.hours.map((h, i) => [btn(`${h.closed ? '🚫' : '🕐'} ${esc(h.days)} · ${esc(h.time)}`, `hour:${i}`)]);
        rows.push([btn('➕ Добавить строку', 'h:add'), NAV('s:home')]);
        return { text: `<b>🕐 Часы работы</b>\nСтрока = «дни» + «время». Формат времени свободный, «Выходной» закрывает день.\nТекущий статус показывается на главной и в разделе «Ещё» в реальном времени.`, kb: kb(rows) };
      }

      case 'hour': {
        const h = st.hours[screen.i];
        if (!h) return this.view(chatId, { name: 'hours' });
        return {
          text: `<b>🕐 ${esc(h.days)}</b>\n${esc(h.time)}\nСтатус: ${h.closed ? '<i>закрыто</i>' : '<i>открыто</i>'}`,
          kb: kb([
            [btn('✏️ Дни', `f:hour:${screen.i}:days`), btn('✏️ Время', `f:hour:${screen.i}:time`)],
            [btn(h.closed ? '✅ Открыть' : '🚫 Закрыть', `a:hour:${screen.i}:toggle`), btn('🗑 Удалить', `a:hour:${screen.i}:del`)],
            [btn('⬆️ Выше', `a:hour:${screen.i}:up`), btn('⬇️ Ниже', `a:hour:${screen.i}:down`)],
            [NAV('s:hours')],
          ]),
        };
      }

      case 'contacts': {
        const c = st.contacts;
        return {
          text:
            `<b>📞 Контакты</b>\n` +
            `Адрес: ${esc(c.address || '—')}\nКарты: ${c.maps ? '📍 ссылка есть' : '—'}\nТелефон: ${esc(c.phone || '—')}\nEmail: ${esc(c.email || '—')}\n` +
            `Бронь: ${esc(c.bookingUrl || '—')} ${st.booking.enabled ? '🟢' : '⚪️ выкл'}\n` +
            `Плашка: <i>${esc(st.booking.text || '')}</i>\n` +
            `Соцсети: ${st.socials.map((x) => esc(x.platform)).join(', ') || '—'}`,
          kb: kb([
            [btn('✏️ Адрес', 'f:c:address'), btn('✏️ Карты', 'f:c:maps')],
            [btn('✏️ Телефон', 'f:c:phone'), btn('✏️ Email', 'f:c:email')],
            [btn('✏️ Ссылка брони', 'f:c:bookingUrl'), btn(st.booking.enabled ? '🟢 Бронь вкл' : '⚪️ Бронь выкл', 'a:book:toggle')],
            [btn('✏️ Текст про бронь', 'f:booktop:text'), btn('✏️ Плашка контактов', 'f:c:note')],
            [btn('🖼 Фото контактов', 'p:c'), btn('🖼 Фото брони', 'p:book')],
            ...st.socials.slice(0, 8).map((x, i) => [btn(`🔗 ${esc(x.platform)}`, `soc:${i}`)]),
            [btn('➕ Соцсеть', 'soc:add'), btn('🗑 Последнюю', 'soc:del')],
            [NAV('s:home')],
          ]),
        };
      }

      case 'soc': {
        const x = st.socials[screen.i];
        if (!x) return this.view(chatId, { name: 'contacts' });
        return {
          text: `<b>${esc(x.platform)}</b>\n${x.url ? `<a href="${esc(x.url)}">${esc(x.url)}</a>` : '<i>ссылка не задана</i>'}`,
          kb: kb([
            [btn('✏️ Название', `f:soc:${screen.i}:platform`), btn('✏️ Ссылка', `f:soc:${screen.i}:url`)],
            [btn('🗑 Удалить', `a:soc:${screen.i}:del`), NAV('s:contacts')],
          ]),
        };
      }

      case 'menu': {
        const rows = st.menu.categories.map((c, i) => {
          const n = c.sections.reduce((a, s2) => a + s2.items.length, 0);
          const stop = c.sections.reduce((a, s2) => a + s2.items.filter((x) => x.stop).length, 0);
          return [btn(`${c.icon || '🍴'} ${esc(c.title)} — ${n}${stop ? ` · ⛔${stop}` : ''}`, `menu:c:${i}`)];
        });
        rows.push([btn('➕ Категория', 'a:cat:add'), btn('🗑 Последняя', 'a:cat:del')]);
        rows.push([NAV('s:home')]);
        return { text: `<b>🍽 Меню</b>\nКатегории → разделы → позиции. Цена «890/2790» — две цены (например 40 мл / бутылка).`, kb: kb(rows) };
      }

      case 'menuCat': {
        const c = st.menu.categories[screen.i];
        if (!c) return this.view(chatId, { name: 'menu' });
        const rows = c.sections.map((s2, j) => [btn(`📂 ${esc(s2.title)} — ${s2.items.length}`, `menu:s:${screen.i}:${j}`)]);
        rows.push([btn('➕ Раздел', `a:sec:add:${screen.i}`), btn('🗑 Последний раздел', `a:sec:del:${screen.i}`)]);
        rows.push([btn('✏️ Название', `f:cat:${screen.i}:title`), btn('✏️ Иконка', `f:cat:${screen.i}:icon`)]);
        rows.push([btn('🖼 Обложка категории', `p:cat:${screen.i}`), btn(c.cover ? '🧹 Убрать обложку' : '🧹 Обложки нет', `a:cat:cover:${screen.i}`)]);
        rows.push([btn('✏️ Сноска снизу', `f:cat:${screen.i}:note`)]);
        rows.push([NAV('s:menu')]);
        return { text: `<b>${esc(c.icon || '')} ${esc(c.title)}</b>\nРазделов: ${c.sections.length}\nОбложка: ${c.cover ? '✅' : '—'} · сноска: ${c.note ? '✅' : '—'}`, kb: kb(rows) };
      }

      case 'menuSec': {
        const c = st.menu.categories[screen.i];
        const s2 = c?.sections[screen.j];
        if (!s2) return this.view(chatId, { name: 'menuCat', i: screen.i });
        const rows = [];
        const N = s2.items.length;
        const per = 12;
        const page = Math.min(Math.max(screen.page || 0, 0), Math.ceil(N / per) - 1);
        for (let k = page * per; k < Math.min(N, (page + 1) * per); k++) {
          const it = s2.items[k];
          rows.push([btn(`${it.stop ? '⛔' : it.image ? '🖼' : '·'} ${esc(it.name)}${it.price ? ' · ' + esc(it.price) : ''}`.slice(0, 60), `item:${screen.i}:${screen.j}:${k}`)]);
        }
        if (Math.ceil(N / per) > 1) {
          rows.push([btn(`◀️ ${page + 1}/${Math.ceil(N / per)}`, `a:secpg:${screen.i}:${screen.j}:${page - 1}`), btn('▶️', `a:secpg:${screen.i}:${screen.j}:${page + 1}`)]);
        }
        rows.push([btn('➕ Позицию', `a:it:add:${screen.i}:${screen.j}`)]);
        rows.push([btn('✏️ Название раздела', `f:sec:${screen.i}:${screen.j}:title`), btn('🗑 Удалить раздел', `a:sec:del:${screen.i}:${screen.j}`)]);
        rows.push([NAV(`menu:c:${screen.i}`)]);
        return {
          text: `<b>${esc(s2.title)}</b>\nПозиций: ${N}${N && s2.items.every((x) => x.stop) ? ' — всё в стоп-листе 🫡' : s2.items.some((x) => x.stop) ? ' · есть ⛔' : ''}`,
          kb: kb(rows),
        };
      }

      case 'item': {
        const it = this.getItem(screen);
        if (!it) return this.view(chatId, { name: 'menuSec', i: screen.i, j: screen.j });
        return {
          text:
            `<b>${esc(it.name)}</b> · ${esc(it.price || '—')}\n${it.desc ? esc(it.desc) + '\n' : ''}` +
            `${it.tags?.length ? 'Теги: <i>' + it.tags.map(esc).join(' · ') + '</i>\n' : ''}` +
            `Фото: ${it.image ? '✅' : '—'} · Стоп-лист: ${it.stop ? '<b>⛔ позиция не продаётся</b>' : 'нет'}`,
          kb: kb([
            [btn('✏️ Название', `f:it:${screen.i}:${screen.j}:${screen.k}:name`), btn('✏️ Цена', `f:it:${screen.i}:${screen.j}:${screen.k}:price`)],
            [btn('✏️ Описание', `f:it:${screen.i}:${screen.j}:${screen.k}:desc`), btn('✏️ Теги', `f:it:${screen.i}:${screen.j}:${screen.k}:tags`)],
            [btn('🖼 Фото', `p:it:${screen.i}:${screen.j}:${screen.k}`), btn(it.stop ? '✅ Снять со стопа' : '⛔ В стоп-лист', `a:stop:${screen.i}:${screen.j}:${screen.k}`)],
            [btn('⬆️', `a:move:it:${screen.i}:${screen.j}:${screen.k}:-1`), btn('⬇️', `a:move:it:${screen.i}:${screen.j}:${screen.k}:1`), btn('🗑 Удалить', `a:it:del:${screen.i}:${screen.j}:${screen.k}`)],
            [btn('➕ Добавить после', `a:it:addafter:${screen.i}:${screen.j}:${screen.k}`), NAV(`menu:s:${screen.i}:${screen.j}`)],
          ]),
        };
      }

      case 'events': {
        const rows = st.events.map((e, i) => [btn(`📅 ${esc(e.date)} · ${esc(e.title)}`.slice(0, 58), `event:${i}`)]);
        rows.push([btn('➕ Событие', 'a:ev:add'), btn('🗑 Последнее', 'a:ev:dellast')]);
        rows.push([NAV('s:home')]);
        return { text: `<b>📅 Афиша</b>\nДата — <code>YYYY-MM-DD</code>. В приложении события сортируются сами: будущие сверху, прошедшие затухают.`, kb: kb(rows) };
      }

      case 'event': {
        const e = st.events[screen.i];
        if (!e) return this.view(chatId, { name: 'events' });
        return {
          text: `<b>${esc(e.title)}</b>\n${esc(e.date)} ${esc(e.time || '')}\n${esc(e.subtitle || '')}\nПостер: ${e.image ? '✅' : '—'}`,
          kb: kb([
            [btn('✏️ Название', `f:ev:${screen.i}:title`), btn('✏️ Подзаголовок', `f:ev:${screen.i}:subtitle`)],
            [btn('✏️ Дата', `f:ev:${screen.i}:date`), btn('✏️ Время', `f:ev:${screen.i}:time`)],
            [btn('🖼 Постер', `p:ev:${screen.i}`), btn('🗑 Удалить', `a:ev:del:${screen.i}`)],
            [NAV('s:events')],
          ]),
        };
      }

      case 'brunch': {
        const b = st.brunch;
        return {
          text: `<b>🥂 Бранч</b>\n${b.enabled ? '🟢 Показан в приложении' : '⚪️ Скрыт'}\n\n<b>${esc(b.title || '')}</b>\n${esc(b.text || '')}\nПостер: ${b.image ? '✅' : '—'}`,
          kb: kb([
            [btn('✏️ Заголовок', 'f:br:title'), btn('✏️ Текст', 'f:br:text')],
            [btn('🖼 Постер', 'p:br'), btn(b.enabled ? '🙈 Скрыть' : '👁 Показать', 'a:br:toggle')],
            [NAV('s:home')],
          ]),
        };
      }

      case 'merch': {
        const rows = st.merch.map((m, i) => [btn(`🧢 ${esc(m.name)} — ${esc(m.price)}${m.image ? ' 📷' : ''}`.slice(0, 58), `mr:${i}`)]);
        rows.push([btn('➕ Товар', 'a:mr:add'), btn('✏️ Плашка', 'f:mrnote:text')]);
        rows.push([NAV('s:home')]);
        return {
          text: `<b>🧢 Мерч</b>\nОплата в приложении отключена: гость жмёт «Оставить заявку» — она приходит в «Заявки».\n<i>${esc(st.merchNote || '')}</i>`,
          kb: kb(rows),
        };
      }

      case 'merchItem': {
        const m = st.merch[screen.i];
        if (!m) return this.view(chatId, { name: 'merch' });
        return {
          text: `<b>${esc(m.name)}</b>\n${esc(m.desc || '')}\nЦена: <b>${esc(m.price)}</b> · метка: ${esc(m.tag || '—')}\nФото: ${m.image ? '✅' : '—'}`,
          kb: kb([
            [btn('✏️ Название', `f:mr:${screen.i}:name`), btn('✏️ Цена', `f:mr:${screen.i}:price`)],
            [btn('✏️ Описание', `f:mr:${screen.i}:desc`), btn('✏️ Метка', `f:mr:${screen.i}:tag`)],
            [btn('💳 Цена в TON', `f:mr:${screen.i}:ton`), btn('✏️ Текст кнопки', `f:mr:${screen.i}:cta`)],
            [btn('🖼 Фото', `p:mr:${screen.i}`), btn('🗑 Удалить', `a:mr:del:${screen.i}`)],
            [btn('🔀 Сдвинуть', `a:mr:move:${screen.i}`), NAV('s:merch')],
          ]),
        };
      }

      case 'gallery': {
        const rows = st.gallery.map((g, i) => [btn(`🖼 #${i + 1} ${esc(g.caption || 'без подписи')}`.slice(0, 58), `gal:${i}`)]);
        rows.push([btn('➕ Прислать фото', 'a:gal:add'), NAV('s:home')]);
        return { text: `<b>🖼 Галерея</b>\nЛента в разделе «Ещё». Подпись = caption фото.`, kb: kb(rows) };
      }

      case 'galItem': {
        const g = st.gallery[screen.i];
        if (!g) return this.view(chatId, { name: 'gallery' });
        return {
          text: `<b>Фото #${screen.i + 1}</b>\n${esc(g.caption || '—')}\n<code>${esc(g.src)}</code>`,
          kb: kb([[btn('✏️ Подпись', `f:gal:${screen.i}:caption`), btn('🗑 Удалить', `a:gal:del:${screen.i}`)], [NAV('s:gallery')]]),
        };
      }

      case 'jobs': {
        const j = st.jobs;
        return {
          text: `<b>💼 Работа</b>\n${j.enabled ? '🟢 Анкета открыта' : '⚪️ Скрыта'}\n\n<b>${esc(j.title || '')}</b>\n${esc(j.text || '')}\n\nПозиции: ${j.positions.map(esc).join(' / ') || '—'}`,
          kb: kb([
            [btn('✏️ Заголовок', 'f:j:title'), btn('✏️ Текст', 'f:j:text')],
            [btn('✏️ Позиции', 'f:j:positions'), btn(j.enabled ? '🙈 Скрыть' : '👁 Показать', 'a:j:toggle')],
            [btn('🖼 Фото-подложка', 'p:j'), NAV('s:home')],
          ]),
        };
      }

      case 'awItem': {
        const a = st.meta.awards[screen.i];
        if (!a) return this.view(chatId, { name: 'meta' });
        return {
          text: `<b>${esc(a.icon || '🏆')} ${esc(a.title)}</b>\n${esc(a.text || '')}\n\n<i>Это строка «фишки/награды» — показывается полосой на главной и в профиле.</i>`,
          kb: kb([
            [btn('✏️ Название', `f:aw:${screen.i}:title`), btn('✏️ Текст', `f:aw:${screen.i}:text`)],
            [btn('✏️ Иконка (эмодзи)', `f:aw:${screen.i}:icon`), btn('🔀 Переместить', `a:aw:move:${screen.i}`)],
            [btn('🗑 Удалить', `a:aw:del:${screen.i}`), NAV('s:meta')],
          ]),
        };
      }

      case 'copy': {
        const c = st.copy || {};
        const rows = Object.entries(COPY_LABELS).map(([k, label]) => [btn(`${esc(label)}`, `f:copy:${k}`)]);
        const shown = rows.slice(0, 10);
        shown.push([btn('🔄 Вернуть тексты по умолчанию', 'a:copy:reset'), NAV('s:home')]);
        return {
          text:
            `<b>🅰️ Тексты интерфейса</b>\nЗаголовки экранов, подписи вкладок и кнопок. Правится так же, как цены:\n` +
            Object.entries(COPY_LABELS).slice(0, 8).map(([k, l]) => `· ${esc(l)} — <b>${esc(c[k] || '—')}</b>`).join('\n') +
            `\n\n<i>Всего полей: ${Object.keys(COPY_LABELS).length}. Нажми любое — пришлю, что сейчас стоит.</i>`,
          kb: kb(shown),
        };
      }

      case 'wallet': {
        const w = st.wallet || {};
        return {
          text:
            `<b>💳 Кошелёк / оплата мерча</b>\n${w.enabled ? '🟢 Блок «Подключить кошелёк» показан в приложении' : '⚪️ Скрыт — мерч идёт через заявку (как сейчас)'}\n\n` +
            `Заголовок: <b>${esc(w.title || '—')}</b>\nТекст: ${esc(w.text || '—')}\nПлашка: <i>${esc(w.note || '—')}</i>\n` +
            `Ссылка: ${w.link ? `<a href="${esc(w.link)}">${esc(w.linkText || w.link)}</a>` : '—'} · фото: ${w.image ? '✅' : '—'}`,
          kb: kb([
            [btn(w.enabled ? '🙈 Скрыть блок' : '👁 Показать блок', 'a:wal:toggle'), btn('🖼 Фото', 'p:w')],
            [btn('✏️ Заголовок', 'f:w:title'), btn('✏️ Текст', 'f:w:text')],
            [btn('✏️ Плашка', 'f:w:note'), btn('✏️ Кнопка', 'f:w:button')],
            [btn('✏️ Ссылка', 'f:w:link'), btn('✏️ Подпись ссылки', 'f:w:linkText')],
            [NAV('s:home')],
          ]),
        };
      }

      case 'requests': {
        const list = S.private.requests.slice(0, 12);
        const icon = { merch: '🧢', booking: '📅', job: '💼', message: '💬' };
        const rows = list.map((r) => [btn(`${icon[r.type] || '🧾'} ${esc(r.fields?.name || r.contact || 'аноним')} · ${r.status}`.slice(0, 58), `rq:${r.id}`)]);
        if (!list.length)
          return { text: '<b>🧾 Заявок нет</b>\nБронь, мерч и анкеты с сайта — здесь. Новые прилетают сами.', kb: kb([[NAV('s:home')]]) };
        rows.push([btn('✅ Взять все в работу', 'a:req:take'), btn('🗑 Очистить закрытые', 'a:req:clear')]);
        rows.push([NAV('s:home')]);
        return { text: `<b>🧾 Заявки</b> — новых: ${S.newRequestsCount()} · всего: ${S.private.requests.length}`, kb: kb(rows) };
      }

      case 'request': {
        const r = S.private.requests.find((x) => x.id === screen.id);
        if (!r) return this.view(chatId, { name: 'requests' });
        const lines = Object.entries(r.fields).map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join('\n') || '—';
        return {
          text:
            `<b>🧾 ${esc(r.type)}</b> · ${esc(r.status)}\n${lines}\nконтакт: <code>${esc(r.contact || '—')}</code>\n` +
            `когда: <code>${esc(r.createdAt)}</code>` +
            (r.from?.userId ? `\nTelegram: ${esc(r.from.name || '')} <a href="https://t.me/${esc(r.from.username || '')}">${esc(r.from.username ? '@' + r.from.username : 'профиль')}</a>` : ''),
          kb: kb([
            r.status === 'new' ? [btn('🔧 В работу', `a:rq:${r.id}:work`)] : [btn('🏁 Закрыть', `a:rq:${r.id}:done`), btn('✅ Выполнено', `a:rq:${r.id}:done`)],
            r.from?.userId ? [btn('⛔ В стоп-лист', `a:rq:${r.id}:block`)] : [],
            [btn('🗑 Удалить', `a:rq:${r.id}:del`), NAV('s:requests')],
          ]),
        };
      }

      case 'stop': {
        const rows = S.private.blocked.slice(0, 15).map((b) => [btn(`⛔ ${esc(b.name || b.handle || String(b.userId || ''))}`, `bl:${b.id}`)]);
        rows.push([btn('➕ Внести', 'a:bl:add'), NAV('s:home')]);
        return {
          text:
            `<b>⛔ Стоп-лист гостей</b>\n` +
            `Гость из стоп-листа не может оставить заявку ботом (с сайта заявки помечаются ⚠️).\n` +
            `Как добавить: кнопка ниже, <code>/block @ник</code> или переслать сообщение гостя.`,
          kb: kb(rows),
        };
      }

      default:
        return null;
    }
  }

  getItem(screen) {
    return this.store.state.menu.categories?.[screen.i]?.sections?.[screen.j]?.items?.[screen.k];
  }

  /* ────────────── callbacks ────────────── */
  async onCallback(q) {
    const chatId = q.message?.chat?.id;
    const data = q.data || '';
    const ans = (text) => this.bot.answerCallback(q.id, text);
    if (!this.isAdmin(chatId)) return ans('⛔ Только для админов');

    // навигация
    if (data.startsWith('s:')) {
      await ans();
      return this.render(chatId, data.slice(2));
    }
    if (data === 'menu') { await ans(); return this.render(chatId, 'menu'); }
    if (data.startsWith('menu:c:')) { await ans(); return this.render(chatId, 'menuCat', { i: +data.slice(7) }); }
    if (data.startsWith('menu:s:')) { const [, , i, j, p] = data.split(':'); await ans(); return this.render(chatId, 'menuSec', { i: +i, j: +j, page: +(p || 0) }); }
    if (data.startsWith('a:secpg:')) { const [, i, j, p] = data.split(':'); await ans(); return this.render(chatId, 'menuSec', { i: +i, j: +j, page: Math.max(0, +p) }); }
    if (data.startsWith('item:')) { const [, i, j, k] = data.split(':'); await ans(); return this.render(chatId, 'item', { i: +i, j: +j, k: +k }); }
    if (data.startsWith('hour:')) { await ans(); return this.render(chatId, 'hour', { i: +data.split(':')[1] }); }
    if (data.startsWith('soc:')) { await ans(); return this.render(chatId, 'soc', { i: +data.split(':')[1] }); }
    if (data.startsWith('ev:') || data.startsWith('event:')) { await ans(); return this.render(chatId, 'event', { i: +data.split(':')[1] }); }
    if (data.startsWith('mr:')) { await ans(); return this.render(chatId, 'merchItem', { i: +data.split(':')[1] }); }
    if (data.startsWith('gal:')) { await ans(); return this.render(chatId, 'galItem', { i: +data.split(':')[1] }); }
    if (data.startsWith('aw:')) { await ans(); return this.render(chatId, 'awItem', { i: +data.split(':')[1] }); }
    if (data.startsWith('rq:')) { await ans(); return this.render(chatId, 'request', { id: data.split(':')[1] }); }
    if (data.startsWith('bl:')) { await ans(); return this.render(chatId, 'blItem', { id: data.split(':')[1] }); }
    if (data === 'a:cancel') {
      const s = this.sess(chatId);
      if (s.pending?.prompt) await this.bot.deleteMessage(chatId, s.pending.prompt).catch(() => {});
      s.pending = null;
      await ans('Отменено');
      return this.render(chatId, s.screen.name, s.screen);
    }

    // поле → режим ожидания ввода
    if (data.startsWith('f:')) return this.askField(chatId, q, data.split(':'));
    // фото → режим ожидания фото
    if (data.startsWith('p:')) {
      const s = this.sess(chatId);
      s.pending = { kind: 'photo', target: data.split(':').slice(1) };
      await ans('📸');
      await this.bot.sendMessage(chatId, 'Кидай фото 🖼 (или перешли любое). Скачаю оригинал и обновлю приложение в тот же момент.\n<i>/cancel — отмена.</i>');
      return;
    }

    const st = this.store.state;
    const U = (label, fn) => this.store.update(label, fn);

    switch (data) {
      case 'a:rehook': {
        await ans('🔁');
        const info = await this.bot.call('getWebhookInfo').catch((e) => ({ error: e.message }));
        return this.bot.sendMessage(chatId, `<b>WebhookInfo</b>\n<code>${esc(JSON.stringify(info))}</code>`, { reply_markup: kb([[NAV('s:status')]]) });
      }
      case 'a:ping':
        this.store.update('admin-ping', () => {});
        return ans(`✅ rev → ${this.store.rev}`);
      case 'h:add':
        U('hours:add', (s) => s.hours.push({ days: 'Новые дни', time: '16:00 – 00:00' }));
        return ans('Добавлено'), this.render(chatId, 'hours');
      case 'a:book:toggle':
        U('book', (s) => { s.booking.enabled = !s.booking.enabled; });
        return this.render(chatId, 'contacts');
      case 'a:meta:herodel':
        U('hero:del', (s) => { s.meta.hero.image = ''; });
        return ans('🧹'), this.render(chatId, 'meta');
      case 'a:aw:del':
        U('aw:del', (s) => s.meta.awards.pop());
        return this.render(chatId, 'meta');
      case 'a:copy:reset':
        U('copy:reset', (s) => { s.copy = { ...COPY_DEFAULT }; });
        return ans('✅'), this.render(chatId, 'copy');
      case 'a:aw:add': {
        const s = this.sess(chatId);
        s.pending = { kind: 'award', stage: 0 };
        await ans('');
        return this.bot.sendMessage(chatId, 'Шаг 1/2. Название награды/фишки (например <b>WhereToEat</b>):');
      }
      case 'a:j:toggle':
        U('j', (s) => { s.jobs.enabled = !s.jobs.enabled; });
        return this.render(chatId, 'jobs');
      case 'a:br:toggle':
        U('br', (s) => { s.brunch.enabled = !s.brunch.enabled; });
        return this.render(chatId, 'brunch');
      case 'a:cat:add':
        U('cat:add', (s) => s.menu.categories.push({ title: 'Новая категория', icon: '🍴', sections: [] }));
        return this.render(chatId, 'menu');
      case 'a:cat:del':
        U('cat:del', (s) => s.menu.categories.pop());
        return this.render(chatId, 'menu');
      case 'a:ev:add':
        U('ev:add', (s) => s.events.push({ date: nextSaturday(), time: '20:00 – 02:00', title: 'Новое событие', subtitle: '', image: '' }));
        return this.render(chatId, 'event', { i: st.events.length - 1 });
      case 'a:ev:dellast':
        U('ev:del', (s) => s.events.pop());
        return this.render(chatId, 'events');
      case 'a:mr:add':
        U('mr:add', (s) => s.merch.push({ name: 'Новый мерч', desc: 'Описание', price: 'скоро', tag: 'заглушка', image: '' }));
        return this.render(chatId, 'merchItem', { i: st.merch.length - 1 });
      case 'a:gal:add': {
        const s = this.sess(chatId);
        s.pending = { kind: 'photo', target: ['gal'] };
        await ans('📸');
        return this.bot.sendMessage(chatId, 'Прислай фото — добавлю в галерею. Caption станет подписью.');
      }
      case 'soc:add':
        U('soc:add', (s) => s.socials.push({ platform: 'Новая соцсеть', url: '' }));
        return this.render(chatId, 'contacts');
      case 'soc:del':
        U('soc:del', (s) => s.socials.pop());
        return this.render(chatId, 'contacts');
      case 'a:bl:add': {
        const s = this.sess(chatId);
        s.pending = { kind: 'block' };
        await ans('');
        return this.bot.sendMessage(chatId, 'Пришли <b>@ник</b>, <b>ID</b> или перешли сообщение гостя. Со второй строки — причина.');
      }
      case 'a:req:take':
        for (const r of [...this.store.private.requests]) if (r.status === 'new') this.store.setRequestStatus(r.id, 'in_work');
        return ans('✅'), this.render(chatId, 'requests');
      case 'a:req:clear':
        for (const r of [...this.store.private.requests]) if (r.status === 'done') this.store.delRequest(r.id);
        return ans('🗑'), this.render(chatId, 'requests');
      case 'a:ping2':
        return ans();
    }

    // действия с индексами
    let m;
    if ((m = data.match(/^a:hour:(\d+):(\w+)$/))) {
      const i = +m[1], act = m[2];
      U('hour', (s) => {
        const h = s.hours[i];
        if (!h) return;
        if (act === 'toggle') h.closed = !h.closed;
        else if (act === 'del') s.hours.splice(i, 1);
        else if (act === 'up' && i > 0) [s.hours[i - 1], s.hours[i]] = [s.hours[i], s.hours[i - 1]];
        else if (act === 'down' && i < s.hours.length - 1) [s.hours[i + 1], s.hours[i]] = [s.hours[i], s.hours[i + 1]];
      });
      await ans('✅');
      return this.render(chatId, s_hours(st, i) ? 'hour' : 'hours', { i });
    }
    if ((m = data.match(/^a:soc:(\d+):del$/))) {
      U('soc:del', (s) => s.socials.splice(+m[1], 1));
      await ans('🗑');
      return this.render(chatId, 'contacts');
    }
    if ((m = data.match(/^a:sec:del:(\d+)(?::(\d+))?$/))) {
      const i = +m[1];
      U('sec:del', (s) => (m[2] == null ? s.menu.categories[i].sections.pop() : s.menu.categories[i].sections.splice(+m[2], 1)));
      await ans('🗑');
      return this.render(chatId, 'menuCat', { i });
    }
    if ((m = data.match(/^a:sec:add:(\d+)$/))) {
      const i = +m[1];
      U('sec:add', (s) => s.menu.categories[i].sections.push({ title: 'Новый раздел', items: [] }));
      await ans('➕');
      return this.render(chatId, 'menuCat', { i });
    }
    if ((m = data.match(/^a:it:add:(\d+):(\d+)$/))) {
      const [_, i, j] = m.map(Number);
      U('it:add', (s) => s.menu.categories[i].sections[j].items.push({ name: 'Новая позиция', price: '', desc: '', tags: [], image: '', stop: false }));
      await ans('➕');
      return this.render(chatId, 'item', { i, j, k: st.menu.categories[i].sections[j].items.length - 1 });
    }
    if ((m = data.match(/^a:it:addafter:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      U('it:addafter', (s) => s.menu.categories[i].sections[j].items.splice(k + 1, 0, { name: 'Новая позиция', price: '', desc: '', tags: [], image: '', stop: false }));
      await ans('➕');
      return this.render(chatId, 'item', { i, j, k: k + 1 });
    }
    if ((m = data.match(/^a:it:del:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      U('it:del', (s) => s.menu.categories[i].sections[j].items.splice(k, 1));
      await ans('🗑');
      return this.render(chatId, 'menuSec', { i, j });
    }
    if ((m = data.match(/^a:move:it:(\d+):(\d+):(\d+):(-?\d+)$/))) {
      const [_, i, j, k, d] = m.map(Number);
      U('it:move', (s) => {
        const items = s.menu.categories[i].sections[j].items;
        const to = Math.max(0, Math.min(items.length - 1, k + d));
        const [it] = items.splice(k, 1);
        items.splice(to, 0, it);
      });
      await ans('↔️');
      const nk = Math.max(0, Math.min(st.menu.categories[i].sections[j].items.length - 1, k + d));
      return this.render(chatId, 'item', { i, j, k: nk });
    }
    if ((m = data.match(/^a:stop:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      U('stop', (s) => { const it = s.menu.categories[i].sections[j].items[k]; it.stop = !it.stop; });
      const on = st.menu.categories[i].sections[j].items[k].stop;
      await ans(on ? '⛔ добавлено в стоп' : '✅ снято');
      return this.render(chatId, 'item', { i, j, k });
    }
    if ((m = data.match(/^a:ev:del:(\d+)$/))) {
      const i = +m[1];
      U('ev:del', (s) => s.events.splice(i, 1));
      await ans('🗑');
      return this.render(chatId, 'events');
    }
    if ((m = data.match(/^a:mr:del:(\d+)$/))) {
      const i = +m[1];
      U('mr:del', (s) => s.merch.splice(i, 1));
      await ans('🗑');
      return this.render(chatId, 'merch');
    }
    if ((m = data.match(/^a:mr:move:(\d+)$/))) {
      const i = +m[1];
      U('mr:move', (s) => {
        if (s.merch.length < 2) return;
        const j = (i + 1) % s.merch.length;
        [s.merch[i], s.merch[j]] = [s.merch[j], s.merch[i]];
      });
      await ans('🔀');
      return this.render(chatId, 'merch');
    }
    if ((m = data.match(/^a:gal:del:(\d+)$/))) {
      U('gal:del', (s) => s.gallery.splice(+m[1], 1));
      await ans('🗑');
      return this.render(chatId, 'gallery');
    }
    if ((m = data.match(/^a:aw:(del|move):(\d+)$/))) {
      const act = m[1], i = +m[2];
      U('aw:' + act, (s) => {
        if (act === 'del') s.meta.awards.splice(i, 1);
        else if (s.meta.awards.length > 1) {
          const j = (i + 1) % s.meta.awards.length;
          [s.meta.awards[i], s.meta.awards[j]] = [s.meta.awards[j], s.meta.awards[i]];
        }
      });
      await ans('✅');
      return this.render(chatId, act === 'del' ? 'meta' : 'awItem', act === 'del' ? {} : { i });
    }
    if ((m = data.match(/^a:cat:cover:(\d+)$/))) {
      const i = +m[1];
      U('cat:cover', (s) => { const c = s.menu.categories[i]; if (c) c.cover = ''; });
      await ans('🧹');
      return this.render(chatId, 'menuCat', { i });
    }
    if ((m = data.match(/^a:wal:(\w+)$/))) {
      U('wallet', (s) => { s.wallet ||= {}; s.wallet.enabled = !s.wallet.enabled; });
      await ans(this.store.state.wallet.enabled ? '🟢 включили — приложение обновилось' : '⚪️ скрыли');
      return this.render(chatId, 'wallet');
    }
    if ((m = data.match(/^a:rq:(\S+):(\w+)$/))) {
      const [, id, act] = m;
      if (act === 'del') this.store.delRequest(id);
      if (act === 'done') this.store.setRequestStatus(id, 'done');
      if (act === 'work') this.store.setRequestStatus(id, 'in_work');
      if (act === 'block') {
        const r = this.store.private.requests.find((x) => x.id === id);
        if (r?.from?.userId) this.store.blockUser({ userId: r.from.userId, handle: r.from.username ? '@' + r.from.username : '', name: r.from.name || '', reason: 'заявка #' + id });
      }
      await ans('✅');
      return this.store.private.requests.some((x) => x.id === id)
        ? this.render(chatId, 'request', { id })
        : this.render(chatId, 'requests');
    }
    if ((m = data.match(/^a:unblock:(\S+)$/))) {
      this.store.unblockUser(m[1]);
      await ans('✅');
      return this.render(chatId, 'stop');
    }

    // свободный выбор фото: fpick:<...>
    if (data.startsWith('fpick:')) return this.handleFreePhotoPick(q);

    await ans('🤔');
  }

  s_hours(st, i) {
    return !!st.hours[i];
  }

  /* ────────────── выбор поля ────────────── */
  async askField(chatId, q, parts) {
    const s = this.sess(chatId);
    const field = parts[parts.length - 1];
    const target = parts.slice(1, -1); // ['meta','name'] без ведущего f
    s.pending = { kind: 'text', target, field };
    const hints = {
      name: 'новое название', sub: 'новая подпись', tagline: 'новый слоган (можно несколько строк)', about: 'новое описание',
      price: 'новая цена (590 · 890/2790 · «по запросу»)', desc: 'новое описание позиции', tags: 'теги через запятую (new, must try, chef) · «—» = очистить',
      days: 'дни («Пт – Сб»)', time: 'время («16:00 – 02:00»)',
      address: 'новый адрес', maps: 'ссылка на карты (https://)', phone: 'телефон', phoneHref: 'tel-ссылка', email: 'email',
      bookingUrl: 'ссылка на бронь', text: 'новый текст', title: 'новый заголовок', subtitle: 'новый подзаголовок',
      date: 'дата YYYY-MM-DD', positions: 'позиции через запятую', url: 'ссылка https://', platform: 'название соцсети',
      caption: 'подпись', icon: 'эмодзи-иконка (1 символ)', note: 'текст плашки',
      cta: 'текст кнопки', ton: 'цена в TON (например 0.12 TON)', link: 'https-ссылка',
      linkText: 'подпись ссылки', button: 'текст кнопки', about: 'новое описание',
    };
    const label = hints[field] || field;
    await this.bot.answerCallback(q.id, '✏️');
    const prompt = await this.bot.sendMessage(
      chatId,
      `✏️ <b>Отправь новое значение:</b> ${esc(label)}\n\n<i>/cancel — отменить</i>`,
    );
    if (prompt?.message_id) s.pending.prompt = prompt.message_id;
    return;
  }

  /* ────────────── сообщения админа ────────────── */
  async onMessage(msg) {
    const chatId = msg.chat?.id;
    if (msg.from?.is_bot) return false;
    if (!this.isAdmin(chatId)) return false;
    const s = this.sess(chatId);
    const st = this.store.state;

    if (/^\/(cancel)\b/i.test(msg.text || '')) {
      if (s.pending?.prompt) this.bot.deleteMessage(chatId, s.pending.prompt).catch(() => {});
      s.pending = null;
      return this.bot.sendMessage(chatId, '✖️ Отменено', { reply_markup: kb([[btn('🛠 Панель', 's:home')]]) });
    }

    if (s.pending?.kind === 'block') {
      const fwd = msg.forward_origin?.sender_user || msg.forward_from;
      let userId = fwd?.id || null, handle = '', name = '', reason = '';
      if (fwd) {
        name = [fwd.first_name, fwd.last_name].filter(Boolean).join(' ');
        handle = fwd.username ? '@' + fwd.username : '';
      }
      const text = msg.text || '';
      if (!userId) {
        const mm = text.match(/@([A-Za-z][A-Za-z0-9_]{3,31})/) || null;
        const mi = text.match(/(?<!\S)(\d{5,20})(?!\S)/);
        if (mm) handle = '@' + mm[1];
        if (mi) userId = Number(mi[2] || mi[1]);
      }
      reason = text.split(/\n/)[1]?.trim() || '';
      if (!userId && !handle) return this.bot.sendMessage(chatId, '🤔 Нужен @ник, Telegram ID или пересланное сообщение.');
      const entry = this.store.blockUser({ userId: userId || null, handle, name: name || handle, reason: reason.slice(0, 200) });
      if (s.pending.prompt) this.bot.deleteMessage(chatId, s.pending.prompt).catch(() => {});
      s.pending = null;
      return this.bot.sendMessage(chatId, entry ? `⛔ В стоп-листе: <b>${esc(entry.name || entry.handle || entry.userId)}</b>${entry.reason ? '\n' + esc(entry.reason) : ''}` : 'Уже в стоп-листе.', {
        reply_markup: kb([[btn('📋 Открыть стоп-лист', 's:stop')]]),
      });
    }

    if (s.pending?.kind === 'award' && msg.text) {
      if (s.pending.stage === 0) {
        s.pending = { kind: 'award', stage: 1, title: msg.text.trim() };
        return this.bot.sendMessage(chatId, `Отлично, «<b>${esc(msg.text.trim())}</b>». Теперь текст награды (иконку можно первым эмодзи):`);
      }
      const mm = msg.text.match(/^(\p{Extended_Pictographic}+)\s*/u);
      const icon = mm ? mm[1] : '🏆';
      const txt = (mm ? msg.text.slice(mm[0].length) : msg.text).trim();
      this.store.update('aw:add', (s2) => s2.meta.awards.push({ title: s.pending.title, text: txt || msg.text.trim(), icon }));
      s.pending = null;
      return this.render(chatId, 'meta');
    }

    if (s.pending?.kind === 'text') {
      const t = s.pending;
      const raw = msg.text ?? (msg.caption || '');
      let value = String(raw);
      const apply = () => {
        const target = resolveTarget(st, t.target);
        if (!target) throw new Error('не нашёл, куда писать');
        if (t.field === 'tags') target.tags = value.trim() && value.trim() !== '—' ? value.split(',').map((x) => x.trim()).filter(Boolean) : [];
        else if (t.field === 'positions') target.positions = value.split(',').map((x) => x.trim()).filter(Boolean);
        else if (t.target[0] === 'mrnote') st.merchNote = value;
        else target[t.field] = value;
      };
      const res = this.store.update('field:' + t.field, apply);
      if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
      s.pending = null;
      if (!res.ok) return this.bot.sendMessage(chatId, '⚠️ ' + esc(res.error));
      await this.bot.sendMessage(chatId, `✅ Обновлено · rev ${res.rev} — приложение уже обновилось`, { reply_markup: kb([[btn('↩️ Назад в панель', 's:home')]]) });
      return this.render(chatId, s.screen.name, s.screen);
    }

    const photo = pickPhoto(msg);
    if (photo && s.pending?.kind === 'photo') {
      return this.applyPhoto(chatId, photo, s.pending.target, msg.caption || '');
    }
    if (photo) {
      // не в редакторе — предложим цель
      const s2 = this.sess(chatId);
      s2.pending = { kind: 'photo', target: null, queue: [photo] };
      await this.bot.sendMessage(chatId, '📸 Фотку получил, оригинал скачан. Куда её?', {
        reply_markup: kb([
          [btn('🏷 На главную', 'fpick:meta'), btn('🖼 Галерея', 'fpick:gal')],
          [btn('🥂 Постер бранча', 'fpick:br'), btn('🍽 Позиция меню…', 'fpick:it')],
          [btn('📅 Событие…', 'fpick:ev'), btn('🧢 Мерч…', 'fpick:mr')],
          [btn('🖼 Фото «О нас»', 'fpick:about'), btn('📞 Фото контактов', 'fpick:c')],
          [btn('🎫 Фото брони', 'fpick:book'), btn('💼 Фото «Работа»', 'fpick:j')],
          [btn('✖️ Отмена', 'a:cancel')],
        ]),
      });
      return true;
    }

    // просто текст админа без pending → быстрые команды
    return false;
  }

  async handleFreePhotoPick(q) {
    const chatId = q.message.chat.id;
    const s = this.sess(chatId);
    const parts = q.data.split(':'); // fpick, t, idx...
    const [_, t, i2, j2, k2] = parts;
    if (parts.length === 2 && ['ev', 'mr', 'it'].includes(t)) return this.pickSubEntity(chatId, s, t);
    if (t === 'it' && parts.length === 3) return this.pickSec(chatId, s, +i2);
    if (t === 'it' && parts.length === 4) return this.pickItem(chatId, s, +i2, +j2);
    const photo = s.pending?.queue?.[0];
    if (!photo) {
      s.pending = null;
      return this.bot.sendMessage(chatId, 'Фото уже устарело — пришли ещё раз.');
    }
    await this.bot.answerCallback(q.id, '📥');
    const target = [t, i2, j2, k2].filter((x) => x != null);
    return this.applyPhoto(chatId, photo, target, s.pending?.caption || '');
  }

  pickSubEntity(chatId, s, kind) {
    const st = this.store.state;
    const rows = [];
    if (kind === 'ev') st.events.forEach((e, i) => rows.push([btn(`📅 ${e.date} · ${e.title}`.slice(0, 56), `fpick:ev:${i}`)]));
    if (kind === 'mr') st.merch.forEach((x, i) => rows.push([btn(`🧢 ${x.name}`.slice(0, 56), `fpick:mr:${i}`)]));
    if (kind === 'it') st.menu.categories.forEach((c, i) => rows.push([btn(`${c.icon || '🍴'} ${c.title}`, `fpick:it:${i}`)]));
    rows.push([btn('✖️ Отмена', 'a:cancel')]);
    s.pending.queue = s.pending.queue || [];
    return this.bot.sendMessage(chatId, 'Куда положить фото?', { reply_markup: kb(rows) });
  }

  pickSec(chatId, s, ci) {
    const c = this.store.state.menu.categories[ci];
    const rows = c.sections.map((x, i) => [btn(`📂 ${x.title}`, `fpick:it:${ci}:${i}`)]);
    rows.push([btn('✖️ Отмена', 'a:cancel')]);
    return this.bot.sendMessage(chatId, `Раздел в «${c.title}»?`, { reply_markup: kb(rows) });
  }

  pickItem(chatId, s, ci, si) {
    const items = this.store.state.menu.categories[ci].sections[si].items;
    const rows = [];
    items.forEach((x, k) => k < 30 && rows.push([btn(`${x.name}`.slice(0, 58), `fpick:it:${ci}:${si}:${k}`)]));
    rows.push([btn('✖️ Отмена', 'a:cancel')]);
    return this.bot.sendMessage(chatId, 'Какая позиция?', { reply_markup: kb(rows) });
  }

  /* ────────────── фото-пайплайн ────────────── */
  async applyPhoto(chatId, photo, target, caption) {
    let file;
    try {
      file = photo.buffer ? { buffer: photo.buffer, ext: photo.ext || 'jpg' } : await this.bot.downloadFile(photo.fileId);
    } catch (e) {
      return this.bot.sendMessage(chatId, '⚠️ Скачивание не удалось: ' + esc(e.message));
    }
    const media = this.store.saveMedia(file.buffer, file.ext);
    const t = target || [];
    let label = '';
    const res = this.store.update('photo', (s) => {
      if (t[0] === 'meta') { s.meta.hero.image = media.url; label = 'фото главной'; }
      else if (t[0] === 'about') { s.meta.aboutImage = media.url; label = 'фото карточки «О нас»'; }
      else if (t[0] === 'c') { s.contacts.image = media.url; label = 'фото контактов'; }
      else if (t[0] === 'book') { s.booking.image = media.url; label = 'фото брони'; }
      else if (t[0] === 'j') { s.jobs.image = media.url; label = 'фото-подложка «Работа»'; }
      else if (t[0] === 'w') { s.wallet.image = media.url; label = 'фото блока «Кошелёк»'; }
      else if (t[0] === 'cat') { const cc = s.menu.categories[+t[1]]; if (!cc) throw new Error('нет такой категории'); cc.cover = media.url; label = `обложка категории · ${cc.title}`; }
      else if (t[0] === 'gal') { s.gallery.unshift({ src: media.url, caption: caption || '' }); label = 'галерея (первым кадром)'; }
      else if (t[0] === 'br') { s.brunch.image = media.url; label = 'постер бранча'; }
      else if (t[0] === 'ev') { const e = s.events[+t[1]]; if (!e) throw new Error('нет такого события'); e.image = media.url; if (caption) e.subtitle = caption; label = `афиша · ${e.title}`; }
      else if (t[0] === 'mr') { const x = s.merch[+t[1]]; if (!x) throw new Error('нет такого товара'); x.image = media.url; if (caption) x.desc = caption; label = `мерч · ${x.name}`; }
      else if (t[0] === 'it') { const it = s.menu.categories[+t[1]]?.sections[+t[2]]?.items[+t[3]]; if (!it) throw new Error('нет такой позиции'); it.image = media.url; if (caption) it.desc = caption; label = `меню · ${it.name}`; }
      else throw new Error('неизвестная цель для фото');
    });
    this.sess(chatId).pending = null;
    if (!res.ok) return this.bot.sendMessage(chatId, '⚠️ ' + esc(res.error));
    await this.bot.sendMessage(
      chatId,
      `🖼 <b>${esc(label)}</b> — обновлено в приложении мгновенно · rev ${res.rev}\n<code>${esc(media.url)}</code>`,
      { reply_markup: kb([[btn('↩️ Назад', 's:home')]]) },
    );
    return true;
  }

  /* ────────────── публичный пользователь ────────────── */
  async publicStart(chatId, from) {
    if (this.store.isBlocked(from?.id)) {
      return this.bot.sendMessage(chatId, 'К сожалению, мы не сможем принять вашу заявку. Свяжитесь с баром напрямую 🙏');
    }
    const st = this.store.state;
    const url = this.getAppUrl();
    return this.bot.sendMessage(
      chatId,
      `<b>${esc(st.meta.name)}</b> · ${esc(st.meta.sub)}\n\n${esc(st.meta.tagline)}\n\n` +
        `В приложении: актуальное меню и цены, часы, афиша, бронирование, мерч и анкета для работы — всё обновляется живьём.`,
      {
        reply_markup: kb([
          url ? [urlBtn('📱 Открыть приложение', url)] : [],
          st.contacts.phone ? [urlBtn('📞 Позвонить', st.contacts.phoneHref || 'tel:' + String(st.contacts.phone).replace(/[^\d+]/g, ''))] : [],
          this.isAdmin(chatId) ? [btn('🛠 Админ-панель', 's:home')] : [],
        ]),
      },
    );
  }

  async notifyAdmins(text, markup) {
    for (const id of this.adminIds) await this.bot.sendMessage(id, text, { reply_markup: markup });
  }
}

/* утилиты */
function resolveTarget(state, target) {
  const [kind, i, j, k] = target;
  const idxs = target.slice(1).map((x) => +x);
  switch (kind) {
    case 'meta': return state.meta;
    case 'cat': return state.menu.categories[idxs[0]];
    case 'sec': return state.menu.categories[idxs[0]]?.sections[idxs[1]];
    case 'it': return state.menu.categories[idxs[0]]?.sections[idxs[1]]?.items[idxs[2]];
    case 'hour': return state.hours[idxs[0]];
    case 'c': return state.contacts;
    case 'booktop': return state.booking;
    case 'soc': return state.socials[idxs[0]];
    case 'ev': return state.events[idxs[0]];
    case 'br': return state.brunch;
    case 'j': return state.jobs;
    case 'gal': return state.gallery[idxs[0]];
    case 'mr': return state.merch[idxs[0]];
    case 'mrnote': return {}; // merchNote обрабатывается отдельно
    case 'hero': return state.meta.hero;
    case 'aw': return state.meta.awards?.[idxs[0]];
    case 'copy': return state.copy;
    case 'w': return state.wallet;
    default: return null;
  }
}

function pickPhoto(msg) {
  if (msg.photo?.length) return { fileId: msg.photo[msg.photo.length - 1].file_id };
  if (msg.document && /^image\//i.test(msg.document.mime_type || '')) {
    const ext = (String(msg.document.file_name).match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
    return { fileId: msg.document.file_id, ext: ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg' };
  }
  return null;
}

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
