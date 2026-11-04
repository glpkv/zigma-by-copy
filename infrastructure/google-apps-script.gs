/** Zigma intake. Deploy as a web app, execute as owner. Never return sheet data. */
var SPREADSHEET_ID = '1NlTXrczvdCWl8MZA8RwAWRjLLC0jcE3a5_Y154ME59Y';
var SHEET_NAME = 'Заявки';
var CATALOG = {
  "version": "2026-11-03-awaiting-clinic-prices",
  "currency": "BYN",
  "services": [
    {"id":"consultation","label":"Консультация стоматолога","description":"Хочу обсудить ситуацию и варианты лечения","unit":"визит","maxQuantity":1,"min":null,"max":null},
    {"id":"caries","label":"Лечение кариеса","description":"Выберите предполагаемое количество зубов","unit":"зуб","maxQuantity":16,"min":null,"max":null},
    {"id":"hygiene","label":"Профессиональная гигиена","description":"Уход за зубами и полостью рта","unit":"процедура","maxQuantity":1,"min":null,"max":null},
    {"id":"whitening","label":"Отбеливание зубов","description":"Обсудить возможность и подходящий метод","unit":"процедура","maxQuantity":1,"min":null,"max":null},
    {"id":"implantation","label":"Имплантация","description":"Обсудить восстановление отсутствующих зубов","unit":"зуб","maxQuantity":16,"min":null,"max":null},
    {"id":"bone-grafting","label":"Костная пластика","description":"Уточнить необходимость и объём процедуры","unit":"консультация","maxQuantity":1,"min":null,"max":null}
  ]
};

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() { return reply({enabled:true}); }

function validateIntake(data) {
  if (!data || data.website || data.consent !== true) throw new Error('INVALID_FORM');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id || '')) throw new Error('INVALID_ID');
  var name = typeof data.name === 'string' ? data.name.trim() : '';
  var digits = typeof data.phone === 'string' ? data.phone.replace(/\D/g,'') : '';
  if (digits.length === 9) digits = '375' + digits;
  if (/^80\d{9}$/.test(digits)) digits = '375' + digits.slice(2);
  if (!name || name.length > 100 || /[\r\n\0]/.test(name) || !/^375\d{9}$/.test(digits)) throw new Error('INVALID_CONTACT');
  var selection = data.selection === undefined ? [] : data.selection;
  if (!Array.isArray(selection) || selection.length > CATALOG.services.length) throw new Error('INVALID_SELECTION');
  var seen = {}, items = selection.map(function(value) {
    var service = CATALOG.services.filter(function(s) { return s.id === (value && value.id); })[0];
    if (!service || seen[service.id] || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > service.maxQuantity) throw new Error('INVALID_SELECTION');
    seen[service.id] = true;
    return {label:service.label,quantity:value.quantity,min:service.min,max:service.max};
  });
  var priced = items.length > 0 && items.every(function(x) { return typeof x.min === 'number' && typeof x.max === 'number' && isFinite(x.min) && isFinite(x.max) && x.min >= 0 && x.max >= x.min; });
  return {id:data.id,name:name,phone:'+'+digits,page:typeof data.page === 'string' && /^\/(?!\/)[\w/.-]*$/.test(data.page) ? data.page : '/',services:items.map(function(x) { return x.label+' × '+x.quantity; }).join('; '),min:priced?items.reduce(function(sum,x) { return sum+Math.round(x.min*100)*x.quantity; },0)/100:'',max:priced?items.reduce(function(sum,x) { return sum+Math.round(x.max*100)*x.quantity; },0)/100:'',version:items.length?CATALOG.version:''};
}

function safeCell(value) {
  var text = String(value).replace(/[\r\n\0]/g,' ');
  return /^[=+\-@\t]/.test(text) ? "'"+text : text;
}

function doPost(e) {
  var item;
  try {
    if (!e || !e.postData || e.postData.contents.length > 4096) throw new Error('INVALID_FORM');
    item = validateIntake(JSON.parse(e.postData.contents));
  } catch (_) { return reply({ok:false,error:'INVALID_FORM'}); }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ok:false,error:'BUSY'});
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getRange(1,1).getValue() !== 'ID заявки') throw new Error('INVALID_SHEET');
    var last = sheet.getLastRow();
    if (last > 50000) throw new Error('TABLE_LIMIT');
    if (last > 1 && sheet.getRange(2,1,last-1,1).createTextFinder(item.id).matchEntireCell(true).findNext()) return reply({ok:true,id:item.id});
    // Quotas count successful new requests only; duplicates remain safe to retry.
    var now = new Date(), day = Utilities.formatDate(now,'UTC','yyyy-MM-dd');
    var properties = PropertiesService.getScriptProperties();
    var usage = JSON.parse(properties.getProperty('DAILY_USAGE') || '{}');
    if (usage.day !== day) usage = {day:day,count:0};
    if (usage.count >= 300) return reply({ok:false,error:'DAILY_LIMIT'});
    var cache = CacheService.getScriptCache();
    var phoneKey = 'phone:'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,item.phone));
    var count = Number(cache.get(phoneKey) || 0);
    if (count >= 5) return reply({ok:false,error:'RATE_LIMIT'});
    var row = [safeCell(item.id),now,safeCell(item.name),safeCell(item.phone),safeCell(item.page),true,safeCell(item.services),item.min,item.max,safeCell(item.version),'Новая'];
    sheet.getRange(last+1,1,1,row.length).setValues([row]);
    sheet.getRange(last+1,2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
    // A quota bookkeeping failure must not turn a saved request into a failure.
    try { properties.setProperty('DAILY_USAGE',JSON.stringify({day:day,count:usage.count+1})); cache.put(phoneKey,String(count+1),3600); } catch (_) {}
    return reply({ok:true,id:item.id});
  } catch (_) { return reply({ok:false,error:'SAVE_FAILED'}); }
  finally { lock.releaseLock(); }
}
