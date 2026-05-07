// ============================================================
// RATE DESK - Guardian Smith | Code.gs v9
// Changes: prevFixedRates tracking for rate movement indicators
// ============================================================

const BANK_IDS = ['BNZ','ASB','Westpac','ANZ','Kiwibank','CoOp','SBS','TSB'];

// One bank can have multiple sending addresses — list them as an array.
// scanGmailForRates builds a Gmail `from:(a OR b)` query so the most
// recent matching email across any address wins. Empty array = skip
// that bank in the scan (advisers drop the rate card manually).
const BANK_SENDERS = {
  BNZ:      ['BNZ_Broker@broker.bnz.co.nz'],
  ASB:      ['thirdpartydistribution@asb.co.nz'],
  Westpac:  ['Third_Party_NoReply@westpac.co.nz'],
  ANZ:      [],
  Kiwibank: ['AdviserComms@kiwibank.co.nz'],
  CoOp:     ['TheCo-operativeBank@email.co-operativebank.co.nz'],
  SBS:      ['comms@e.sbsbank.co.nz'],
  TSB:      []
};

const BANK_FULL_NAMES = {
  BNZ:      'Bank of New Zealand',
  ASB:      'ASB Bank',
  Westpac:  'Westpac NZ',
  ANZ:      'ANZ Bank NZ',
  Kiwibank: 'Kiwibank',
  CoOp:     'Co-operative Bank',
  SBS:      'SBS Bank',
  TSB:      'TSB Bank'
};

const DEFAULT_LEM = {b80_85: 0, b85_90: 0.25, b90_95: 0.50};

const DEFAULT_RATES = {
  BNZ: {
    isPending: false, lastUpdated: '8 April 2026',
    lemBands: {b80_85: 0.35, b85_90: 0.75, b90_95: 1.20},
    fixedRates: [
      {term:'6 month', adv:4.49, disc:4.45, highLVR:4.49},
      {term:'1 year',  adv:4.59, disc:4.49, highLVR:4.59},
      {term:'18 month',adv:4.79, disc:4.69, highLVR:4.79},
      {term:'2 year',  adv:4.89, disc:4.85, highLVR:4.89},
      {term:'3 year',  adv:5.29, disc:5.19, highLVR:5.29},
      {term:'4 year',  adv:5.59, disc:5.55, highLVR:5.59},
      {term:'5 year',  adv:5.79, disc:5.69, highLVR:5.79}
    ],
    floatingRates: [
      {name:'Standard Variable', adv:5.84, disc:5.74, highLVR:5.84},
      {name:'TotalMoney',        adv:5.94, disc:5.84, highLVR:5.94},
      {name:'Rapid Repay',       adv:5.94, disc:5.84, highLVR:5.94}
    ],
    cashback: 'Up to 0.9% of new lending (max $20,000). FHB min $5,000.',
    notes: 'Disc. <=80% LVR rates include base interest rate margin.'
  },
  ASB: {
    isPending: false, lastUpdated: '7 April 2026',
    lemBands: {b80_85: 0.30, b85_90: 0.75, b90_95: 1.30},
    fixedRates: [
      {term:'6 month', adv:4.49, disc:4.49, highLVR:4.49},
      {term:'1 year',  adv:4.59, disc:4.49, highLVR:4.59},
      {term:'18 month',adv:4.85, disc:4.69, highLVR:4.85},
      {term:'2 year',  adv:5.09, disc:4.89, highLVR:5.09},
      {term:'3 year',  adv:5.39, disc:5.29, highLVR:5.39},
      {term:'4 year',  adv:5.55, disc:5.49, highLVR:5.55},
      {term:'5 year',  adv:5.69, disc:5.65, highLVR:5.69}
    ],
    floatingRates: [
      {name:'Housing Variable', adv:5.79, disc:5.09, highLVR:5.79},
      {name:'Orbit Variable',   adv:5.89, disc:5.19, highLVR:5.89}
    ],
    cashback: 'Up to 0.9%. FHB min $5,000. New securities only.',
    notes: 'LEM applies to LVR >80%. ERA may apply when breaking fixed term.'
  },
  Westpac: {
    isPending: false, lastUpdated: '7 April 2026',
    lemBands: {b80_85: 0.25, b85_90: 0.75, b90_95: 1.50},
    fixedRates: [
      {term:'6 month', adv:4.49, disc:4.49, highLVR:5.09},
      {term:'1 year',  adv:4.59, disc:4.49, highLVR:5.19},
      {term:'18 month',adv:4.85, disc:4.85, highLVR:5.45},
      {term:'2 year',  adv:5.19, disc:4.99, highLVR:5.79},
      {term:'3 year',  adv:5.29, disc:5.29, highLVR:5.89},
      {term:'4 year',  adv:5.39, disc:5.39, highLVR:5.99},
      {term:'5 year',  adv:5.59, disc:5.59, highLVR:6.19}
    ],
    floatingRates: [
      {name:'Choices Floating', adv:5.89, disc:5.59, highLVR:5.89},
      {name:'Choices Offset',   adv:5.89, disc:5.59, highLVR:5.89},
      {name:'Choices Everyday', adv:5.99, disc:5.69, highLVR:5.99}
    ],
    cashback: 'Contact Westpac for current cashback offers.',
    notes: 'Rate Card No. 64. Low equity margin applies >80% LVR.'
  },
  ANZ: {
    isPending: true, lastUpdated: 'Not yet received',
    lemBands: {b80_85: 0, b85_90: 0, b90_95: 0},
    fixedRates: [
      {term:'6 month', adv:0,disc:0,highLVR:0},{term:'1 year',  adv:0,disc:0,highLVR:0},
      {term:'18 month',adv:0,disc:0,highLVR:0},{term:'2 year',  adv:0,disc:0,highLVR:0},
      {term:'3 year',  adv:0,disc:0,highLVR:0},{term:'4 year',  adv:0,disc:0,highLVR:0},
      {term:'5 year',  adv:0,disc:0,highLVR:0}
    ],
    floatingRates: [{name:'Floating', adv:0,disc:0,highLVR:0}],
    cashback: 'Check ANZ adviser portal.', notes: 'Drop rate card to update.'
  },
  Kiwibank: {
    isPending: false, lastUpdated: '7 April 2026',
    lemBands: {b80_85: 0, b85_90: 0, b90_95: 0},
    fixedRates: [
      {term:'6 month', adv:4.49, disc:4.45, highLVR:5.39},
      {term:'1 year',  adv:4.59, disc:4.45, highLVR:5.49},
      {term:'2 year',  adv:5.09, disc:4.99, highLVR:5.99},
      {term:'3 year',  adv:5.45, disc:5.29, highLVR:6.25},
      {term:'4 year',  adv:5.79, disc:5.79, highLVR:6.59},
      {term:'5 year',  adv:5.89, disc:5.89, highLVR:6.69}
    ],
    floatingRates: [
      {name:'Variable',         adv:5.75, disc:5.65, highLVR:5.75},
      {name:'Offset Home Loan', adv:5.75, disc:5.75, highLVR:5.75},
      {name:'Revolving Credit', adv:5.80, disc:5.70, highLVR:5.80}
    ],
    cashback: 'New: 0.85% refinance, 0.9% otherwise (min $20K). FHB min $5K.',
    notes: 'Matrix ID ADVAPR07. Carded = advertised, Matrix = discretionary. No 18-month term.'
  },
  CoOp: {
    isPending: true, lastUpdated: 'Not yet received',
    lemBands: {b80_85: 0, b85_90: 0.25, b90_95: 0.50},
    fixedRates: [
      {term:'6 month', adv:0,disc:0,highLVR:0},{term:'1 year',  adv:0,disc:0,highLVR:0},
      {term:'18 month',adv:0,disc:0,highLVR:0},{term:'2 year',  adv:0,disc:0,highLVR:0},
      {term:'3 year',  adv:0,disc:0,highLVR:0},{term:'4 year',  adv:0,disc:0,highLVR:0},
      {term:'5 year',  adv:0,disc:0,highLVR:0}
    ],
    floatingRates: [{name:'Floating', adv:0,disc:0,highLVR:0}],
    cashback: 'Check Co-operative Bank portal.', notes: 'Drop rate card to update.'
  },
  SBS: {
    isPending: false, lastUpdated: '3 April 2026',
    lemBands: {b80_85: 0, b85_90: 0.25, b90_95: 0.50},
    fixedRates: [
      {term:'6 month', adv:4.49, disc:4.49, highLVR:5.09},
      {term:'1 year',  adv:4.49, disc:4.59, highLVR:5.19},
      {term:'18 month',adv:4.65, disc:4.79, highLVR:5.39},
      {term:'2 year',  adv:4.85, disc:4.99, highLVR:5.59},
      {term:'3 year',  adv:5.19, disc:5.29, highLVR:5.89},
      {term:'4 year',  adv:5.49, disc:5.55, highLVR:6.15},
      {term:'5 year',  adv:5.59, disc:5.69, highLVR:6.29}
    ],
    floatingRates: [{name:'Variable', adv:0, disc:0, highLVR:0}],
    cashback: 'Cash back 1.25% up to $20,000 for new residential home loans with >=20% equity.',
    notes: 'Exclusive Adviser rates for Owner Occupied <80% LVR & Resi Invest <70%. FirstHome Combo 12mth: 4.09%.'
  },
  TSB: {
    isPending: true, lastUpdated: 'Not yet received',
    lemBands: {b80_85: 0, b85_90: 0.25, b90_95: 0.50},
    fixedRates: [
      {term:'6 month', adv:0,disc:0,highLVR:0},{term:'1 year',  adv:0,disc:0,highLVR:0},
      {term:'18 month',adv:0,disc:0,highLVR:0},{term:'2 year',  adv:0,disc:0,highLVR:0},
      {term:'3 year',  adv:0,disc:0,highLVR:0},{term:'4 year',  adv:0,disc:0,highLVR:0},
      {term:'5 year',  adv:0,disc:0,highLVR:0}
    ],
    floatingRates: [{name:'Floating', adv:0,disc:0,highLVR:0}],
    cashback: 'Check TSB adviser portal.', notes: 'Drop rate card to update.'
  }
};

// ============================================================
// SHEET ACCESSOR
// ============================================================
// Resolves the Rate Desk spreadsheet from a script property first
// (RATE_DESK_SHEET_ID), falling back to the active spreadsheet for
// container-bound contexts. Time-driven triggers in Apps Script may
// have no active spreadsheet, so the property path is the reliable
// route for the daily Gmail scan.
function _rateDeskSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('RATE_DESK_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Rate Desk sheet not configured. Run captureSheetId() from the editor once, or set RATE_DESK_SHEET_ID in Project Settings → Script Properties.');
}

// One-off helper. Run from the editor while you have the Rate Desk
// spreadsheet bound (or active in your tab) to capture its ID into
// Script Properties so triggers can find it later.
function captureSheetId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No active spreadsheet — open this script from inside the Rate Desk spreadsheet via Extensions → Apps Script, then run captureSheetId again.');
  var id = ss.getId();
  PropertiesService.getScriptProperties().setProperty('RATE_DESK_SHEET_ID', id);
  // Logger output is what shows up in the execution log; the return
  // value does not. Log explicitly so the user can confirm the save.
  Logger.log('Saved RATE_DESK_SHEET_ID = ' + id + '  (sheet name: ' + ss.getName() + ')');
  return 'Saved RATE_DESK_SHEET_ID = ' + id;
}

// ============================================================
// WEB APP ENTRY POINT
// ============================================================
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Rate Desk - Guardian Smith')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// RATES - READ
// ============================================================
function getAllRates() {
  try {
    const ss = _rateDeskSheet_();
    const result = {};
    BANK_IDS.forEach(function(bankId) {
      const sheet = ss.getSheetByName(bankId);
      result[bankId] = sheet ? parseSheet(sheet, bankId) : Object.assign({id: bankId}, DEFAULT_RATES[bankId]);
    });
    return JSON.stringify(result);
  } catch (e) {
    Logger.log('getAllRates error: ' + e.message);
    return JSON.stringify(DEFAULT_RATES);
  }
}

function parseSheet(sheet, bankId) {
  const data = sheet.getDataRange().getValues();
  const def = DEFAULT_RATES[bankId] || {};
  const result = {
    id:bankId, isPending:false, lastUpdated:'',
    lemBands: Object.assign({}, DEFAULT_LEM),
    fixedRates:[], floatingRates:[],
    prevFixedRates: [],  // stores previous rates for movement indicators
    cashback:def.cashback||'', notes:def.notes||''
  };
  data.forEach(function(row) {
    const t = String(row[0]).trim().toUpperCase();
    if      (t === 'PENDING')      result.isPending         = row[1] === true || row[1] === 'true';
    else if (t === 'LAST_UPDATED') result.lastUpdated       = String(row[1]);
    else if (t === 'LEM_80_85') { var n80=parseFloat(row[1]); result.lemBands.b80_85=isNaN(n80)?0:n80; }
    else if (t === 'LEM_85_90') { var n85=parseFloat(row[1]); result.lemBands.b85_90=isNaN(n85)?0.25:n85; }
    else if (t === 'LEM_90_95') { var n90=parseFloat(row[1]); result.lemBands.b90_95=isNaN(n90)?0.50:n90; }
    else if (t === 'FIXED')        result.fixedRates.push({term:String(row[1]),adv:parseFloat(row[2])||0,disc:parseFloat(row[3])||0,highLVR:parseFloat(row[4])||0});
    else if (t === 'PREV_FIXED')   result.prevFixedRates.push({term:String(row[1]),adv:parseFloat(row[2])||0,disc:parseFloat(row[3])||0,highLVR:parseFloat(row[4])||0});
    else if (t === 'FLOAT')        result.floatingRates.push({name:String(row[1]),adv:parseFloat(row[2])||0,disc:parseFloat(row[3])||0,highLVR:parseFloat(row[4])||0});
    else if (t === 'CASHBACK')     result.cashback = String(row[1]);
    else if (t === 'NOTES')        result.notes    = String(row[1]);
  });
  return result;
}

// ============================================================
// RATES - WRITE
// ============================================================
function updateBankRates(bankId, rateDataJson) {
  try {
    const d = JSON.parse(rateDataJson);
    d.lastUpdated = formatDateValue(d.lastUpdated) || d.lastUpdated;
    if (d.fixedRates) d.fixedRates = d.fixedRates.map(function(r){return Object.assign({},r,{term:normalizeTerm(r.term)});});

    const ss = _rateDeskSheet_();
    let sheet = ss.getSheetByName(bankId);

    // Snapshot current FIXED rows as PREV_FIXED before overwriting.
    // This gives the frontend the data it needs for rate movement indicators.
    let prevFixedRows = [];
    if (sheet) {
      const existingData = sheet.getDataRange().getValues();
      existingData.forEach(function(row) {
        const t = String(row[0]).trim().toUpperCase();
        if (t === 'FIXED') {
          prevFixedRows.push(['PREV_FIXED', row[1], row[2], row[3], row[4]]);
        }
      });
    }

    if (!sheet) sheet = ss.insertSheet(bankId);
    else sheet.clearContents();

    const lem = d.lemBands || DEFAULT_LEM;
    const rows = [
      ['type','name_or_term','advertised_%','disc_lte80_%','adv_gt80_%'],
      ['PENDING',      d.isPending ? 'true' : 'false','','',''],
      ['LAST_UPDATED', d.lastUpdated,'','',''],
      ['LEM_80_85',    lem.b80_85 !== undefined ? lem.b80_85 : 0,'','',''],
      ['LEM_85_90',    lem.b85_90 !== undefined ? lem.b85_90 : 0.25,'','',''],
      ['LEM_90_95',    lem.b90_95 !== undefined ? lem.b90_95 : 0.50,'','','']
    ];
    (d.fixedRates    ||[]).forEach(function(r){rows.push(['FIXED', r.term, r.adv, r.disc, r.highLVR]);});
    (d.floatingRates ||[]).forEach(function(r){rows.push(['FLOAT', r.name, r.adv, r.disc, r.highLVR]);});
    if (d.cashback) rows.push(['CASHBACK', d.cashback,'','','']);
    if (d.notes)    rows.push(['NOTES',    d.notes,'','','']);

    // Append snapshotted previous rates at the bottom of the sheet
    prevFixedRows.forEach(function(r){ rows.push(r); });

    sheet.getRange(1,1,rows.length,5).setValues(rows);
    sheet.getRange(1,1,1,5).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
    const dataStart = 7;
    if (rows.length > dataStart) sheet.getRange(dataStart,3,rows.length-dataStart+1,3).setNumberFormat('0.00"%"');
    sheet.autoResizeColumns(1,5);

    // Append a snapshot to RateCardHistory for sparklines / history modal.
    try { _appendRateHistory_(ss, bankId, d); } catch (histErr) { Logger.log('history append failed: ' + histErr.message); }

    return JSON.stringify({success:true, updated:d.lastUpdated});
  } catch (e) {
    Logger.log('updateBankRates error: ' + e.message);
    return JSON.stringify({success:false, error:e.message});
  }
}

// ============================================================
// RATE CARD HISTORY (sparkline + history modal data)
// ============================================================
// Append a row per (date, bank, term) every time a rate card is saved.
// Sheet schema: timestamp_iso | bank | term | adv | disc | highLVR | last_updated_str
function _appendRateHistory_(ss, bankId, d) {
  var sheet = ss.getSheetByName('RateCardHistory');
  if (!sheet) {
    sheet = ss.insertSheet('RateCardHistory');
    sheet.getRange(1,1,1,7).setValues([['timestamp','bank','term','adv','disc','highLVR','last_updated']]);
    sheet.getRange(1,1,1,7).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var ts = new Date().toISOString();
  var lu = d.lastUpdated || '';
  var rows = [];
  (d.fixedRates || []).forEach(function(r){
    rows.push([ts, bankId, r.term, parseFloat(r.adv)||0, parseFloat(r.disc)||0, parseFloat(r.highLVR)||0, lu]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow()+1, 1, rows.length, 7).setValues(rows);
}

// One-shot backfill: seed RateCardHistory from each bank sheet's existing
// PREV_FIXED + FIXED rows so sparklines have at least 2 points immediately,
// instead of waiting for two future updates. Idempotent — won't double-seed
// if already populated for a bank.
function backfillRateHistory() {
  try {
    var ss = _rateDeskSheet_();
    var sheet = ss.getSheetByName('RateCardHistory');
    if (!sheet) {
      sheet = ss.insertSheet('RateCardHistory');
      sheet.getRange(1,1,1,7).setValues([['timestamp','bank','term','adv','disc','highLVR','last_updated']]);
      sheet.getRange(1,1,1,7).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var existingByBank = {};
    if (sheet.getLastRow() > 1) {
      var existing = sheet.getRange(2,1,sheet.getLastRow()-1,7).getValues();
      existing.forEach(function(row){
        var bank = String(row[1]);
        existingByBank[bank] = (existingByBank[bank] || 0) + 1;
      });
    }

    var seeded = [];
    var skipped = [];
    BANK_IDS.forEach(function(bankId) {
      if (existingByBank[bankId]) { skipped.push(bankId + ' (' + existingByBank[bankId] + ' rows)'); return; }
      var bs = ss.getSheetByName(bankId);
      if (!bs) return;
      var data = bs.getDataRange().getValues();
      var fixedRates = [], prevFixedRates = [], lastUpdated = '';
      data.forEach(function(row){
        var t = String(row[0]).trim().toUpperCase();
        if      (t === 'LAST_UPDATED') lastUpdated = String(row[1]);
        else if (t === 'FIXED')        fixedRates.push({term:String(row[1]), adv:parseFloat(row[2])||0, disc:parseFloat(row[3])||0, highLVR:parseFloat(row[4])||0});
        else if (t === 'PREV_FIXED')   prevFixedRates.push({term:String(row[1]), adv:parseFloat(row[2])||0, disc:parseFloat(row[3])||0, highLVR:parseFloat(row[4])||0});
      });

      var rows = [];
      var prevTs = new Date(Date.now() - 14*24*60*60*1000).toISOString();
      var curTs  = new Date().toISOString();
      prevFixedRates.forEach(function(r){
        rows.push([prevTs, bankId, r.term, r.adv, r.disc, r.highLVR, '(historical)']);
      });
      fixedRates.forEach(function(r){
        rows.push([curTs, bankId, r.term, r.adv, r.disc, r.highLVR, lastUpdated]);
      });

      if (rows.length) {
        sheet.getRange(sheet.getLastRow()+1, 1, rows.length, 7).setValues(rows);
        seeded.push(bankId + ' (' + rows.length + ' rows)');
      }
    });

    return JSON.stringify({ success:true, seeded:seeded, skipped:skipped });
  } catch (e) {
    Logger.log('backfillRateHistory error: ' + e.message);
    return JSON.stringify({ success:false, error: e.message });
  }
}

// Returns history for a single bank, grouped by snapshot timestamp.
// limit = max number of recent snapshots to return (default 12).
function getRateHistory(bankId, limit) {
  try {
    var lim = parseInt(limit) || 12;
    var ss = _rateDeskSheet_();
    var sheet = ss.getSheetByName('RateCardHistory');
    if (!sheet || sheet.getLastRow() < 2) return JSON.stringify({success:true, snapshots:[]});
    var data = sheet.getRange(2,1,sheet.getLastRow()-1,7).getValues();
    var byTs = {};
    data.forEach(function(row){
      if (String(row[1]) !== String(bankId)) return;
      var ts = String(row[0]);
      if (!byTs[ts]) byTs[ts] = { ts: ts, lastUpdated: String(row[6] || ''), rates: {} };
      byTs[ts].rates[String(row[2])] = {
        adv: parseFloat(row[3]) || 0,
        disc: parseFloat(row[4]) || 0,
        highLVR: parseFloat(row[5]) || 0
      };
    });
    var snapshots = Object.keys(byTs).map(function(k){ return byTs[k]; });
    snapshots.sort(function(a,b){ return a.ts < b.ts ? 1 : -1; });
    snapshots = snapshots.slice(0, lim).reverse();
    return JSON.stringify({ success:true, snapshots: snapshots });
  } catch (e) {
    Logger.log('getRateHistory error: ' + e.message);
    return JSON.stringify({ success:false, error: e.message, snapshots: [] });
  }
}

// ============================================================
// TERM NORMALISER
// ============================================================
function normalizeTerm(term) {
  var t = String(term).toLowerCase().trim().replace(/\s+/g,' ');
  var map = {
    '6 month':'6 month','6 months':'6 month','6 mth':'6 month','6 mths':'6 month',
    '1 year':'1 year','1 yr':'1 year','12 month':'1 year','12 months':'1 year','12 mth':'1 year','12 mths':'1 year',
    '18 month':'18 month','18 months':'18 month','18 mth':'18 month','18 mths':'18 month',
    '2 year':'2 year','2 years':'2 year','24 month':'2 year','24 months':'2 year','24 mth':'2 year','24 mths':'2 year',
    '3 year':'3 year','3 years':'3 year','36 month':'3 year','36 months':'3 year','36 mth':'3 year','36 mths':'3 year',
    '4 year':'4 year','4 years':'4 year','48 month':'4 year','48 months':'4 year','48 mth':'4 year','48 mths':'4 year',
    '5 year':'5 year','5 years':'5 year','60 month':'5 year','60 months':'5 year','60 mth':'5 year','60 mths':'5 year'
  };
  return map[t] || term;
}

// ============================================================
// DATE FORMATTER
// ============================================================
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Pacific/Auckland', 'd MMMM yyyy');
  var s = String(val);
  if (s.indexOf('GMT') !== -1 || s.indexOf('Standard Time') !== -1) {
    try { return Utilities.formatDate(new Date(s), 'Pacific/Auckland', 'd MMMM yyyy'); } catch(e) { return s; }
  }
  return s;
}

// ============================================================
// AI EXTRACTION
// ============================================================
function extractRatesFromFile(base64Data, mimeType, bankHint) {
  try {
    const prompt = buildExtractPrompt(bankHint);
    var responseText;
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      responseText = callGemini(prompt, base64Data, mimeType);
    } else {
      const text = Utilities.newBlob(Utilities.base64Decode(base64Data)).getDataAsString().substring(0,8000);
      responseText = callGemini(prompt + '\n\nContent:\n' + text, null, null);
    }
    const cleaned = responseText.replace(/```json|```/g,'').trim();
    // Gemini sometimes returns prose ('I am sorry...') when an email
    // isn't actually a rate card. Detect non-JSON before parsing so the
    // caller gets a clean failure instead of an Unexpected-token crash.
    if (!cleaned || (cleaned[0] !== '{' && cleaned[0] !== '[')) {
      return JSON.stringify({success:false, error:'Not a rate card · ' + cleaned.substring(0,80)});
    }
    return JSON.stringify({success:true, data:JSON.parse(cleaned)});
  } catch (e) {
    Logger.log('extractRatesFromFile error: ' + e.message);
    return JSON.stringify({success:false, error:e.message});
  }
}

function buildExtractPrompt(bankHint) {
  return 'Extract NZ home loan interest rates from this bank rate card. Return ONLY valid JSON - no markdown, no explanation.\n\n' +
    'Format:\n{"bankName":"BNZ/ASB/Westpac/ANZ/Kiwibank/CoOp/SBS/TSB","lastUpdated":"date e.g. 7 April 2026",\n' +
    '"fixedRates":[{"term":"STANDARD TERM","adv":4.49,"disc":4.45,"highLVR":4.49},...],\n' +
    '"floatingRates":[{"name":"product","adv":5.75,"disc":5.65,"highLVR":5.75}]}\n\n' +
    'Standard terms only: "6 month","1 year","18 month","2 year","3 year","4 year","5 year"\n' +
    'Convert: 12 mths->1 year, 24 mths->2 year, 36 mths->3 year, 48 mths->4 year, 60 mths->5 year. Skip non-standard rows.\n\n' +
    'Column mappings:\n' +
    '- BNZ: adv=Card, disc=0-80% LVR, highLVR=>80% LVR\n' +
    '- ASB: adv=Advertised Rate, disc=LVR<=80%, highLVR=LVR>80%\n' +
    '- Westpac: adv=Adv Rate <80%, disc=Disc Rate <80%, highLVR=Adv Rate >80%\n' +
    '- Kiwibank: adv=Carded (<=80%), disc=Matrix (<=80%), highLVR=Carded (>80%). NO 18-month term.\n' +
    '- SBS: adv=Carded Special, disc=Exclusive Adviser (<80%), highLVR=Standard >80%\n' +
    '- ANZ: adv=Advertised, disc=Disc <=80%, highLVR=Adv >80%\n' +
    '- Other: adv=advertised, disc=discretionary <=80%, highLVR=advertised >80%\n\n' +
    'Date format: "7 April 2026". Rates numeric. If column missing, copy adv.\n' +
    'Bank hint: ' + (bankHint||'detect from document') + '.';
}

// ============================================================
// RATE UPDATE EMAIL
// ============================================================
function generateClientEmail(configJson) {
  try {
    const config = JSON.parse(configJson);
    const bank = JSON.parse(getAllRates())[config.bankId];
    if (!bank) throw new Error('Bank not found: ' + config.bankId);

    var rateLines;
    if (config.includeDisc) {
      rateLines = (bank.fixedRates || []).filter(function(r){return r.adv > 0;})
        .map(function(r){return '  ' + r.term + ': ' + parseFloat(r.adv).toFixed(2) + '% p.a. (advertised) / ' + parseFloat(r.disc).toFixed(2) + '% p.a. (discretionary <=80% LVR)';}).join('\n');
    } else {
      rateLines = (bank.fixedRates || []).filter(function(r){return r.adv > 0;})
        .map(function(r){return '  ' + r.term + ': ' + parseFloat(r.adv).toFixed(2) + '% p.a.';}).join('\n');
    }

    var discNote = config.includeDisc
      ? '\n\nAdd this disclaimer before sign-off: "Discretionary rates are subject to eligibility criteria and lending conditions. These rates are provided as a guide only and are not for onward distribution."'
      : '';

    const prompt = 'You are a mortgage adviser at Guardian Smith in New Zealand. Draft a professional, warm rate update email.\n\n' +
      'Client: ' + (config.clientName || 'there') + '\nBank: ' + (BANK_FULL_NAMES[config.bankId] || config.bankId) +
      '\nRate card date: ' + bank.lastUpdated + '\nFocus term: ' + config.focusTerm + '\nContext: ' + (config.notes || 'none') + '\n\n' +
      (config.includeDisc ? 'Advertised and discretionary rates:\n' : 'Advertised rates:\n') + rateLines + '\n\n' +
      'Instructions: warm NZ English, highlight ' + config.focusTerm + ' and 2 alternatives, invite a call, under 200 words, no specific financial advice, do not mention cashback. ' +
      'Sign off: [Your Name] | Mortgage Adviser | Guardian Smith | guardiansmith.co.nz. First line: "Subject: ...".' + discNote;

    return JSON.stringify({success: true, email: callGemini(prompt, null, null)});
  } catch (e) {
    Logger.log('generateClientEmail error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

// ============================================================
// REFIX EMAIL
// ============================================================
function generateRefixEmail(configJson) {
  try {
    const config = JSON.parse(configJson);
    const allRates = JSON.parse(getAllRates());
    var rateTable = '[Rates not currently available - please insert manually]';
    if (config.bankId && allRates[config.bankId] && !allRates[config.bankId].isPending) {
      var bank = allRates[config.bankId];
      rateTable = (bank.fixedRates || []).filter(function(r){return r.disc > 0;})
        .map(function(r){return r.term + ':  ' + parseFloat(r.disc).toFixed(2) + '% p.a.';}).join('\n');
    }

    var isAppRefix = config.process && config.process.toLowerCase().indexOf('app') !== -1;

    var prompt = 'You are helping a mortgage adviser at Guardian Smith fill in a refix email template.\n\n' +
      'INSTRUCTIONS:\n' +
      '- Fill in ALL placeholders below with the details provided\n' +
      '- Replace [INSERT SCREENSHOT OF CURRENT RATES HERE] with the RATE TABLE provided\n' +
      '- Keep email structure and wording very close to the template\n' +
      '- If the process is "Client refixes via app", ensure the email includes clear app refix instructions\n' +
      '- If the process is "You refix for them", ensure the email asks client to confirm their preferred term\n' +
      '- If context notes provided, weave naturally into opening greeting only\n' +
      '- Replace [Adviser Name] sign-off with adviser name provided\n' +
      '- Return: "Subject: ..." then the full email body\n\n' +
      'PLACEHOLDERS TO FILL:\n' +
      '- [Client Name] / [Client Names] -> ' + (config.clientName || '[Client Name]') + '\n' +
      '- [Bank Name] -> ' + (config.bankLabel || '') + '\n' +
      '- [Insert Date] -> ' + (config.refixDate || '[Insert refix date]') + '\n' +
      '- [Refix Window] -> ' + (config.refixWindow || '') + '\n' +
      '- [Property Address/Loan Account] -> ' + (config.propertyRef || '(not provided)') + '\n' +
      '- [Adviser Name] / sign-off -> ' + (config.adviserName || 'Your Name') + '\n\n' +
      'REFIX PROCESS FOR THIS BANK: ' + (config.process || 'standard') + '\n' +
      (isAppRefix ? 'Client refixes via banking app — include step-by-step app instructions and ask them to screenshot confirmation.\n' : 'Adviser submits refix on behalf of client — ask client to confirm preferred term and repayment preference.\n') + '\n' +
      'RATE TABLE (replace [INSERT SCREENSHOT OF CURRENT RATES HERE] with this):\n' + rateTable + '\n\n' +
      (config.notes ? 'PERSONALISATION (opening line only): ' + config.notes + '\n\n' : '') +
      'TEMPLATE:\n' + config.templateBody;

    return JSON.stringify({success: true, email: callGemini(prompt, null, null)});
  } catch (e) {
    Logger.log('generateRefixEmail error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

// ============================================================
// PRE-MEETING EMAIL
// Repayments are calculated in JS and passed in pre-formatted
// so numbers are always accurate - Gemini just writes the wrapper
// ============================================================
function generatePreMeetingEmail(configJson) {
  try {
    const config = JSON.parse(configJson);

    const prompt =
      'You are a mortgage adviser at Guardian Smith in New Zealand.\n\n' +
      'Draft a professional pre-loan-structure-meeting email to a client.\n\n' +
      'CLIENT: ' + (config.clientName || 'there') + '\n' +
      'MEETING DATE: ' + (config.meetingDate || 'our upcoming meeting') + '\n' +
      'LOAN AMOUNT: $' + (config.loanAmount || '') + '\n' +
      'LVR BAND: ' + (config.lvrBandLabel || '<=80% LVR') + '\n' +
      'BANKS COMPARED: ' + config.bankAName + ' vs ' + config.bankBName + '\n' +
      'ADVISER: ' + (config.adviserName || 'Your Name') + '\n' +
      (config.notes ? 'CONTEXT: ' + config.notes + '\n' : '') + '\n' +
      'COMPARISON TABLE (include this formatted exactly as shown - do not alter the numbers):\n' +
      config.comparisonTable + '\n\n' +
      'INSTRUCTIONS:\n' +
      '- Warm, professional NZ English\n' +
      '- Open with context about the upcoming meeting and purpose of the email\n' +
      '- Briefly explain the comparison table (rate options + estimated repayments)\n' +
      '- Note the two- and three-year terms are currently popular but mention shorter terms for flexibility\n' +
      '- Emphasise rates are indicative and subject to change - nothing locked in until confirmed\n' +
      '- Invite them to come to the meeting with questions or a preferred direction\n' +
      '- No specific financial advice - frame as options to discuss\n' +
      '- Do not mention cashback\n' +
      '- Under 250 words for the body (not including the table)\n' +
      '- First line must be: "Subject: ..."\n' +
      '- Sign off: ' + (config.adviserName || '[Your Name]') + ' | Mortgage Adviser | Guardian Smith | guardiansmith.co.nz\n' +
      '- Insert the comparison table between the intro paragraph and the closing paragraph\n' +
      '- Add this disclaimer after the table: "Repayment estimates are based on $' + (config.loanAmount||'') + ' over 30 years at each rate shown, ' + config.freq + ' frequency. Rates are indicative only and subject to change without notice."';

    return JSON.stringify({success: true, email: callGemini(prompt, null, null)});
  } catch (e) {
    Logger.log('generatePreMeetingEmail error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

// ============================================================
// GMAIL AUTO-SCAN
// ============================================================
function scanGmailForRates() {
  const props = PropertiesService.getScriptProperties();
  const lastMs = parseInt(props.getProperty('LAST_SCAN_MS')||'0');
  const cutoffSec = Math.floor((lastMs || Date.now()-7*24*60*60*1000) / 1000);
  const updated = [];

  BANK_IDS.forEach(function(bankId) {
    var senders = BANK_SENDERS[bankId];
    // Tolerate the legacy single-string format alongside the array form.
    if (typeof senders === 'string') senders = senders ? [senders] : [];
    if (!senders || !senders.length) return;
    var fromClause = senders.length === 1
      ? 'from:' + senders[0]
      : 'from:(' + senders.join(' OR ') + ')';
    try {
      const threads = GmailApp.search(fromClause + ' after:' + cutoffSec, 0, 3);
      if (!threads.length) return;
      const msg = threads[0].getMessages().pop();
      let extracted = null;
      var atts = msg.getAttachments();
      for (var i=0; i<atts.length; i++) {
        var mime = atts[i].getContentType();
        if (mime.startsWith('image/')||mime==='application/pdf') {
          try {
            var res = JSON.parse(extractRatesFromFile(Utilities.base64Encode(atts[i].getBytes()), mime, bankId));
            if (res.success && res.data.fixedRates && res.data.fixedRates.length) { extracted=res.data; break; }
          } catch(ex){ Logger.log(bankId+' attachment: '+ex.message); }
        }
      }
      if (!extracted) {
        try {
          var body = msg.getPlainBody().substring(0,8000);
          var res2 = JSON.parse(extractRatesFromFile(Utilities.base64Encode(Utilities.newBlob(body).getBytes()),'text/plain',bankId));
          if (res2.success && res2.data.fixedRates && res2.data.fixedRates.length) extracted=res2.data;
        } catch(ex){ Logger.log(bankId+' body: '+ex.message); }
      }
      if (extracted) {
        var def = DEFAULT_RATES[bankId]||{};
        var rd = {
          isPending:false,
          lastUpdated: extracted.lastUpdated||Utilities.formatDate(new Date(),'Pacific/Auckland','d MMMM yyyy'),
          lemBands: def.lemBands || DEFAULT_LEM,
          fixedRates: extracted.fixedRates,
          floatingRates: (extracted.floatingRates&&extracted.floatingRates.length)?extracted.floatingRates:(def.floatingRates||[]),
          cashback: def.cashback||'', notes: def.notes||''
        };
        if (JSON.parse(updateBankRates(bankId,JSON.stringify(rd))).success) updated.push({bankId:bankId, date:rd.lastUpdated});
      }
    } catch(e){ Logger.log('Scan error '+bankId+': '+e.message); }
  });

  props.setProperty('LAST_SCAN_MS', Date.now().toString());
  if (updated.length) {
    var summary = updated.map(function(u){return u.bankId+' ('+u.date+')';}).join(', ');
    try { GmailApp.sendEmail(Session.getEffectiveUser().getEmail(),'Rate Desk - Auto-updated','Updated:\n\n'+summary+'\n\nVisit Rate Desk to review.'); }
    catch(e){ Logger.log('Email failed: '+e.message); }
  }
  return JSON.stringify({success:true, updated:updated});
}

// ============================================================
// ONE-TIME SETUP
// ============================================================
function initializeSheets() {
  BANK_IDS.forEach(function(b){ updateBankRates(b, JSON.stringify(DEFAULT_RATES[b])); });
  return 'Done: ' + BANK_IDS.join(', ');
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction()==='scanGmailForRates') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('scanGmailForRates').timeBased().everyDays(1).atHour(8).create();
  return 'Daily Gmail scan set for 8am.';
}

// ============================================================
// REPAYMENT CALCULATOR PDF
// ============================================================
// Renders the calculator results as HTML, lets Apps Script convert
// to PDF, returns base64 so the browser can trigger a download.
// Apps Script's HTML-to-PDF supports basic CSS + tables + <img>
// data URLs (used for the chart).
function generateRepaymentPdf(payloadJson) {
  try {
    var p = JSON.parse(payloadJson);
    var html = _buildRepaymentReportHtml_(p);
    var blob = Utilities.newBlob(html, 'text/html', 'report.html').getAs('application/pdf');
    var b64 = Utilities.base64Encode(blob.getBytes());
    var stamp = Utilities.formatDate(new Date(), 'Pacific/Auckland', 'yyyyMMdd_HHmm');
    var filename = (p.mode === 'compare' ? 'Repayment_Comparison_' : 'Repayment_Calculator_') + stamp + '.pdf';
    return JSON.stringify({ success: true, filename: filename, base64: b64 });
  } catch (e) {
    Logger.log('generateRepaymentPdf error: ' + e.message);
    return JSON.stringify({ success: false, error: e.message });
  }
}

function _nzd_(n){
  if (n === null || n === undefined || isNaN(n)) return '';
  return '$' + Math.round(n).toLocaleString('en-NZ');
}

function _buildRepaymentReportHtml_(p) {
  var caller = '';
  try { caller = Session.getActiveUser().getEmail(); } catch (_) {}
  var dateStr = Utilities.formatDate(new Date(), 'Pacific/Auckland', 'd MMMM yyyy');

  var css = 'body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px;color:#1B2A3B;font-size:11px;line-height:1.4;}'+
            'h1{font-size:18px;margin:0 0 4px;color:#1B2A3B;}'+
            'h2{font-size:13px;margin:18px 0 8px;color:#1B2A3B;border-bottom:1px solid #d1d5db;padding-bottom:4px;}'+
            'h3{font-size:11px;margin:0 0 6px;color:#1B2A3B;text-transform:uppercase;letter-spacing:0.04em;}'+
            '.sub{font-size:11px;color:#6b7280;margin-bottom:18px;}'+
            'table{width:100%;border-collapse:collapse;margin-bottom:6px;}'+
            'th{background:#1B2A3B;color:#fff;padding:6px 8px;text-align:left;font-size:10px;}'+
            'td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10.5px;}'+
            '.kv td{padding:3px 0;border:none;}'+
            '.kv td:first-child{color:#6b7280;width:50%;}'+
            '.kv td:last-child{text-align:right;font-weight:600;}'+
            '.danger{color:#dc2626;}'+
            '.success{color:#059669;}'+
            // Side-by-side schedule layout. HTML <table> is the most reliable
            // layout primitive in Apps Script HTML-to-PDF — flexbox/grid don\'t
            // render consistently. Inner schedule tables shrink to 9pt so two
            // 4-col tables fit across A4 portrait.
            '.sbs{width:100%;border-collapse:separate;border-spacing:10px 0;table-layout:fixed;margin-bottom:6px;}'+
            '.sbs>tbody>tr>td{vertical-align:top;width:50%;border:none;padding:0;}'+
            '.sbs table{font-size:9px;}'+
            '.sbs th{padding:4px 6px;font-size:9px;}'+
            '.sbs td{padding:3px 6px;font-size:9px;}'+
            '.sbs .label-A{color:#1D4ED8;}'+
            '.sbs .label-B{color:#059669;}'+
            '.foot{margin-top:18px;font-size:9.5px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:8px;}';

  function summaryTable(input, sched){
    var w = _calcPaymentRaw_(input.amount, input.rate, input.termYears, 'Weekly');
    var f = _calcPaymentRaw_(input.amount, input.rate, input.termYears, 'Fortnightly');
    var m = _calcPaymentRaw_(input.amount, input.rate, input.termYears, 'Monthly');
    return '<table class="kv">'+
      '<tr><td>Loan amount</td><td>'+_nzd_(input.amount)+'</td></tr>'+
      '<tr><td>Interest rate</td><td>'+input.rate.toFixed(2)+'% p.a.</td></tr>'+
      '<tr><td>Loan term</td><td>'+input.termYears+' years</td></tr>'+
      '<tr><td>Weekly repayment</td><td>'+_nzd_(w)+'</td></tr>'+
      '<tr><td>Fortnightly repayment</td><td>'+_nzd_(f)+'</td></tr>'+
      '<tr><td>Monthly repayment</td><td>'+_nzd_(m)+'</td></tr>'+
      '<tr><td>Total interest</td><td class="danger">'+_nzd_(sched.totalInterest)+'</td></tr>'+
      '<tr><td>Total repaid</td><td>'+_nzd_(sched.totalPaid)+'</td></tr>'+
    '</table>';
  }

  function scheduleTable(sched){
    var rows = (sched.years || []).map(function(y){
      return '<tr><td>Year '+y.year+'</td><td>'+_nzd_(y.principal)+'</td><td class="danger">'+_nzd_(y.interest)+'</td><td>'+_nzd_(y.balance)+'</td></tr>';
    }).join('');
    return '<table><thead><tr><th>Period</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }

  function sideBySideSchedules(labelL, schedL, labelR, schedR){
    return '<table class="sbs"><tbody><tr>'+
      '<td><h3 class="label-A">'+labelL+'</h3>'+scheduleTable(schedL)+'</td>'+
      '<td><h3 class="label-B">'+labelR+'</h3>'+scheduleTable(schedR)+'</td>'+
    '</tr></tbody></table>';
  }
  function sideBySideSummaries(labelL, inpL, schedL, labelR, inpR, schedR){
    return '<table class="sbs"><tbody><tr>'+
      '<td><h3 class="label-A">'+labelL+'</h3>'+summaryTable(inpL, schedL)+'</td>'+
      '<td><h3 class="label-B">'+labelR+'</h3>'+summaryTable(inpR, schedR)+'</td>'+
    '</tr></tbody></table>';
  }

  var chartImg = p.chartPng
    ? '<h2>Balance over time</h2><div style="margin:6px 0 14px;text-align:center"><img src="data:image/png;base64,'+p.chartPng+'" style="max-width:100%;height:auto;border:1px solid #e5e7eb;border-radius:4px" alt="Balance chart"></div>'
    : '';

  var body = '';
  if (p.mode === 'compare') {
    var compare = '';
    if (p.A && p.B) {
      body = '<h2>Loan summary</h2>' + sideBySideSummaries(
        'Scenario A — '+p.A.input.rate.toFixed(2)+'%', p.A.input, p.A.schedule,
        'Scenario B — '+p.B.input.rate.toFixed(2)+'%', p.B.input, p.B.schedule
      );
      var diff = Math.abs(p.A.schedule.totalPaid - p.B.schedule.totalPaid);
      var lower = p.A.schedule.totalPaid <= p.B.schedule.totalPaid ? 'Scenario A' : 'Scenario B';
      var mA = _calcPaymentRaw_(p.A.input.amount, p.A.input.rate, p.A.input.termYears, 'Monthly');
      var mB = _calcPaymentRaw_(p.B.input.amount, p.B.input.rate, p.B.input.termYears, 'Monthly');
      compare = '<h2>Comparison</h2><table class="kv">'+
        '<tr><td>Monthly difference</td><td class="success">'+_nzd_(Math.abs(mA-mB))+'/mo</td></tr>'+
        '<tr><td>Total cost difference</td><td class="success">'+_nzd_(diff)+'</td></tr>'+
        '<tr><td>Lower total cost</td><td class="success">'+lower+'</td></tr>'+
      '</table>';
      body += compare + chartImg + '<h2>Amortization schedules</h2>' + sideBySideSchedules(
        'Scenario A — '+p.A.input.rate.toFixed(2)+'%', p.A.schedule,
        'Scenario B — '+p.B.input.rate.toFixed(2)+'%', p.B.schedule
      );
    } else {
      var only = p.A || p.B;
      if (only) {
        body = '<h2>Loan summary</h2>' + summaryTable(only.input, only.schedule) +
               chartImg +
               '<h2>Amortization schedule</h2>' + scheduleTable(only.schedule);
      }
    }
  } else {
    body = '<h2>Loan summary</h2>' + summaryTable(p.input, p.schedule);
    if (p.extra && p.extra > 0 && p.extraSchedule) {
      var saved = p.schedule.totalInterest - p.extraSchedule.totalInterest;
      var newTerm = p.extraSchedule.years.length;
      var yrsReduced = p.input.termYears - newTerm;
      body += '<h2>Extra repayment scenario · +'+_nzd_(p.extra)+' per '+(p.input.freq||'Monthly').toLowerCase()+'</h2>'+
        '<table class="kv">'+
        '<tr><td>Interest saved</td><td class="success">'+_nzd_(saved)+'</td></tr>'+
        '<tr><td>Years reduced</td><td class="success">'+(yrsReduced>0?yrsReduced+' yr':'—')+'</td></tr>'+
        '<tr><td>New term</td><td>'+newTerm+' years</td></tr>'+
        '</table>'+
        chartImg +
        '<h2>Amortization schedules — standard vs with extras</h2>'+
        sideBySideSchedules(
          'Standard repayments', p.schedule,
          'With +'+_nzd_(p.extra)+' per '+(p.input.freq||'Monthly').toLowerCase(), p.extraSchedule
        );
    } else {
      body += chartImg + '<h2>Amortization schedule</h2>' + scheduleTable(p.schedule);
    }
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+
    '<h1>Repayment Calculator</h1>'+
    '<div class="sub">Prepared by '+(caller||'Guardian Smith')+' &middot; '+dateStr+'</div>'+
    body +
    '<div class="foot">This report is a guide based on the rate and amount entered. Actual repayments may vary depending on bank policy, fees, and rate changes. Verify with the bank before relying on these figures.</div>'+
  '</body></html>';
}

// Server-side payment calc, mirrors the client calcPayment logic.
function _calcPaymentRaw_(principal, annualRate, termYears, freq) {
  var ppy = freq === 'Weekly' ? 52 : freq === 'Fortnightly' ? 26 : 12;
  var r = (annualRate / 100) / ppy;
  var n = termYears * ppy;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

// ============================================================
// NEGOTIATED RATE LOG
// Shared across all advisers via the NegotiatedRates sheet.
// ============================================================
function getNegotiatedRates() {
  try {
    const ss = _rateDeskSheet_();
    const sheet = ss.getSheetByName('NegotiatedRates');
    if (!sheet) return JSON.stringify([]);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return JSON.stringify([]);
    return JSON.stringify(data.slice(1).map(function(row) {
      return {
        id:       String(row[0]),
        adviser:  String(row[1]),
        bank:     String(row[2]),
        term:     String(row[3]),
        rate:     parseFloat(row[4]) || 0,
        note:     String(row[5]),
        date:     String(row[6]),
        status:   String(row[7]) || 'active'
      };
    }).filter(function(r){ return r.id && r.bank; }).reverse()); // newest first
  } catch(e) {
    Logger.log('getNegotiatedRates error: ' + e.message);
    return JSON.stringify([]);
  }
}

function addNegotiatedRate(entryJson) {
  try {
    const entry = JSON.parse(entryJson);
    const ss = _rateDeskSheet_();
    let sheet = ss.getSheetByName('NegotiatedRates');
    if (!sheet) {
      sheet = ss.insertSheet('NegotiatedRates');
      const hdr = [['id','adviser','bank','term','rate_%','notes','date_added','status']];
      sheet.getRange(1,1,1,8).setValues(hdr);
      sheet.getRange(1,1,1,8).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setColumnWidth(1,160); sheet.setColumnWidth(5,70); sheet.setColumnWidth(6,300);
    }
    const id = Date.now().toString();
    const date = Utilities.formatDate(new Date(), 'Pacific/Auckland', 'd MMMM yyyy');
    sheet.appendRow([id, entry.adviser||'', entry.bank||'', entry.term||'', entry.rate||0, entry.note||'', date, 'active']);
    return JSON.stringify({success: true, id: id, date: date});
  } catch(e) {
    Logger.log('addNegotiatedRate error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

function updateNegotiatedRateStatus(id, status) {
  try {
    const ss = _rateDeskSheet_();
    const sheet = ss.getSheetByName('NegotiatedRates');
    if (!sheet) return JSON.stringify({success: false, error: 'No log sheet found'});
    const data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 8).setValue(status);
        return JSON.stringify({success: true});
      }
    }
    return JSON.stringify({success: false, error: 'Entry not found'});
  } catch(e) {
    Logger.log('updateNegotiatedRateStatus error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

// ============================================================
// GEMINI API
// ============================================================
function callGemini(textPrompt, base64Data, mimeType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set. Get one free at aistudio.google.com');
  const parts = [];
  if (base64Data && mimeType) parts.push({inlineData:{mimeType:mimeType, data:base64Data}});
  parts.push({text: textPrompt});
  const res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+apiKey,
    { method:'post', headers:{'Content-Type':'application/json'},
      payload:JSON.stringify({contents:[{parts:parts}],generationConfig:{temperature:0.1,maxOutputTokens:8192,thinkingConfig:{thinkingBudget:0}}}),
      muteHttpExceptions:true }
  );
  const result = JSON.parse(res.getContentText());
  if (result.error) throw new Error('Gemini: '+result.error.message);
  if (!result.candidates||!result.candidates[0]) throw new Error('No response from Gemini - check API key.');
  return result.candidates[0].content.parts[0].text;
}
  function _showRateDeskParentId() {                                                                                                                                                                                                                                           
    Logger.log('Rate Desk sheet ID: ' + _rateDeskSheet_().getId());                                                                                                                                                                                        
  }  