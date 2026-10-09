/* eslint-disable */
/**
 * Общая сборка данных для летучки. Один и тот же файл используется:
 *  - в Node (tools/payload.mjs → локальный сервер tools/serve.mjs);
 *  - в Apps Script (его текст вклеивается в Api.gs сборщиком).
 *
 * Файл не ходит в таблицу сам: чтение передаётся в ctx.read(name) -> values[][],
 * где values[r][c] — как в getValues() (индексы с нуля).
 */

var SHEETS = {
  stat: '0 Статистика',
  dash: 'DASHBOARD',
  fact: 'Факт',
  news: '0 Новости',
  web: 'WEB',
  plan: 'Планирование',
  quiz: '0 Quiz',
  cases: '0 Кейсы',
  motiv: '0 Мотивация',
  block: 'Блокнот',
  os: 'ОС',
  prot: 'Протокол',
  courses: '0 Обучение'
};

/** Колонки листа «ОС» (индексы с нуля). */
var OS = {
  km: 2, task: 3, type: 4, zone: 5, comm: 6, status: 7, sent: 8
};

/**
 * Персональные листы КМ: имя КМ -> лист. Соответствие по table_description.md
 * (лист «Андрей» = Иванов, «Вера» = Петрова, «Олег» = Сидоров,
 * «Артём» = Кузнецов, «Мария» = Смирнова). Волков/Козлов/Новиков
 * в документации ещё не описаны — их листы будут заполнены позже.
 */
var KM_SHEETS = {
  'Иванов': 'Андрей',
  'Петрова': 'Вера',
  'Сидоров': 'Олег',
  'Кузнецов': 'Артём',
  'Смирнова': 'Мария'
};

/** Колонки «0 Статистики» (шапка в строке 1), индексы с нуля. */
var STAT = {
  name: 0, planRko: 1, sfaRko: 2, factRko: 3, leftRko: 4, meetings: 5, regbiz: 6,
  ak: 7, yak: 8, pu: 9, planTe: 10, sfaTe: 11, tek: 12, teAk: 13, ie: 14, ieAk: 15,
  zp: 16, zpSht: 17, credit: 18, creditSum: 19, leasing: 20, podsvetka: 21,
  ved: 22, ebg: 23, faktoring: 24, nefin: 25, sc: 26, rank: 27
};

/** Колонки листа «Планирование» A..Q — тот же порядок, что в летучке (PLAN_ROW_MAP). */
var PLAN_COLS = {
  date: 0, time: 1, km: 2, rko: 3, te: 4, ie: 5, zp: 6, pu: 7, yak: 8,
  mk_k: 9, mk_f: 10, pol_p: 11, pol_o: 12, pol_open: 13, bill: 14, comm: 15, author: 16
};

/** Статусы воронки, которые считаем встречей/регистрацией бизнеса. */
var FN_STATUSES = ['Встреча', 'РегБиз'];

var BROKEN = /^#(REF|VALUE|NAME|N\/A|DIV\/0|NUM|NULL)/;

/** Число или null. Мусорные формулы (#REF! и пр.) и прочерки становятся null. */
function num(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).trim();
  if (!s || s === '-' || BROKEN.test(s)) return null;
  s = s.replace(',', '.').replace(/\s/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}

function str(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).replace(/\r/g, ' ').trim();
  return BROKEN.test(s) ? '' : s;
}

/** Как str, но переносы строк схлопнуты — для текстов, которые идут в одну строку. */
function text(v) {
  return str(v).replace(/[\r\n\t\u2028\u2029]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** '05.10.2026' -> '2026-10-05' ; Date/серийный номер -> '2026-10-05' ; мусор -> ''. */
function isoDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    var d = new Date(Math.round((v - 25569) * 86400000));
    if (!isNaN(d.getTime())) return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  var s = str(v);
  var m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (m) {
    var y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return y + '-' + pad2(m[2]) + '-' + pad2(m[1]);
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
  return '';
}

function pad2(n) {
  n = Number(n);
  return (n < 10 ? '0' : '') + n;
}

function ddmm(v) {
  var iso = isoDate(v);
  if (!iso) return '';
  var p = iso.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

/** Время из ячейки (текст, Date или serial-дробь) в "HH:mm". */
function timeStr(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return pad2(v.getHours()) + ':' + pad2(v.getMinutes());
  }
  if (typeof v === 'number' && v >= 0 && v < 1) {
    var m = Math.round(v * 1440);
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }
  return str(v).replace(/:00$/, '');
}

function todayIso() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** Ищет индекс колонки по имени шапки (регистр и лишние пробелы не важны). */
function col(hdr, name) {
  for (var i = 0; i < hdr.length; i++) {
    if (str(hdr[i]).toLowerCase() === name.toLowerCase()) return i;
  }
  return -1;
}

/** «0 Статистика»: строки КМ (со 2-й) + итоговая. Верхний блок один — до первой пустой строки. */
function parseStat(rows) {
  var out = { km: [], total: null, warn: [] };
  if (!rows || rows.length < 2) { out.warn.push('stat:пусто'); return out; }
  var hdr = rows[0];
  if (col(hdr, 'Сотрудник') !== STAT.name) out.warn.push('stat:шапка сдвинулась');

  var keys = ['planRko', 'sfaRko', 'factRko', 'leftRko', 'meetings', 'regbiz', 'ak',
    'yak', 'pu', 'planTe', 'sfaTe', 'tek', 'teAk', 'ie', 'ieAk', 'zp', 'zpSht',
    'credit', 'creditSum', 'leasing', 'podsvetka', 'ved', 'ebg', 'faktoring',
    'nefin', 'sc', 'rank'];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var name = str(row[STAT.name]);
    if (!name) break;                        // конец верхнего блока
    var rec = { name: name };
    for (var k = 0; k < keys.length; k++) rec[keys[k]] = num(row[STAT[keys[k]]]);
    rec.rkoToday = null;
    if (name === 'Итого:') { out.total = rec; continue; }
    out.km.push(rec);
  }
  if (!out.km.length) out.warn.push('stat:нет строк КМ');
  return out;
}

/**
 * DASHBOARD: нормативы «Цель на день!» и per-КМ остаток/RR.
 * Ищем по подписям, а не по номерам строк — витрина её двигает.
 */
function parseDashGoals(rows) {
  var out = { norm: {}, km: [], warn: [] };
  if (!rows) { out.warn.push('dash:пусто'); return out; }
  var head = -1;
  for (var r = 0; r < rows.length; r++) {
    if (str(rows[r][11]) === 'КМ' && str(rows[r][13]).indexOf('Осталось РКО') === 0) { head = r; break; }
  }
  if (head < 0) { out.warn.push('dash:не найдена шапка «Цель на день»'); return out; }

  // нормативы: подпись в строке, значение — в строке ниже
  var labels = [
    { key: 'rko', col: 1, text: 'РКО' },
    { key: 'tek', col: 4, text: 'ТЭК' },
    { key: 'billing', col: 7, text: 'БИЛЛИНГ' },
    { key: 'ak', col: 1, text: 'АКТИВАЦИЯ' },
    { key: 'pu', col: 4, text: 'ПУ' },
    { key: 'podsvetka', col: 1, text: 'ПОДСВЕТКА' },
    { key: 'mkKlass', col: 4, text: 'МК КЛАССИКА' },
    { key: 'mkFu', col: 7, text: 'МК ФЮ' }
  ];
  for (var i = 0; i < labels.length; i++) {
    var L = labels[i];
    var found = null;
    for (var rr = head; rr < rows.length; rr++) {
      var v = str(rows[rr][L.col]);
      if (v && v.toUpperCase().indexOf(L.text) === 0) { found = num(rows[rr + 1] ? rows[rr + 1][L.col] : null); break; }
    }
    out.norm[L.key] = found;
  }

  for (var r2 = head + 1; r2 < rows.length; r2++) {
    var nm = str(rows[r2][11]);
    if (!nm || BROKEN.test(nm)) continue;
    out.km.push({
      name: nm,
      leftRko: num(rows[r2][13]),
      rrRko: num(rows[r2][14]),
      leftTe: num(rows[r2][15]),
      rrTe: num(rows[r2][16]),
      pu: num(rows[r2][17])
    });
  }
  return out;
}

/**
 * Ищет в «0 Статистике» блоки, где в первой колонке названия (КМ или продукты),
 * а в следующих — даты. Возвращает [{headRow, cols:[{c,iso}], items:[{name,values}]}].
 */
function scanDateBlocks(rows) {
  var blocks = [];
  if (!rows) return blocks;
  for (var r = 0; r < rows.length; r++) {
    var cols = [];
    for (var c = 1; c < rows[r].length; c++) {
      var iso = isoDate(rows[r][c]);
      if (!iso) break;
      cols.push({ c: c, iso: iso });
    }
    if (!cols.length) continue;
    var items = [];
    for (var r2 = r + 1; r2 < rows.length; r2++) {
      if (isoDate(rows[r2][1])) break;                 // началась следующая шапка
      var nm = str(rows[r2][0]);
      if (!nm) continue;
      items.push({ name: nm, values: cols.map(function (x) { return num(rows[r2][x.c]); }) });
      if (nm === 'Динамика') break;
    }
    blocks.push({ headRow: r, cols: cols, items: items });
  }
  return blocks;
}

/** Дневная динамика по продуктам: берём блок, где в первой колонке РКО/ТЭК. */
function parseDayMatrix(rows, kmNames) {
  var out = { dates: [], byProduct: {}, warn: [] };
  var blocks = scanDateBlocks(rows);
  if (!blocks.length) { out.warn.push('stat:не найдена дневная матрица'); return out; }

  var block = null;
  for (var i = 0; i < blocks.length; i++) {
    var names = blocks[i].items.map(function (x) { return x.name; });
    if (names.some(function (n) { return /^(РКО|ТЭК|ИЭ|ПУ|ЗП)/.test(n); })) { block = blocks[i]; break; }
  }
  if (!block) {
    // блока с продуктами нет — берём тот, где нет ни одного имени КМ
    block = blocks.filter(function (b) {
      return !b.items.some(function (x) { return (kmNames || []).indexOf(x.name) >= 0; });
    })[0] || blocks[0];
    out.warn.push('stat:дневная матрица без названий продуктов');
  }
  out.dates = block.cols.map(function (x) { return x.iso; });
  for (var j = 0; j < block.items.length; j++) {
    out.byProduct[block.items[j].name] = block.items[j].values;
  }
  return out;
}

/** Сегодняшний счёт по каждому КМ: берём колонку сегодня из блока с именами КМ. */
function parseDayByKm(rows, todayIsoStr, kmNames) {
  var out = {};
  if (!rows || !todayIsoStr) return out;
  var blocks = scanDateBlocks(rows);
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (!b.items.some(function (x) { return (kmNames || []).indexOf(x.name) >= 0; })) continue;
    var colIdx = -1;
    for (var c = 0; c < b.cols.length; c++) if (b.cols[c].iso === todayIsoStr) { colIdx = c; break; }
    if (colIdx < 0) continue;
    for (var j = 0; j < b.items.length; j++) {
      var it = b.items[j];
      if (it.name === 'Динамика') continue;
      out[it.name] = it.values[colIdx];
    }
    break;
  }
  return out;
}

/** Планирование на сегодня: последняя строка по каждому КМ за дату. */
function parsePlan(rows, todayIsoStr) {
  var out = { byKm: {}, log: [], warn: [] };
  if (!rows || rows.length < 2) return out;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var km = str(row[PLAN_COLS.km]);
    if (!km) continue;
    var iso = isoDate(row[PLAN_COLS.date]);
    var rec = {
      date: iso,
      time: str(row[PLAN_COLS.time]),
      km: km,
      comm: str(row[PLAN_COLS.comm]),
      author: str(row[PLAN_COLS.author]),
      rko: num(row[PLAN_COLS.rko]),
      te: num(row[PLAN_COLS.te]),
      ie: num(row[PLAN_COLS.ie]),
      zp: num(row[PLAN_COLS.zp]),
      pu: num(row[PLAN_COLS.pu]),
      yak: num(row[PLAN_COLS.yak]),
      mk_k: num(row[PLAN_COLS.mk_k]),
      mk_f: num(row[PLAN_COLS.mk_f]),
      pol_open: num(row[PLAN_COLS.pol_open]),
      bill: num(row[PLAN_COLS.bill])
    };
    out.log.push(rec);
    if (todayIsoStr && iso === todayIsoStr) {
      var prev = out.byKm[km];
      if (!prev || rec.time >= prev.time) out.byKm[km] = rec;
    }
  }
  return out;
}

/** Новости из одноимённого листа: Дата | Тема | Новость. */
function parseNews(rows, days) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  var hdr = rows[0];
  var ci = { date: col(hdr, 'Дата'), topic: col(hdr, 'Тема'), text: col(hdr, 'Новость') };
  if (ci.topic < 0) ci.topic = col(hdr, 'Заголовок');
  if (ci.text < 0) ci.text = col(hdr, 'Суть');
  var cutoff = '';
  if (days) {
    var t = new Date();
    t.setDate(t.getDate() - days);
    cutoff = t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
  }
  for (var r = 1; r < rows.length; r++) {
    var topic = text(rows[r][ci.topic]);
    var body = text(rows[r][ci.text]);
    if (!topic && !body) continue;
    var iso = ci.date >= 0 ? isoDate(rows[r][ci.date]) : '';
    if (cutoff && iso && iso < cutoff) continue;
    out.push({ date: iso, dateRu: ddmm(iso), topic: topic, text: body });
  }
  out.reverse();
  return out;
}

/**
 * Лист «0 Обучение» — шпаргалка по продуктам банка (1 курс = 1 строка).
 * Колонки: Курс | Категория | Для кого | Суть продукта | Тарифы/условия |
 * Лимиты/требования | Шаги сделки/документы | Кому предлагать | Файл-источник.
 * Фронт показывает случайный курс и выбор по списку.
 */
function parseCourses(rows) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  var h = rows[0];
  var c = {
    name: col(h, 'Курс'), cat: col(h, 'Категория'), forWhom: col(h, 'Для кого'),
    essence: col(h, 'Суть продукта'), tariff: col(h, 'Тарифы/условия'),
    limits: col(h, 'Лимиты/требования'), steps: col(h, 'Шаги сделки/документы'),
    offer: col(h, 'Кому предлагать'), src: col(h, 'Файл-источник')
  };
  var cats = {};
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var name = text(row[c.name]);
    if (!name) continue;
    var cat = text(row[c.cat]) || 'Другое';
    var course = {
      name: name,
      cat: cat,
      for: text(row[c.forWhom]),
      essence: text(row[c.essence]),
      tariff: text(row[c.tariff]),
      limits: text(row[c.limits]),
      steps: text(row[c.steps]),
      offer: text(row[c.offer]),
      src: text(row[c.src])
    };
    cats[cat] = cats[cat] || [];
    cats[cat].push(course);
    out.push(course);
  }
  return { list: out, cats: cats };
}

/**
 * Лист «ОС» (обратная связь по КМ). Колонки: Дата | Время | КМ | Задача |
 * Тип | Зона роста | Комментарий | Статус | Отправлено.
 * Возвращает записи за сегодня, открытые задачи (любой день) и кому уже
 * собирали письмо сегодня. Отсутствие листа не ломает payload.
 */
function parseOs(rows, today) {
  var out = { today: [], open: [], sent: {} };
  if (!rows || rows.length < 2) return out;
  var todayRu = ddmm(today) || '';
  var from = Math.max(1, rows.length - 400); // открытые задачи — по недавним строкам
  for (var r = from; r < rows.length; r++) {
    var row = rows[r];
    var km = str(row[OS.km]).trim();
    var task = str(row[OS.task]).trim();
    var comm = str(row[OS.comm]).trim();
    if (!km && !task && !comm) continue; // пустая строка
    var e = {
      row: r + 1,
      km: km,
      date: ddmm(row[0]) || str(row[0]).trim(),
      time: timeStr(row[1]),
      task: task,
      type: str(row[OS.type]).trim(),
      zone: str(row[OS.zone]).trim(),
      comm: comm,
      done: str(row[OS.status]).toLowerCase() === 'выполнено',
      sent: !!str(row[OS.sent]).trim()
    };
    if (e.date === todayRu) {
      out.today.push(e);
      if (e.sent) out.sent[e.km] = true;
    }
    if (task && !e.done) {
      out.open.push({ row: e.row, km: e.km, date: e.date, time: e.time, task: task });
    }
  }
  return out;
}

/**
 * Лист «Протокол» (планёрка): Дата | Время | КМ | Текст.
 * Записи за сегодня + последние 60 строк лога.
 */
function parseProt(rows, today) {
  var out = { today: [], log: [] };
  if (!rows || rows.length < 2) return out;
  var todayRu = ddmm(today) || '';
  var from = Math.max(1, rows.length - 60);
  for (var r = from; r < rows.length; r++) {
    var row = rows[r];
    var date = ddmm(row[0]) || str(row[0]).trim();
    var time = timeStr(row[1]);
    var km = str(row[2]).trim();
    var text = str(row[3]).trim();
    if (!date && !text && !km) continue;
    var e = { row: r + 1, date: date, time: time, km: km, text: text };
    out.log.push(e);
    if (date === todayRu) out.today.push(e);
  }
  return out;
}

/**
 * Лист «Планирование» (форма планирования дня): читается родным
 * parsePlan (колонки D..Q). Здесь только СБОРКА payload: plan = план
 * по КМ на сегодня, planLog = журнал.
 */

/** Задачи дня из «Блокнота»: реакция по каждому КМ. */
function parseBlock(rows, todayIsoStr) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  var hdr = rows[0];
  var ci = { date: col(hdr, 'Дата'), task: col(hdr, 'Задача'), due: col(hdr, 'Срок реакции') };
  for (var r = 1; r < rows.length; r++) {
    var iso = ci.date >= 0 ? isoDate(rows[r][ci.date]) : '';
    var task = str(rows[r][ci.task]);
    if (!task) continue;
    if (todayIsoStr && iso && iso !== todayIsoStr) continue;
    var km = {};
    for (var c = 3; c < hdr.length; c++) {
      var nm = str(hdr[c]);
      if (nm) km[nm] = str(rows[r][c]);
    }
    out.push({ date: iso, task: task, due: str(rows[r][ci.due]), km: km });
  }
  return out;
}

/** Цитаты мотивации: колонка с текстом. */
function parseMotivation(rows, n) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  for (var r = 1; r < rows.length && out.length < (n || 40); r++) {
    var row = rows[r];
    for (var c = 0; c < row.length; c++) {
      var t = str(row[c]);
      if (t.length > 20) { out.push(t); break; }
    }
  }
  return out;
}

/** Клиентские базы персональных листов: заголовок ищется по тексту «дата встречи». */
function parseKmSheet(rows) {
  var out = { clients: [], warn: [] };
  if (!rows || rows.length < 2) return out;
  var head = -1;
  for (var r = 0; r < rows.length; r++) {
    var low = [];
    for (var c = 0; c < rows[r].length; c++) low.push(str(rows[r][c]).toLowerCase());
    if (low.indexOf('инн') >= 0 && low.some(function (v) { return v.indexOf('дата встречи') >= 0 || v.indexOf('дата встр') >= 0; })) {
      head = r; break;
    }
  }
  if (head < 0) {
    // Лист без шапки (напр. «Артём»): колонка A — ИНН, B — комментарий,
    // блок начинается после строк шапки-блока. Даты в нём нет, поэтому
    // используется только для сопоставления ИНН.
    for (var r3 = 5; r3 < rows.length; r3++) {
      var rr = rows[r3];
      var a = rr[0], b = rr[1];
      var inn = typeof a === 'number' ? str(a) : str(a);
      if (!inn || !/^\d{10,13}(\.0)?$/.test(inn)) continue;
      out.clients.push({ client: '', inn: inn, status: '', date: '', comm: str(b) });
    }
    out.headless = true;
    return out;
  }
  var hdr = rows[head];
  var ci = {
    client: col(hdr, 'Клиент'), inn: col(hdr, 'ИНН'), comm: col(hdr, 'Комметнтарий \\ адрес'),
    status: col(hdr, 'Статус'), date: -1
  };
  for (var c2 = 0; c2 < hdr.length; c2++) {
    var h = str(hdr[c2]).toLowerCase();
    if (h.indexOf('дата встр') === 0) ci.date = c2;
  }
  if (ci.comm < 0) ci.comm = ci.client;
  for (var r2 = head + 1; r2 < rows.length; r2++) {
    var row = rows[r2];
    var name = str(row[ci.client]);
    if (!name) continue;
    out.clients.push({
      client: name,
      inn: str(row[ci.inn]),
      status: str(row[ci.status]),
      date: ci.date >= 0 ? ddmm(row[ci.date]) : '',
      comm: str(row[ci.comm])
    });
  }
  return out;
}

/**
 * Встречи/регистрации: строки «Факта». Колонка `Дата` универсальна — она
 * относится ко всем статусам подряд. Если дата пуста, пробуем дату из
 * персонального листа КМ по ИНН (страховка для старых выгрузок).
 * Возврат: `date` — «дд.мм.гггг» для показа, `iso` — для фильтра «на сегодня».
 */
function parseMeetings(factRows, clients, days) {
  var out = [];
  if (!factRows || factRows.length < 2) return out;
  var hdr = factRows[0];
  var ci = {
    km: col(hdr, 'КМ'), product: col(hdr, 'Продукт'), client: col(hdr, 'Клиент'),
    inn: col(hdr, 'ИНН'), status: col(hdr, 'РКО статус'), comment: col(hdr, 'Комментарий'),
    date: col(hdr, 'Дата')
  };
  if (ci.date < 0) ci.date = col(hdr, 'Дата открытия');
  var byInn = {};
  for (var nm in clients) {
    var list = clients[nm] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].inn) byInn[list[i].inn] = { km: nm, date: list[i].date };
    }
  }
  for (var r = 1; r < factRows.length; r++) {
    var row = factRows[r];
    var st = str(row[ci.status]);
    var ok = FN_STATUSES.some(function (s) { return st.toLowerCase() === s.toLowerCase(); });
    if (!ok) continue;
    var inn = str(row[ci.inn]);
    var extra = byInn[inn];
    var iso = ci.date >= 0 ? isoDate(row[ci.date]) : '';
    if (!iso && extra) iso = isoDate(extra.date);
    out.push({
      km: str(row[ci.km]) || (extra ? extra.km : ''),
      product: str(row[ci.product]),
      client: str(row[ci.client]),
      inn: inn,
      status: st,
      iso: iso,
      date: iso ? ddmm(iso) : (extra ? extra.date : ''),
      comment: str(row[ci.comment])
    });
  }
  out.sort(function (a, b) {
    if (a.iso && b.iso && a.iso !== b.iso) return a.iso.localeCompare(b.iso);
    if (a.iso && !b.iso) return -1;
    if (!a.iso && b.iso) return 1;
    return a.client.localeCompare(b.client);
  });
  if (days) {
    var t = new Date();
    t.setDate(t.getDate() - days);
    var cut = t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
    out = out.filter(function (x) { return !x.iso || x.iso >= cut; });
  }
  return out;
}

/** Квиз из листа «0 Quiz»: вопрос, 4 варианта, правильный ответ, дата. */
function parseQuiz(rows) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  var hdr = rows[0];
  var ci = {
    id: col(hdr, 'ID'), q: col(hdr, 'Вопрос'),
    a: col(hdr, 'Вариант_A'), b: col(hdr, 'Вариант_B'),
    c: col(hdr, 'Вариант_C'), d: col(hdr, 'Вариант_D'),
    right: col(hdr, 'Правильный_ответ'), date: col(hdr, 'Дата')
  };
  for (var r = 1; r < rows.length; r++) {
    var q = str(rows[r][ci.q]);
    if (!q) continue;
    out.push({
      id: ci.id >= 0 ? str(rows[r][ci.id]) : '',
      q: q,
      a: str(rows[r][ci.a]), b: str(rows[r][ci.b]),
      c: str(rows[r][ci.c]), d: str(rows[r][ci.d]),
      right: str(rows[r][ci.right]),
      date: ci.date >= 0 ? ddmm(rows[r][ci.date]) : ''
    });
  }
  return out;
}

/** Кейсы из листа «0 Кейсы»: текст, тип клиента, дата, КМ-клиент и КМ-менеджер. */
function parseCases(rows) {
  var out = [];
  if (!rows || rows.length < 2) return out;
  var hdr = rows[0];
  var ci = {
    id: col(hdr, 'ID'), c: col(hdr, 'Кейс'), type: col(hdr, 'Тип клиента'),
    date: col(hdr, 'Дата'),
    buyer: col(hdr, 'КМ_Клиент'), seller: col(hdr, 'КМ_Менеджер')
  };
  for (var r = 1; r < rows.length; r++) {
    var t = str(rows[r][ci.c]);
    if (!t) continue;
    var type = str(rows[r][ci.type]);
    out.push({
      id: ci.id >= 0 ? str(rows[r][ci.id]) : '',
      case: t,
      title: t.split('\n')[0].slice(0, 90),
      type: type,
      isObj: type.toLowerCase().indexOf('возраж') >= 0,
      buyer: ci.buyer >= 0 ? str(rows[r][ci.buyer]) : '',
      seller: ci.seller >= 0 ? str(rows[r][ci.seller]) : '',
      date: ci.date >= 0 ? ddmm(rows[r][ci.date]) : ''
    });
  }
  return out;
}

/* ── WEB: витрина «Общие показатели отдела» ───────────────────── */

function isoToDate(iso) {
  var p = iso.split('-');
  return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
}
function dateToIso(d) {
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}
function addDays(iso, n) {
  var d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToIso(d);
}
var WD_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Понедельник–воскресенье недели, содержащей iso. */
function isoWeekRange(iso) {
  var d = isoToDate(iso);
  var shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  var start = dateToIso(d);
  return { start: start, end: addDays(start, 6) };
}
/** Границы квартала, содержащего iso. */
function quarterRange(iso) {
  var d = isoToDate(iso);
  var q = Math.floor(d.getUTCMonth() / 3);
  return {
    start: dateToIso(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1))),
    end: dateToIso(new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0)))
  };
}
function countDates(dates, from, to) {
  var n = 0;
  for (var i = 0; i < dates.length; i++) if (dates[i] >= from && dates[i] <= to) n++;
  return n;
}
/** Рабочие дни (пн–пт) между iso-датами включительно. */
function workdaysBetween(from, to) {
  if (!from || !to || from > to) return 0;
  var n = 0, cur = from;
  while (cur <= to) {
    var wd = isoToDate(cur).getUTCDay();
    if (wd >= 1 && wd <= 5) n++;
    cur = addDays(cur, 1);
  }
  return n;
}

/**
 * Лист WEB: дата, бюджет, рейтинги, блок показателей (Отток, RR и пр.),
 * Score Card, лучший/слабый за вчера. Подписи ищутся по тексту — витрина
 * двигает строки. Значения в блоках обычно строкой ниже подписей, у бюджета — выше.
 */
function parseWeb(rows) {
  var out = {
    date: '', dateRu: '',
    budget: { plan: null, sever: null, mbo: null },
    rankMos: null, rankTerr: null, stepDay: null,
    rko: null, ak: null, tek: null, teAk: null, leftRko: null,
    yak: null, ie: null, creditSum: null, ottok: null, pu: null,
    zpSht: null, rrSever: null,
    score: { m0: null, teQ3: null, rkoQ3: null },
    best: null, worst: null,
    warn: []
  };
  if (!rows || !rows.length) { out.warn.push('web:пусто'); return out; }
  out.date = rows[0] ? isoDate(rows[0][0]) : '';
  out.dateRu = ddmm(out.date);

  function findRow(pred) {
    for (var r = 0; r < rows.length; r++) if (pred(rows[r])) return r;
    return -1;
  }
  /** Значение подписи label: dy = +1 (значение ниже) или −1 (выше). */
  function near(r, label, dy) {
    if (r < 0) return null;
    var rr = r + dy;
    if (rr < 0 || rr >= rows.length) return null;
    for (var c = 0; c < rows[r].length; c++) {
      if (str(rows[r][c]).toLowerCase() === label.toLowerCase()) return num(rows[rr][c]);
    }
    return null;
  }

  var rBud = findRow(function (r) { return str(r[0]) === 'Бюджет'; });
  out.budget.plan = near(rBud, 'Бюджет', -1);
  out.budget.sever = near(rBud, 'Север', -1);
  out.budget.mbo = near(rBud, 'МБО', -1);

  var rRank = findRow(function (r) {
    return str(r[0]) === 'Рейтинг Москвы' && str(r[1]) === 'Рейтинг территории';
  });
  out.rankMos = near(rRank, 'Рейтинг Москвы', 1);
  out.rankTerr = near(rRank, 'Рейтинг территории', 1);
  out.stepDay = near(rRank, 'ШАГ ДНЯ', 1);

  var rMet = findRow(function (r) { return str(r[0]) === 'Факт РКО'; });
  if (rMet >= 0 && rows[rMet + 1]) {
    var vals = rows[rMet + 1];
    var keys = ['rko', 'ak', 'tek', 'teAk', 'leftRko', 'yak', 'ie', 'creditSum',
                'ottok', 'pu', 'zpSht', 'rrSever'];
    for (var m = 0; m < keys.length; m++) out[keys[m]] = num(vals[m]);
    if (out.rrSever !== null) out.rrSever = Math.round(out.rrSever * 100);
  }

  var rSc = findRow(function (r) { return str(r[0]) === 'Score Card отдела M0'; });
  out.score.m0 = near(rSc, 'Score Card отдела M0', 1);
  out.score.teQ3 = near(rSc, 'ТЭ Q3', 1);
  out.score.rkoQ3 = near(rSc, 'РКО Q3', 1);
  for (var sk in out.score) {
    if (out.score[sk] !== null) out.score[sk] = Math.round(out.score[sk] * 100);
  }

  var rBest = findRow(function (r) { return str(r[0]) === 'Лучший за вчера'; });
  if (rBest >= 0) {
    out.best = str(rows[rBest + 1] ? rows[rBest + 1][0] : '') || null;
    for (var w = rBest + 1; w < Math.min(rBest + 4, rows.length); w++) {
      var v = str(rows[w] ? rows[w][1] : '');
      if (v) { out.worst = v; break; }
    }
  }
  return out;
}

/* ── KPI: план/факт по периодам для карточек ──────────────────── */

/**
 * Имя карточки → поля. `plan`/`fact` — колонки строки «Итого:»
 * `0 Статистики`; `day` — имя строки дневной матрицы (недельный факт
 * есть только у РКО и ТЭК); `web` — поле листа WEB для стабов.
 */
var KPI_CARDS = [
  { name: 'Отток', kind: 'ottok', rank: 1 },
  { name: 'РКО', rank: 2, plan: 'planRko', fact: 'factRko', day: 'РКО' },
  { name: 'Активные РКО', rank: 3, plan: 'sfaRko', fact: 'ak' },
  { name: 'Эквайринг', rank: 4, plan: 'planTe', fact: 'tek', day: 'ТЭК' },
  { name: 'Активный эквайринг', rank: 5, plan: 'sfaTe', fact: 'teAk' },
  { name: 'ИЭ', rank: 6, plan: null, fact: 'ie' },
  { name: 'Активный ИЭ', rank: 7, plan: null, fact: 'ieAk' },
  { name: 'ЗП', rank: 8, plan: null, fact: 'zpSht' },
  { name: 'Кредит', rank: 9, plan: null, fact: 'credit' },
  { name: 'ПУ', rank: 10, plan: null, fact: 'pu' },
  { name: 'Якоря', rank: 11, plan: null, fact: 'yak' },
  { name: '__gap1', kind: 'gap', rank: 12 },
  { name: 'RR РКО СЕВЕР', kind: 'stub', rank: 13, percent: true, web: 'rrSever' },
  { name: 'Место по Москве', kind: 'stub', rank: 14, web: 'rankMos' }
];

/**
 * Месяц — из `0 Статистики`. Неделя — из дневной матрицы: факт по дням
 * текущей недели, план = месячный × (раб.дни недели / раб.дни месяца).
 * Квартал — сумма месяцев квартала: факт = доступные месяцы (сейчас один),
 * план = месячный × 3. Отток/RR/Место — без периодов (WEB).
 */
function buildKpi(stat, matrix, web, today) {
  var out = {};
  var total = (stat && stat.total) ? stat.total : {};
  var dates = (matrix && matrix.dates) || [];
  var week = isoWeekRange(today);
  var weekDays = countDates(dates, week.start, week.end) || workdaysBetween(week.start, week.end);
  var monthDays = dates.length || workdaysBetween(today.slice(0, 8) + '01', today);
  var monthsInQuarter = 3;

  for (var i = 0; i < KPI_CARDS.length; i++) {
    var c = KPI_CARDS[i];
    if (c.kind === 'gap') { out[c.name] = {}; continue; }

    if (c.kind === 'ottok') {
      out[c.name] = { fact: web ? web.ottok : null, ottokIe: null, prev: null, rank: c.rank, ottok: true };
      continue;
    }
    if (c.kind === 'stub') {
      out[c.name] = { fact: web ? web[c.web] : null, rank: c.rank, percent: !!c.percent, stub: true };
      continue;
    }

    var mPlan = c.plan ? num(total[c.plan]) : null;
    var mFact = c.fact ? num(total[c.fact]) : null;

    // неделя: факт из матрицы (только РКО/ТЭК имеют дневной разрез)
    var wFact = null;
    if (c.day && matrix && matrix.byProduct[c.day]) {
      var arr = matrix.byProduct[c.day];
      var sum = 0, any = false;
      for (var d = 0; d < dates.length; d++) {
        if (dates[d] < week.start || dates[d] > week.end || dates[d] > today) continue;
        var v = num(arr[d]);
        if (v !== null) { sum += v; any = true; }
      }
      wFact = any ? sum : null;
    }
    var wPlan = (mPlan !== null && monthDays) ? Math.round(mPlan * weekDays / monthDays) : null;
    var qPlan = (mPlan !== null) ? mPlan * monthsInQuarter : null;

    out[c.name] = {
      fact: [wFact, mFact, mFact],
      plan: [(mPlan !== null && monthDays) ? wPlan : null, mPlan, qPlan],
      rank: c.rank
    };
  }
  return out;
}

/** Отработано / всего (рабочие дни) по периодам — темп (runrate). */
function buildProgress(matrix, today) {
  var dates = (matrix && matrix.dates) || [];
  var has = dates.length > 0;
  var week = isoWeekRange(today);
  var monthStart = today.slice(0, 8) + '01';
  var qr = quarterRange(today);

  var wTot = has ? countDates(dates, week.start, week.end) : 0;
  var wDone = has ? countDates(dates, week.start, today) : 0;
  if (!wTot) { wTot = workdaysBetween(week.start, week.end); wDone = workdaysBetween(week.start, today); }

  var mTot = has ? dates.length : workdaysBetween(monthStart, qr.end);
  var mDone = has ? countDates(dates, monthStart, today) : workdaysBetween(monthStart, today);
  if (has && mTot > dates.length) mTot = dates.length;

  var qDone = workdaysBetween(qr.start, today);
  var qTot = workdaysBetween(qr.start, qr.end);

  function fix(done, tot) { tot = Math.max(tot, done, 1); return [Math.min(done, tot), tot]; }
  return { week: fix(wDone, wTot), month: fix(mDone, mTot), quarter: fix(qDone, qTot) };
}

/**
 * Вчерашний рабочий день из дневной матрицы: дата, факт РКО/ТЭК,
 * цели дня (DASHBOARD), день накануне для Δ. Дневного оттока в таблице нет.
 */
function buildYesterday(matrix, norm, today) {
  if (!matrix || !matrix.dates || !matrix.dates.length) return null;
  var idx = -1;
  for (var i = 0; i < matrix.dates.length; i++) {
    if (matrix.dates[i] < today) idx = i; else break;
  }
  if (idx < 0) return null;
  var iso = matrix.dates[idx];
  var n = norm || {};

  function val(p, i2) {
    var arr = matrix.byProduct[p];
    var v = arr ? num(arr[i2]) : null;
    return v;
  }
  var defs = [
    { key: 'rko', p: 'РКО', g: n.rko },
    { key: 'tek', p: 'ТЭК', g: n.tek }
  ];
  var rows = [];
  for (var d = 0; d < defs.length; d++) {
    var g = num(defs[d].g);
    rows.push({
      n: defs[d].p, key: defs[d].key,
      f: val(defs[d].p, idx),
      g: g, gnull: g === null
    });
  }
  var prev = {};
  if (idx > 0) {
    prev.rko = val('РКО', idx - 1);
    prev.tek = val('ТЭК', idx - 1);
  }
  return { iso: iso, dateRu: ddmm(iso), wd: WD_RU[isoToDate(iso).getUTCDay()], rows: rows, prev: prev };
}

/** График «Динамика месяца»: календарь рабочих дней, факт по дням, планы. */
function buildMonthDynamics(matrix, total, today) {
  var dates = (matrix && matrix.dates) || [];
  var rkoArr = (matrix && matrix.byProduct && matrix.byProduct['РКО']) || [];
  var teArr = (matrix && matrix.byProduct && matrix.byProduct['ТЭК']) || [];
  var days = [], rko = [], te = [];
  for (var i = 0; i < dates.length; i++) {
    days.push(Number(dates[i].slice(8, 10)));
    rko.push(num(rkoArr[i]));
    te.push(num(teArr[i]));
  }
  var todayIdx = -1;
  for (var k = 0; k < dates.length; k++) if (dates[k] <= today) todayIdx = k;
  var t = total || {};
  return {
    days: days, rko: rko, te: te,
    today: todayIdx,
    planRko: num(t.planRko), planTe: num(t.planTe)
  };
}

/** Точка входа: собирает всё, что показывает летучка. */
function buildPayload(ctx) {
  var today = (ctx && ctx.today) ? ctx.today() : todayIso();
  var read = ctx.read;
  var warn = [];
  function get(name) {
    try { return read(name) || []; } catch (e) { warn.push(name + ':' + (e && e.message ? e.message : e)); return []; }
  }

  var statRows = get(SHEETS.stat);
  var dashRows = get(SHEETS.dash);
  var stat = parseStat(statRows);
  var goals = parseDashGoals(dashRows);
  var kmNames = stat.km.map(function (k) { return k.name; });
  var matrix = parseDayMatrix(statRows, kmNames);
  var dayByKm = parseDayByKm(statRows, today, kmNames);

  var clients = {};
  for (var km in KM_SHEETS) {
    var p = parseKmSheet(get(KM_SHEETS[km]));
    clients[km] = p.clients;
    if (p.warn && p.warn.length) warn.push(KM_SHEETS[km] + ':' + p.warn.join(','));
  }

  var statKm = {};
  for (var i = 0; i < stat.km.length; i++) {
    var k = stat.km[i];
    k.rkoToday = dayByKm[k.name] !== undefined ? dayByKm[k.name] : null;
    statKm[k.name] = k;
  }

  var planRows = get(SHEETS.plan);
  var plan = parsePlan(planRows, today);

  var web = parseWeb(get(SHEETS.web));
  var kpi = buildKpi(stat, matrix, web, today);
  var progress = buildProgress(matrix, today);
  var yesterday = buildYesterday(matrix, goals.norm, today);
  var monthDynamics = buildMonthDynamics(matrix, stat.total, today);
  var os = parseOs(get(SHEETS.os), today);
  var prot = parseProt(get(SHEETS.prot), today);

  warn = warn.concat(stat.warn, goals.warn, matrix.warn, web.warn);

  return {
    ok: true,
    builtAt: new Date().toISOString(),
    today: today,
    todayRu: ddmm(today),
    km: stat.km,
    total: stat.total,
    dayNorm: goals.norm,
    dayRR: goals.km,
    days: matrix,
    kpi: kpi,
    progress: progress,
    yesterday: yesterday,
    monthDynamics: monthDynamics,
    web: web,
    os: os,
    prot: prot,
    news: parseNews(get(SHEETS.news), 3),
    courses: parseCourses(get(SHEETS.courses)),
    plan: plan.byKm,
    planLog: plan.log.slice(-30).reverse(),
    meetings: parseMeetings(get(SHEETS.fact), clients, 30),
    tasks: parseBlock(get(SHEETS.block), today),
    motivation: parseMotivation(get(SHEETS.motiv), 40),
    // Люди отдела (для ролей в играх): берутся из «0 Статистики».
    people: kmNames.slice(),
    quiz: parseQuiz(get(SHEETS.quiz)),
    cases: parseCases(get(SHEETS.cases)),
    plans: (function(){
      var t = stat.total || {};
      var out = [];
      if (t.planRko !== null && t.planRko !== undefined) out.push(["РКО", t.planRko]);
      if (t.ak !== null && t.ak !== undefined) out.push(["АК", t.ak]);
      if (t.yak !== null && t.yak !== undefined) out.push(["Якоря", t.yak]);
      if (t.pu !== null && t.pu !== undefined) out.push(["ПУ", t.pu]);
      if (t.tek !== null && t.tek !== undefined) out.push(["ТЭК", t.tek]);
      if (t.ie !== null && t.ie !== undefined) out.push(["ИЭ", t.ie]);
      if (t.zpSht !== null && t.zpSht !== undefined) out.push(["ЗП штук", t.zpSht]);
      if (t.credit !== null && t.credit !== undefined) out.push(["Кредит", t.credit]);
      if (t.leasing !== null && t.leasing !== undefined) out.push(["Лизинг", t.leasing]);
      if (t.nefin !== null && t.nefin !== undefined) out.push(["Нефин", t.nefin]);
      return out;
    })(),
    warn: warn
  };
}

/** Запись строки планирования (A..Q). */
function appendPlan(read, write, row) {
  var last = read(SHEETS.plan).length;
  return write(SHEETS.plan, Math.max(last, 1) + 1, row);
}