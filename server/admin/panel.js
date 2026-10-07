import { esc, sleep } from '../util.js';
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
            `rev <code>${S.rev}</code> · новых заявок: <b>${S.newRequestsCount()}</b> · подписчиков: <b>${S.subStats().active}</b>\n\n` +
            `<i>Кидайте фото в любой момент — спрошу, куда поставить, и обновлю приложение сразу.</i>`,
          kb: kb([
            [btn('📱 Ссылка на приложение', 's:app'), btn('📊 Статус', 's:status')],
            [btn('🏷 О заведении', 's:meta'), btn('🕐 Часы работы', 's:hours')],
            [btn('🍽 Меню', 's:menu'), btn('📅 Афиша', 's:events')],
            [btn('⛔ Стоп-лист позиций', 's:stop'), btn('🖼 Галерея', 's:gallery')],
            [btn('👥 Команда', 's:team')],
            [btn('📞 Контакты', 's:contacts'), btn('💼 Работа', 's:jobs')],
            [btn('🧾 Заявки', 's:requests'), btn('📣 Пуши гостям', 's:push')],
            [btn('🅰️ Тексты UI', 's:copy'), btn('✖️ Сбросить ввод', 'a:cancel')],
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
            `Заявок: ${S.private.requests.length} (новых ${S.newRequestsCount()})\n` +
            `Позиций в стоп-листе: ${this.stoppedItems().length} · подписчиков бота: ${S.subStats().active}\n` +
            `rev состояния: ${S.rev}`,
          kb: kb([[btn('🔁 Проверить webhook', 'a:rehook'), btn('📤 Пинг-обновление', 'a:ping')], [NAV('s:home')]]),
        };
      }

      case 'meta': {
        const m = st.meta;
        const aw = m.awards.map((a, i) => [btn(`${String(i + 1).padStart(2, '0')} · ${esc(a.title)}`, `aw:${i}`)]).slice(0, 8);
        return {
          text:
            `<b>🏷 О заведении</b>\n` +
            `Название: <b>${esc(m.name)}</b>\nПодпись: ${esc(m.sub)}\n\n` +
            `Слоган:\n<i>${esc(m.tagline)}</i>\n\nОписание:\n${esc(m.about)}\n\n` +
            `История (экран «Ещё» → «О нас»): ${m.story ? esc(m.story.slice(0, 160)) + (m.story.length > 160 ? '…' : '') : '—'}\n\n` +
            `Герой главной: ${m.hero?.image ? '🖼 фото есть' : '— без фото'} · текст: <i>${esc((m.hero?.text || '').replace(/\n/g, ' '))}</i>\n` +
            `Кнопка: <b>${esc(m.hero?.cta || 'Забронировать стол')}</b> · Наград/фишек: ${m.awards.length}`,
          kb: kb([
            [btn('✏️ Название', 'f:meta:name'), btn('✏️ Подпись', 'f:meta:sub')],
            [btn('✏️ Слоган', 'f:meta:tagline'), btn('✏️ Описание', 'f:meta:about')],
            [btn('✏️ История «О нас»', 'f:meta:story')],
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
            `Сайт: ${c.site ? `<a href=\"${esc(c.site)}\">${esc(c.site)}</a>` : '—'}\n` +
            `Instagram: ${c.instagram ? `<a href=\"${esc(c.instagram)}\">${esc(c.instagram)}</a>` : '—'}\n` +
            `Бронь: ${esc(c.bookingUrl || '—')} ${st.booking.enabled ? '🟢' : '⚪️ выкл'}\n` +
            `Плашка: <i>${esc(st.booking.text || '')}</i>\n` +
            `Соцсети: ${st.socials.map((x) => esc(x.platform)).join(', ') || '—'}`,
          kb: kb([
            [btn('✏️ Адрес', 'f:c:address'), btn('✏️ Карты', 'f:c:maps')],
            [btn('✏️ Телефон', 'f:c:phone'), btn('✏️ Email', 'f:c:email')],
            [btn('🌐 Сайт', 'f:c:site'), btn('📸 Instagram', 'f:c:instagram')],
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
          return [btn(`${i + 1}. ${esc(c.title)} — ${n}${stop ? ` · ⛔${stop}` : ''}`, `menu:c:${i}`)];
        });
        rows.push([btn('➕ Категория', 'a:cat:add'), btn('🗑 Последняя', 'a:cat:del')]);
        rows.push([NAV('s:home')]);
        return {
          text:
            `<b>🍽 Меню</b>\nКатегории → разделы → позиции. Цена «890/2790» — две цены (например 40 мл / бутылка).\n\n` +
            `Позиции добавляются и правятся отсюда же: по шагам (название → цена → описание), ` +
            `списком «📋 Вставить списком» или тапом по готовой позиции.\n` +
            `Всё, что меняете, сразу улетает в приложение.`,
          kb: kb(rows),
        };
      }

      case 'menuCat': {
        const c = st.menu.categories[screen.i];
        if (!c) return this.view(chatId, { name: 'menu' });
        const rows = c.sections.map((s2, j) => [btn(`📂 ${esc(s2.title)} — ${s2.items.length}`, `menu:s:${screen.i}:${j}`)]);
        rows.push([btn('➕ Раздел', `a:sec:add:${screen.i}`), btn('🗑 Последний раздел', `a:sec:del:${screen.i}`)]);
        rows.push([btn('✏️ Название', `f:cat:${screen.i}:title`)]);
        rows.push([btn('✏️ Сноска снизу', `f:cat:${screen.i}:note`)]);
        rows.push([NAV('s:menu')]);
        return { text: `<b>${esc(c.title)}</b>\nРазделов: ${c.sections.length}\nСноска: ${c.note ? '✅' : '—'}\nКатегории показываются с векторными иконками; фото добавляются к отдельным позициям.`, kb: kb(rows) };
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
          rows.push([btn(`${it.stop ? '⛔' : it.image ? '📷' : '·'} ${esc(it.name)}${it.price ? ' · ' + esc(it.price) : ''}`.slice(0, 60), `item:${screen.i}:${screen.j}:${k}`)]);
        }
        if (Math.ceil(N / per) > 1) {
          rows.push([btn(`◀️ ${page + 1}/${Math.ceil(N / per)}`, `a:secpg:${screen.i}:${screen.j}:${page - 1}`), btn('▶️', `a:secpg:${screen.i}:${screen.j}:${page + 1}`)]);
        }
        rows.push([btn('➕ Позицию', `a:it:add:${screen.i}:${screen.j}`), btn('📋 Вставить списком', `a:it:bulk:${screen.i}:${screen.j}`)]);
        rows.push([btn('✏️ Название раздела', `f:sec:${screen.i}:${screen.j}:title`), btn('🗑 Удалить раздел', `a:sec:del:${screen.i}:${screen.j}`)]);
        rows.push([NAV(`menu:c:${screen.i}`)]);
        return {
          text:
            `<b>${esc(s2.title)}</b>\nПозиций: ${N}${N && s2.items.every((x) => x.stop) ? ' — всё в стоп-листе 🫡' : s2.items.some((x) => x.stop) ? ' · есть ⛔' : ''}\n\n` +
            `<i>Нажмите на позицию, чтобы изменить название, цену, состав, фото, теги, порядок или стоп-лист.</i>`,
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
            `Фото: ${it.image ? '✅' : 'не добавлено'}\nСтоп-лист: ${it.stop ? '<b>⛔ позиция не продаётся</b>' : 'нет'}`,
          kb: kb([
            [btn('✏️ Название', `f:it:${screen.i}:${screen.j}:${screen.k}:name`), btn('✏️ Цена', `f:it:${screen.i}:${screen.j}:${screen.k}:price`)],
            [btn('✏️ Состав/описание', `f:it:${screen.i}:${screen.j}:${screen.k}:desc`), btn('✏️ Теги', `f:it:${screen.i}:${screen.j}:${screen.k}:tags`)],
            [btn(it.image ? '🖼 Заменить фото' : '🖼 Добавить фото', `p:it:${screen.i}:${screen.j}:${screen.k}`), btn(it.image ? '🧹 Убрать фото' : '🧹 Фото нет', `a:it:photo:del:${screen.i}:${screen.j}:${screen.k}`)],
            [btn(it.stop ? '✅ Снять со стопа' : '⛔ В стоп-лист', `a:stop:${screen.i}:${screen.j}:${screen.k}`)],
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
            [btn('📣 Разослать анонс гостям', `a:ev:push:${screen.i}`), NAV('s:events')],
          ]),
        };
      }


      case 'team': {
        const t = st.team;
        const rows = t.members.map((m, i) => [btn(`👤 ${esc(m.name || 'без имени')}${m.role ? ' — ' + esc(m.role) : ''}${m.photo ? ' 📷' : ''}`.slice(0, 58), `tm:${i}`)]);
        rows.push([btn('➕ Участник', 'a:tm:add'), btn(t.enabled ? '🙈 Скрыть блок' : '👁 Показать блок', 'a:team:toggle')]);
        rows.push([btn('✏️ Заголовок', 'f:team:title'), btn('✏️ Текст', 'f:team:text')]);
        rows.push([btn('✏️ Плашка', 'f:team:note'), btn('🖼 Фото блока', 'p:team')]);
        rows.push([btn(t.image ? '🧹 Убрать фото блока' : '🧹 Фото блока нет', 'a:team:cover')]);
        rows.push([NAV('s:home')]);
        return {
          text:
            `<b>👥 Команда</b>\n${t.enabled ? '🟢 Блок виден в приложении (вкладка «Команда»)' : '⚪️ Скрыт'}\n\n` +
            `<b>${esc(t.title || '')}</b>\n${esc(t.text || '')}\nПлашка: <i>${esc(t.note || '')}</i>\n\n` +
            (t.members.length
              ? `Участников: ${t.members.length}. Нажмите на имя, чтобы изменить данные, фото или порядок; удаление запрашивает подтверждение.`
              : `Участников пока нет — в приложении показывается заглушка.\nДобавьте первого: имя, роль, описание и фото.`),
          kb: kb(rows),
        };
      }

      case 'teamMember': {
        const m = st.team.members[screen.i];
        if (!m) return this.view(chatId, { name: 'team' });
        return {
          text: `<b>👤 ${esc(m.name || '—')}</b>\n${esc(m.role || '— роль не указана —')}\n${esc(m.text || '')}\nФото: ${m.photo ? '✅' : 'не добавлено'}`,
          kb: kb([
            [btn('✏️ Изменить имя', `f:tm:${screen.i}:name`), btn('✏️ Изменить роль', `f:tm:${screen.i}:role`)],
            [btn('✏️ Изменить описание', `f:tm:${screen.i}:text`)],
            [btn(m.photo ? '🖼 Заменить фото' : '🖼 Добавить фото', `p:tm:${screen.i}`)],
            [btn('⬆️ Выше', `a:tm:move:${screen.i}:-1`), btn('⬇️ Ниже', `a:tm:move:${screen.i}:1`)],
            [btn('🗑 Удалить участника', `a:tm:confirm:${screen.i}`), NAV('s:team')],
          ]),
        };
      }

      case 'teamDelete': {
        const m = st.team.members[screen.i];
        if (!m) return this.view(chatId, { name: 'team' });
        return {
          text: `<b>Удалить участника?</b>\n${esc(m.name || 'Без имени')} будет удалён из списка команды. Действие нельзя отменить.`,
          kb: kb([[btn('🗑 Да, удалить', `a:tm:del:${screen.i}`), btn('Отмена', `tm:${screen.i}`)]]),
        };
      }

      case 'gallery': {
        const rows = st.gallery.map((g, i) => [btn(`🖼 Фото #${i + 1}`, `gal:${i}`)]);
        rows.push([btn('➕ Прислать фото', 'a:gal:add'), NAV('s:home')]);
        return { text: `<b>🖼 Галерея</b>\nЛента в разделе «Ещё». Подписи к изображениям не отображаются.`, kb: kb(rows) };
      }

      case 'galItem': {
        const g = st.gallery[screen.i];
        if (!g) return this.view(chatId, { name: 'gallery' });
        return {
          text: `<b>Фото #${screen.i + 1}</b>\n<code>${esc(g.src)}</code>`,
          kb: kb([
            [btn('🖼 Заменить фото', `p:galreplace:${screen.i}`)],
            [btn('⬆️ Выше', `a:gal:move:${screen.i}:-1`), btn('⬇️ Ниже', `a:gal:move:${screen.i}:1`)],
            [btn('🗑 Удалить', `a:gal:del:${screen.i}`), NAV('s:gallery')],
          ]),
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
          text: `<b>${esc(a.title)}</b>\n${esc(a.text || '')}\n\n<i>Показывается в инфографике на главной и в профиле. Векторная пиктограмма выбирается автоматически.</i>`,
          kb: kb([
            [btn('✏️ Название', `f:aw:${screen.i}:title`), btn('✏️ Текст', `f:aw:${screen.i}:text`)],
            [btn('🔀 Переместить', `a:aw:move:${screen.i}`), btn('🗑 Удалить', `a:aw:del:${screen.i}`)],
            [NAV('s:meta')],
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

      case 'push': {
        const stats = S.subStats();
        const last = S.private.lastPush;
        const s = this.sess(chatId);
        return {
          text:
            `<b>📣 Пуши гостям</b>\n` +
            `Открыли бота (нажали /start): <b>${stats.active}</b>${stats.blocked ? ` · заблокировали бота: ${stats.blocked}` : ''}\n` +
            `Кнопка «Открыть приложение» в пуше: ${s.pushAppBtn === false ? '⚪️ выкл' : '🟢 вкл'}\n` +
            (last
              ? `Последний пуш: <code>${esc(String(last.at || '').slice(0, 16).replace('T', ' '))}</code> — доставлено ${last.ok ?? 0} из ${last.total ?? 0}\n`
              : 'Пушей ещё не отправляли.\n') +
            `\n<i>Сообщение уйдёт всем гостям, которые открыли бота. Доступны HTML-теги &lt;b&gt;, &lt;i&gt;, &lt;a href&gt;, &lt;code&gt;.</i>`,
          kb: kb([
            [btn('✍️ Написать пуш', 'a:push:new'), btn('📸 Пуш с фото', 'a:push:photo')],
            [btn(s.pushAppBtn === false ? '🔗 Кнопку приложения: вкл' : '🔗 Кнопку приложения: выкл', 'a:push:appbtn')],
            [btn('👥 Подписчики', 's:subs'), btn('📅 Анонс из афиши', 'a:push:ev')],
            [NAV('s:home')],
          ]),
        };
      }

      case 'subs': {
        const stats = S.subStats();
        const rows = S.private.subs.slice(0, 14).map((x) => [
          btn(`${x.blockedBot ? '🚫' : '👤'} ${esc(x.name || x.username || String(x.userId))}`.slice(0, 56), `sub:${x.id}`),
        ]);
        if (!rows.length)
          return {
            text: '<b>👥 Подписчиков пока нет</b>\nКак только гость откроет бота и нажмёт /start — он появится здесь, и ему можно будет отправить пуш.',
            kb: kb([[NAV('s:push')]]),
          };
        rows.push([btn('🧹 Убрать заблокировавших', 'a:subs:clean')]);
        rows.push([NAV('s:push')]);
        return {
          text: `<b>👥 Подписчики бота</b>\nАктивных: ${stats.active} · всего: ${stats.all}${stats.blocked ? ` · 🚫 заблокировали бота: ${stats.blocked}` : ''}\n\n<i>Показаны последние ${Math.min(14, stats.all)}.</i>`,
          kb: kb(rows),
        };
      }

      case 'sub': {
        const x = S.private.subs.find((y) => y.id === screen.id);
        if (!x) return this.view(chatId, { name: 'subs' });
        return {
          text:
            `<b>${esc(x.name || 'без имени')}</b>\n` +
            `${x.username ? `ник: <code>@${esc(x.username)}</code>\n` : ''}id: <code>${x.userId}</code>\n` +
            `открыл бота: <code>${esc(String(x.addedAt || '').slice(0, 16).replace('T', ' '))}</code>\n` +
            `последний /start: <code>${esc(String(x.lastSeen || '').slice(0, 16).replace('T', ' '))}</code>\n` +
            (x.blockedBot ? '🚫 заблокировал бота — пуши не дойдут' : '🟢 пуши доходят'),
          kb: kb([
            [btn('📣 Отправить личное сообщение', `a:sub:ping:${x.id}`), btn('🗑 Убрать из списка', `a:sub:del:${x.id}`)],
            [NAV('s:subs')],
          ]),
        };
      }

      case 'requests': {
        const list = S.private.requests.slice(0, 12);
        const icon = { booking: '📅', job: '💼', message: '💬', team: '👥' };
        const rows = list.map((r) => [btn(`${icon[r.type] || '🧾'} ${esc(r.fields?.name || r.contact || 'аноним')} · ${r.status}`.slice(0, 58), `rq:${r.id}`)]);
        if (!list.length)
          return { text: '<b>🧾 Заявок нет</b>\nБронь, анкеты и сообщения с сайта — здесь. Новые прилетают сами.', kb: kb([[NAV('s:home')]]) };
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
            r.from?.userId ? [btn('💬 Написать гостю', `a:rq:${r.id}:reply`)] : [],
            [btn('🗑 Удалить', `a:rq:${r.id}:del`), NAV('s:requests')],
          ]),
        };
      }

      case 'stop': {
        const stopped = this.stoppedItems();
        const rows = stopped.slice(0, 14).map((x) => [btn(`⛔ ${esc(x.it.name)}`.slice(0, 56), `item:${x.i}:${x.j}:${x.k}`)]);
        rows.push([btn('➕ Позицию в стоп', 'a:stop:pick'), stopped.length ? btn('🧹 Очистить стоп-лист', 'a:stop:clear') : null].filter(Boolean));
        rows.push([NAV('s:home')]);
        return {
          text:
            `<b>⛔ Стоп-лист позиций</b>\nСегодня не продаём: <b>${stopped.length}</b>\n\n` +
            `В приложении такие позиции зачёркнуты, а на главной и в меню появляется плашка «${esc(st.copy.stopTitle || 'Сегодня не продаём')}».\n` +
            `<i>Стоп-лист — про позиции меню, не про гостей.</i>`,
          kb: kb(rows),
        };
      }

      case 'stopCat': {
        const rows = st.menu.categories.map((c, i) => [btn(`${i + 1}. ${esc(c.title)}`, `stopsec:${i}`)]);
        rows.push([btn('🧹 Очистить стоп-лист', 'a:stop:clear'), NAV('s:stop')]);
        return { text: '<b>⛔ Стоп-лист · категория</b>\nГде ищем позицию?', kb: kb(rows) };
      }

      case 'stopSec': {
        const c = st.menu.categories[screen.i];
        if (!c) return this.view(chatId, { name: 'stopCat' });
        const rows = c.sections.map((x, j) => [btn(`📂 ${esc(x.title)} — ${x.items.filter((y) => y.stop).length}/${x.items.length}`, `stopit:${screen.i}:${j}`)]);
        rows.push([NAV('s:stop')]);
        return { text: `<b>⛔ ${esc(c.title)} · раздел</b>`, kb: kb(rows) };
      }

      case 'stopItems': {
        const c = st.menu.categories[screen.i];
        const sec = c?.sections[screen.j];
        if (!sec) return this.view(chatId, { name: 'stopCat' });
        const rows = [];
        const page = Math.max(0, screen.page || 0);
        const per = 12;
        for (let k = page * per; k < Math.min(sec.items.length, (page + 1) * per); k++) {
          const it = sec.items[k];
          rows.push([btn(`${it.stop ? '✅ снять' : '⛔ в стоп'} · ${esc(it.name)}`.slice(0, 58), `a:stoptoggle:${screen.i}:${screen.j}:${k}`)]);
        }
        if (Math.ceil(sec.items.length / per) > 1)
          rows.push([btn(`◀️ ${page + 1}/${Math.ceil(sec.items.length / per)}`, `a:stoppg:${screen.i}:${screen.j}:${page - 1}`), btn('▶️', `a:stoppg:${screen.i}:${screen.j}:${page + 1}`)]);
        rows.push([NAV(`stopsec:${screen.i}`)]);
        return { text: `<b>⛔ ${esc(sec.title)}</b>\nТап — добавить в стоп или снять.`, kb: kb(rows) };
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
    if (data.startsWith('tm:')) { await ans(); return this.render(chatId, 'teamMember', { i: +data.split(':')[1] }); }
    if (data.startsWith('gal:')) { await ans(); return this.render(chatId, 'galItem', { i: +data.split(':')[1] }); }
    if (data.startsWith('aw:')) { await ans(); return this.render(chatId, 'awItem', { i: +data.split(':')[1] }); }
    if (data.startsWith('rq:')) { await ans(); return this.render(chatId, 'request', { id: data.split(':')[1] }); }
    if (data.startsWith('sub:')) { await ans(); return this.render(chatId, 'sub', { id: data.split(':')[1] }); }
    // стоп-лист позиций: категория → раздел → позиции
    if (data.startsWith('stopsec:')) { await ans(); return this.render(chatId, 'stopSec', { i: +data.split(':')[1] }); }
    if (data.startsWith('stopit:')) { const [, i, j, pg] = data.split(':'); await ans(); return this.render(chatId, 'stopItems', { i: +i, j: +j, page: +(pg || 0) }); }
    if (data.startsWith('a:stoppg:')) { const [, i, j, pg] = data.split(':'); await ans(); return this.render(chatId, 'stopItems', { i: +i, j: +j, page: Math.max(0, +pg) }); }
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
        return this.bot.sendMessage(chatId, 'Шаг 1/2. Название факта для инфографики (например <b>Звук Tannoy</b>):');
      }
      case 'a:j:toggle':
        U('j', (s) => { s.jobs.enabled = !s.jobs.enabled; });
        return this.render(chatId, 'jobs');
      case 'a:cat:add':
        U('cat:add', (s) => s.menu.categories.push({ title: 'Новая категория', sections: [] }));
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
      case 'a:team:toggle':
        U('team', (s) => { s.team.enabled = !s.team.enabled; });
        await ans(this.store.state.team.enabled ? '🟢 блок «Команда» виден' : '⚪️ блок скрыт');
        return this.render(chatId, 'team');
      case 'a:tm:add': {
        const s = this.sess(chatId);
        s.pending = { kind: 'member', stage: 0 };
        await ans('');
        return this.bot.sendMessage(chatId, 'Шаг 1/3. Имя (или «Имя Фамилия»):');
      }
      case 'a:gal:add': {
        const s = this.sess(chatId);
        s.pending = { kind: 'photo', target: ['gal'] };
        await ans('📸');
        return this.bot.sendMessage(chatId, 'Пришлите фото — добавлю в галерею без подписи к изображению.');
      }
      case 'soc:add':
        U('soc:add', (s) => s.socials.push({ platform: 'Новая соцсеть', url: '' }));
        return this.render(chatId, 'contacts');
      case 'soc:del':
        U('soc:del', (s) => s.socials.pop());
        return this.render(chatId, 'contacts');

      /* ── пуши гостям, которые открыли бота ── */
      case 'a:push:new':
      case 'a:push:photo': {
        const s = this.sess(chatId);
        s.draft = null;
        s.pending = { kind: 'push', withPhoto: data === 'a:push:photo' };
        await ans('✍️');
        const prompt = await this.bot.sendMessage(
          chatId,
          s.pending.withPhoto
            ? '📸 Пришли фото для пуша (подпись спрошу следующим шагом). <i>/cancel — отмена.</i>'
            : `✍️ Напиши текст пуша — уйдёт ${this.store.subStats().active} гостям, которые открыли бота.\nМожно несколько строк и HTML-теги &lt;b&gt;, &lt;i&gt;, &lt;a href="…"&gt;.\n\n<i>/cancel — отмена.</i>`,
        );
        if (prompt?.message_id) s.pending.prompt = prompt.message_id;
        return;
      }
      case 'a:push:appbtn': {
        const s = this.sess(chatId);
        s.pushAppBtn = s.pushAppBtn === false;
        await ans(s.pushAppBtn === false ? '⚪️ кнопка выключена' : '🟢 кнопка включена');
        return this.render(chatId, 'push');
      }
      case 'a:push:ev': {
        // ближайшее будущее событие; если афиша вся в прошлом — самое свежее
        const today = new Date().toISOString().slice(0, 10);
        const ev =
          [...st.events].filter((e) => String(e.date || '') >= today).sort((a, b) => (a.date > b.date ? 1 : -1))[0] ||
          [...st.events].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        if (!ev) { await ans('в афише пусто'); return this.render(chatId, 'events'); }
        this.sess(chatId).draft = this.eventDraft(ev);
        await ans('');
        return this.confirmPush(chatId);
      }
      case 'a:push:send': {
        const s = this.sess(chatId);
        if (!s.draft?.text) { await ans('черновик пуст'); return this.render(chatId, 'push'); }
        const draft = s.draft;
        s.draft = null;
        s.pending = null;
        await ans('📨');
        return this.broadcast(chatId, draft);
      }
      case 'a:push:cancel': {
        const s = this.sess(chatId);
        if (s.pending?.prompt) await this.bot.deleteMessage(chatId, s.pending.prompt).catch(() => {});
        s.draft = null;
        s.pending = null;
        await ans('✖️');
        return this.render(chatId, 'push');
      }
      case 'a:subs:clean': {
        const before = this.store.private.subs.length;
        for (const x of [...this.store.private.subs]) if (x.blockedBot) this.store.removeSub(x.id);
        await ans(`🧹 убрали ${before - this.store.private.subs.length}`);
        return this.render(chatId, 'subs');
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
    /* новая позиция — по шагам: название → цена → описание */
    if ((m = data.match(/^a:it:add:(\d+):(\d+)$/))) {
      const [_, i, j] = m.map(Number);
      const s = this.sess(chatId);
      s.pending = { kind: 'item', i, j, insertAt: null, stage: 0 };
      await ans('➕');
      return this.askItemStep(chatId, s.pending);
    }
    if ((m = data.match(/^a:it:addafter:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      const s = this.sess(chatId);
      s.pending = { kind: 'item', i, j, insertAt: k + 1, stage: 0 };
      await ans('➕');
      return this.askItemStep(chatId, s.pending);
    }
    /* сразу пачкой: «Название | описание | цена» построчно */
    if ((m = data.match(/^a:it:bulk:(\d+):(\d+)$/))) {
      const [_, i, j] = m.map(Number);
      const s = this.sess(chatId);
      s.pending = { kind: 'itembulk', i, j };
      await ans('📋');
      const prompt = await this.bot.sendMessage(
        chatId,
        `📋 <b>Позиции списком</b> — по одной на строку в раздел «${esc(this.store.state.menu.categories[i]?.sections[j]?.title || '')}»:\n\n` +
          `<code>Название | описание | цена</code>\n` +
          `<code>Название | цена</code>\n` +
          `<code>Название цена</code>\n\n` +
          `Пример:\n<code>Тартар из говядины | блю чиз | 790\nNEGRONI | джин / кампари / вермут | 950</code>\n\n<i>/cancel — отмена.</i>`,
      );
      if (prompt?.message_id) s.pending.prompt = prompt.message_id;
      return;
    }
    if ((m = data.match(/^a:it:photo:del:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      U('it:photo:del', (s) => { s.menu.categories[i].sections[j].items[k].image = ''; });
      await ans('🧹');
      return this.render(chatId, 'item', { i, j, k });
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
    if ((m = data.match(/^a:tm:confirm:(\d+)$/))) {
      const i = +m[1];
      if (!st.team.members[i]) { await ans('Участник не найден'); return this.render(chatId, 'team'); }
      await ans();
      return this.render(chatId, 'teamDelete', { i });
    }
    if ((m = data.match(/^a:tm:del:(\d+)$/))) {
      const i = +m[1];
      if (!st.team.members[i]) { await ans('Участник не найден'); return this.render(chatId, 'team'); }
      U('tm:del', (s) => { if (s.team.members[i]) s.team.members.splice(i, 1); });
      await ans('Удалено');
      return this.render(chatId, 'team');
    }
    if ((m = data.match(/^a:tm:move:(\d+):(-?\d+)$/))) {
      const i = +m[1], d = +m[2];
      U('tm:move', (s) => {
        const arr = s.team.members;
        const to = Math.max(0, Math.min(arr.length - 1, i + d));
        const [x] = arr.splice(i, 1);
        arr.splice(to, 0, x);
      });
      await ans('↕️');
      const nk = Math.max(0, Math.min(this.store.state.team.members.length - 1, i + d));
      return this.render(chatId, 'teamMember', { i: nk });
    }
    /* стоп-лист позиций: добавить/снять */
    if ((m = data.match(/^a:stoptoggle:(\d+):(\d+):(\d+)$/))) {
      const [_, i, j, k] = m.map(Number);
      U('stop', (s) => { const it = s.menu.categories[i].sections[j].items[k]; it.stop = !it.stop; });
      const on = this.store.state.menu.categories[i].sections[j].items[k].stop;
      await ans(on ? '⛔ в стоп-листе' : '✅ снова продаём');
      return this.render(chatId, 'stopItems', { i, j, page: Math.floor(k / 12) });
    }
    if (data === 'a:stop:pick') {
      await ans();
      return this.render(chatId, 'stopCat');
    }
    if (data === 'a:stop:clear') {
      const n = this.stoppedItems().length;
      U('stop:clear', (s) => {
        for (const c of s.menu.categories) for (const sec of c.sections) for (const it of sec.items) it.stop = false;
      });
      await ans(`🧹 сняли ${n}`);
      return this.render(chatId, 'stop');
    }
    /* пуш по событию афиши */
    if ((m = data.match(/^a:ev:push:(\d+)$/))) {
      const e = this.store.state.events[+m[1]];
      if (!e) { await ans('нет такого события'); return this.render(chatId, 'events'); }
      this.sess(chatId).draft = this.eventDraft(e);
      await ans('');
      return this.confirmPush(chatId);
    }
    /* подписчик: личное сообщение / удаление */
    if ((m = data.match(/^a:sub:(\w+):(\S+)$/))) {
      const x = this.store.private.subs.find((y) => y.id === m[2]);
      if (!x) { await ans('нет такого'); return this.render(chatId, 'subs'); }
      if (m[1] === 'del') {
        this.store.removeSub(x.id);
        await ans('🗑');
        return this.render(chatId, 'subs');
      }
      await this.bot.sendMessage(x.userId, '💬 Сообщение от бара Catch 22 — напишите ответным, если что-то нужно.').catch(() => {});
      await ans('отправили');
      return this.render(chatId, 'sub', { id: x.id });
    }
    if ((m = data.match(/^a:gal:move:(\d+):(-?\d+)$/))) {
      const i = +m[1], d = +m[2];
      U('gal:move', (s) => {
        const to = Math.max(0, Math.min(s.gallery.length - 1, i + d));
        const [photo] = s.gallery.splice(i, 1);
        s.gallery.splice(to, 0, photo);
      });
      await ans('↕️');
      const ni = Math.max(0, Math.min(this.store.state.gallery.length - 1, i + d));
      return this.render(chatId, 'galItem', { i: ni });
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
    if ((m = data.match(/^a:team:cover$/))) {
      U('team:cover', (s) => { s.team.image = ''; });
      await ans('🧹');
      return this.render(chatId, 'team');
    }
    if ((m = data.match(/^a:rq:(\S+):(\w+)$/))) {
      const [, id, act] = m;
      if (act === 'del') this.store.delRequest(id);
      if (act === 'done') this.store.setRequestStatus(id, 'done');
      if (act === 'work') this.store.setRequestStatus(id, 'in_work');
      if (act === 'reply' && this.store.private.requests.find((x) => x.id === id)?.from?.userId) {
        await this.bot.sendMessage(this.store.private.requests.find((x) => x.id === id).from.userId, '💬 Catch 22: получили вашу заявку — скоро ответим.').catch(() => {});
      }
      await ans('✅');
      return this.store.private.requests.some((x) => x.id === id)
        ? this.render(chatId, 'request', { id })
        : this.render(chatId, 'requests');
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
      note: 'текст плашки',
      cta: 'текст кнопки', ton: 'цена в TON (например 0.12 TON)', link: 'https-ссылка',
      linkText: 'подпись ссылки', button: 'текст кнопки', about: 'новое описание',
      story: 'история бара для экрана «О нас» (абзацы — через пустую строку)', role: 'роль в команде',
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

    /* ── пуш гостям: ждём фото и/или текст ── */
    if (s.pending?.kind === 'push') {
      const p = s.pending;
      const ph = pickPhoto(msg);
      if (p.withPhoto && !p.photo && ph) {
        p.photo = ph.fileId; // file_id этого же бота — им и шлём подписчикам
        try {
          const file = await this.bot.downloadFile(ph.fileId);
          p.photoUrl = this.store.saveMedia(file.buffer, file.ext).url; // запасной вариант: шлём по URL
        } catch {}
        if (msg.caption?.trim()) p.text = msg.caption.trim();
        if (p.text) return this.finishPushDraft(chatId, s);
        const prompt = await this.bot.sendMessage(chatId, '📸 Фото получил. Теперь текст пуша:');
        if (prompt?.message_id) p.prompt = prompt.message_id;
        return true;
      }
      // подписали фото текстом — считаем его текстом пуша
      if (!p.withPhoto && ph && msg.caption?.trim()) {
        p.text = msg.caption.trim();
        return this.finishPushDraft(chatId, s);
      }
      if (msg.text?.trim()) {
        if (p.withPhoto && !p.photo) {
          await this.bot.sendMessage(chatId, 'Сначала пришли фото 📸 (или <code>/cancel</code>, чтобы написать пуш без фото).');
          return true;
        }
        p.text = msg.text.trim();
        return this.finishPushDraft(chatId, s);
      }
      await this.bot.sendMessage(chatId, p.withPhoto && !p.photo ? 'Жду фото 📸 для пуша.' : 'Жду текст пуша (или <code>/cancel</code>).');
      return true;
    }

    /* ── новая позиция меню: название → цена → описание ── */
    if (s.pending?.kind === 'item' && msg.text != null) {
      const t = s.pending;
      const v = msg.text.trim();
      if (t.stage === 0) {
        if (!v) return this.bot.sendMessage(chatId, 'Название не может быть пустым 🙂');
        t.name = v;
        t.stage = 1;
        return this.askItemStep(chatId, t);
      }
      if (t.stage === 1) {
        t.price = isSkip(v) ? '' : v;
        t.stage = 2;
        return this.askItemStep(chatId, t);
      }
      t.desc = isSkip(v) ? '' : v;
      const sec = st.menu.categories[t.i]?.sections[t.j];
      if (!sec) { s.pending = null; return this.bot.sendMessage(chatId, '⚠️ Раздел не найден — откройте меню заново.'); }
      const item = { name: t.name, price: t.price || '', desc: t.desc || '', image: '', tags: [], stop: false };
      const at = t.insertAt == null ? sec.items.length : Math.min(t.insertAt, sec.items.length);
      const res = this.store.update('it:add', (s2) => {
        const arr = s2.menu.categories[t.i].sections[t.j].items;
        arr.splice(Math.min(at, arr.length), 0, item);
      });
      if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
      s.pending = null;
      if (!res.ok) return this.bot.sendMessage(chatId, '⚠️ ' + esc(res.error));
      const k = Math.min(at, sec.items.length - 1);
      await this.bot.sendMessage(
        chatId,
        `✅ <b>${esc(item.name)}</b>${item.price ? ' · ' + esc(item.price) + ' ₽' : ' · по запросу'} — позиция в меню\nrev ${res.rev}, приложение уже обновилось`,
        { reply_markup: kb([[btn('⛔ В стоп-лист', `a:stop:${t.i}:${t.j}:${k}`)], [btn('➕ Ещё позицию', `a:it:add:${t.i}:${t.j}`), NAV(`menu:s:${t.i}:${t.j}`)]]) },
      );
      return this.render(chatId, 'item', { i: t.i, j: t.j, k });
    }

    /* ── позиции пачкой: «Название | описание | цена» построчно ── */
    if (s.pending?.kind === 'itembulk' && msg.text != null) {
      const t = s.pending;
      const parsed = msg.text.split('\n').map(parseItemLine).filter((x) => x && x.name);
      if (!parsed.length) return this.bot.sendMessage(chatId, '🤔 Не разобрал ни одной строки. Формат: <code>Название | описание | цена</code>');
      const res = this.store.update('it:bulk', (s2) => {
        const arr = s2.menu.categories[t.i]?.sections[t.j]?.items;
        if (!arr) throw new Error('раздел не найден');
        for (const x of parsed) arr.push({ name: x.name, price: x.price, desc: x.desc, image: '', tags: [], stop: false });
      });
      if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
      s.pending = null;
      if (!res.ok) return this.bot.sendMessage(chatId, '⚠️ ' + esc(res.error));
      await this.bot.sendMessage(
        chatId,
        `📋 Добавлено позиций: <b>${parsed.length}</b> · rev ${res.rev}\n` +
          parsed.slice(0, 8).map((x) => `· ${esc(x.name)}${x.price ? ' — ' + esc(x.price) : ''}`).join('\n') +
          (parsed.length > 8 ? `\n…и ещё ${parsed.length - 8}` : ''),
        { reply_markup: kb([[btn('📂 Открыть раздел', `menu:s:${t.i}:${t.j}`), NAV('s:menu')]]) },
      );
      return this.render(chatId, 'menuSec', { i: t.i, j: t.j });
    }

    /* ── участник команды: имя → роль → пара слов ── */
    if (s.pending?.kind === 'member' && msg.text != null) {
      const t = s.pending;
      const v = msg.text.trim();
      if (t.stage === 0) {
        if (!v) return this.bot.sendMessage(chatId, 'Имя не может быть пустым 🙂');
        t.name = v;
        t.stage = 1;
        const p1 = await this.bot.sendMessage(chatId, `Шаг 2/3. Роль для «${esc(t.name)}» (бар, кухня, за пультом…):\n\n<i>/cancel — отмена.</i>`);
        if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
        t.prompt = p1?.message_id;
        return true;
      }
      if (t.stage === 1) {
        t.role = isSkip(v) ? '' : v;
        t.stage = 2;
        const p2 = await this.bot.sendMessage(chatId, `Шаг 3/3. Пара слов о «${esc(t.name)}» («—» = пропустить):\n\n<i>/cancel — отмена.</i>`);
        if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
        t.prompt = p2?.message_id;
        return true;
      }
      const text = isSkip(v) ? '' : v;
      const res = this.store.update('tm:add', (s2) => s2.team.members.push({ name: t.name, role: t.role || '', text, photo: '' }));
      if (t.prompt) this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
      s.pending = null;
      const i = this.store.state.team.members.length - 1;
      await this.bot.sendMessage(chatId, `✅ <b>${esc(t.name)}</b> — в блоке «Команда» · rev ${res.rev}`, {
        reply_markup: kb([[btn('🖼 Фото', `p:tm:${i}`), btn('➕ Ещё участника', 'a:tm:add')], [NAV('s:team')]]),
      });
      return this.render(chatId, 'teamMember', { i });
    }

    if (s.pending?.kind === 'award' && msg.text) {
      if (s.pending.stage === 0) {
        s.pending = { kind: 'award', stage: 1, title: msg.text.trim() };
        return this.bot.sendMessage(chatId, `Отлично, «<b>${esc(msg.text.trim())}</b>». Шаг 2/2. Добавьте короткое пояснение:`);
      }
      const txt = msg.text.trim();
      this.store.update('aw:add', (s2) => s2.meta.awards.push({ title: s.pending.title, text: txt }));
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
          [btn('🍽 Позиция меню…', 'fpick:it')],
          [btn('📅 Событие…', 'fpick:ev'), btn('👥 Участник команды…', 'fpick:tm')],
          [btn('👥 Фото «Команда»', 'fpick:team'), btn('🖼 Фото «О нас»', 'fpick:about')],
          [btn('📞 Фото контактов', 'fpick:c'), btn('🎫 Фото брони', 'fpick:book')],
          [btn('💼 Фото «Работа»', 'fpick:j'), btn('✖️ Отмена', 'a:cancel')],
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
    if ((parts.length === 2 && ['ev', 'tm', 'it'].includes(t)) || (t === 'it' && parts.length < 5)) return this.pickSubEntity(chatId, s, t, [i2, j2, k2].filter((x) => x != null));
    const photo = s.pending?.queue?.[0];
    if (!photo) {
      s.pending = null;
      return this.bot.sendMessage(chatId, 'Фото уже устарело — пришли ещё раз.');
    }
    await this.bot.answerCallback(q.id, '📥');
    const target = [t, i2, j2, k2].filter((x) => x != null);
    return this.applyPhoto(chatId, photo, target, s.pending?.caption || '');
  }

  pickSubEntity(chatId, s, kind, path = []) {
    const st = this.store.state;
    const rows = [];
    if (kind === 'ev') st.events.forEach((e, i) => rows.push([btn(`📅 ${e.date} · ${e.title}`.slice(0, 56), `fpick:ev:${i}`)]));
    if (kind === 'tm') {
      if (!st.team.members.length) {
        return this.bot.sendMessage(chatId, 'В блоке «Команда» пока нет участников — сначала добавьте: 👥 Команда → ➕ Участник.', {
          reply_markup: kb([[btn('👥 Команда', 's:team'), btn('✖️ Отмена', 'a:cancel')]]),
        });
      }
      st.team.members.forEach((x, i) => rows.push([btn(`👤 ${x.name || 'без имени'}`.slice(0, 56), `fpick:tm:${i}`)]));
    }
    if (kind === 'it') {
      const [i, j] = path.map(Number);
      if (path.length === 0) st.menu.categories.forEach((x, ci) => rows.push([btn(`🍽 ${x.title}`.slice(0, 56), `fpick:it:${ci}`)]));
      else if (path.length === 1) st.menu.categories[i]?.sections.forEach((x, sj) => rows.push([btn(`📂 ${x.title}`.slice(0, 56), `fpick:it:${i}:${sj}`)]));
      else st.menu.categories[i]?.sections[j]?.items.forEach((x, ik) => rows.push([btn(`· ${x.name}`.slice(0, 56), `fpick:it:${i}:${j}:${ik}`)]));
    }
    rows.push([btn('✖️ Отмена', 'a:cancel')]);
    s.pending.queue = s.pending.queue || [];
    return this.bot.sendMessage(chatId, 'Куда положить фото?', { reply_markup: kb(rows) });
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
      else if (t[0] === 'team') { s.team.image = media.url; label = 'фото блока «Команда»'; }
      else if (t[0] === 'tm') { const x = s.team.members[+t[1]]; if (!x) throw new Error('нет такого участника'); x.photo = media.url; label = `команда · ${x.name}`; }
      else if (t[0] === 'gal') { s.gallery.unshift({ src: media.url }); label = 'галерея (первым кадром)'; }
      else if (t[0] === 'galreplace') { const x = s.gallery[+t[1]]; if (!x) throw new Error('нет такого фото'); x.src = media.url; label = `галерея · фото #${+t[1] + 1}`; }
      else if (t[0] === 'it') { const x = s.menu.categories[+t[1]]?.sections[+t[2]]?.items[+t[3]]; if (!x) throw new Error('нет такой позиции'); x.image = media.url; label = `меню · ${x.name}`; }
      else if (t[0] === 'ev') { const e = s.events[+t[1]]; if (!e) throw new Error('нет такого события'); e.image = media.url; if (caption) e.subtitle = caption; label = `афиша · ${e.title}`; }
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
    const st = this.store.state;
    const url = this.getAppUrl();

    // гость открыл бота → пишем в базу пушей (админам придёт уведомление)
    if (from?.id) {
      this.store.addSub({
        userId: from.id,
        username: from.username || '',
        name: [from.first_name, from.last_name].filter(Boolean).join(' '),
      });
    }

    return this.bot.sendMessage(
      chatId,
      `<b>${esc(st.meta.name)}</b> · ${esc(st.meta.sub)}\n\n${esc(st.meta.tagline)}\n\n` +
        `В приложении: актуальное меню и цены, часы работы, афиша, бронирование, команда и анкета для работы — всё обновляется живьём.\n\n` +
        `<i>Здесь можно оставить заявку — просто напишите сообщение, бару придёт уведомление. Иногда присылаем анонсы вечеров; чтобы не получать их, достаточно заблокировать бота.</i>`,
      {
        reply_markup: kb([
          url ? [urlBtn('📱 Открыть приложение', url)] : [],
          st.contacts.site ? [urlBtn('🌐 Сайт', st.contacts.site)] : [],
          st.contacts.instagram ? [urlBtn('📸 Instagram', st.contacts.instagram)] : [],
          st.contacts.phone ? [urlBtn('📞 Позвонить', st.contacts.phoneHref || 'tel:' + String(st.contacts.phone).replace(/[^\d+]/g, ''))] : [],
          this.isAdmin(chatId) ? [btn('🛠 Админ-панель', 's:home')] : [],
        ]),
      },
    );
  }

  /* ────────────── стоп-лист позиций меню ────────────── */
  stoppedItems() {
    const out = [];
    (this.store.state.menu?.categories || []).forEach((c, i) =>
      (c.sections || []).forEach((sec, j) =>
        (sec.items || []).forEach((it, k) => { if (it.stop) out.push({ i, j, k, it }); }),
      ),
    );
    return out;
  }

  /* ────────────── пошаговое добавление позиции меню ────────────── */
  async askItemStep(chatId, t) {
    const sec = this.store.state.menu.categories[t.i]?.sections[t.j];
    const where = sec ? ` в раздел «${esc(sec.title)}»` : '';
    const steps = [
      `Шаг 1/3. Название позиции${where}:`,
      `Шаг 2/3. Цена «${esc(t.name)}» <i>(590 · 890/2790 · «—» = по запросу)</i>:`,
      `Шаг 3/3. Описание/состав «${esc(t.name)}» <i>(«—» = без описания)</i>:`,
    ];
    if (t.prompt) await this.bot.deleteMessage(chatId, t.prompt).catch(() => {});
    const p = await this.bot.sendMessage(chatId, `${steps[t.stage] || steps[0]}\n\n<i>/cancel — отмена.</i>`);
    if (p?.message_id) t.prompt = p.message_id;
    return true;
  }

  /* ────────────── пуши гостям, которые открыли бота ────────────── */
  async finishPushDraft(chatId, s) {
    if (s.pending?.prompt) await this.bot.deleteMessage(chatId, s.pending.prompt).catch(() => {});
    s.draft = {
      text: s.pending.text || '',
      photo: s.pending.photo || '',
      photoUrl: s.pending.photoUrl || '',
      appBtn: s.pushAppBtn !== false && !!this.getAppUrl(),
    };
    s.pending = null;
    return this.confirmPush(chatId);
  }

  async confirmPush(chatId) {
    const s = this.sess(chatId);
    const d = s.draft;
    if (!d?.text) return this.render(chatId, 'push');
    const n = this.store.pushTargets().length;
    return this.bot.sendMessage(
      chatId,
      `<b>Черновик пуша</b>\n\n${d.text}\n\n` +
        `${d.photo ? '📸 фото приложено\n' : ''}${d.appBtn ? '🔗 кнопка «Открыть приложение» приложена\n' : ''}` +
        `<i>Получателей: <b>${n}</b>${n ? '' : ' — пока никто не открыл бота'}</i>`,
      {
        reply_markup: kb([
          n ? [btn(`📨 Отправить (${n})`, 'a:push:send')] : [],
          [btn('✏️ Переписать', 'a:push:new'), btn('✖️ Отмена', 'a:push:cancel')],
        ]),
      },
    );
  }

  /** Анонс события афиши — готовый текст пуша (фото берём из постера). */
  eventDraft(e) {
    const appUrl = this.getAppUrl();
    const date = String(e.date || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2');
    const photo = e.image && appUrl && !/^https?:/.test(e.image) ? appUrl + e.image : /^https?:/.test(e.image || '') ? e.image : '';
    return {
      text:
        `🎧 <b>${esc(e.title)}</b>\n${date ? esc(date) + ' · ' : ''}${esc(e.time || '')}\n${e.subtitle ? esc(e.subtitle) + '\n' : ''}\n` +
        `<i>Столы — в приложении Catch 22.</i>`,
      photo: '',
      photoUrl: photo,
      appBtn: !!appUrl,
    };
  }

  /**
   * Рассылка всем, кто открыл бота (/start).
   * Шлём последовательно с паузой — так мы точно внутри лимитов Telegram
   * (~30 сообщений/с), а заблокировавшие бота автоматически выпадают из списка.
   */
  async broadcast(chatId, draft) {
    const targets = this.store.pushTargets();
    if (!targets.length) {
      return this.bot.sendMessage(
        chatId,
        '📣 Пушить пока некого: бота ещё никто не открыл. Как только гости нажмут /start — они появятся в «👥 Подписчики».',
        { reply_markup: kb([[NAV('s:push')]]) },
      );
    }
    const appUrl = this.getAppUrl();
    const markup = draft.appBtn && appUrl ? { inline_keyboard: [[urlBtn('📱 Открыть приложение', appUrl)]] } : undefined;
    const progress = await this.bot.sendMessage(chatId, `📨 Отправляю ${targets.length} гостям…`);
    const abs = (u) => (!u ? '' : /^https?:/.test(u) ? u : appUrl ? appUrl + u : '');
    let photo = draft.photo || abs(draft.photoUrl);
    let ok = 0;
    let failed = 0;
    let i = 0;
    for (const t of targets) {
      i++;
      const extra = { parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) };
      try {
        if (photo) {
          await this.bot.call('sendPhoto', { chat_id: t.userId, photo, caption: draft.text.slice(0, 1024), ...extra });
        } else {
          await this.bot.call('sendMessage', { chat_id: t.userId, text: draft.text, ...extra });
        }
        ok++;
      } catch (e) {
        // разметка не читается — не мучаем гостей, возвращаем текст админу
        if (e.badRequest && /parse|entities/i.test(e.message || '')) {
          if (progress?.message_id) await this.bot.deleteMessage(chatId, progress.message_id).catch(() => {});
          return this.bot.sendMessage(
            chatId,
            `⚠️ Telegram не принял разметку: ${esc(e.message)}\n\nПришлите текст ещё раз — без «&lt;» и «&gt;» (или закройте теги: &lt;b&gt;…&lt;/b&gt;).`,
            { reply_markup: kb([[btn('✍️ Переписать', 'a:push:new'), NAV('s:push')]]) },
          );
        }
        // file_id мог не подойти (документ/истёк) — пробуем разок по URL из media
        const alt = abs(draft.photoUrl);
        if (photo && alt && photo !== alt) {
          photo = alt;
          try {
            await this.bot.call('sendPhoto', { chat_id: t.userId, photo, caption: draft.text.slice(0, 1024), ...extra });
            ok++;
            failed--;
          } catch (e2) {
            failed++;
            if (e2.telegramErrorCode === 403) this.store.markSubBlocked(t.userId);
          }
        } else {
          failed++;
          if (e.telegramErrorCode === 403) this.store.markSubBlocked(t.userId);
        }
      }
      if (i % 20 === 0) {
        await this.bot.editMessage(chatId, progress?.message_id, `📨 Отправлено ${i}/${targets.length}…`).catch(() => {});
        await sleep(40);
      }
    }
    this.store.setLastPush({ text: String(draft.text).slice(0, 160), total: targets.length, ok, failed });
    if (progress?.message_id) await this.bot.deleteMessage(chatId, progress.message_id).catch(() => {});
    return this.bot.sendMessage(
      chatId,
      `📣 <b>Пуш отправлен</b>\nДоставлено: <b>${ok}</b> из ${targets.length}${failed ? ` · не дошло: ${failed}` : ''}` +
        (failed ? '\n<i>Кто заблокировал бота — исключён из рассылки автоматически.</i>' : ''),
      { reply_markup: kb([[btn('✍️ Написать ещё', 'a:push:new'), NAV('s:push')]]) },
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
    case 'j': return state.jobs;
    case 'gal': return state.gallery[idxs[0]];
    case 'team': return state.team;
    case 'tm': return state.team.members[idxs[0]];
    case 'hero': return state.meta.hero;
    case 'aw': return state.meta.awards?.[idxs[0]];
    case 'copy': return state.copy;
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

/** «—» / «-» / пусто = пропустить шаг визарда */
function isSkip(v) {
  const x = String(v || '').trim();
  return !x || /^[-—–.]+$/.test(x);
}

/** Строка из «вставить списком»: Название | описание | цена (или Название цена). */
function parseItemLine(line) {
  const raw = String(line || '').trim().replace(/^[-*•·▪]\s*/, '');
  if (!raw) return null;
  if (raw.includes('|')) {
    const parts = raw.split('|').map((x) => x.trim());
    const name = parts[0];
    if (!name) return null;
    if (parts.length >= 3) return { name, desc: isSkip(parts[1]) ? '' : parts[1], price: cleanPrice(parts[2]) };
    return { name, desc: '', price: cleanPrice(parts[1] || '') };
  }
  const mm = raw.match(/^(.*?)[\s—–-]+([\d][\d\s./]*\s*₽?)$/);
  if (mm && mm[1].trim()) return { name: mm[1].trim(), desc: '', price: cleanPrice(mm[2]) };
  return { name: raw, desc: '', price: '' };
}

function cleanPrice(p) {
  const x = String(p || '').replace(/₽/g, '').replace(/\s+/g, '').trim();
  return isSkip(x) ? '' : x.slice(0, 24);
}

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
