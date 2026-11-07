// Shaxmat 3D — tillar: oʻzbekcha (asosiy) va ruscha.
// Lugʻat kaliti — aniq oʻzbekcha matn. t() oʻzbek tilida yoki tarjima boʻlmasa oʻzbekcha matnni qaytaradi.
// {name} — oʻrniga vars.name qoʻyiladi. Ruscha matnda {n|ход|хода|ходов} — n soniga qarab koʻplik shakli.
// vars._ctx — bir xil oʻzbekcha soʻz turli maʼnoda kelganda: avval RU['soʻz@ctx'], keyin RU['soʻz'].

const RU = {
  // ───── index.html ─────
  'Doska tayyorlanmoqda…': 'Готовим доску…',
  'Uch oʻlchamli doska, jonli donalar': 'Трёхмерная доска, живые фигуры',
  'Oʻyinni davom ettirish': 'Продолжить игру',
  'Toʻxtagan joyingizdan': 'С того места, где остановились',
  'Kompyuterga qarshi': 'Против компьютера',
  'Toʻrt daraja: boshlovchidan ustagacha': 'Четыре уровня: от новичка до мастера',
  'Onlayn oʻyin': 'Онлайн-игра',
  'Reyting yoki doʻst bilan': 'На рейтинг или с другом',
  'Bir telefonda ikki kishi': 'Вдвоём на одном телефоне',
  'Navbatma-navbat oʻynash': 'Ходите по очереди',
  'Masala': 'Задачи',
  '2 yurishda mot': 'Мат в 2 хода',
  'Darslar': 'Уроки',
  'Noldan oʻrganing': 'Учитесь с нуля',
  'Taklif': 'Пригласить',
  'Sovgʻa oling': 'Дарим подарки',
  'Doʻkon': 'Магазин',
  'Natijalar': 'Статистика',
  'Sozlamalar': 'Настройки',
  'Raqib kuchi': 'Сила соперника',
  'Siz qaysi rangda oʻynaysiz': 'Каким цветом вы играете',
  'Oq': 'Белые',
  'Tasodifiy': 'Случайно',
  'Qora': 'Чёрные',
  'Oʻyinni boshlash': 'Начать игру',
  'Bekor qilish': 'Отмена',
  'oʻylayapti': 'думает',
  'Orqaga': 'Назад',
  'Maslahat': 'Подсказка',
  'Koʻrinish': 'Вид',
  'Taslim': 'Сдаться',
  'Menyu': 'Меню',

  // ───── config.js: darajalar, mavzular, effektlar, mahsulotlar ─────
  'Boshlovchi': 'Новичок',
  'Oʻrta': 'Средний',
  'Kuchli': 'Сильный',
  'Usta': 'Мастер',
  'Klassik yogʻoch': 'Классическое дерево',
  'Marmar': 'Мрамор',
  'Oltin & Obsidian': 'Золото и обсидиан',
  'Neon': 'Неон',
  'Kristall': 'Кристалл',
  'Samarqand': 'Самарканд',
  'Parchalanish': 'Осколки',
  'Olov': 'Огонь',
  'Chaqmoq': 'Молния',
  'Yulduzlar': 'Звёзды',
  'Olov effekti': 'Эффект огня',
  'Chaqmoq effekti': 'Эффект молнии',
  'Yulduz izi': 'Звёздный след',
  'PRO: cheksiz orqaga va maslahat': 'PRO: безлимитные отмены и подсказки',
  'Hammasi bir paketda': 'Всё в одном наборе',

  // ───── oʻyin, HUD, natija ─────
  'Mat': 'Мат',
  'Pat': 'Пат',
  'Uch marta takrorlanish': 'Троекратное повторение',
  '50 yurish qoidasi': 'Правило 50 ходов',
  'Mat qilish uchun dona yetarli emas': 'Недостаточно материала для мата',
  'Taslim boʻlindi': 'Партия сдана',
  'Kelishuv boʻyicha durang': 'Ничья по соглашению',
  'Siz': 'Вы',
  'Kompyuter': 'Компьютер',
  'Raqib kutilmoqda…': 'Ожидание соперника…',
  'tarmoqda emas': 'не в сети',
  'Emoji': 'Эмодзи',
  'Durang': 'Ничья',
  'Yechim': 'Решение',
  'Qayta': 'Заново',
  'Shoh!': 'Шах!',
  'Oq yutdi': 'Белые выиграли',
  'Qora yutdi': 'Чёрные выиграли',
  'Gʻalaba': 'Победа',
  'Gʻalaba!': 'Победа!',
  'Magʻlubiyat': 'Поражение',
  '{reason}, {n} yurish': '{reason}, {n} {n|ход|хода|ходов}',
  'Keyingi daraja: <b>{level}</b> — sinab koʻrasizmi?': 'Следующий уровень: <b>{level}</b> — попробуете?',
  'Yana oʻynash': 'Сыграть ещё',
  '⬆️ Keyingi daraja': '⬆️ Следующий уровень',
  'Oʻyin tahlili': 'Анализ партии',
  'Natijani ulashish': 'Поделиться результатом',
  'Bosh menyu': 'Главное меню',
  'Kompyuter ({level})': 'Компьютер ({level})',
  'Bir telefonda': 'На одном телефоне',
  '{who} · {reason} · {n} yurish': '{who} · {reason} · {n} {n|ход|хода|ходов}',
  'Hali yurish qilinmagan': 'Ходов ещё не было',
  'Bepul «Orqaga» tugadi (oʻyinda 3 ta).': 'Бесплатные отмены хода закончились (3 за партию).',
  'Bepul maslahat tugadi (oʻyinda 1 ta).': 'Бесплатная подсказка закончилась (1 за партию).',
  'Eng yaxshi yurish izlanmoqda…': 'Ищем лучший ход…',
  'Taslim boʻlasizmi?': 'Сдаться?',
  'Oʻyin magʻlubiyat sifatida yoziladi.': 'Партия будет засчитана как поражение.',
  'Ha, taslim': 'Да, сдаюсь',
  'Davom etish': 'Продолжить',
  'Durangga kelishasizmi?': 'Согласиться на ничью?',
  'Ikkala oʻyinchi ham rozimi?': 'Оба игрока согласны?',
  'Ha, durang': 'Да, ничья',
  'Yoʻq': 'Нет',
  'PRO bilan «Orqaga» va «Maslahat» cheksiz.': 'С PRO «Назад» и «Подсказка» без ограничений.',
  'PRO olish, {price} ⭐': 'Купить PRO, {price} ⭐',
  'Doʻkonni ochish': 'Открыть магазин',
  'Yopish': 'Закрыть',
  'Dona tanlang': 'Выберите фигуру',
  'Farzin · Rux · Fil · Ot': 'Ферзь · Ладья · Слон · Конь',
  '{w} gʻalaba, {l} magʻlubiyat': 'побед: {w}, поражений: {l}',
  'hali oʻynalmagan': 'ещё не играли',
  'Yangi oʻyin': 'Новая игра',
  'Xatolik: {e}': 'Ошибка: {e}',

  // ───── masalalar ─────
  'Mashq №{n}': 'Упражнение №{n}',
  'Masala №{n}': 'Задача №{n}',
  'Oq yuradi: 2 yurishda mot': 'Ход белых: мат в 2 хода',
  'Qora yuradi: 2 yurishda mot': 'Ход чёрных: мат в 2 хода',
  'Toʻgʻri! Davom eting': 'Верно! Продолжайте',
  'Endi mot qiling!': 'Теперь поставьте мат!',
  'Notoʻgʻri': 'Неверно',
  'Maslahat tugmasini bosib koʻring': 'Попробуйте нажать «Подсказка»',
  'Barakalla': 'Отлично',
  'Barakalla!': 'Отлично!',
  '{title} yechildi.': '{title} — решено.',
  '{title} yechildi, birinchi urinishda.': '{title} — решено с первой попытки.',
  'Seriya: <b>{n} kun</b>': 'Серия: <b>{n} {n|день|дня|дней}</b>',
  'eng yaxshisi {n}': 'рекорд {n}',
  'Keyingi: mashq №{n}': 'Дальше: упражнение №{n}',
  'Keyingi: masala №{n}': 'Дальше: задача №{n}',
  'Barcha masalalar yechildi. Ertaga yangisi chiqadi!': 'Все задачи решены. Завтра будет новая!',
  'Doʻstlarga yuborish': 'Отправить друзьям',
  '{title} yechildi': '{title} — решено',
  '2 yurishda mot · seriya {n} kun': 'Мат в 2 хода · серия {n} {n|день|дня|дней}',
  'Yashil oʻq — toʻgʻri yurish': 'Зелёная стрелка — верный ход',
  'Oʻzim qayta yechaman': 'Попробую решить сам',
  'Kunlik masalalar': 'Ежедневные задачи',
  'Har kuni yangi masala: 2 yurishda mot. Seriya: <b>{n} kun</b> · yechilgan: {s}': 'Каждый день новая задача: мат в 2 хода. Серия: <b>{n} {n|день|дня|дней}</b> · решено: {s}',
  'Bugungi masala yechilgan ✓': 'Задача дня решена ✓',
  'Bugungi masala (№{n})': 'Задача дня (№{n})',
  'Kunlik': 'Ежедневные',
  'Mashq uchun': 'Для тренировки',
  'Yechildi · {n} kun': 'Решено · {n} дн.',
  'Seriya {n} kun': 'Серия: {n} дн.',
  '{d}/{n} tugallangan': 'Пройдено {d}/{n}',

  // ───── darslar ─────
  'Shaxmatni noldan oʻrganing: donalar, maxsus yurishlar va birinchi motlar. {done}/{total} tugallangan.': 'Шахматы с нуля: фигуры, особые ходы и первые маты. Пройдено {done} из {total}.',
  '{n} ta topshiriq': '{n} {n|задание|задания|заданий}',
  'Topshiriqni boshlash': 'Начать задание',
  'Darslar roʻyxati': 'Список уроков',
  'Dars tugadi!': 'Урок пройден!',
  'Toʻgʻri!': 'Верно!',
  '«{title}» darsini oʻzlashtirdingiz.': 'Вы освоили урок «{title}».',
  '{goal} — bajarildi.': '{goal} — выполнено.',
  'Keyingi topshiriq': 'Следующее задание',
  'Keyingi dars: {title}': 'Следующий урок: {title}',
  'Barcha darslar tugadi! Endi kompyuterga qarshi «Boshlovchi» darajasida oʻynab koʻring.': 'Все уроки пройдены! Теперь сыграйте с компьютером на уровне «Новичок».',

  // lessons.js
  'Piyoda': 'Пешка',
  'Piyoda faqat oldinga, bir katak yuradi. Birinchi yurishida ikki katak ham yura oladi. Raqib donasini esa oldinga qiya (diagonal) yoʻnalishda oladi.':
    'Пешка ходит только вперёд, на одно поле. Первым ходом она может пойти и на два поля. А бьёт пешка вперёд наискосок — по диагонали.',
  'Piyodani ikki katak oldinga yuring': 'Продвиньте пешку на два поля вперёд',
  'Piyoda bilan qora piyodani oling': 'Возьмите пешкой чёрную пешку',
  'Ot': 'Конь',
  'Ot «G» harfi shaklida yuradi: bir tomonga ikki katak, soʻng yonga bir katak. Ot boshqa donalar ustidan sakrab oʻta oladigan yagona dona.':
    'Конь ходит буквой «Г»: на два поля в одну сторону, затем на одно вбок. Это единственная фигура, которая может перепрыгивать через другие.',
  'Ot bilan qora ruxni oling': 'Возьмите конём чёрную ладью',
  'Piyodalar ustidan sakrab, otni c3 ga chiqaring': 'Перепрыгните через пешки и выведите коня на c3',
  'Fil': 'Слон',
  'Fil faqat diagonal boʻylab, istalgancha katak yuradi. Shuning uchun u doim bir xil rangdagi kataklarda qoladi.':
    'Слон ходит только по диагонали, на любое число полей. Поэтому он всегда остаётся на полях одного цвета.',
  'Fil bilan qora farzinni oling': 'Возьмите слоном чёрного ферзя',
  'Rux': 'Ладья',
  'Rux toʻgʻri chiziq boʻylab — oldinga, orqaga va yonga — istalgancha katak yuradi. Ochiq chiziqlarda rux juda kuchli.':
    'Ладья ходит по прямой — вперёд, назад и вбок — на любое число полей. На открытых линиях ладья очень сильна.',
  'Rux bilan qora otni oling': 'Возьмите ладьёй чёрного коня',
  'Farzin': 'Ферзь',
  'Farzin — eng kuchli dona. U rux va filning yurishlarini birlashtiradi: toʻgʻri chiziq va diagonal boʻylab istalgancha yuradi.':
    'Ферзь — самая сильная фигура. Он сочетает ходы ладьи и слона: ходит по прямой и по диагонали на любое число полей.',
  'Farzin bilan qora ruxni oling': 'Возьмите ферзём чёрную ладью',
  'Shoh': 'Король',
  'Shoh istalgan tomonga bir katak yuradi. Shohni hujum ostidagi katakka qoʻyib boʻlmaydi. Shohni yoʻqotish — oʻyinni yutqazish.':
    'Король ходит на одно поле в любую сторону. Ставить короля на поле под ударом нельзя. Мат королю — это проигрыш партии.',
  'Shoh bilan himoyasiz piyodani oling': 'Возьмите королём незащищённую пешку',
  'Rokirovka': 'Рокировка',
  'Rokirovka — shoh va rux bir yurishda joy almashadi: shoh ruxga tomon ikki katak suriladi, rux esa uning ustidan oʻtadi. Shoh ham, rux ham hali yurmagan, oralarida dona boʻlmasligi va shoh hujum ostida boʻlmasligi kerak.':
    'Рокировка — ход, которым король и ладья меняются местами: король сдвигается на два поля в сторону ладьи, а ладья перепрыгивает через него. Ни король, ни ладья ещё не должны были ходить, между ними не должно быть фигур, а король не должен стоять под шахом.',
  'Qisqa rokirovka qiling: shohni g1 ga suring': 'Сделайте короткую рокировку: передвиньте короля на g1',
  'Oʻtib ketayotganda olish': 'Взятие на проходе',
  'Raqib piyodasi birinchi yurishida ikki katak yurib, sizning piyodangiz yonidan oʻtib ketsa, uni xuddi bir katak yurgandek olishingiz mumkin. Bu faqat darhol, keyingi yurishda mumkin.':
    'Если пешка соперника первым ходом прошла на два поля и встала рядом с вашей пешкой, её можно взять так, будто она сходила на одно поле. Это разрешено только сразу, ответным ходом.',
  'e5 piyoda bilan d5 piyodani oʻtib ketayotganda oling': 'Возьмите пешкой e5 пешку d5 на проходе',
  'Piyoda aylanishi': 'Превращение пешки',
  'Piyoda oxirgi qatorga yetsa, istalgan donaga aylanadi: koʻpincha eng kuchlisi — farzinga.':
    'Дойдя до последней горизонтали, пешка превращается в любую фигуру — чаще всего в самую сильную, в ферзя.',
  'Piyodani oxirgi qatorga yuring va farzin tanlang': 'Проведите пешку на последнюю горизонталь и выберите ферзя',
  'Shoh va mot': 'Шах и мат',
  'Shohga hujum qilish — «shoh» deyiladi. Agar shoh hujumdan hech qanday yoʻl bilan qutula olmasa — bu «mot», oʻyin tugaydi. Maqsad — raqib shohini mot qilish.':
    'Нападение на короля называется «шах». Если король никак не может уйти от шаха — это «мат», и партия окончена. Цель игры — поставить мат королю соперника.',
  '1 yurishda mot qiling: oxirgi qatorga e’tibor bering': 'Мат в 1 ход: обратите внимание на последнюю горизонталь',
  'Farzin bilan 1 yurishda mot qiling': 'Поставьте мат ферзём в 1 ход',
  'Ikki rux bilan mot': 'Мат двумя ладьями',
  '«Zinapoya» usuli: ikki rux navbatma-navbat shohni oxirgi qatorga siqib boradi. Bir rux qatorni yopadi, ikkinchisi shoh beradi.':
    'Приём «лесенка»: две ладьи по очереди оттесняют короля на край доски. Одна ладья отрезает горизонталь, другая объявляет шах.',
  'Avval 7-qatorni yoping, soʻng mot qiling': 'Сначала отрежьте 7-ю горизонталь, затем поставьте мат',

  // ───── taklif ─────
  'Ulashish faqat Telegram ichida': 'Поделиться можно только в Telegram',
  'Doʻstlarni taklif qiling': 'Пригласите друзей',
  'Yuklanmoqda…': 'Загрузка…',
  'Maʼlumotni yuklab boʻlmadi': 'Не удалось загрузить данные',
  'Havolangiz orqali kelgan har bir yangi doʻst uchun sizga bitta effekt yoki mavzu <b>tekin</b> ochiladi.':
    'За каждого нового друга, пришедшего по вашей ссылке, вы <b>бесплатно</b> получаете эффект или тему.',
  'taklif qilingan doʻst': '{n|приглашённый друг|приглашённых друга|приглашённых друзей}',
  'Keyingi sovgʻa: <b>{item}</b>': 'Следующий подарок: <b>{item}</b>',
  'Sizda hamma narsa ochiq': 'У вас уже всё открыто',
  'Telegramda yuborish': 'Отправить в Telegram',
  'Havolani nusxalash': 'Скопировать ссылку',
  'Sizning doʻstlaringiz': 'Ваши друзья',
  'Keling, Shaxmat 3D da oʻynaymiz! Chiroyli 3D shaxmat, kunlik masalalar va onlayn reyting ♟':
    'Давай сыграем в Shaxmat 3D! Красивые 3D-шахматы, ежедневные задачи и онлайн-рейтинг ♟',
  'Havola nusxalandi': 'Ссылка скопирована',

  // ───── tahlil ─────
  'Qoʻpol xato': 'Грубая ошибка',
  'Xato': 'Ошибка',
  'Noaniqlik': 'Неточность',
  'Tahlil uchun yurishlar juda kam': 'Слишком мало ходов для анализа',
  'Har bir yurish tekshirilmoqda…': 'Проверяем каждый ход…',
  'yaxshisi: {m}': 'лучше: {m}',
  '{n} qoʻpol xato': '{n} {n|грубая ошибка|грубые ошибки|грубых ошибок}',
  '{n} xato': '{n} {n|ошибка|ошибки|ошибок}',
  '{n} noaniqlik': '{n} {n|неточность|неточности|неточностей}',
  'Yurishni bosing — doskada eng yaxshi yurish koʻrsatiladi': 'Нажмите на ход — на доске появится лучший вариант',
  'Ajoyib! Jiddiy xato topilmadi.': 'Отлично! Серьёзных ошибок нет.',
  'Toʻliq tahlil — PRO, {price} ⭐': 'Полный анализ — PRO, {price} ⭐',
  'Toʻliq tahlil PRO uchun.': 'Полный анализ доступен в PRO.',

  // ───── natija rasmi va ulashish ─────
  '@{bot} — oʻynash': '@{bot} — играть',
  'Rasm tayyorlanmoqda…': 'Готовим картинку…',
  'Yuborildi!': 'Отправлено!',
  'Rasm bot chatiga yuborildi — uni doʻstlaringizga ulashing': 'Картинка отправлена в чат с ботом — перешлите её друзьям',
  'Rasm yuborib boʻlmadi: {e}': 'Не удалось отправить картинку: {e}',
  'Yangi yutuq: {title}': 'Новое достижение: {title}',

  // ───── onlayn ─────
  '1 daqiqa': '1 минута',
  '3 daqiqa': '3 минуты',
  '3 + 2 soniya': '3 мин + 2 с',
  '5 daqiqa': '5 минут',
  '10 daqiqa': '10 минут',
  'Vaqtsiz': 'Без часов',
  '{m} daq': '{m} мин',
  '{m} daq + {s} s': '{m} мин + {s} с',
  'Vaqt tugadi': 'Время вышло',
  'Oʻyinchi oʻyinni tashlab ketdi': 'Игрок покинул партию',
  'Oʻyin bekor qilindi': 'Партия отменена',
  'Onlayn oʻyin faqat Telegram ichida ishlaydi': 'Онлайн-игра работает только в Telegram',
  'Onlayn server tez orada ishga tushadi': 'Онлайн-сервер скоро заработает',
  'Reytingingiz {r}, oʻynalgan {g}': 'Ваш рейтинг {r}, сыграно партий: {g}',
  'Tasodifiy raqib bilan, reytingga taʼsir qiladi': 'Случайный соперник, игра на рейтинг',
  'Doʻstni havola bilan chaqirish': 'Позвать друга по ссылке',
  'Havola yaratish': 'Создать ссылку',
  'Haftalik turnir': 'Турнир недели',
  'Reyting jadvali': 'Таблица рейтинга',
  'Turnirni yuklab boʻlmadi': 'Не удалось загрузить турнир',
  'Reytingli onlayn oʻyinlar: gʻalaba — 1, durang — ½ ochko. Kamida {n} ta oʻyin oʻynang. Hafta gʻolibiga yangi mavzu yoki effekt sovgʻa qilinadi.':
    'Рейтинговые онлайн-партии: победа — 1 очко, ничья — ½. Сыграйте минимум {n} {n|партию|партии|партий}. Победитель недели получает в подарок новую тему или эффект.',
  '{d}k {h}s': '{d} д {h} ч',
  'tugashiga': 'до конца',
  'sizning oʻrningiz': 'ваше место',
  'ochko': 'очки',
  'Oʻyinchi': 'Игрок',
  'Ochko': 'Очки',
  'Oʻyin': 'Партии',
  'Bu hafta hali oʻyin yoʻq — birinchi boʻling!': 'На этой неделе партий ещё нет — будьте первым!',
  'Reytingli oʻyin boshlash': 'Играть на рейтинг',
  'Raqib izlanmoqda': 'Поиск соперника',
  's': 'с',
  'Xatolik': 'Ошибка',
  'Xona yaratib boʻlmadi: {e}': 'Не удалось создать комнату: {e}',
  'Aloqa uzildi, qayta ulanmoqda…': 'Связь потеряна, переподключаемся…',
  'Raqib durang taklif qildi': 'Соперник предлагает ничью',
  'Qabul qilsangiz, oʻyin durang bilan tugaydi.': 'Если примете, партия закончится вничью.',
  'Qabul qilish': 'Принять',
  'Rad etish': 'Отклонить',
  'Raqib durangni rad etdi': 'Соперник отклонил ничью',
  'Raqib revansh soʻrayapti': 'Соперник предлагает реванш',
  'Revanshni qabul qilish': 'Принять реванш',
  'Oʻyin boshlandi!': 'Партия началась!',
  'Siz bu oʻyinni tomosha qilyapsiz': 'Вы смотрите эту партию',
  'Doʻstingiz kutilmoqda': 'Ждём вашего друга',
  'Havolani doʻstingizga yuboring': 'Отправьте ссылку другу',
  'Keling, Shaxmat 3D da bir partiya oʻynaymiz': 'Давай сыграем партию в Shaxmat 3D',
  'Bekor qilindi': 'Отменена',
  'Reyting: {d}': 'Рейтинг: {d}',
  'Revansh': 'Реванш',
  'Yangi raqib': 'Новый соперник',
  'Onlayn': 'Онлайн',
  'reyting {d}': 'рейтинг {d}',
  '⏳ Raqib javobini kutish…': '⏳ Ждём ответа соперника…',
  'Taklif yuborilgan': 'Предложение уже отправлено',
  'Durang taklifi yuborildi': 'Предложение ничьей отправлено',
  'Emoji yuborish': 'Отправить эмодзи',
  'Reyting': 'Рейтинг',
  'Hali reytingli oʻyinlar yoʻq': 'Рейтинговых партий пока нет',
  'Siz: <b>{r}</b> · {w} gʻalaba · {l} magʻlubiyat · {d} durang': 'Вы: <b>{r}</b> · побед: {w} · поражений: {l} · ничьих: {d}',
  'Reytingni yuklab boʻlmadi': 'Не удалось загрузить рейтинг',

  // ───── doʻkon ─────
  'Tanlangan': 'Выбрано',
  'Sizda bor': 'Доступно',
  'Koʻrish': 'Смотреть',
  'Tanlash': 'Выбрать',
  'Mavzular': 'Темы',
  'Urish effektlari': 'Эффекты взятия',
  'Imkoniyatlar': 'Возможности',
  'Toʻlov Telegram Stars orqali. Xarid darhol ochiladi.': 'Оплата через Telegram Stars. Покупка открывается сразу.',
  '{name} doskada koʻrsatildi': '{name}: показано на доске',
  '{name}: dona olinganda koʻrinadi': '{name}: видно при взятии фигуры',
  'Xarid faqat Telegram ichida ishlaydi': 'Покупки доступны только в Telegram',
  'Bu mahsulot tez orada sotuvga chiqadi': 'Этот товар скоро появится в продаже',
  '{name} ochildi. Rahmat!': '{name}: открыто. Спасибо!',
  'Toʻlov amalga oshmadi': 'Оплата не прошла',

  // ───── sozlamalar va natijalar ─────
  'Ovoz': 'Звук',
  'Tebranish': 'Вибрация',
  'Mumkin yurishlarni koʻrsatish': 'Показывать возможные ходы',
  'Doskaga tepadan qarash': 'Вид на доску сверху',
  'Bir telefonda: doskani navbatga qarab burish': 'На одном телефоне: поворачивать доску к игроку',
  'Koordinatalar': 'Координаты',
  'Grafika sifati': 'Качество графики',
  'Past': 'Низкое',
  'Oʻrta@quality': 'Среднее',
  'Yuqori': 'Высокое',
  'Rejim': 'Режим',
  'Gʻ': 'В',
  'M': 'П',
  'D': 'Н',
  'Gʻ — gʻalaba, M — magʻlubiyat, D — durang': 'В — победы, П — поражения, Н — ничьи',
  'kun ketma-ket': '{n|день|дня|дней} подряд',
  'masala yechildi': '{n|задача решена|задачи решены|задач решено}',
  'yutuq': 'достижения',
  'Yutuqlar': 'Достижения',

  // achievements.js
  'Birinchi gʻalaba': 'Первая победа',
  'Kompyuterni birinchi marta yuting': 'Впервые обыграйте компьютер',
  'Oʻrta darajani yengdi': 'Победа над «Средним»',
  '«Oʻrta» darajadagi kompyuterni yuting': 'Обыграйте компьютер на уровне «Средний»',
  'Kuchli raqib': 'Сильный соперник',
  '«Kuchli» darajadagi kompyuterni yuting': 'Обыграйте компьютер на уровне «Сильный»',
  'Usta ustidan gʻalaba': 'Победа над мастером',
  '«Usta» darajadagi kompyuterni yuting': 'Обыграйте компьютер на уровне «Мастер»',
  '10 gʻalaba': '10 побед',
  'Kompyuterga qarshi jami 10 marta yuting': 'Обыграйте компьютер 10 раз',
  'Tezkor mat': 'Быстрый мат',
  '20 yurishgacha mat qilib yuting': 'Поставьте мат не более чем за 20 ходов',
  'Onlayn gʻalaba': 'Онлайн-победа',
  'Tirik raqibni onlayn yuting': 'Обыграйте живого соперника онлайн',
  'Reyting 1300': 'Рейтинг 1300',
  'Onlayn reytingni 1300 ga yetkazing': 'Поднимите онлайн-рейтинг до 1300',
  'Birinchi masala': 'Первая задача',
  'Bitta masalani yeching': 'Решите одну задачу',
  'Masala ustasi': 'Мастер задач',
  '10 ta masalani yeching': 'Решите 10 задач',
  'Masala seriyasi': 'Серия задач',
  'Kunlik masalani 7 kun ketma-ket yeching': 'Решайте задачу дня 7 дней подряд',
  '3 kun ketma-ket': '3 дня подряд',
  '3 kun ketma-ket oʻynang': 'Играйте 3 дня подряд',
  '10 kun ketma-ket': '10 дней подряд',
  '10 kun ketma-ket oʻynang': 'Играйте 10 дней подряд',
  'Bir oy shaxmat': 'Месяц шахмат',
  '30 kun ketma-ket oʻynang': 'Играйте 30 дней подряд',
  'Bitiruvchi': 'Выпускник',
  'Barcha darslarni tugating': 'Пройдите все уроки',
  'Birinchi doʻst': 'Первый друг',
  'Doʻstingizni taklif qiling': 'Пригласите друга',
  'Doʻstlar davrasi': 'Круг друзей',
  '5 ta doʻstni taklif qiling': 'Пригласите 5 друзей',
  // bot raqib, onlayn soni, turnir ochkolari
  'Bot reytingi: {d} → {r}': 'Рейтинг против ботов: {d} → {r}',
  'Bot bilan oʻyinda «Orqaga» yoʻq — xuddi onlayndagidek': 'В игре с ботом нет отмены хода — как в онлайне',
  'Bot bilan oʻyinda maslahat yoʻq — xuddi onlayndagidek': 'В игре с ботом нет подсказок — как в онлайне',
  'Hozir boʻsh onlayn raqib yoʻq. Kutishda davom etishingiz yoki bot raqib bilan oʻynashingiz mumkin.': 'Сейчас нет свободных соперников онлайн. Можно подождать или сыграть с ботом.',
  'Bot raqib bilan oʻynash': 'Играть с ботом',
  'Hozir ilovada: {n} kishi': 'Сейчас в приложении: {n} {n|человек|человека|человек}',
  'hozir onlayn: {n}': 'сейчас онлайн: {n}',
  'Ochkolar: onlayn gʻalaba — 1, durang — ½, kunlik masala — 1, bot ustidan gʻalaba — ½ (kuniga 3 tagacha). Kamida {n} ta ochkoli harakat qiling. Hafta gʻolibiga yangi mavzu yoki effekt sovgʻa qilinadi.':
    'Очки: победа онлайн — 1, ничья — ½, ежедневная задача — 1, победа над ботом — ½ (до 3 в день). Наберите очки минимум в {n} играх или задачах. Победитель недели получает новую тему или эффект.',
};

const RU_CODES = ['ru', 'uk', 'be', 'kk', 'ky'];

function detectLang() {
  const pick = (v) => (v === 'ru' || v === 'uz' ? v : null);
  try { const q = pick(new URLSearchParams(location.search).get('lang')); if (q) return q; } catch (e) { /* ignore */ }
  try { const s = pick(localStorage.getItem('s3d_lang')); if (s) return s; } catch (e) { /* ignore */ }
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    const code = u && u.language_code ? String(u.language_code).toLowerCase().split(/[-_]/)[0] : '';
    if (RU_CODES.includes(code)) return 'ru';
  } catch (e) { /* ignore */ }
  return 'uz';
}

/** Joriy til: 'uz' | 'ru'. */
export const LANG = detectLang();

// ruscha koʻplik: 1 ход, 2 хода, 5 ходов
function pluralRu(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 2;
  if (b === 1) return 0;
  return b >= 2 && b <= 4 ? 1 : 2;
}

/** Tarjima: kalit — oʻzbekcha matn. vars — {name} oʻrniga qoʻyiladigan qiymatlar. */
export function t(uz, vars) {
  let s = uz;
  if (LANG === 'ru') {
    const ctx = vars && vars._ctx;
    s = (ctx && RU[uz + '@' + ctx]) || RU[uz] || uz;
  }
  if (!vars) return s;
  return s.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (m, k, forms) => {
    if (!(k in vars)) return m;
    if (forms === undefined) return String(vars[k]);
    const f = forms.split('|');
    return f[Math.min(pluralRu(+vars[k] || 0), f.length - 1)];
  });
}

/** data-t belgisi qoʻyilgan elementlarning oʻz matn tugunlarini tarjima qiladi; <html lang> ni oʻrnatadi. */
export function applyStatic(root = document) {
  document.documentElement.lang = LANG;
  if (LANG === 'uz') return;
  root.querySelectorAll('[data-t]').forEach((el) => {
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const raw = n.nodeValue, key = raw.trim();
      if (key) n.nodeValue = raw.replace(key, () => t(key));
    }
  });
}
