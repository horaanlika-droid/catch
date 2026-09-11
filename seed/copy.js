/*
 * Тексты интерфейса приложения CATCH 22.
 * Лежат в состоянии (state.copy), поэтому подписи кнопок, заголовки вкладок
 * и разделов правятся админ-ботом (/panel → «Тексты») и мгновенно улетают
 * в веб-клиент так же, как цены или афиша.
 *
 * Ключи переиспользует и клиент (public/app.js берёт state.copy целиком),
 * поэтому достаточно поменять значение через бота — без релиза.
 */
export const COPY_DEFAULT = {
  // вкладки
  tabHome: 'Главная',
  tabMenu: 'Меню',
  tabEvents: 'Афиша',
  tabMerch: 'Мерч',
  tabMore: 'Ещё',
  // заголовки экранов
  titleMenu: 'МЕНЮ',
  titleEvents: 'АФИША',
  titleMerch: 'МЕРЧ',
  titleMore: 'ПРОФИЛЬ',
  titleBooking: 'БРОНИРОВАНИЕ',
  titleContacts: 'КОНТАКТЫ',
  titleJobs: 'РАБОТА',
  titleWallet: 'КОШЕЛЁК',
  // кнопки
  ctaBooking: 'Забронировать стол',
  ctaMerch: 'Оставить заявку',
  ctaContacts: 'Написать в Telegram',
  ctaJobs: 'Отправить анкету',
  ctaGallery: 'Смотреть фото',
  ctaWallet: 'Подключить кошелёк',
  // подписи блоков
  eventsSub: 'Винил, сессии и гости за пультом',
  merchSub: 'Фирменные вещи Catch 22',
  aboutCard: 'О нас',
  tonight: 'Этим вечером',
  stopTitle: 'Сегодня не продаём',
  hoursTitle: 'Часы работы',
  socialsTitle: 'Соцсети',
  awardsTitle: 'За что нас любят',
  galleryTitle: 'Галерея',
  jobsCard: 'Стань частью команды',
  walletNote: 'Оплата мерча пока не подключена — оставьте заявку, согласуем лично.',
};

/** как подписывать поля на экране «Тексты» в боте */
export const COPY_LABELS = {
  tabHome: 'Вкладка «Главная»',
  tabMenu: 'Вкладка «Меню»',
  tabEvents: 'Вкладка «Афиша»',
  tabMerch: 'Вкладка «Мерч»',
  tabMore: 'Вкладка «Ещё»',
  titleMenu: 'Заголовок: меню',
  titleEvents: 'Заголовок: афиша',
  titleMerch: 'Заголовок: мерч',
  titleMore: 'Заголовок: профиль',
  titleBooking: 'Заголовок: бронь',
  titleContacts: 'Заголовок: контакты',
  titleJobs: 'Заголовок: работа',
  titleWallet: 'Заголовок: кошелёк',
  ctaBooking: 'Кнопка брони',
  ctaMerch: 'Кнопка мерча',
  ctaContacts: 'Кнопка связи',
  ctaJobs: 'Кнопка анкеты',
  ctaGallery: 'Кнопка галереи',
  ctaWallet: 'Кнопка кошелька',
  eventsSub: 'Подзаголовок афиши',
  merchSub: 'Подзаголовок мерча',
  aboutCard: 'Карточка «О нас»',
  tonight: 'Блок «что скоро»',
  stopTitle: 'Плашка стоп-листа',
  hoursTitle: 'Блок «часы»',
  socialsTitle: 'Блок «соцсети»',
  awardsTitle: 'Блок «фишки/награды»',
  galleryTitle: 'Блок «галерея»',
  jobsCard: 'Блок «работа»',
  walletNote: 'Плашка про оплату',
};
