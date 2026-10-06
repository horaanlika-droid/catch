// Меню CATCH 22 — сверено с официальными страницами меню из пресс-кита бара
// (PRESS PACK → Menu: 11.png — бар, 22.png — еда, 33.png — крепкое, 44.png — вино).
// Цены, составы и пометки шефа/бара («must try», «new», «on a tap»…) — как в карте.
// Дальше всё правится из админ-бота (🍽 Меню), этот файл — только стартовое состояние.

const it = (name, price, desc = '', extra = {}) => ({ name, price: String(price), ...(desc ? { desc } : {}), ...extra });

export const menu = {
  note: '',
  categories: [
    /* ───────────── ЕДА ───────────── */
    {
      id: 'food',
      title: 'Еда',
      note: 'Comfort food со всего света — шеф Илья Борик и су-шеф Иван Королев',
      sections: [
        {
          title: 'Starts',
          items: [
            it('Картофель фри с трюфельным майо', 590),
            it('Батат фри с соусом блю чиз', 690),
            it('Чипсы с красной / чёрной икрой', '890/2790'),
            it('Тартар из говядины блю чиз', 790),
            it('Тартар из говядины', 790),
            it('Фаршированные яйца с красной икрой', 690),
            it('Креветочные шарики с соусом спайси-мисо майо', 790),
            it('Запечённые черри со взбитой фетой', 690),
            it('Салат с осьминогом', 1290, '', { tags: ['new'] }),
          ],
        },
        {
          title: 'Fresh',
          items: [
            it('Севиче из дальневосточного гребешка', 830),
            it('Буррата с томатами', 990),
            it('Табуле', 760),
            it('Креветки / сальса / копчёная страчателла', 1160, '', { tags: ['chef recommends'] }),
            it('Зелёный салат', 890),
            it('Салат хориатики', 790),
            it('Крудо из палтуса с морковным агуачиле', 790),
            it('Салат с черешней', 790),
            it('Сезонные овощи с дзадзыки', 490, '', { tags: ['new'] }),
            it('Коппа / персик / страчателла', 1190),
          ],
        },
        {
          title: 'Delicatessen',
          items: [
            it('Вяленые томаты', 640),
            it('Оливки', 640),
            it('Артишоки', 690),
            it('Хамон', 1210, '', { tags: ['must try'] }),
            it('Сесина', 1210),
            it('Сыр манчего выдержанный', 990),
            it('Сыр манчего с трюфелем', 990),
            it('Молодой козий сыр', 990),
            it('Хлеб с анчоусным маслом', 590),
          ],
        },
        {
          title: 'Main',
          items: [
            it('Перец с рататуем и тоннато', 690),
            it('Томатный суп и гриль чиз', 790),
            it('Фокачча сэндвич с прошутто котто', 790),
            it('Чикен сэндвич', 790, '', { tags: ['must try'] }),
            it('Хрустящий цыплёнок с ромейном', 790),
            it('Маффин с яйцом', 690),
            it('Бифштекс с перечным соусом', 990),
            it('Щупальце осьминога с соусом из чоризо', 1690, '', { tags: ['new'] }),
            it('Палтус с рататуем и дзадзыки', 990, '', { tags: ['new'] }),
          ],
        },
        {
          title: 'Desserts',
          items: [
            it('Бананы фостер', 690),
            it('Сырный мусс с жжёным лимоном', 690),
            it('Яблочный пирог', 690),
          ],
        },
      ],
    },

    /* ───────────── БАР ───────────── */
    {
      id: 'bar',
      title: 'Бар',
      note: 'Каждый коктейль — одна из музыкальных революций. Шеф-бартендер Дмитрий Гукасян',
      sections: [
        {
          title: 'Signature Cocktails · 950',
          items: [
            it('DIN45500', 950, 'ром / каффирский лайм / кокос / лемонграсс'),
            it('ABBA', 950, 'персиковая водка / горечавка / донник / тоник'),
            it('MINIMOOG', 950, 'текила / джин / ром / водка / трипл сек / кофе / карамель / кола / мороженое'),
            it('WALKMAN', 950, 'мартини фиеро / джин / шалфей / клубника / розовый перец'),
            it('FAIRLIGHT CMI', 950, 'джин / базилик / кампотский перец / малина', { tags: ['must try'] }),
            it('ITUNES', 950, 'кальвадос / фейхоа / яблоко / абсент'),
            it('808', 950, 'коньяк мартиньяк VS / аперитив / амаро / ежевика / юдзу'),
            it('GRAMOPHONE', 950, 'джин / кинкина / бузина / какао блан / фенхель'),
            it('GIBSON', 950, 'джин / мартини экстра драй / чёрный чеснок / кленовый уксус', { tags: ['frozen −7°C'] }),
            it('LONGPLAY', 950, 'ром / кофейный ликёр / мисо-карамель / бобы тонка / эспрессо / дорблю'),
          ],
        },
        {
          title: 'Classic · 950',
          items: [
            it('SKINNY BITCH', 950, 'водка / лайм / содовая'),
            it('BELLINI', 950, 'брют / белый персик'),
            it('GIN&TONIC', 950, 'джин / тоник / лайм', { tags: ['on a tap'] }),
            it('BLOODY MARY', 950, 'водка / сангрита / микс специй'),
            it('AMARETTO SOUR', 950, 'амаретто / бурбон / лимон'),
            it('AVIATION', 950, 'джин / фиалка / мараскино'),
            it('COSMOPOLITAN', 950, 'водка / апельсин / клюква / лайм', { tags: ['king cocktail special'] }),
            it('TOMMY’S MARGARITA', 950, 'espolon blanco / агавовый нектар / лайм'),
            it('NEGRONI', 950, 'джин / campari / купаж вермутов'),
            it('DRY MARTINI', 950, 'джин / мартини экстра драй / апельсиновый биттер'),
          ],
        },
        {
          title: 'Mocktails · 700',
          items: [
            it('VIRGIN DIN45500', 700, 'кокос / каффирский лайм / лемонграсс'),
            it('VIRGIN BELLINI', 700, 'б/а игристое / белый персик'),
            it('VIRGIN MICHELADA', 700, 'сангрита / б/а корона'),
            it('ALICE ADONIS', 700, 'б/а красный вермут / б/а винный аперитив / бузина', { tags: ['for our friend'] }),
            it('GIN MAID 75', 700, 'б/а джин / мята / огурец / б/а игристое'),
            it('BOULEVARDIER', 700, 'б/а бурбон / б/а красный биттер / б/а красный вермут'),
          ],
        },
        {
          title: 'Special',
          items: [
            it('PENICILLIN + BLUE CHEESE TARTAR', 1100, 'dewar’s 8 yo / teeling blackpitts / мёд / имбирь / лимон + тартар / голубой сыр'),
            it('PORNSTAR MARTINI', 1400, 'grey goose / cremant de limoux / ваниль / маракуйя'),
            it('WATERMELON FROZEN MARGO', 950, 'espolon blanco / арбуз / малина / лайм / перец тимут'),
            it('COCO NEGRONI', 950, 'ром / кампари / амаретто / кокос / вишня / красный вермут'),
            it('APEROL SPRITZ', 950, 'апероль / брют / содовая', { tags: ['no shame'] }),
            it('OYSTER MICHELADA', 950, 'сангрита / пиво / устрица', { tags: ['friday till sunday'] }),
          ],
        },
        {
          title: 'Premium',
          items: [
            it('KITOS NEGRONI', 1500, 'bombay sapphire / strega / amaro rabarbaro / cocchi dopo teatro'),
            it('IDIOT WHISKEY COLA', 2500, 'macallan 12 yo double cask / coca-cola 0,33'),
            it('CLASE AZUL MARGO', 6000, 'clase azul reposado / cointreau / лайм'),
            it('CHAMPAGNE COCKTAIL', 5000, 'champagne henri giraud «g» / мусковадо / ангостура'),
            it('PORNSTAR MARTINI COCKTAIL TREE', 12000, 'pornstar martini 6x + cremant de limoux 0,75 л'),
          ],
        },
      ],
    },

    /* ───────────── КРЕПКОЕ ───────────── */
    {
      id: 'drinks',
      title: 'Крепкое',
      note: 'Все позиции — порция 40 мл',
      sections: [
        {
          title: 'Whiskey · 40 мл',
          items: [
            it('DEWAR’S WHITE LABEL', 700, 'шотландия, хайленд'),
            it('DEWAR’S 8 YO', 800, 'шотландия, хайленд', { tags: ['+ blue cheese tartar'] }),
            it('CRAIGELLACHIE 13 YO', 1100, 'шотландия, спейсайд'),
            it('GLENFIDDICH 15 YEARS OLD', 1600, 'шотландия, хайленд'),
            it('ARDBEG 10 YO', 1600, 'шотландия, айла'),
            it('ROYAL BRACKLA 12 YO', 1000, 'шотландия, хайленд'),
            it('TAMDHU AGED 12 YEARS', 1700, 'шотландия, спейсайд'),
            it('MACALLAN 12 YO DOUBLE CASK', 1900, 'шотландия, хайленд'),
            it('BUSHMILLS 10 Y.O. SINGLE MALT', 900, 'ирландия, антрим'),
            it('TEELING SMALL BATCH', 700, 'ирландия, дублин'),
            it('TEELING SINGLE MALT BLACKPITTS', 1000, 'ирландия, дублин'),
            it('TEELING SINGLE MALT', 900, 'ирландия, дублин'),
            it('MAKER’S MARK', 900, 'сша, кентукки'),
            it('ABASOLO ALMA DE LA TIERRA', 900, 'мексика, мехико'),
            it('KEMLYA RUSSIAN RYE', 900, 'россия, мордовия'),
            it('KAVALAN DISTILLERY SELECT #1', 1000, 'китай, тайвань'),
            it('NOBUSHI SINGLE GRAIN', 1300, 'япония, нагано'),
            it('HATOZAKI BLENDED', 900, 'япония, хёго'),
          ],
        },
        {
          title: 'Tequila · 40 мл',
          items: [
            it('LIBELULA JOVEN', 1000, 'мексика, халиско'),
            it('MARACAME PLATA', 1700, 'мексика, халиско'),
            it('CORRALEJO BLANCO', 800, 'мексика, гуанохуато'),
            it('PATRON REPOSADO', 900, 'мексика, халиско'),
            it('ESPOLON BLANCO', 800, 'мексика, халиско'),
            it('ESPOLON ANEJO', 1000, 'мексика, халиско'),
            it('ESPOLON CRISTALINO', 1200, 'мексика, халиско'),
            it('CAVA DE ORO EXTRA ANEJO BLACK', 3600, 'мексика, халиско'),
            it('DON JULIO 1942 ANEJO', 3900, 'мексика, халиско'),
            it('CLASE AZUL REPOSADO', 6000, 'мексика, халиско'),
          ],
        },
        {
          title: 'Mezcal · 40 мл',
          items: [
            it('MONTELOBOS ESPADÍN', 1300, 'мексика, оахака'),
            it('SE BUSCA JOVEN MADRECUISHE', 1800, 'мексика, оахака'),
            it('BUEN AMIGO JOVEN', 800, 'мексика, закатекас'),
            it('RAICILLA LA VENENOSA SIERRA DEL TIGRE', 2500, 'мексика, халиско'),
            it('SOTOL NOCHELUNA', 1000, 'мексика, чиуауа'),
            it('CLASE AZUL DURANGO', 12000, 'мексика, дуранго'),
            it('CLASE AZUL GUERRERO', 12000, 'мексика, герреро'),
            it('CLASE AZUL SAN LUIS POTOSI', 12000, 'мексика, сан-луис-потоси'),
          ],
        },
        {
          title: 'Brandy · 40 мл',
          items: [
            it('COURVOISIER VS', 800, 'франция, коньяк'),
            it('COURVOISIER VSOP', 1100, 'франция, коньяк'),
            it('BARON OTARD VSOP', 900, 'франция, коньяк'),
            it('FRANCOIS DE MARTIGNAC XO', 1800, 'франция, коньяк'),
            it('TIO TOTO BRANDY DE JEREZ', 700, 'испания, андалусия'),
            it('BUSNEL FINE PAYS D’AUGE', 800, 'франция, нормандия'),
            it('BLANCHE DE NORMANDIE', 900, 'франция, нормандия'),
            it('PISCO VINAS DE ORO TORONTEL', 900, 'перу, лима'),
          ],
        },
        {
          title: 'Rum · 40 мл',
          items: [
            it('GOSLINGS BLACK SEAL', 700, 'великобритания, бермуды'),
            it('ANGOSTURA RESERVA 3 YO', 700, 'тринидад и тобаго, порт-оф-спейн'),
            it('EL RON PROHIBIDO 12 YO', 900, 'мексика, гуанохуато'),
            it('PLANTATION THREE STARS', 800, 'барбадос, ямайка, тринидад и тобаго'),
            it('BACARDI OAKHEART ORIGINAL', 700, 'испания, куба'),
            it('BUMBU ORIGINAL', 1000, 'карибы, барбадос'),
            it('BOTUCAL MONTUANO EXTRA ANEJO', 800, 'венесуэла, трухильо'),
            it('ZACAPA 23 YO', 1400, 'гватемала, сьюдад-вьеха'),
            it('CACHAÇA VELHO BARREIRO', 800, 'бразилия, сан-паулу'),
            it('RHUM J.M BLANC', 900, 'франция, мартиника'),
          ],
        },
        {
          title: 'Gin · 40 мл',
          items: [
            it('ROKU GIN', 900, 'япония, осака'),
            it('SIPSMITH LONDON DRY', 800, 'англия, лондон'),
            it('HENDRICK’S', 900, 'шотландия, гирван'),
            it('MARSHALL LONDON DRY', 1000, 'швеция, стокгольм'),
            it('BOMBAY SAPPHIRE', 800, 'англия, хэмпшир'),
            it('BOLS GENEVER BARREL AGED', 800, 'нидерланды, амстердам'),
            it('GIN MARE', 800, 'испания, каталония'),
            it('BEEFEATER PINK', 700, 'англия, лондон'),
            it('GREY SHINE', 700, 'россия, нижний новгород'),
          ],
        },
        {
          title: 'Vodka · 40 мл',
          items: [
            it('TSELOVALNIK', 500, 'россия, кашин'),
            it('GREY GOOSE', 800, 'франция, коньяк'),
            it('CHISTYE ROSY ORGANIC', 700, 'россия, саранск'),
            it('KOSKENKORVA', 600, 'финляндия, илмайоки'),
            it('REYKA', 1000, 'исландия, боргарнес'),
          ],
        },
        {
          title: 'Liqueur · 40 мл',
          items: [
            it('LIMONCELLO PALLINI', 500, 'италия, лацио'),
            it('TSELOVALNIK COFFEE ELIXIR', 500, 'россия, санкт-петербург'),
            it('NIXTA', 800, 'мексика, мехико'),
            it('SUZE', 700, 'франция, тюр'),
            it('LE BIRLOU', 600, 'франция, овернь'),
          ],
        },
        {
          title: 'Amaro · 40 мл',
          items: [
            it('CAMPARI', 500, 'италия, милан'),
            it('APEROL', 500, 'италия, венето'),
            it('SARTI', 500, 'италия, болонья'),
            it('AMARO MONTENEGRO', 600, 'италия, болонья'),
            it('CYNAR', 600, 'италия, венето'),
            it('FERNET BRANCA', 600, 'италия, ломбардия'),
          ],
        },
        {
          title: 'Fortified Wine · 40 мл',
          items: [
            it('ВЕРМУТ MARTINI ROSSO, FIERO, EXTRA DRY', 500, 'италия, турин'),
            it('ВЕРМУТ MARTINI RISERVA AMBRATO, RUBINO', 500, 'италия, турин'),
            it('ВЕРМУТ NORDES ROJO', 600, 'испания, галисия'),
            it('ВЕРМУТ DOLLIN DRY', 600, 'франция, шамбери'),
            it('ХЕРЕС LUSTAU PEDRO XIMENEZ', 500, 'испания, херес-де-ла-фронтера'),
            it('ХЕРЕС TIO PEPE PALOMINO FINO', 600, 'испания, херес-де-ла-фронтера'),
            it('ПОРТВЕЙН CALEM FINE RUBY', 500, 'португалия, дору'),
          ],
        },
        {
          title: 'Beer',
          items: [
            it('ASAHI SUPER DRY', 700, '0,33 л · япония, осака'),
            it('GUINNESS DRAUGHT', 800, '0,44 л · ирландия, дублин'),
            it('CORONA EXTRA', 600, '0,35 л · мексика, идальго'),
            it('CORONA CERO 0°', 600, '0,33 л · мексика, идальго'),
          ],
        },
        {
          title: 'Soft',
          items: [
            it('COCA-COLA', 500, '0,33 л'),
            it('ТОНИК', 400, '0,2 л'),
            it('ФИЛЬТР КОФЕ', 300, '0,2 л'),
            it('ВОДА PREALPI', 500, '0,5 л'),
            it('СОКИ ZUEGG', 500, '0,2 л'),
            it('Б/А ИГРИСТОЕ', 700, '125 мл'),
          ],
        },
      ],
    },

    /* ───────────── ВИНО ───────────── */
    {
      id: 'wine',
      title: 'Вино',
      note: 'Карта как пластинка: сторона A — хиты и понятные ориентиры, сторона B — new wave и эксперименты. Цены — 125 мл / 750 мл',
      sections: [
        {
          title: 'A-SIDE · Игристое · 125/750 мл',
          items: [
            it('KRONE «BOREALIS» VINTAGE CUVEE BRUT', '900/5400', 'South Africa'),
            it('MARTINI BRUT', '1100/6600', 'Italy'),
            it('MARTINI PROSECCO ROSE', '1200/7200', 'Italy'),
            it('PAUL G. VALENTIN, CREMANT DE LIMOUX «№88»', '1200/7200', 'France'),
            it('PATRICK PIUZE «FRENCH BUBBLE» ROSE', '1400/8400', 'France'),
            it('HENRI GIRAUD, ESPRIT NATURE G', '2800/16800', 'Champagne'),
            it('RUHLMANN DIRRINGER, BRUT NATURE CREMANT D’ALSACE', '7900', 'France'),
            it('DIEL, RIESLING RESERVE SEKT EXTRA BRUT', '17500', 'Germany'),
            it('RUINART BLANC DE BLANCS', '40000', 'Champagne'),
            it('DOM PERIGNON', '69000', 'Champagne'),
          ],
        },
        {
          title: 'A-SIDE · Белое',
          items: [
            it('ANSELMO MENDES «3 RIOS» ESCOLHA, VINHO VERDE', '900/5400', 'Portugal'),
            it('DOMAINE LOUIS MOREAU, CHABLIS', '1700/10200', 'Chablis'),
            it('KARTHAUSERHOF «BRUNO» RIESLING', '7500', 'Germany'),
            it('LOIMER, GRUNER VELTLINER', '8300', 'Austria'),
            it('GERARD RAPHET, ALIGOTE', '9900', 'Bourgogne'),
            it('CANTINE LUNAE, VERMENTINO «ETICHETTA NERA»', '11500', 'Italy'),
            it('XAVIER MONNOT, MEURSAULT «LES CHEVALIERES»', '49000', 'Bourgogne'),
          ],
        },
        {
          title: 'A-SIDE · Красное',
          items: [
            it('VRIESENHOF, CABERNET SAUVIGNON', '900/5400', 'South Africa'),
            it('LA MAGIA, IL VISPO', '1100/6500', 'Toscana'),
            it('TUPINIER-BAUTISTA, BOURGOGNE PINOT NOIR', '1900/11400', 'Bourgogne'),
            it('MEYER-NAKEL, SPATBURGUNDER', '12500', 'Germany'),
            it('LE MASSE, CHIANTI CLASSICO', '13500', 'Italy'),
            it('«VINA BOSCONIA» RESERVA', '19000', 'Rioja'),
            it('CHATEAU DU TERTRE', '27000', 'Bordeaux'),
            it('DOMAINE NICOLAS BURGUET, GEVREY-CHAMBERTIN «LES CRAIS»', '29000', 'Bourgogne'),
          ],
        },
        {
          title: 'B-SIDE · Игристое · 125/750 мл',
          items: [
            it('SANFELETTO, GREZZONE, COLLFONDO', '900/5400', 'Italy'),
            it('CATCH 22 × OLEG ANDREEV × EVGENIY LITVYAK, CIDER, LIMITED EDITION', '1800', '0,375 л'),
            it('ORSI VIGNETO SAN VITO «SUI LIEVITI» PET NAT', '8700', 'Italy'),
            it('FRANCK PASCAL «RELIANCE» BRUT NATURE', '22000', 'Champagne'),
          ],
        },
        {
          title: 'B-SIDE · Белое',
          items: [
            it('WEINHOF HAIDER «DELIRIOUS»', '1200/7200', 'Austria'),
            it('ARCHIL GUNIAVA, TSITSKA', '8900', 'Georgia'),
            it('SONS OF WINE «VIN DE MESS»', '9300', 'France'),
            it('CLEMENT LAVALLEE «LES COPAINS D’ABORD», SAUVIGNON BLANC', '15900', 'Bourgogne'),
          ],
        },
        {
          title: 'B-SIDE · Красное',
          items: [
            it('PARADISE GARAGE, PINOT NOIR №1', '1200/7200', 'Russia'),
            it('JOHANNES ZILLINGER «PARCELLAIRE» ROUGE #1', '8500', 'Austria'),
            it('LUCIEN & FANNY ROCAULT, COTEAUX BOURGUIGNONS, GAMAY', '9500', 'France'),
            it('DOMAINE BALLORIN & F, SYRAH', '11500', 'Bourgogne'),
            it('DOMAINE DIDON, PINOT NOIR', '15900', 'Bourgogne'),
          ],
        },
      ],
    },
  ],
};
