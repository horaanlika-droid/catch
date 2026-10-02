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
  tabTeam: 'Команда',
  tabMore: 'Ещё',
  // заголовки экранов
  titleMenu: 'МЕНЮ',
  titleEvents: 'АФИША',
  titleTeam: 'КОМАНДА',
  titleMore: 'ПРОФИЛЬ',
  titleBooking: 'БРОНИРОВАНИЕ',
  titleContacts: 'КОНТАКТЫ',
  titleJobs: 'РАБОТА',
  // кнопки
  ctaBooking: 'Забронировать стол',
  ctaContacts: 'Написать в Telegram',
  ctaJobs: 'Отправить анкету',
  ctaGallery: 'Смотреть фото',
  ctaSite: 'Открыть сайт',
  ctaInstagram: 'Мы в Instagram',
  // подписи блоков
  eventsSub: 'Винил, сессии и гости за пультом',
  teamSub: 'Люди, которые делают Catch 22',
  teamNote: 'Раздел в работе — добавим фото и имена команды.',
  aboutCard: 'О нас',
  tonight: 'Этим вечером',
  stopTitle: 'Сегодня не продаём',
  hoursTitle: 'Часы работы',
  socialsTitle: 'Мы на связи',
  awardsTitle: 'За что нас любят',
  galleryTitle: 'Галерея',
  jobsCard: 'Стань частью команды',
};

/** как подписывать поля на экране «Тексты» в боте */
export const COPY_LABELS = {
  tabHome: 'Вкладка «Главная»',
  tabMenu: 'Вкладка «Меню»',
  tabEvents: 'Вкладка «Афиша»',
  tabTeam: 'Вкладка «Команда»',
  tabMore: 'Вкладка «Ещё»',
  titleMenu: 'Заголовок: меню',
  titleEvents: 'Заголовок: афиша',
  titleTeam: 'Заголовок: команда',
  titleMore: 'Заголовок: профиль',
  titleBooking: 'Заголовок: бронь',
  titleContacts: 'Заголовок: контакты',
  titleJobs: 'Заголовок: работа',
  ctaBooking: 'Кнопка брони',
  ctaContacts: 'Кнопка связи',
  ctaJobs: 'Кнопка анкеты',
  ctaGallery: 'Кнопка галереи',
  ctaSite: 'Кнопка «сайт»',
  ctaInstagram: 'Кнопка «Instagram»',
  eventsSub: 'Подзаголовок афиши',
  teamSub: 'Подзаголовок команды',
  teamNote: 'Плашка «команда в работе»',
  aboutCard: 'Карточка «О нас»',
  tonight: 'Блок «что скоро»',
  stopTitle: 'Плашка стоп-листа',
  hoursTitle: 'Блок «часы»',
  socialsTitle: 'Блок «мы на связи»',
  awardsTitle: 'Блок «фишки»',
  galleryTitle: 'Блок «галерея»',
  jobsCard: 'Блок «работа»',
};
