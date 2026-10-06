// Стартовое состояние приложения CATCH 22.
// Тексты, команда, меню и фото сверены с пресс-китом бара (PRESS PACK:
// «Press Catch 22», «Что Где Есть Catch 22», Menu, Photo/*). Всё, что здесь
// лежит, админ потом правит через бота — этот файл только дефолт.
import { menu } from './menu.js';

const P = '/img/press';

export const seed = {
  meta: {
    name: 'CATCH 22',
    sub: 'ФОНОТЕКА + БАР',
    tagline:
      'Музыкальный listening bar и фонотека.\nШумные вечеринки по пятницам и субботам,\nкоктейли и comfort food.',
    // коротко — для карточки «О нас» в боковом меню
    about:
      'Listening bar и фонотека на Фонтанке, 86: винил, звук Tannoy High Fidelity, коктейли и comfort food.',
    // подробно — для раздела «О нас» на экране «Ещё» (из пресс-релиза бара)
    story:
      'Бар и фонотека Catch 22 — музыкальный listening bar и фонотека, шумные вечеринки каждую пятницу и субботу, коктейли и comfort food.\n\n' +
      'За дизайн отвечает лондонское бюро Studio Cache. В основе бара — премиальная акустическая система погружения High Fidelity от исторического бренда Tannoy.\n\n' +
      'Музыкальной концепцией фонотеки занимается Евгений Литвяк — музыкальный энтузиаст, коллекционер винила и совладелец баров «На Вина».\n\n' +
      'Напитки разработаны барной командой во главе с Даниилом Золотухиным и шеф-бартендером Дмитрием Гукасяном (ex El Copitas). Идея коктейльной карты родилась вместе с концепцией бара: каждый коктейль отражает одну из музыкальных революций. ABBA посвящён культовой поп-группе 70-х, а iTunes символизирует цифровое влияние на музыку.\n\n' +
      'За кухню отвечают шеф-повар Илья Борик (ex Beefzavod, Nola Jazz Bar) и су-шеф Иван Королев (ex Футура). В меню — comfort food со всего света: от севиче из гребешка до фокаччи с прошутто котто и европейскими сырами.\n\n' +
      'Винную карту собрали Сергей Ничога и Евгений Литвяк — как пластинку с двумя сторонами. Сторона A — хиты, знакомые сорта и понятные регионы, но без скучной классики. Сторона B — new wave, авангард и неожиданные прочтения.',
    hero: {
      title: 'CATCH 22',
      subtitle: 'ФОНОТЕКА + БАР',
      // текст под логотипом на главной — правится ботом (🏷 О заведении)
      text: 'Listening bar и фонотека.\nВинил, коктейли\nи comfort food.',
      image: `${P}/interior/bar-wide.jpg`,
      cta: 'Забронировать стол',
    },
    // фото карточки «О нас» в боковом меню
    aboutImage: `${P}/interior/lounge-chair.jpg`,
    bot: '',
    // «За что нас любят» — только подтверждённые факты из пресс-кита
    awards: [
      { icon: '🏆', title: 'Открытие года 2026', text: 'Всероссийская премия Where2Drink' },
      { icon: '🔊', title: 'Звук Tannoy', text: 'Акустическая система погружения High Fidelity' },
      { icon: '🎧', title: 'Фонотека', text: 'Винил и музыкальная концепция Евгения Литвяка' },
      { icon: '🍸', title: 'Коктейли', text: 'Каждый — одна из музыкальных революций, от 950 ₽' },
      { icon: '🍷', title: 'Вино A / B', text: 'Карта как пластинка: хиты и new wave' },
      { icon: '🛋', title: 'Studio Cache', text: 'Интерьер от лондонского бюро' },
    ],
  },

  hours: [
    { days: 'Вт, Ср, Чт, Вс', time: '16:00 – 00:00' },
    { days: 'Пт, Сб', time: '16:00 – 02:00' },
    { days: 'Пн', time: 'Выходной', closed: true },
  ],

  contacts: {
    address: 'наб. реки Фонтанки, 86, Санкт-Петербург',
    maps: 'https://yandex.ru/maps/?text=наб+реки+Фонтанки+86',
    phone: '+7 (931) 531-22-32',
    phoneHref: 'tel:+79315312232',
    email: '',
    site: 'https://catch-22-bar.ru/',
    instagram: 'https://www.instagram.com/catch22.catch22.catch22/',
    bookingUrl: 'https://catch-22-bar.ru/',
    note: 'Listening bar и фонотека на набережной Фонтанки',
    image: `${P}/interior/bar-window.jpg`,
  },

  socials: [
    { platform: 'Instagram', url: 'https://www.instagram.com/catch22.catch22.catch22/' },
    { platform: 'Сайт', url: 'https://catch-22-bar.ru/' },
  ],

  booking: {
    enabled: true,
    title: 'Столик у фонотеки',
    text: 'Подтверждение бронирования в течение 15 минут',
    image: `${P}/interior/table-wine.jpg`,
  },

  brunch: {
    enabled: true,
    title: 'БРАНЧ',
    text: 'Суббота и воскресенье, 16:00 – 18:00\nСвечи на барной стойке, тостер, сливочное масло, икра\nи яйца почти десятком разных способов',
    image: '/img/brunch.jpg',
  },

  // меню вынесено в seed/menu.js — сверено с официальной картой из пресс-кита
  menu,

  events: [
    {
      date: '2026-09-12',
      time: '20:00 – 02:00',
      title: 'MAESTRO SESSIONS: KITO JEMPERE',
      subtitle: 'back vocal — Евгений Литвяк',
      image: '/img/event-sept.jpg',
    },
    {
      date: '2026-09-18',
      time: '20:00 – 22:00',
      title: 'VINYL LOVERS DAY',
      subtitle: 'Jazz, downtempo & deep house — by Ivan Pudenkov',
      image: '',
    },
    {
      date: '2026-09-19',
      time: '20:00 – 02:00',
      title: 'CONTEMPORARY JAZZ · HIP-HOP & R’n’B',
      subtitle: 'by Dizzy · Poizon & Tony Lil',
      image: '',
    },
  ],

  // Блок «Команда» — по пресс-киту бара (PRESS PACK → Photo/Team + пресс-релиз).
  // Роли указаны только там, где они есть в пресс-релизе; остальным бар
  // допишет роль из бота (👥 Команда → участник → ✏️ Роль).
  team: {
    enabled: true,
    title: 'КОМАНДА',
    text: 'Люди, которые ставят пластинки, мешают коктейли и готовят на кухне Catch 22.',
    note: '',
    image: `${P}/vibe/bar-panorama.jpg`,
    members: [
      {
        name: 'Даниил Золотухин',
        role: 'Управляющий и партнёр',
        text: 'Управляющий и партнёр проекта. Вместе с шеф-бартендером разработал напитки и коктейльную карту Catch 22.',
        photo: `${P}/team/daniil-zolotukhin.jpg`,
      },
      {
        name: 'Евгений Литвяк',
        role: 'Музыкальная концепция',
        text: 'Музыкальный энтузиаст, коллекционер винила и совладелец баров «На Вина». Отвечает за музыкальную концепцию фонотеки и вместе с Сергеем Ничогой собрал винную карту.',
        photo: `${P}/team/evgeniy-litvyak.jpg`,
      },
      {
        name: 'Дмитрий Гукасян',
        role: 'Шеф-бартендер',
        text: 'Ex El Copitas. Коктейльная карта, где каждый напиток — одна из музыкальных революций: от ABBA до iTunes.',
        photo: `${P}/team/dmitriy-gukasyan.jpg`,
      },
      {
        name: 'Илья Борик',
        role: 'Шеф-повар',
        text: 'Ex Beefzavod, Nola Jazz Bar. Comfort food со всего света: от севиче из гребешка до фокаччи с прошутто котто и европейскими сырами.',
        photo: `${P}/team/ilya-borik.jpg`,
      },
      {
        name: 'Иван Королев',
        role: 'Су-шеф',
        text: 'Ex Футура. Вместе с Ильёй Бориком отвечает за кухню.',
        photo: '',
      },
      {
        name: 'Сергей Ничога',
        role: 'Винная карта',
        text: 'Вместе с Евгением Литвяком собрал винную карту — пластинку со сторонами A и B.',
        photo: '',
      },
      { name: 'Алексей', role: '', text: '', photo: `${P}/team/aleksey.jpg` },
      { name: 'Натали Афанасьева', role: '', text: '', photo: `${P}/team/natali-afanasyeva.jpg` },
      { name: 'Алина Балк', role: '', text: '', photo: `${P}/team/alina-balk.jpg` },
      { name: 'Глеб Драгин', role: '', text: '', photo: `${P}/team/gleb-dragin.jpg` },
      { name: 'Даниил Кузин', role: '', text: '', photo: `${P}/team/daniil-kuzin.jpg` },
      { name: 'Мария Иванова', role: '', text: '', photo: `${P}/team/mariya-ivanova.jpg` },
      { name: 'Павел Павлов', role: '', text: '', photo: `${P}/team/pavel-pavlov.jpg` },
      { name: 'Егор Печенкин', role: '', text: '', photo: `${P}/team/egor-pechenkin.jpg` },
      { name: 'Руслан Рожков', role: '', text: '', photo: `${P}/team/ruslan-rozhkov.jpg` },
      { name: 'Никита Соколюк', role: '', text: '', photo: `${P}/team/nikita-sokolyuk.jpg` },
    ],
  },

  // тексты интерфейса: что не указано — берётся из seed/copy.js
  copy: {
    eventsSub: 'Винил, сессии и гости за пультом',
    teamSub: 'Люди, которые делают Catch 22',
  },
  jobs: {
    enabled: true,
    title: 'Стань частью CATCH 22',
    image: `${P}/food/kitchen.jpg`,
    text: 'Мы ищем в команду людей, которые разделяют нашу любовь к музыке, вкусной еде и гостеприимству. Оставьте анкету — мы свяжемся с вами.',
    positions: ['Официант', 'Бармен', 'Кухня', 'Хостес', 'Другое'],
  },

  gallery: [
    { src: `${P}/interior/bar-wide.jpg`, caption: 'Бар Catch 22' },
    { src: `${P}/vibe/vinyl-shelves.jpg`, caption: 'Фонотека' },
    { src: `${P}/interior/turntable.jpg`, caption: 'За пультом' },
    { src: `${P}/interior/lounge-chair.jpg`, caption: 'Интерьер — Studio Cache, Лондон' },
    { src: `${P}/cocktails/martini-tray.jpg`, caption: 'Pornstar Martini' },
    { src: `${P}/food/table.jpg`, caption: 'Comfort food' },
    { src: `${P}/vibe/cassette-deck.jpg`, caption: 'Звук и техника' },
    { src: `${P}/interior/bar-window.jpg`, caption: 'Вид на Фонтанку' },
    { src: `${P}/vibe/dj-hands.jpg`, caption: 'Винил' },
    { src: `${P}/interior/vinyl-records.jpg`, caption: 'Коллекция пластинок' },
  ],
};
