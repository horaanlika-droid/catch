// Оффлайн-прогон админ-панели с моком Telegram API:
//   node scripts/simulate.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, migrateState, normalizeState } from '../server/store.js';
import { Panel } from '../server/admin/panel.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catch22-test-'));
const store = new Store(tmp);
let mid = 100;
const sent = [];
const pushed = []; // что ушло «в мир» через bot.call (пуши гостям)
const fakeBot = {
  _status: {},
  async sendMessage(chat_id, text, extra) { sent.push({ chat_id, text, kb: extra?.reply_markup }); return { message_id: ++mid }; },
  async editMessage(chat_id, message_id, text, extra) { sent.push({ edited: message_id, text, kb: extra?.reply_markup }); return { message_id }; },
  async answerCallback() { return true; },
  async deleteMessage() { return true; },
  async call(method, params = {}) {
    if (method === 'getWebhookInfo') return { url: 'test' };
    if (method === 'sendMessage' || method === 'sendPhoto') { pushed.push({ method, ...params }); return { message_id: ++mid }; }
    return true;
  },
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
check(sent.at(-1).kb.inline_keyboard.flat().some((b) => b.text.includes('Команда')), 'в панели есть блок «Команда»');
check(!sent.at(-1).kb.inline_keyboard.flat().some((b) => /Мерч|Кошелёк/.test(b.text)), 'мерча и кошелька в панели больше нет');

/* ── шапка приложения: фонотека + бар ── */
check(store.state.meta.sub === 'ФОНОТЕКА + БАР', 'подпись = «ФОНОТЕКА + БАР»');
check(!JSON.stringify(store.publicState()).toLowerCase().includes('бистро'), 'слово «бистро» из данных ушло');
check(!JSON.stringify(store.publicState()).toLowerCase().includes('bistro'), 'слово «bistro» из данных ушло');

/* ── часы работы ── */
check(store.state.hours[0].days === 'Вт, Ср, Чт, Вс' && store.state.hours[0].time === '16:00 – 00:00', 'часы: вт/ср/чт/вс 16:00–00:00');
check(store.state.hours[1].days === 'Пт, Сб' && store.state.hours[1].time === '16:00 – 02:00', 'часы: пт/сб 16:00–02:00');

/* ── награды: «Собака.ру» убрана ── */
check(!store.state.meta.awards.some((a) => /sobaka|собака/i.test(a.title)), 'Sobaka.ru убрана из наград');

/* ── ссылки на сайт и инстаграм ── */
check(store.state.contacts.site === 'https://catch-22-bar.ru/', 'сайт прописан в контактах');
check(store.state.contacts.instagram === 'https://www.instagram.com/catch22.catch22.catch22/', 'инстаграм прописан в контактах');
check(store.state.socials.some((x) => x.url.includes('instagram.com/catch22.catch22.catch22')), 'инстаграм в соцсетях');
check(store.state.socials.some((x) => x.url === 'https://catch-22-bar.ru/'), 'сайт в соцсетях');

/* ── меню: редактирование цены ── */
await click('s:menu'); await click('menu:c:0'); await click('menu:s:0:0'); await click('item:0:0:0');
await click('f:it:0:0:0:price');
await msg(111, { text: '610' });
check(store.state.menu.categories[0].sections[0].items[0].price === '610', 'цена изменена через pending-редактор');

/* ── меню: теги через редактор ── */
await click('item:0:0:0'); await click('f:it:0:0:0:tags');
await msg(111, { text: 'new, chef' });
check(store.state.menu.categories[0].sections[0].items[0].tags.join() === 'new,chef', 'теги установлены');

/* ── меню: новая позиция по шагам (название → цена → описание) ── */
const sec0 = store.state.menu.categories[0].sections[0];
const n0 = sec0.items.length;
await click('menu:s:0:0'); await click('a:it:add:0:0');
await msg(111, { text: 'Устрица «Фонтанка»' });
await msg(111, { text: '390' });
await msg(111, { text: 'с лаймом и миньонет' });
check(sec0.items.length === n0 + 1, 'позиция добавлена визардом');
check(sec0.items.at(-1).name === 'Устрица «Фонтанка»' && sec0.items.at(-1).price === '390' && sec0.items.at(-1).desc === 'с лаймом и миньонет', 'название/цена/описание записаны');

/* ── меню: позиции пачкой («Название | описание | цена») ── */
const n1 = sec0.items.length;
await click('menu:s:0:0'); await click('a:it:bulk:0:0');
await msg(111, { text: 'Тартар из говядины | блю чиз | 790\nNEGRONI | джин / кампари / вермут | 950\nОливки 640' });
check(sec0.items.length === n1 + 3, 'список распарсен: 3 позиции');
check(sec0.items.at(-3).name === 'Тартар из говядины' && sec0.items.at(-3).desc === 'блю чиз' && sec0.items.at(-3).price === '790', 'строка «название | описание | цена»');
check(sec0.items.at(-1).name === 'Оливки' && sec0.items.at(-1).price === '640', 'строка «название цена»');

/* ── меню: фото отключены, legacy-поля удаляются при нормализации ── */
await click('item:0:0:0');
const itemControls = sent.at(-1).kb.inline_keyboard.flat();
check(!itemControls.some((b) => /Фото/.test(b.text)), 'у позиции меню нет элементов управления фото');
store.update('legacy:menu-images', (s) => {
  s.menu.note = 'Меню сверено с картой. Состав и наличие уточняйте у команды.';
  s.menu.categories[0].cover = '/media/old-menu-cover.jpg';
  s.menu.categories[0].icon = '🍽';
  s.menu.categories[0].sections[0].cover = '/media/old-section-cover.jpg';
  s.menu.categories[0].sections[0].items[0].icon = '🍟';
  s.menu.categories[0].sections[0].items[0].image = '/media/old-menu-item.jpg';
  s.gallery[0].caption = 'Подпись, которую нужно удалить';
  s.meta.awards[0].icon = '🏆';
});
const firstItem = store.state.menu.categories[0].sections[0].items[0];
check(!('image' in firstItem) && !('cover' in store.state.menu.categories[0]) && !('cover' in store.state.menu.categories[0].sections[0]), 'нормализация удаляет фото меню и обложки');
check(!('icon' in firstItem) && !('icon' in store.state.menu.categories[0]) && store.state.menu.note === '', 'иконки-emoji и просьба уточнять наличие удалены');
check(!('caption' in store.state.gallery[0]) && !('icon' in store.state.meta.awards[0]), 'подписи галереи и emoji наград удалены');

const legacyState = structuredClone(store.state);
legacyState._v = 2.2;
legacyState.menu.categories[0].sections[0].items[0].image = '/media/legacy.jpg';
legacyState.gallery[0].caption = 'Legacy caption';
legacyState.meta.awards[0].icon = '🏆';
legacyState.menu.categories[0].cover = '/media/legacy-cover.jpg';
legacyState.menu.categories[0].sections[0].icon = '🍟';
migrateState(legacyState);
normalizeState(legacyState);
check(!('image' in legacyState.menu.categories[0].sections[0].items[0]) && !('caption' in legacyState.gallery[0]), 'миграция 2.3 очищает legacy-поля');

/* ── свободное фото → выбор цели → галерея ── */
const galBefore = store.state.gallery.length;
await msg(111, { photo: [{ file_id: 'BBB' }] });
check(sent.at(-1).text.includes('Куда её'), 'без pending бот предлагает цель для фото');
await click('fpick:gal');
check(store.state.gallery.length === galBefore + 1 && store.state.gallery[0].src.startsWith('/media/'), 'фото добавлено в галерею первым кадром');

/* ── стоп-лист позиций (не гостей!) ── */
await click('item:0:0:0'); await click('a:stop:0:0:0');
check(store.state.menu.categories[0].sections[0].items[0].stop === true, 'позиция помечена ⛔ (в приложении зачёркнется)');
await panel.render(111, 'stop');
check(sent.at(-1).text.includes('Стоп-лист позиций'), 'экран «стоп-лист» — про позиции меню');
check(sent.at(-1).kb.inline_keyboard.flat().some((b) => b.text.includes('Устрица') || b.text.includes('Картофель')), 'в стоп-листе видно позицию');
await click('a:stop:pick'); await click('stopsec:0'); await click('stopit:0:0');
await click('a:stoptoggle:0:0:0');
check(store.state.menu.categories[0].sections[0].items[0].stop === false, 'сняли со стопа одним тапом');
await click('a:stop:0:0:1'); await click('s:stop'); await click('a:stop:clear');
check(panel.stoppedItems().length === 0, '«Очистить стоп-лист» снимает все позиции');
check(!store.private.blocked, 'стоп-листа гостей в данных больше нет');

/* ── команда: блок-заглушка и участники ── */
await panel.render(111, 'team');
check(sent.at(-1).text.includes('Команда'), 'экран «Команда» рендерится');
const team0 = store.state.team.members.length;
check(team0 >= 4 && store.state.team.members.some((m) => m.name === 'Даниил Золотухин' && m.photo), 'команда из пресс-кита: участники с фото');
check(store.state.team.enabled === true && store.state.team.title === 'КОМАНДА', 'блок включён и озаглавлен');
check(store.state.team.members.find((m) => m.name === 'Илья Борик')?.photo === '', 'фото шефа оставлено пустым для добавления через админку');
await click('a:tm:add');
await msg(111, { text: 'Глеб' });
await msg(111, { text: 'за пультом' });
await msg(111, { text: 'ставит джаз и хаус' });
const tmI = store.state.team.members.length - 1;
check(store.state.team.members.length === team0 + 1, 'участник добавлен визардом');
check(store.state.team.members[tmI].name === 'Глеб' && store.state.team.members[tmI].role === 'за пультом', 'имя и роль записаны');
await click(`tm:${tmI}`); await click(`f:tm:${tmI}:name`); await msg(111, { text: 'Глеб Тестовый' });
await click(`tm:${tmI}`); await click(`f:tm:${tmI}:role`); await msg(111, { text: 'Музыкальный редактор' });
await click(`tm:${tmI}`); await click(`f:tm:${tmI}:text`); await msg(111, { text: 'Собирает виниловые сеты для вечеров.' });
check(store.state.team.members[tmI].name === 'Глеб Тестовый' && store.state.team.members[tmI].role === 'Музыкальный редактор' && store.state.team.members[tmI].text.includes('виниловые'), 'существующего участника можно редактировать');
await click(`tm:${tmI}`); await click(`p:tm:${tmI}`);
await msg(111, { photo: [{ file_id: 'TEAM1' }] });
check(/^\/media\//.test(store.state.team.members[tmI].photo), 'фото участника загружено или заменено');
await click(`tm:${tmI}`); await click(`a:tm:confirm:${tmI}`);
check(sent.at(-1).text.includes('Удалить участника?'), 'перед удалением показывается подтверждение');
await click(`tm:${tmI}`);
check(store.state.team.members.length === team0 + 1, 'отмена подтверждения сохраняет участника');
await click(`a:tm:confirm:${tmI}`); await click(`a:tm:del:${tmI}`);
check(store.state.team.members.length === team0 && !store.state.team.members.some((m) => m.name === 'Глеб Тестовый'), 'подтверждённое удаление убирает участника');
await click('s:team'); await click('a:team:toggle');
check(store.state.team.enabled === false, 'блок «Команда» скрывается из бота');
await click('s:team'); await click('a:team:toggle');
check(store.state.team.enabled === true, 'и включается обратно');

/* ── часы: правка строки ── */
await click('s:hours'); await click('hour:0'); await click('f:hour:0:time');
await msg(111, { text: '16:00 – 00:00' });
check(store.state.hours[0].time === '16:00 – 00:00', 'часы работы обновляются из бота');

/* ── афиша: новое событие + постер ── */
const evBefore = store.state.events.length;
await click('s:events'); await click('a:ev:add');
check(store.state.events.length === evBefore + 1, 'событие добавлено');
await click(`p:ev:${evBefore}`);
await msg(111, { photo: [{ file_id: 'CCC' }] });
check(store.state.events[evBefore].image.startsWith('/media/'), 'постер события загружен');

/* ── заявка с сайта → статусы ── */
const rq = store.addRequest({ type: 'booking', fields: { name: 'Иван', дата: '2026-10-04' }, contact: '+7 999', from: { userId: 4242, username: 'ivantest', name: 'Иван Тест' } });
await panel.render(111, 'requests');
await click('rq:' + rq.id);
check(sent.at(-1).text.includes('booking'), 'карточка заявки открыта');
check(!sent.at(-1).kb.inline_keyboard.flat().some((b) => /стоп-лист/i.test(b.text)), 'в заявке нет кнопки «в стоп-лист»');
await click('a:rq:' + rq.id + ':work');
check(store.private.requests.find((x) => x.id === rq.id).status === 'in_work', 'заявка взята в работу');

/* ── добавление награды (пошаговый визард) ── */
await click('s:meta'); await click('a:aw:add');
await msg(111, { text: 'Time Out' });
await msg(111, { text: 'Бар года' });
const awards = store.state.meta.awards;
check(awards.at(-1).title === 'Time Out' && !('icon' in awards.at(-1)) && awards.at(-1).text === 'Бар года', 'факт для инфографики добавлен без emoji-иконки');

/* ── отмена ввода ── */
await click('item:0:0:0'); await click('f:it:0:0:0:name');
await msg(111, { text: '/cancel' });
check(store.state.menu.categories[0].sections[0].items[0].name === 'Картофель фри с трюфельным майо', 'cancel не трогает данные');

/* ── публичный /start: гость попадает в базу пушей ── */
await panel.publicStart(999, { id: 999, first_name: 'Гость', username: 'guest22' });
const startMsg = sent.at(-1);
check(startMsg.kb.inline_keyboard.flat().some((b) => b.url === 'https://example.test'), '/start даёт кнопку приложения');
check(startMsg.kb.inline_keyboard.flat().some((b) => b.url === 'https://catch-22-bar.ru/'), '/start даёт ссылку на сайт');
check(startMsg.kb.inline_keyboard.flat().some((b) => b.url.includes('instagram.com/catch22.catch22.catch22')), '/start даёт ссылку на инстаграм');
check(store.subStats().active === 1, 'гость записан в подписчики бота');
await panel.publicStart(999, { id: 999, first_name: 'Гость', username: 'guest22' });
check(store.subStats().all === 1, 'повторный /start не дублирует подписчика');
await panel.publicStart(888, { id: 888, first_name: 'Вторая' });
check(store.subStats().active === 2, 'второй гость — тоже подписчик');

/* ── пуш: черновик → подтверждение → рассылка ── */
await panel.render(111, 'push');
check(sent.at(-1).text.includes('Пуши гостям'), 'экран пушей рендерится');
await click('a:push:new');
await msg(111, { text: '🎧 Сегодня винил-сет с 20:00 — приходите' });
check(sent.at(-1).text.includes('Черновик пуша'), 'черновик показан до отправки');
check(sent.at(-1).kb.inline_keyboard.flat().some((b) => b.callback_data === 'a:push:send'), 'есть кнопка «Отправить»');
await click('a:push:send');
check(pushed.length === 2 && pushed.every((p) => p.method === 'sendMessage'), 'пуш ушёл обоим подписчикам');
check(pushed.map((p) => p.chat_id).sort().join() === '888,999', 'адресаты — те, кто открыл бота');
check(pushed[0].text.includes('винил-сет'), 'текст пуша доставлен');
check(store.private.lastPush?.ok === 2, 'последняя рассылка записана');

/* ── пуш с фото ── */
pushed.length = 0;
await click('a:push:photo');
await msg(111, { photo: [{ file_id: 'PUSH1' }] });
check(pushed.length === 0, 'фото без текста ещё не отправлено');
await msg(111, { text: '📸 В субботу — гость за пультом' });
await click('a:push:send');
check(pushed.length === 2 && pushed.every((p) => p.method === 'sendPhoto'), 'пуш с фото ушёл как sendPhoto');
check(pushed[0].photo === 'PUSH1' && pushed[0].caption.includes('гость за пультом'), 'в пуше — фото и подпись');

/* ── анонс из афиши одной кнопкой ── */
pushed.length = 0;
await panel.render(111, 'events');
await click(`a:ev:push:${store.state.events.length - 1}`);
check(sent.at(-1).text.includes('Черновик пуша'), 'анонс события собрался в черновик');
await click('a:push:send');
check(pushed.length === 2, 'анонс разослан подписчикам');

/* ── заблокировал бота → из рассылки выпадает ── */
pushed.length = 0;
store.markSubBlocked(888);
check(store.subStats().active === 1, 'заблокировавший бота не считается активным');
await panel.render(111, 'push');
await click('a:push:new');
await msg(111, { text: 'проверка' });
await click('a:push:send');
check(pushed.length === 1 && pushed[0].chat_id === 999, 'пуш ушёл только активному подписчику');

/* ── v2: оформление и тексты через бота ── */
await click('s:meta'); await click('f:hero:text');
await msg(111, { text: 'Винил, коктейли и comfort food' });
check(store.state.meta.hero.text === 'Винил, коктейли и comfort food', 'текст героя обновлён из бота');
await click('s:meta'); await click('f:hero:cta');
await msg(111, { text: 'Занять стол' });
check(store.state.meta.hero.cta === 'Занять стол', 'кнопка на главной переименована');
await click('s:meta'); await click('f:meta:sub');
await msg(111, { text: 'ФОНОТЕКА + БАР' });
check(store.state.meta.sub === 'ФОНОТЕКА + БАР', 'подпись в шапке правится из бота');

await click('s:copy'); await click('f:copy:titleEvents');
await msg(111, { text: 'ВЕЧЕРА' });
check(store.state.copy.titleEvents === 'ВЕЧЕРА', 'заголовок вкладки правится ботом');
await click('s:copy'); await click('a:copy:reset');
check(store.state.copy.titleEvents === 'АФИША', 'reset возвращает дефолтные тексты');
check(store.state.copy.tabTeam === 'Команда' && store.state.copy.titleTeam === 'КОМАНДА', 'в текстах UI есть «Команда»');

await click('s:menu'); await click('menu:c:0'); await click('f:cat:0:note');
await msg(111, { text: 'Цены за 125 мл' });
check(store.state.menu.categories[0].note === 'Цены за 125 мл', 'сноска категории обновлена');
await click('menu:c:0');
const categoryControls = sent.at(-1).kb.inline_keyboard.flat();
check(!categoryControls.some((b) => /обложка|иконка|фото меню/i.test(b.text)), 'для категорий меню нет управления фото и emoji-иконками');

await click('s:meta'); await click('p:about');
await msg(111, { photo: [{ file_id: 'about1' }], caption: 'Зал Catch 22' });
check(/^\/media\//.test(store.state.meta.aboutImage), 'фото карточки «О нас» обновлено');

await click('s:contacts'); await click('p:c');
await msg(111, { photo: [{ file_id: 'cont1' }] });
check(/^\/media\//.test(store.state.contacts.image), 'фото контактов обновлено');
await click('p:book');
await msg(111, { photo: [{ file_id: 'book1' }] });
check(/^\/media\//.test(store.state.booking.image), 'фото брони обновлено');
await click('s:contacts'); await click('f:c:instagram');
await msg(111, { text: 'https://www.instagram.com/catch22.catch22.catch22/' });
check(store.state.contacts.instagram.includes('catch22.catch22.catch22'), 'ссылка на инстаграм правится из бота');

/* публичная выборка должна отдавать всё, что читает клиент */
const pub = store.publicState();
check(pub.team && pub.copy && pub.meta.hero && !('cover' in pub.menu.categories[0]), 'publicState отдаёт team/copy/hero без обложек меню');
check(!('image' in pub.menu.categories[0].sections[0].items[0]), 'publicState не отдаёт фото позиций меню');
check(pub.merch === undefined && pub.wallet === undefined, 'мерча и кошелька в публичных данных нет');

/* ── сериализация/перезагрузка ── */
store.save();
const store2 = new Store(tmp);
check(!('image' in store2.state.menu.categories[0].sections[0].items[0]), 'state.json пережил перезагрузку без фото меню');
check(store2.private.subs.length === 2 && store2.subStats().active === 1, 'подписчики пушей пережили перезагрузку');
check(store2.state.team.members[0].photo === store.state.team.members[0].photo, 'команда пережила перезагрузку');
check(store2.rev > 0, 'rev сохраняется');

/* ── легаси-данные (v2.0): перенос на новую версию при загрузке ── */
const legacy = structuredClone(store2.state);
delete legacy._v;
legacy.merch = [{ name: 'Кепка', price: 'скоро' }];
legacy.merchNote = 'оплата не подключена';
legacy.wallet = { enabled: true };
legacy.meta.sub = 'LISTENING BAR & BISTRO';
legacy.meta.hero.subtitle = 'LISTENING BAR & BISTRO';
legacy.meta.about = 'Музыкальный бар и бистро с коллекцией винила.';
legacy.meta.hero.text = 'Музыкальный бар и бистро\nс коллекцией винила.';
legacy.hours = [
  { days: 'Вт – Чт, Вс', time: '16:00 – 01:00' },
  { days: 'Пт – Сб', time: '16:00 – 02:00' },
  { days: 'Пн', time: 'Выходной', closed: true },
];
legacy.meta.awards = [
  { title: 'WhereToEat', text: 'Открытие года 2026 (W2D)', icon: '🍸' },
  { title: 'Sobaka.ru', text: 'Лучший новый бар', icon: '🏆' },
  { title: 'catch-22-bar.ru', text: 'Бронирование стола онлайн', icon: '🎧' },
];
legacy.socials = [{ platform: 'Instagram', url: 'https://instagram.com/catch22' }, { platform: 'Telegram', url: '' }];
legacy.contacts.site = '';
legacy.contacts.instagram = '';
delete legacy.team;
legacy.copy.tabMerch = 'Мерч';
legacy.copy.titleWallet = 'КОШЕЛЁК';
legacy.menu.note = 'Состав и наличие уточняйте у команды.';
legacy.menu.categories[0].cover = '/media/legacy-cover.jpg';
legacy.menu.categories[0].icon = '🍽';
legacy.menu.categories[0].sections[0].items[0].image = '/media/legacy-item.jpg';
legacy.gallery[0].caption = 'Старая подпись';
legacy.meta.awards[0].icon = '🏆';
fs.writeFileSync(path.join(tmp, 'state.json'), JSON.stringify(legacy));
const store3 = new Store(tmp);
check(store3.state.merch === undefined && store3.state.wallet === undefined, 'старые мерч/кошелёк удаляются при загрузке');
check(store3.state.meta.sub === 'ФОНОТЕКА + БАР' && store3.state.meta.hero.subtitle === 'ФОНОТЕКА + БАР', 'подписка «бистро» заменена на «фонотека + бар»');
check(!/бистро/i.test(store3.state.meta.about + store3.state.meta.hero.text), '«бистро» вычищено из описаний');
check(store3.state.hours[0].time === '16:00 – 00:00' && store3.state.hours[1].days === 'Пт, Сб', 'старые часы заменены на новые');
check(!store3.state.meta.awards.some((a) => /sobaka|catch-22-bar/i.test(a.title)), 'Sobaka.ru и «сайт-награда» убраны из старого состояния');
check(store3.state.socials.find((x) => /inst/i.test(x.platform)).url === 'https://www.instagram.com/catch22.catch22.catch22/', 'старая ссылка на инстаграм обновлена');
check(store3.state.socials.some((x) => x.url === 'https://catch-22-bar.ru/'), 'сайт добавлен в соцсети');
check(store3.state.contacts.site === 'https://catch-22-bar.ru/' && store3.state.contacts.instagram.includes('catch22.catch22.catch22'), 'контакты получили сайт и инстаграм');
check(store3.publicState().team?.title === 'КОМАНДА', 'блок «Команда» появился на месте мерча');
check(store3.state.copy.tabMerch === undefined && store3.state.copy.titleWallet === undefined, 'тексты мерча/кошелька убраны');
check(store3.state.copy.tabTeam === 'Команда', 'текст вкладки «Команда» добавился');
check(store3.state.menu.note === '' && !('cover' in store3.state.menu.categories[0]) && !('icon' in store3.state.menu.categories[0]), 'миграция 2.3 убрала старую сноску и иконки/обложки меню');
check(!('image' in store3.state.menu.categories[0].sections[0].items[0]) && !('caption' in store3.state.gallery[0]) && !('icon' in store3.state.meta.awards[0]), 'миграция 2.3 удалила legacy-фото, подписи и emoji наград');
check(store3.rev > store2.rev, 'после переноса rev вырос — приложение обновится само');
check(new Store(tmp).state.meta.sub === 'ФОНОТЕКА + БАР', 'миграция идемпотентна: второй запуск ничего не ломает');

/* правки бара не затираются: свой текст героя остаётся */
store3.update('hero', (s) => { s.meta.hero.text = 'Наш текст про винил'; });
store3.save();
const store4 = new Store(tmp);
check(store4.state.meta.hero.text === 'Наш текст про винил', 'текст, который бар поставил сам, миграция не трогает');

/* ── v2.1 → v2.3: данные пресс-кита и очистка старых полей меню ── */
const v21 = structuredClone(store4.state);
v21._v = 2.1;
v21.meta.tagline = 'Винил. Коктейли. Comfort food.\nМузыка, которую хочется слушать.\nБар и фонотека Catch 22.';
delete v21.meta.story;
v21.meta.hero.image = '/img/interior-vinyl.jpg';
v21.contacts.phone = '8 (931) 531-22-32';
v21.contacts.email = 'hello@catch-22-bar.ru';
v21.team.members = [];
const bar21 = v21.menu.categories.find((c) => c.id === 'bar');
bar21.sections[0].items = [
  { name: 'MINIMOG', desc: 'текила / джин', price: '950' },          // старое распознавание
  { name: 'ABBA', desc: 'старый состав', price: '950', stop: true }, // в стоп-листе
  { name: 'НАШ СЕЗОННЫЙ', desc: 'добавили через бота', price: '1000' },
];
fs.writeFileSync(path.join(tmp, 'state.json'), JSON.stringify(v21));
const store5 = new Store(tmp);
const all5 = store5.state.menu.categories.flatMap((c) => c.sections.flatMap((x) => x.items));
check(store5.state._v === 2.3, 'состояние перенесено на v2.3');
check(store5.state.meta.story.includes('Studio Cache') && store5.state.meta.tagline.includes('listening bar'), 'тексты из пресс-релиза');
check(store5.state.meta.hero.text === 'Наш текст про винил', 'свой текст героя бара сохранён и в 2.2');
check(store5.state.contacts.phone === '+7 (931) 531-22-32' && store5.state.contacts.email === '', 'телефон из пресс-кита, выдуманная почта убрана');
check(store5.state.team.members.length >= 10 && store5.state.team.members.some((m) => m.role === 'Шеф-повар' && m.name === 'Илья Борик'), 'команда из пресс-кита появилась');
check(store5.state.meta.awards.some((a) => /Where2Drink/.test(a.text)), '«Открытие года 2026» Where2Drink в фишках');
check(all5.some((i) => i.name === 'MINIMOOG' && /мороженое/.test(i.desc)) && !all5.some((i) => i.name === 'MINIMOG'), 'меню заменено на официальную карту');
check(all5.find((i) => i.name === 'ABBA')?.stop === true && /горечавка/.test(all5.find((i) => i.name === 'ABBA').desc), 'стоп-лист пережил замену меню');
check(all5.some((i) => i.name === 'НАШ СЕЗОННЫЙ'), 'позиции, заведённые баром, сохранены');
check(new Store(tmp).state.menu.categories.flatMap((c) => c.sections.flatMap((x) => x.items)).length === all5.length, 'миграция 2.2 идемпотентна');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILURES` : '\nВсе проверки пройдены ✔');
process.exit(fails ? 1 : 0);
