// Стартовое состояние приложения CATCH 22.
// Собрано из фото меню/афиши в репозитории (docs/reference/).
// Пункты распознаны с фото — точные цены/составы админ всегда может
// поправить через бота (админ-панель → Меню).
export const seed = {
  meta: {
    name: 'CATCH 22',
    sub: 'LISTENING BAR & BISTRO',
    tagline:
      'Винил. Коктейли. Comfort food.\nМузыка, которую хочется слушать.\nБар и фонотека Catch 22.',
    about:
      'Музыкальный бар и бистро с коллекцией винила, коктейлями и comfort food. Открытие года 2026 по версии W2D.',
    hero: {
      title: 'CATCH 22',
      subtitle: 'LISTENING BAR & BISTRO',
      // текст под логотипом на главной — правится ботом (🏷 О заведении)
      text: 'Музыкальный бар и бистро\nс коллекцией винила, коктейлями\nи comfort food.',
      image: '/img/interior-vinyl.jpg',
      cta: 'Забронировать стол',
    },
    // фото карточки «О нас» в боковом меню
    aboutImage: '/img/interior-chair.jpg',
    bot: '',
    awards: [
      { icon: '🍸', title: 'WhereToEat', text: 'Открытие года 2026 (W2D)' },
      { icon: '🏆', title: 'Sobaka.ru', text: 'Лучший новый бар' },
      { icon: '🎧', title: 'catch-22-bar.ru', text: 'Бронирование стола онлайн' },
    ],
  },

  hours: [
    { days: 'Вт – Чт, Вс', time: '16:00 – 01:00' },
    { days: 'Пт – Сб', time: '16:00 – 02:00' },
    { days: 'Пн', time: 'Выходной', closed: true },
  ],

  contacts: {
    address: 'наб. реки Фонтанки, 86, Санкт-Петербург',
    maps: 'https://yandex.ru/maps/?text=наб+реки+Фонтанки+86',
    phone: '8 (931) 531-22-32',
    phoneHref: 'tel:+79315312232',
    email: 'hello@catch-22-bar.ru',
    bookingUrl: 'https://catch-22-bar.ru',
    note: 'наб. реки Фонтанки, 86 — вход со двора, ищите вывеску 22',
    image: '/img/interior-vinyl.jpg',
  },

  socials: [
    { platform: 'Instagram', url: 'https://instagram.com/catch22' },
    { platform: 'Telegram', url: '' },
  ],

  booking: {
    enabled: true,
    title: 'Столик у фонотеки',
    text: 'Подтверждение бронирования в течение 15 минут',
    image: '/img/interior-chair.jpg',
  },

  brunch: {
    enabled: true,
    title: 'БРАНЧ',
    text: 'Суббота – Воскресенье\nс 16:00 до 18:00',
    image: '/img/brunch.jpg',
  },

  menu: {
    note: 'Меню распознано с фото бара — уточняйте у команды.',
    categories: [
      {
        id: 'food',
        title: 'Еда',
        icon: '🍽',
        cover: '/img/brunch.jpg',
        note: 'Кухню ведёт шеф, который сам подбирает пластинки на вечер',
        sections: [
          {
            title: 'Starts',
            items: [
              { name: 'Картофель фри с трюфельным майо', price: '590' },
              { name: 'Батат фри с соусом блю чиз', price: '690' },
              { name: 'Чипсы с красной/чёрной икрой', price: '890/2790' },
              { name: 'Тартар из говядины блю чиз', price: '790' },
              { name: 'Тартар из говядины', price: '790' },
              { name: 'Фаршированные яйца с красной икрой', price: '690' },
              { name: 'Креветочные шарики с соусом спайси-майо', price: '790' },
              { name: 'Запечённые черри со взбитой фетой', price: '690' },
              { name: 'Салат с осьминогом', price: '1290', tags: ['new'] },
            ],
          },
          {
            title: 'Fresh',
            items: [
              { name: 'Севиче из дальневосточного гребешка', price: '830' },
              { name: 'Буррата с томатами', price: '990' },
              { name: 'Табуле', price: '760' },
              { name: 'Креветки / сальса / копчёная страчателла', price: '1160', tags: ['chef'] },
              { name: 'Зеленый салат', price: '890' },
              { name: 'Салат хориатики', price: '790' },
              { name: 'Крудо из бралтуца с морковным агачиле', price: '790' },
              { name: 'Салат с черешней', price: '790' },
              { name: 'Сезонные овощи с дзадзыки', price: '490', tags: ['new'] },
              { name: 'Коппа / персик / страчателла', price: '1190' },
            ],
          },
          {
            title: 'Delicatessen',
            items: [
              { name: 'Вяленые томаты', price: '640' },
              { name: 'Оливки', price: '640' },
              { name: 'Артишоки', price: '690' },
              { name: 'Хамон', price: '1210', tags: ['must try'] },
              { name: 'Сесина', price: '1210' },
              { name: 'Сыр манчего выдержанный', price: '990' },
              { name: 'Сыр манчего с трюфелем', price: '990' },
              { name: 'Молодой козий сыр', price: '990' },
              { name: 'Хлеб санчоусным маслом', price: '590' },
            ],
          },
          {
            title: 'Main',
            items: [
              { name: 'Перец с рататуй и тоннато', price: '690' },
              { name: 'Томатный суп и гриль чиз', price: '790' },
              { name: 'Фокачча сэндвич с прошутто котто', price: '790' },
              { name: 'Чикен сэндвич', price: '790', tags: ['must try'] },
              { name: 'Хрустящий цыплёнок с ромейном', price: '790' },
              { name: 'Маффин с яйцом', price: '690' },
              { name: 'Бифштекс с перечным соусом', price: '990' },
              { name: 'Щупальце осьминога с соусом из чоризо', price: '1690', tags: ['new'] },
              { name: 'Палтус с рататуй и дзадзыки', price: '990', tags: ['new'] },
            ],
          },
          {
            title: 'Desserts',
            items: [
              { name: 'Бананы фостер', price: '690' },
              { name: 'Сырный мусс с жжёным лимоном', price: '690' },
              { name: 'Яблочный пирог', price: '690' },
            ],
          },
        ],
      },
      {
        id: 'bar',
        title: 'Бар',
        icon: '🍸',
        cover: '/img/interior-vinyl.jpg',
        note: 'Коктейли по музыкальным эпохам — от 950 ₽',
        sections: [
          {
            title: 'Signature Cocktails · 950',
            items: [
              { name: 'DIN45500', desc: 'ром / кардамовый лайм / кокос / лемонграсс', price: '950' },
              { name: 'ABBA', desc: 'хурмовая вермут-настойка / крепкий чай / одуванчик / медовый тоник', price: '950' },
              { name: 'MINIMOG', desc: 'текила / джин / ром / водка / трипл-сек / кофе / карамель / кола / мороженое', price: '950' },
              { name: 'WALKMAN', desc: 'мартина ферро / джин / шанди / клубника / розовый перец', price: '950' },
              { name: 'FAIRLIGHT CMI', desc: 'джин / базилик / кампотский перец / малина', price: '950', tags: ['must try'] },
              { name: 'ITUNES', desc: 'кальвадос / фейхоа / яблоко / абсент', price: '950' },
              { name: '808', desc: 'коньяк / мартини россо / вермут / амаро / ежевика / сода', price: '950' },
              { name: 'GRAMOPHONE', desc: 'джин / кинза / какао блан / фенхель', price: '950' },
              { name: 'GIBSON −72°', desc: 'джин / мартини экстра-драй / чёрный чеснок / кленовый уксус', price: '950' },
              { name: 'LONGLAY', desc: 'ром / кофейный ликер / мисо-карамель / сода-тоник / эспрессо / дрибл', price: '950' },
            ],
          },
          {
            title: 'Classic · 950',
            items: [
              { name: 'SKINNY BITCH', desc: 'водка / лайм / содовая', price: '950' },
              { name: 'BELLINI', desc: 'просекко / белый персик', price: '950' },
              { name: 'GIN&TONIC on a tap', desc: 'джин / тоник', price: '950' },
              { name: 'BLOODY MARY', desc: 'водка / сангрия / микс специй', price: '950' },
              { name: 'AMARETTO SOUR', desc: 'амаретто / бурбон / лимон', price: '950' },
              { name: 'AVIATION', desc: 'джин / фиалка / мараскино', price: '950' },
              { name: 'COSMOPOLITAN', desc: 'водка / апельсин / клюква / лайм', price: '950', tags: ['king special'] },
              { name: 'TOMMY’S MARGARITA', desc: 'текила бланко / агавовый нектар / лайм', price: '950' },
              { name: 'NEGRONI', desc: 'джин / кампари / красный вермут', price: '950' },
              { name: 'DRY MARTINI', desc: 'джин / мартини экстра-драй / апельсиновый биттер', price: '950' },
            ],
          },
          {
            title: 'Mocktails · 700',
            items: [
              { name: 'VIRGIN DIN45500', desc: 'кокос / кардамовый лайм / лемонграсс', price: '700' },
              { name: 'VIRGIN BELLINI', desc: 'б/а просекко / белый персик', price: '700' },
              { name: 'VIRGIN MICHELADA', desc: 'сангрия / б/а пиво', price: '700' },
              { name: 'ALICE ADONIS', desc: 'б/а красный вермут / б/а вишнёвый биттер / бузина', price: '700', tags: ['for our friends'] },
              { name: 'GIN MAID 75', desc: 'б/а джин / мята / апельсин / б/а игристое', price: '700' },
              { name: 'BOULEVARDIER', desc: 'б/а бурбон / б/а красный биттер / б/а красный вермут', price: '700' },
            ],
          },
          {
            title: 'Special',
            items: [
              { name: 'PENICILLIN + BLUE CHEESE TARTAR', desc: '«GlenDron» peated / blending scotch / мед / имбирь / лимон + тартар / голубой сыр', price: '1100' },
              { name: 'PORNSTAR MARTINI', desc: 'grey goose / creme de luxe / ликер ваниль / маракуйя', price: '1400' },
              { name: 'WATERMELON FROZEN MARGO', desc: 'текила бланко / ликер / мята / лайм / перец халапеньо', price: '950' },
              { name: 'COCO NEGRONI', desc: 'ром / кампари / амаретто / кокос / вишня / красный вермут', price: '950' },
              { name: 'APEROL SPRITZ', desc: 'апероль / б/а просекко', price: '950', tags: ['no shm no share'] },
              { name: 'OYSTER MICHELADA', desc: 'сангрия / пиво / устрицы', price: '950', tags: ['friday till sunday'] },
            ],
          },
          {
            title: 'Premium',
            items: [
              { name: 'KITOS NEGRONI', desc: 'bombay sapphire / stalee / amaro / rabarbaro / cocchi diritto teatro', price: '1500' },
              { name: 'IDIOT WHISKEY COLA', desc: 'macallan 12 y.o double cask / coca-cola 0.33', price: '2500' },
              { name: 'CLASE AZUL MARGO', desc: 'clase azul reposado / contreau / лайм', price: '6000' },
              { name: 'CHAMPAGNE COCKTAIL', desc: 'champagne pommery grand cru / мускат / анголатура', price: '5000' },
              { name: 'PORNSTAR MARTINI COCKTAIL TREE', desc: 'pornstar martini 6x + cava de lux 1000 ml 0,75 л', price: '12000' },
            ],
          },
        ],
      },
      {
        id: 'drinks',
        title: 'Крепкое',
        icon: '🥃',
        cover: '/img/event-sept.jpg',
        note: '40 мл · налили и объяснили',
        sections: [
          {
            title: 'Whiskey · 40 мл',
            items: [
              { name: 'DEWAR’S WHITE LABEL', desc: 'шотландия, хаеленд', price: '700' },
              { name: 'DEWAR’S 8 Y.O.', desc: 'шотландия, хаеленд', price: '800', tags: ['+ blue cheese tartar'] },
              { name: 'CRAIGELLACHIE 13 Y.O.', desc: 'шотландия, спейсайд', price: '1100' },
              { name: 'GLENFIDDICH 15 YEARS OLD', desc: 'шотландия, спейсайд', price: '1600' },
              { name: 'ARDBEG 10 Y.O.', desc: 'шотландия, айл-эй', price: '1600' },
              { name: 'ROYAL BRACKLA 12 Y.O.', desc: 'шотландия, спейсайд', price: '1000' },
              { name: 'TAMDHU AGED 12 YEARS', desc: 'шотландия, айла', price: '1700' },
              { name: 'MACALLAN 12 Y.O DOUBLE CASK', desc: 'шотландия, спейсайд', price: '1900' },
              { name: 'BUSHMILLS 10 Y.O. SINGLE MALT', desc: 'ирландия, антрим', price: '900' },
              { name: 'TEELING SMALL BATCH', desc: 'ирландия, дублин', price: '900' },
              { name: 'TEELING SINGLE MALT BLACKPITTS', desc: 'ирландия, дублин', price: '1000' },
              { name: 'TEELING SINGLE MALT', desc: 'ирландия, дублин', price: '900' },
              { name: 'MAKER’S MARK', desc: 'сша, кентукки', price: '900' },
              { name: 'ABASOLO ALMA DE LA TIERRA', desc: 'мексика, мичоакан', price: '900' },
              { name: 'KEMILIYA RUSSIAN RYE', desc: 'россия, мурманская обл.', price: '800' },
              { name: 'KAVALAN DISTILLERY SELECT #1', desc: 'тайвань', price: '1000' },
              { name: 'NOBUSHI SINGLE GRAIN', desc: 'япония, ниигата', price: '1300' },
              { name: 'HATOZAKI BLENDED', desc: 'япония, кёто', price: '900' },
            ],
          },
          {
            title: 'Tequila · 40 мл',
            items: [
              { name: 'LIBELAJO JOVEN', desc: 'мексика, халиско', price: '1000' },
              { name: 'MARAMEC PLATA', desc: 'мексика, халиско', price: '1700' },
              { name: 'CORRALEJO BLANCO', desc: 'мексика, ранчо эло', price: '800' },
              { name: 'ESPOLON ANEJO', desc: 'мексика, халиско', price: '900' },
              { name: 'ESPOLON BLANCO', desc: 'мексика, халиско', price: '800' },
              { name: 'ESPOLON CRISTALINO', desc: 'мексика, халиско', price: '1200' },
              { name: 'CAVA DE ORO EXTRA AÑEJO BLACK', desc: 'мексика, халиско', price: '3600' },
              { name: 'DON JULIO 1942 AÑEJO', desc: 'мексика, халиско', price: '3900' },
              { name: 'CLASE AZUL REPOSADO', desc: 'мексика, халиско', price: '6000' },
            ],
          },
          {
            title: 'Mezcal · 40 мл',
            items: [
              { name: 'MONTELOBOS ESPADÍN', desc: 'мексика, оахака', price: '1300' },
              { name: 'SE BUSCA JOVEN MADRECUILHE', desc: 'мексика, оахака', price: '1800' },
              { name: 'BUEN AMIGO JOVEN', desc: 'мексика, закаткас', price: '800' },
              { name: 'RAICILLA LA VENENOSA SIERRA DEL TIGRE', desc: 'мексика, халиско', price: '2500' },
              { name: 'SOTOL NOCHELUNA', desc: 'мексика, чихуахуа', price: '1000' },
              { name: 'CLASE AZUL DURANGO', desc: 'мексика, дуронго', price: '12000' },
              { name: 'CLASE AZUL GUERRERO', desc: 'мексика, герреро', price: '12000' },
              { name: 'CLASE AZUL SAN LUIS POTOSÍ', desc: 'мексика, сан-луис-потоси', price: '12000' },
            ],
          },
          {
            title: 'Brandy · 40 мл',
            items: [
              { name: 'COURVOISIER VS', desc: 'франция, коньяк', price: '800' },
              { name: 'COURVOISIER VSOP', desc: 'франция, коньяк', price: '1100' },
              { name: 'BARON OTARD VSOP', desc: 'франция, коньяк', price: '900' },
              { name: 'FRANCOIS DE MARTIGNAC XO', desc: 'франция, коньяк', price: '1800' },
              { name: 'TIO TOTO BRANDY DE JEREZ', desc: 'испания, андалусия', price: '700' },
              { name: 'BUSNEL FINE PAYS D’AUGE', desc: 'франция, нормандия', price: '800' },
              { name: 'BLANCHE DE NORMANDIE', desc: 'франция, кальвадос', price: '900' },
              { name: 'PISCO VINAS DE ORO TORONTEL', desc: 'перу', price: '900' },
            ],
          },
          {
            title: 'Rum · 40 мл',
            items: [
              { name: 'GOSLING’S BLACK SEAL', desc: 'бермуды', price: '700' },
              { name: 'ANGOSTURA RESERVA 3 Y.O.', desc: 'тринидад и тобаго', price: '700' },
              { name: 'EL RON PROHIBIDO 12 Y.O.', desc: 'мексика, гвадалахара', price: '900' },
              { name: 'PLANTATION THREE STARS', desc: 'барбадос, ямайка, тринидад, тобаго', price: '800' },
              { name: 'BACARDI OAKHEART ORIGINAL', desc: 'испания, куба', price: '700' },
              { name: 'BUMBU ORIGINAL', desc: 'барбадос', price: '1000' },
              { name: 'BOTUCAL MONTUANO EXTRA ANEJO', desc: 'венесуэла, тругильо', price: '800' },
              { name: 'ZACAPA 23 Y.O.', desc: 'гватемала, суареда вьюа', price: '1400' },
              { name: 'CACHAÇA VELHO BARREIRO', desc: 'бразилия, сан-паулу', price: '800' },
              { name: 'RHUM JM BLANC', desc: 'франция, мартиника', price: '900' },
            ],
          },
          {
            title: 'Gin · 40 мл',
            items: [
              { name: 'ROKU GIN', desc: 'япония, осака', price: '900' },
              { name: 'SIPSMITH LONDON DRY', desc: 'англия, лондон', price: '800' },
              { name: 'HENDRICK’S', desc: 'шотландия', price: '800' },
              { name: 'MARSHALL LONDON DRY', desc: 'россия, санкт-петербург', price: '1000' },
              { name: 'BOMBAY SAPPHIRE', desc: 'англия, лондон', price: '800' },
              { name: 'BOLS GENEVER BARREL AGED', desc: 'нидерланды', price: '1000' },
              { name: 'GIN MARE', desc: 'испания', price: '800' },
              { name: 'BEEFEATER PINK', desc: 'англия, лондон', price: '700' },
              { name: 'GREY SHINE', desc: 'россия, нижний новгород', price: '700' },
            ],
          },
          {
            title: 'Vodka · 40 мл',
            items: [
              { name: 'TSELOVALNIK', desc: 'россия, казань', price: '500' },
              { name: 'GREY GOOSE', desc: 'франция', price: '800' },
              { name: 'CHISTYE ROSY ORGANIC', desc: 'россия, самара', price: '700' },
              { name: 'KOSKENKORVA', desc: 'финляндия', price: '600' },
              { name: 'REYKA', desc: 'исландия, боргарнес', price: '1000' },
            ],
          },
          {
            title: 'Liqueur · 40 мл',
            items: [
              { name: 'LIMONCELLO PALLINI', desc: 'италия, рим', price: '500' },
              { name: 'TSELOVALNIK COFFEE ELIXIR', desc: 'россия, санкт-петербург', price: '500' },
              { name: 'NIXTA', desc: 'кукурузный ликер', price: '800' },
              { name: 'SUZE', desc: 'франция', price: '700' },
              { name: 'LE BIRLOU', desc: 'франция, савойя', price: '600' },
            ],
          },
          {
            title: 'Amaro · 40 мл',
            items: [
              { name: 'CAMPARI', desc: 'италия, милан', price: '500' },
              { name: 'APEROL', desc: 'италия', price: '500' },
              { name: 'SARTI', desc: 'италия, болонья', price: '500' },
              { name: 'AMARO MONTENEGRO', desc: 'италия, болонья', price: '600' },
              { name: 'CYNAR', desc: 'италия', price: '600' },
              { name: 'FERNET BRANCA', desc: 'италия, ломбардия', price: '600' },
            ],
          },
          {
            title: 'Fortified Wine · 40 мл',
            items: [
              { name: 'ВЕРМУТ MARTINI ROSSO, FIERO, EXTRA DRY', desc: 'италия, турин', price: '500' },
              { name: 'ВЕРМУТ MARTINI RISERVA AMBRATO, RUBINO', desc: 'италия, турин', price: '500' },
              { name: 'ВЕРМУТ NORDÈS ROJO', desc: 'испания, галисия', price: '600' },
              { name: 'ВЕРМУТ DOLIN DRY', desc: 'франция, шамбери', price: '600' },
              { name: 'ХЕРЕС LUSTAU PEDRO XIMÉNEZ', desc: 'испания, херес-де-ла-фронтера', price: '500' },
              { name: 'ХЕРЕС TIO PEPE PALOMINO FINO', desc: 'испания, херес-де-ла-фронтера', price: '600' },
              { name: 'ПОРТВЕЙН CALEM FINE RUBY', desc: 'португалия, дору', price: '500' },
            ],
          },
          {
            title: 'Beer',
            items: [
              { name: 'ASAHI SUPER DRY', desc: '0.5 л, Япония, Осака', price: '700' },
              { name: 'GUINNESS DRAUGHT', desc: '0.44 л, Ирландия, Дублин', price: '800' },
              { name: 'CORONA EXTRA', desc: '0.33 л, Мексика, Идальго', price: '600' },
              { name: 'CORONA CERO 0.0', desc: '0.5 л, Мексика, Идальго', price: '600' },
            ],
          },
          {
            title: 'Soft',
            items: [
              { name: 'COCA-COLA', desc: '0.33 л', price: '500' },
              { name: 'ТОНИК', desc: '0.2 л', price: '400' },
              { name: 'ФИЛЬТР КОФЕ', desc: '0.2 л', price: '300' },
              { name: 'ВОДА PREALPI', desc: '0.5 л', price: '500' },
              { name: 'СОКИ ZUEGG', desc: '0.2 л', price: '500' },
              { name: 'Б/А ИГРИСТОЕ', desc: '0.2 л', price: '700' },
            ],
          },
        ],
      },
      {
        id: 'wine',
        title: 'Вино',
        icon: '🍷',
        cover: '/img/interior-chair.jpg',
        note: 'Цены указаны за 125 мл / 750 мл',
        sections: [
          {
            title: 'A-SIDE · Игристое · 125/750 мл',
            items: [
              { name: 'KRONE «BOREALIS» VINTAGE CUVEE BRUT', desc: 'ЮАР', price: '900/5400' },
              { name: 'MARTINI BRUT', desc: 'Италия', price: '1100/6600' },
              { name: 'MARTINI PROSECCO ROSÉ', desc: 'Италия', price: '1200/7200' },
              { name: 'PAUL G. VALENTIN CRÉMANT DE LIMOUX №88', desc: 'Франция', price: '1200/7200' },
              { name: 'PATRICK PLUZE «FRENCH BUBBLE» ROSÉ', desc: 'Франция', price: '1400/8400' },
              { name: 'HENRI GIRAUD ESPRIT NATURE', desc: 'Шампань', price: '2800/16800' },
              { name: 'RUHLMANN DIRINGER BRUT NATURE CRÉMANT D’ALSACE', desc: 'Франция', price: '7900' },
              { name: 'DIEL RIESLING RESERVE SEKT EXTRA BRUT', desc: 'Германия', price: '17500' },
              { name: 'RUINART BLANC DE BLANCS', desc: 'Шампань', price: '40000' },
              { name: 'DOM PÉRIGNON', desc: 'Шампань', price: '69000' },
            ],
          },
          {
            title: 'A-SIDE · Белое',
            items: [
              { name: 'ANSELMO MENDES «3 RIOS» ESCOLHA, VINHO VERDE', desc: 'Португалия', price: '900/5400' },
              { name: 'DOMAINE LOUIS MOREAU, CHABLIS', desc: 'Франция', price: '1700/10200' },
              { name: 'KARTHÄUSERHOF «BRUNO» RIESLING', desc: 'Германия', price: '7500' },
              { name: 'LOIMER, GRÜNER VELTLINER', desc: 'Австрия', price: '8300' },
              { name: 'GERARD RAPET ALIGOTÉ', desc: 'Бургундия', price: '9900' },
              { name: 'CANTINE LUNAE VERMENTINO «ETICHETTA NERA»', desc: 'Италия', price: '11500' },
              { name: 'XAVIER MONNOT, MEURSAULT «LES CHEVALIERES»', desc: 'Бургундия', price: '49000' },
            ],
          },
          {
            title: 'A-SIDE · Красное',
            items: [
              { name: 'VRIESENHOF, CABERNET SAUVIGNON', desc: 'ЮАР', price: '900/5400' },
              { name: 'LA MAGIA IL VISPO', desc: 'Тоскана', price: '1100/6500' },
              { name: 'TUPINIER-BAUTISTA, BOURGOGNE PINOT NOIR', desc: 'Франция', price: '1900/11400' },
              { name: 'MEYER-NAKEL SPÄTBURGUNDER', desc: 'Германия', price: '12500' },
              { name: 'LE MASSÉ, CHIANTI CLASSICO', desc: 'Италия', price: '13500' },
              { name: '«VINA BOSCONIA» RESERVA', desc: 'Риоха', price: '19000' },
              { name: 'CHATEAU DU TUTRE, BORDEAUX', desc: 'Франция', price: '27000' },
              { name: 'DOMAINE NICOLAS BURGUEV, GEVREY-CHAMBERTIN «LES CRAIS»', desc: 'Бургундия', price: '29000' },
            ],
          },
          {
            title: 'B-SIDE · Игристое',
            items: [
              { name: 'SANFELETTO, GREZZONE, COL FONDO', desc: 'Италия', price: '900/5400' },
              { name: 'CATCH 22 x OLEG ANDREEV · CIDER, LIMITED EDITION', desc: '0.33 л', price: '1800' },
              { name: 'ORSI VIGNETO SAN VITO «SUI LIEVITI» PET NAT', desc: 'Италия', price: '8700' },
              { name: 'FRANCK PASCAL «RELIANCE» BRUT NATURE', desc: 'Шампань', price: '22000' },
            ],
          },
          {
            title: 'B-SIDE · Белое',
            items: [
              { name: 'WEINHOF HAIDER «DELIBIOUS»', desc: 'Австрия', price: '1200/7200' },
              { name: 'ARCHIL · ЦИСКА', desc: 'Грузия', price: '8900' },
              { name: 'SONS OF WINE «VIN DE MESS»', desc: 'Франция', price: '9300' },
              { name: 'CLEMENT LAVALLÉE «LES COPAINS D’ABORD» SAUVIGNON BLANC', desc: 'Бургундия', price: '15900' },
            ],
          },
          {
            title: 'B-SIDE · Красное',
            items: [
              { name: 'PARADISE GARAGE, PINOT NOIR №1', desc: 'Россия, Крым', price: '1200/7200' },
              { name: 'JOHANNES ZILLINGER «PARCELLAIRE» ROUGE №1', desc: 'Австрия', price: '8500' },
              { name: 'LUCIEN & FANNY ROCAULT, COTEAUX BOURGUIGNONS, GAMAY', desc: 'Франция', price: '9500' },
              { name: 'DOMAINE BALLORIN & F., SYRAH', desc: 'Бургундия', price: '11500' },
              { name: 'DOMAINE DIDON, PINOT NOIR', desc: 'Бургундия', price: '15900' },
            ],
          },
        ],
      },
    ],
  },

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

  merch: [
    { name: 'Футболка Catch 22', desc: 'Плотный хлопок, принт по фонотеке', price: 'скоро', ton: '', tag: 'заглушка', image: '', cta: 'Оставить заявку' },
    { name: 'Кепка Catch 22', desc: 'Вышитый логотип 22', price: 'скоро', ton: '', tag: 'заглушка', image: '', cta: 'Оставить заявку' },
    { name: 'Шоппер', desc: 'Чёрный канвас, шелкография', price: 'скоро', ton: '', tag: 'заглушка', image: '', cta: 'Оставить заявку' },
    { name: 'Виниловая пластинка', desc: 'Лимитированный пресс бара', price: 'скоро', ton: '', tag: 'заглушка', image: '', cta: 'Оставить заявку' },
  ],

  merchNote: 'Оплата пока не подключена — оставьте заявку, и мы свяжемся с вами.',

  // Блок «Кошелёк» (как на референсе). enabled: false — оплата не подключена;
  // бар может включить его из бота, когда появится приём TON.
  wallet: {
    enabled: false,
    title: 'Подключить кошелёк',
    text: 'Для оплаты Catch 22 merch',
    note: 'Оплата через TON ещё не подключена — сейчас работает заявка через бота.',
    link: '',
    linkText: 'Подключить TON',
    button: 'Подключить кошелёк',
    image: '/img/interior-vinyl.jpg',
  },

  // тексты интерфейса: что не указано — берётся из seed/copy.js
  copy: {
    eventsSub: 'Винил, сессии и гости за пультом',
    merchSub: 'Фирменные вещи Catch 22 в блокчейне TON',
  },
  jobs: {
    enabled: true,
    title: 'Стань частью CATCH 22',
    image: '/img/interior-chair.jpg',
    text: 'Мы ищем в команду людей, которые разделяют нашу любовь к музыке, вкусной еде и гостеприимству. Оставьте анкету — мы свяжемся с вами.',
    positions: ['Официант', 'Бармен', 'Кухня', 'Хостес', 'Другое'],
  },

  gallery: [
    { src: '/img/interior-vinyl.jpg', caption: 'Фонотека в объективе @gleb_shirokov' },
    { src: '/img/interior-chair.jpg', caption: 'Зал Catch 22' },
  ],
};
