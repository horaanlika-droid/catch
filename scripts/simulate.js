// Оффлайн-прогон админ-панели с моком Telegram API:
//   node scripts/simulate.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { Panel } from '../server/admin/panel.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catch22-test-'));
const store = new Store(tmp);
let mid = 100;
const sent = [];
const fakeBot = {
  _status: {},
  async sendMessage(chat_id, text, extra) { sent.push({ text, kb: extra?.reply_markup }); return { message_id: ++mid }; },
  async editMessage(chat_id, message_id, text, extra) { sent.push({ edited: message_id, text, kb: extra?.reply_markup }); return { message_id }; },
  async answerCallback() { return true; },
  async deleteMessage() { return true; },
  async call(method) { if (method === 'getWebhookInfo') return { url: 'test' }; return true; },
  async downloadFile(fileId) { return { buffer: Buffer.from('FAKEJPG-' + fileId), ext: 'jpg' }; },
};
const panel = new Panel({ store, bot: fakeBot, adminIds: new Set([111]), getAppUrl: () => 'https://example.test' });

let fails = 0;
const check = (cond, label) => { console.log((cond ? '✅' : '❌') + ' ' + label); if (!cond) fails++; };
const msg = (chatId, obj) => panel.onMessage({ chat: { id: chatId }, from: { id: chatId }, ...obj });
const click = (data) => panel.onCallback({ id: 'q', data, message: { chat: { id: 111 }, message_id: 1 } });

/* ── навигация ── */
await panel.render(111, 'home');
check(sent.at(-1).text.includes('Админ-панель'), 'главная панель рендерится');

/* ── меню: редактирование цены ── */
await click('s:menu'); await click('menu:c:0'); await click('menu:s:0:0'); await click('item:0:0:0');
await click('f:it:0:0:0:price');
await msg(111, { text: '610' });
check(store.state.menu.categories[0].sections[0].items[0].price === '610', 'цена изменена через pending-редактор');

/* ── меню: теги через редактор ── */
await click('item:0:0:0'); await click('f:it:0:0:0:tags');
await msg(111, { text: 'new, chef' });
check(store.state.menu.categories[0].sections[0].items[0].tags.join() === 'new,chef', 'теги установлены');

/* ── фото в позицию (pending) ── */
await click('item:0:0:0'); await click('p:it:0:0:0');
await msg(111, { photo: [{ file_id: 'AAA', sizes: {} }], caption: 'со свежим чатни' });
const it0 = store.state.menu.categories[0].sections[0].items[0];
check(/^\/media\/[\w-]+\.jpg$/.test(it0.image), 'фото позиции: путь /media/...');
const mediaFile = path.join(tmp, 'media', path.basename(it0.image));
check(fs.existsSync(mediaFile) && fs.readFileSync(mediaFile).includes('FAKEJPG'), 'байты файла реально скачаны в data/media');
check(it0.desc === 'со свежим чатни', 'caption стал описанием');

/* ── свободное фото → выбор цели → галерея ── */
const galBefore = store.state.gallery.length;
await msg(111, { photo: [{ file_id: 'BBB' }] });
check(sent.at(-1).text.includes('Куда её'), 'без pending бот предлагает цель для фото');
await click('fpick:gal');
check(store.state.gallery.length === galBefore + 1 && store.state.gallery[0].src.startsWith('/media/'), 'фото добавлено в галерею первым кадром');

/* ── стоп-лист позиции + плашка ── */
await click('item:0:0:0'); await click('a:stop:0:0:0');
check(store.state.menu.categories[0].sections[0].items[0].stop === true, 'позиция помечена ⛔ (в приложении зачеркнётся)');
await click('item:0:0:0'); await click('a:stop:0:0:0');
check(store.state.menu.categories[0].sections[0].items[0].stop === false, 'снята со стопа');

/* ── часы: правка строки ── */
await click('s:hours'); await click('hour:0'); await click('f:hour:0:time');
await msg(111, { text: '16:00 – 00:00' });
check(store.state.hours[0].time === '16:00 – 00:00', 'часы работы обновлены');

/* ── афиша: новое событие + постер ── */
const evBefore = store.state.events.length;
await click('s:events'); await click('a:ev:add');
check(store.state.events.length === evBefore + 1, 'событие добавлено');
await click(`p:ev:${evBefore}`);
await msg(111, { photo: [{ file_id: 'CCC' }] });
check(store.state.events[evBefore].image.startsWith('/media/'), 'постер события загружен');

/* ── заявка с сайта → actions панели ── */
const rq = store.addRequest({ type: 'merch', fields: { name: 'Иван', item: 'Кепка' }, contact: '+7 999', from: { userId: 4242, username: 'ivantest', name: 'Иван Тест' } });
await panel.render(111, 'requests');
await click('rq:' + rq.id);
check(sent.at(-1).text.includes('merch'), 'карточка заявки открыта');
await click('a:rq:' + rq.id + ':block');
check(store.isBlocked(4242), 'гость из заявки попал в стоп-лист');
await panel.render(111, 'stop');
const bl = store.private.blocked[0];
await click('a:unblock:' + bl.id);
check(!store.isBlocked(4242), 'стоп-лист: Unblock работает');

/* ── блок вручную текстом ── */
await click('a:bl:add');
await msg(111, { text: '@badguest 123\nнесколько буллингов персонала' });
check(store.private.blocked.length === 1 && store.private.blocked[0].reason.includes('буллингов'), 'ручной блок с причиной');
await msg(111, { text: '123456789' });

/* ── добавление награды (пошаговый визард) ── */
await click('s:meta'); await click('a:aw:add');
await msg(111, { text: 'Time Out' });
await msg(111, { text: '🏅 Бар года' });
const awards = store.state.meta.awards;
check(awards.at(-1).title === 'Time Out' && awards.at(-1).icon === '🏅' && awards.at(-1).text === 'Бар года', 'награда добавлена визардом');

/* ── отмена ввода ── */
await click('item:0:0:0'); await click('f:it:0:0:0:name');
await msg(111, { text: '/cancel' });
check(store.state.menu.categories[0].sections[0].items[0].name === 'Картофель фри с трюфельным майо', 'cancel не трогает данные');

/* ── публичный /start с кнопкой приложения ── */
await panel.publicStart(999, { id: 999, first_name: 'Гость' });
const startMsg = sent.at(-1);
check(startMsg.kb.inline_keyboard.flat().some((b) => b.url === 'https://example.test'), '/start даёт кнопку приложения');

/* ── публичное сообщение гостя → заявка ── (логика в boot, тут проверка стор-слоя) */
const r2 = store.addRequest({ type: 'message', fields: { 'сообщение': 'хочу стол на 8' }, contact: '@guest' });
check(r2.status === 'new' && store.newRequestsCount() >= 1, 'заявка-сообщение записана');

/* ── сериализация/перезагрузка ── */
store.save();
const store2 = new Store(tmp);
check(store2.state.menu.categories[0].sections[0].items[0].image === it0.image, 'state.json пережил перезагрузку');
check(store2.rev > 0, 'rev сохраняется');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILURES` : '\nВсе проверки пройдены ✔');
process.exit(fails ? 1 : 0);
