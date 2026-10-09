const NEWS_SHEET = '0 Новости';

/**
 * GET: ?days=14
 * POST: { values: [[...]] } или { row: [...] } — запись новостей
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(NEWS_SHEET);
    if (!sh) return json({ ok: false, error: 'Лист «' + NEWS_SHEET + '» не найден' });
    const days = parseInt((e && e.parameter && e.parameter.days) || '14', 10) || 14;
    const values = sh.getDataRange().getValues();
    if (values.length < 2) return json({ ok: true, rows: [] });
    const hdr = values[0];
    const map = {};
    hdr.forEach((h,i)=>{ if (h) map[String(h).trim()] = i; });
    const idx = {
      date: map['Дата'] ?? hdr.indexOf('Дата'),
      title: map['Заголовок'] ?? hdr.indexOf('Заголовок'),
      text: map['Суть'] ?? hdr.indexOf('Суть'),
      imp: map['Важность'] ?? hdr.indexOf('Важность'),
      src: map['Источник'] ?? hdr.indexOf('Источник'),
      link: map['Ссылка'] ?? hdr.indexOf('Ссылка'),
      q: map['Вопрос на восприятие'] ?? hdr.indexOf('Вопрос на восприятие'),
      det: map['Детали'] ?? hdr.indexOf('Детали'),
      id: map['ID'] ?? hdr.indexOf('ID'),
    };
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 86400000);
    const out = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const dval = idx.date >= 0 ? row[idx.date] : '';
      let d = null;
      if (dval instanceof Date) d = dval;
      else if (typeof dval === 'number' && dval > 1000) d = new Date((dval - 25569) * 86400000);
      else if (typeof dval === 'string' && dval.trim()) {
        const m = dval.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
      }
      if (d && d < cutoff) continue;
      out.push({
        date: d ? d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') : '',
        title: idx.title>=0 ? String(row[idx.title]||'') : '',
        text: idx.text>=0 ? String(row[idx.text]||'') : '',
        imp: idx.imp>=0 ? String(row[idx.imp]||'') : '',
        src: idx.src>=0 ? String(row[idx.src]||'') : '',
        link: idx.link>=0 ? String(row[idx.link]||'') : '',
        question: idx.q>=0 ? String(row[idx.q]||'') : '',
        details: idx.det>=0 ? String(row[idx.det]||'') : '',
        id: idx.id>=0 ? String(row[idx.id]||'') : '',
      });
    }
    out.reverse();
    return json({ ok: true, rows: out });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(NEWS_SHEET);
    if (!sh) return json({ ok: false, error: 'Нет листа «' + NEWS_SHEET + '»' });
    let values = null;
    if (Array.isArray(payload.values)) values = payload.values;
    else if (Array.isArray(payload.row)) values = [payload.row];
    if (!values || !values.length) return json({ ok: false, error: 'values не переданы' });
    const last = Math.max(sh.getLastRow(), 1);
    sh.getRange(last + 1, 1, values.length, values[0].length).setValues(values);
    return json({ ok: true, count: values.length, updatedRange: sh.getName() + '!A' + (last+1) });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
