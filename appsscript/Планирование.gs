/**
 * Запись планирования с летучки в лист «Планирование».
 *
 * Установка
 * 1. Открыть таблицу YOUR_SPREADSHEET_ID → Расширения → Apps Script.
 * 2. Вставить этот файл.
 * 3. «Развернуть» → «Новое развёртывание» → тип «Веб-приложение»,
 *    выполнить «Я», кто имеет доступ — «Любой» (внутри контура банка).
 * 4. Скопировать URL веб-приложения в константу PLAN_ENDPOINT в летучка-макет.html.
 *
 * Формат: витрина шлёт POST с JSON { row: [17 значений] } в порядке колонок A..Q.
 */

const SHEET = 'Планирование';
const COLS = 17;

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const row = payload && payload.row;

    if (!Array.isArray(row) || row.length !== COLS) {
      return json({ ok: false, error: 'Ожидается массив из ' + COLS + ' значений, получено: ' + (row ? row.length : 0) });
    }
    if (!row[2]) {                                   // колонка C — КМ
      return json({ ok: false, error: 'Не указан КМ' });
    }

    const ss = SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId());
    const sh = ss.getSheetByName(SHEET);
    if (!sh) {
      return json({ ok: false, error: 'Нет листа «' + SHEET + '»' });
    }

    const lastRow = Math.max(sh.getLastRow(), 1);    // шапка в строке 1
    sh.getRange(lastRow + 1, 1, 1, COLS).setValues([row]);

    return json({ ok: true, row: lastRow + 1 });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  // проверка связи: возвращает последнюю запись
  const sh = SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId()).getSheetByName(SHEET);
  if (!sh) return json({ ok: false, error: 'Нет листа' });
  const last = sh.getLastRow();
  return json({
    ok: true,
    lastRow: last,
    last: last > 1 ? sh.getRange(last, 1, 1, COLS).getValues()[0] : null
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
