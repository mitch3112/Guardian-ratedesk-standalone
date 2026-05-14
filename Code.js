// ============================================================
// RATE DESK - Guardian Smith | Code.gs v9
// Changes: prevFixedRates tracking for rate movement indicators
// ============================================================

const BANK_IDS = ['BNZ','ASB','Westpac','ANZ','Kiwibank','CoOp','SBS','TSB','AIA'];

// Banks that mirror another bank's rates rather than publishing their own.
// At read time, getAllRates copies the source bank's data over and tags
// it with mirroredFrom so the UI can lock editing and show a banner.
const MIRRORED_BANKS = { AIA: 'ASB' };

// One bank can have multiple sending addresses — list them as an array.
// scanGmailForRates builds a Gmail `from:(a OR b)` query so the most
// recent matching email across any address wins. Empty array = skip
// that bank in the scan (advisers drop the rate card manually).
const BANK_SENDERS = {
  BNZ:      ['BNZ_Broker@broker.bnz.co.nz'],
  ASB:      ['thirdpartydistribution@asb.co.nz'],
  Westpac:  ['Third_Party_NoReply@westpac.co.nz'],
  ANZ:      ['info@message.anz.co.nz','anztheinsider@anz.com'],
  Kiwibank: ['AdviserComms@kiwibank.co.nz'],
  CoOp:     ['TheCo-operativeBank@email.co-operativebank.co.nz'],
  SBS:      ['comms@e.sbsbank.co.nz'],
  TSB:      ['theteam@mail.tsb.co.nz'],
  AIA:      []
};

const BANK_FULL_NAMES = {
  BNZ:      'Bank of New Zealand',
  ASB:      'ASB Bank',
  Westpac:  'Westpac NZ',
  ANZ:      'ANZ Bank NZ',
  Kiwibank: 'Kiwibank',
  CoOp:     'Co-operative Bank',
  SBS:      'SBS Bank',
  TSB:      'TSB Bank',
  AIA:      'AIA Home Loans'
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
  },
  // AIA placeholder. Real values are overlaid from ASB at read time
  // via MIRRORED_BANKS — this entry just exists so a fresh sheet boot
  // doesn't crash before mirroring runs.
  AIA: {
    isPending: false, lastUpdated: '',
    lemBands: {b80_85: 0, b85_90: 0.25, b90_95: 0.50},
    fixedRates: [], floatingRates: [],
    cashback: 'Mirrored from ASB.', notes: 'Rates and pricing inherited from ASB. Updates here automatically when ASB updates.'
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
    // Apply mirroring after every bank is loaded — a mirrored bank
    // takes its source's rates / lemBands / lastUpdated but keeps its
    // own id and gets a mirroredFrom flag the UI uses to lock editing.
    Object.keys(MIRRORED_BANKS).forEach(function(targetId){
      var sourceId = MIRRORED_BANKS[targetId];
      if (!result[sourceId] || result[sourceId].isPending) return;
      var source = result[sourceId];
      var existingTarget = result[targetId] || {};
      result[targetId] = {
        id: targetId,
        isPending: false,
        lastUpdated: source.lastUpdated,
        lemBands: Object.assign({}, source.lemBands || {}),
        fixedRates: (source.fixedRates || []).map(function(r){ return Object.assign({}, r); }),
        prevFixedRates: (source.prevFixedRates || []).map(function(r){ return Object.assign({}, r); }),
        floatingRates: (source.floatingRates || []).map(function(r){ return Object.assign({}, r); }),
        cashback: existingTarget.cashback || ('Mirrored from ' + sourceId + '.'),
        notes: existingTarget.notes || ('Rates inherited from ' + sourceId + '. Updates here when ' + sourceId + ' updates.'),
        mirroredFrom: sourceId
      };
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
    if (MIRRORED_BANKS[bankId]) {
      return JSON.stringify({success:false, error: bankId + ' rates mirror ' + MIRRORED_BANKS[bankId] + '. Update ' + MIRRORED_BANKS[bankId] + ' instead.'});
    }
    const d = JSON.parse(rateDataJson);
    d.lastUpdated = formatDateValue(d.lastUpdated) || d.lastUpdated;
    if (d.fixedRates) d.fixedRates = d.fixedRates.map(function(r){return Object.assign({},r,{term:normalizeTerm(r.term)});});

    const ss = _rateDeskSheet_();
    let sheet = ss.getSheetByName(bankId);

    // Snapshot current FIXED rows as PREV_FIXED before overwriting.
    // This gives the frontend the data it needs for rate movement indicators.
    let prevFixedRows = [];
    let existingFixed = [];
    if (sheet) {
      const existingData = sheet.getDataRange().getValues();
      existingData.forEach(function(row) {
        const t = String(row[0]).trim().toUpperCase();
        if (t === 'FIXED') {
          prevFixedRows.push(['PREV_FIXED', row[1], row[2], row[3], row[4]]);
          existingFixed.push({
            term: normalizeTerm(String(row[1])),
            adv: parseFloat(row[2]) || 0,
            disc: parseFloat(row[3]) || 0,
            highLVR: parseFloat(row[4]) || 0
          });
        }
      });
    }

    // No-change dedup. Prevents duplicate history rows when the same rate
    // card is scanned more than once (cron + manual "Scan now" race,
    // multiple triggers, or back-to-back weekly cards with identical rates).
    // Compare term/adv/disc/highLVR with small tolerance for float rounding.
    if (existingFixed.length && d.fixedRates && d.fixedRates.length === existingFixed.length) {
      var byTerm = {};
      existingFixed.forEach(function(r){ byTerm[r.term] = r; });
      var unchanged = d.fixedRates.every(function(r){
        var e = byTerm[normalizeTerm(r.term)];
        return e
          && Math.abs((parseFloat(r.adv)||0)     - e.adv)     < 0.005
          && Math.abs((parseFloat(r.disc)||0)    - e.disc)    < 0.005
          && Math.abs((parseFloat(r.highLVR)||0) - e.highLVR) < 0.005;
      });
      if (unchanged) {
        return JSON.stringify({success:true, skipped:true, reason:'no_change', updated:d.lastUpdated});
      }
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
// HISTORY DELETE + REVERT (clean-up after bad scrapes)
// ============================================================
// Strip a single (bank, timestamp) snapshot from RateCardHistory.
// All rows sharing that timestamp+bank pair (one per term) are removed.
// Also refreshes the bank sheet's PREV_FIXED rows from the cleaned history
// so movement indicators (▼/▲ deltas) don't keep showing the deleted rates.
function deleteRateHistorySnapshot(bankId, isoTs) {
  try {
    var ss = _rateDeskSheet_();
    var sheet = ss.getSheetByName('RateCardHistory');
    if (!sheet || sheet.getLastRow() < 2) {
      return JSON.stringify({success:false, error:'No history sheet'});
    }
    var range = sheet.getRange(2,1,sheet.getLastRow()-1,7);
    var data = range.getValues();
    var keep = [];
    var deleted = 0;
    data.forEach(function(row){
      if (String(row[1]) === String(bankId) && String(row[0]) === String(isoTs)) {
        deleted++;
      } else {
        keep.push(row);
      }
    });
    if (!deleted) return JSON.stringify({success:false, error:'Snapshot not found'});
    range.clearContent();
    if (keep.length) sheet.getRange(2,1,keep.length,7).setValues(keep);

    // Rebuild the bank's PREV_FIXED rows from the cleaned history so the
    // movement indicators reflect the current state of history, not the
    // snapshot we just removed.
    try { _refreshPrevFixedFromHistory_(ss, bankId); } catch (e) { Logger.log('PREV_FIXED refresh failed: ' + e.message); }

    return JSON.stringify({success:true, deleted:deleted});
  } catch (e) {
    Logger.log('deleteRateHistorySnapshot error: ' + e.message);
    return JSON.stringify({success:false, error:e.message});
  }
}

// Rebuild the bank sheet's PREV_FIXED rows from RateCardHistory.
// Rule: PREV_FIXED = most recent snapshot whose values differ from the
// bank's current FIXED rows. If the most recent snapshot matches current
// FIXED (current rates came from the last capture), we walk one further
// back. If no snapshot exists or no snapshot differs, PREV_FIXED is cleared.
function _refreshPrevFixedFromHistory_(ss, bankId) {
  var bs = ss.getSheetByName(bankId);
  if (!bs) return;
  var histSheet = ss.getSheetByName('RateCardHistory');

  // Read current FIXED rows + non-PREV_FIXED row payload
  var allData = bs.getDataRange().getValues();
  var curFixed = {};
  var keepRows = [];
  allData.forEach(function(row){
    var t = String(row[0]).trim().toUpperCase();
    if (t === 'PREV_FIXED') return;
    if (t === 'FIXED') {
      curFixed[String(row[1])] = {
        adv: parseFloat(row[2]) || 0,
        disc: parseFloat(row[3]) || 0,
        highLVR: parseFloat(row[4]) || 0
      };
    }
    keepRows.push(row);
  });

  // Group history by timestamp for this bank
  var prevRates = null;
  if (histSheet && histSheet.getLastRow() >= 2) {
    var hd = histSheet.getRange(2,1,histSheet.getLastRow()-1,7).getValues();
    var byTs = {};
    hd.forEach(function(row){
      if (String(row[1]) !== String(bankId)) return;
      var ts = String(row[0]);
      if (!byTs[ts]) byTs[ts] = [];
      byTs[ts].push({term:String(row[2]), adv:parseFloat(row[3])||0, disc:parseFloat(row[4])||0, highLVR:parseFloat(row[5])||0});
    });
    var tsList = Object.keys(byTs).sort().reverse();

    function snapshotMatchesCurrent(rates) {
      if (!rates || !rates.length) return false;
      var anyTerm = false;
      for (var i = 0; i < rates.length; i++) {
        var c = curFixed[rates[i].term];
        if (!c) continue;
        anyTerm = true;
        if (Math.abs(c.adv - rates[i].adv) > 0.005) return false;
        if (Math.abs(c.disc - rates[i].disc) > 0.005) return false;
      }
      return anyTerm;
    }

    for (var i = 0; i < tsList.length; i++) {
      if (!snapshotMatchesCurrent(byTs[tsList[i]])) {
        prevRates = byTs[tsList[i]];
        break;
      }
    }
  }

  bs.clearContents();
  bs.getRange(1,1,keepRows.length,5).setValues(keepRows);
  var totalRows = keepRows.length;
  if (prevRates && prevRates.length) {
    var prevRows = prevRates.map(function(r){
      return ['PREV_FIXED', r.term, r.adv, r.disc, r.highLVR];
    });
    bs.getRange(keepRows.length+1, 1, prevRows.length, 5).setValues(prevRows);
    totalRows += prevRows.length;
  }

  bs.getRange(1,1,1,5).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
  var dataStart = 7;
  if (totalRows > dataStart) bs.getRange(dataStart,3,totalRows-dataStart+1,3).setNumberFormat('0.00"%"');
  bs.autoResizeColumns(1,5);
  // Mirrored banks (e.g. AIA → ASB) inherit prevFixedRates from the source
  // at read time in getAllRates, so they don't need their own refresh.
}

// Rewrite the bank's main sheet from the most-recent remaining snapshot
// in RateCardHistory. Used after deleting a bad latest snapshot — so the
// live rates roll back instead of staying poisoned.
// LEM bands, cashback, notes, and floating rates are preserved from the
// current bank sheet (history only tracks fixed rates).
// PREV_FIXED is rebuilt from the second-most-recent snapshot so movement
// indicators reflect the pre-revert state, not the bad snapshot.
// Does NOT append a new history row — that would defeat the point.
function revertBankToLatestSnapshot(bankId) {
  try {
    if (MIRRORED_BANKS[bankId]) {
      return JSON.stringify({success:false, error: bankId + ' rates mirror ' + MIRRORED_BANKS[bankId] + '. Revert ' + MIRRORED_BANKS[bankId] + ' instead.'});
    }
    var ss = _rateDeskSheet_();
    var histSheet = ss.getSheetByName('RateCardHistory');
    if (!histSheet || histSheet.getLastRow() < 2) {
      return JSON.stringify({success:false, error:'No history available to revert from'});
    }
    var histData = histSheet.getRange(2,1,histSheet.getLastRow()-1,7).getValues();
    var byTs = {};
    histData.forEach(function(row){
      if (String(row[1]) !== String(bankId)) return;
      var ts = String(row[0]);
      if (!byTs[ts]) byTs[ts] = { ts: ts, lastUpdated: String(row[6]||''), rates: [] };
      byTs[ts].rates.push({term:String(row[2]), adv:parseFloat(row[3])||0, disc:parseFloat(row[4])||0, highLVR:parseFloat(row[5])||0});
    });
    var tsList = Object.keys(byTs).sort().reverse();
    if (!tsList.length) {
      return JSON.stringify({success:false, error:'No history snapshots for ' + bankId});
    }
    var latest = byTs[tsList[0]];

    // Preserve everything the history sheet doesn't track.
    var bs = ss.getSheetByName(bankId);
    var preservedNotes = '', preservedCashback = '';
    var preservedLem = null;
    var preservedFloats = [];
    if (bs) {
      var bd = bs.getDataRange().getValues();
      bd.forEach(function(row){
        var t = String(row[0]).trim().toUpperCase();
        if (t === 'NOTES') preservedNotes = String(row[1]||'');
        else if (t === 'CASHBACK') preservedCashback = String(row[1]||'');
        else if (t === 'FLOAT') preservedFloats.push({name:String(row[1]), adv:parseFloat(row[2])||0, disc:parseFloat(row[3])||0, highLVR:parseFloat(row[4])||0});
        else if (t === 'LEM_80_85' || t === 'LEM_85_90' || t === 'LEM_90_95') {
          if (!preservedLem) preservedLem = {};
          var key = t === 'LEM_80_85' ? 'b80_85' : (t === 'LEM_85_90' ? 'b85_90' : 'b90_95');
          preservedLem[key] = parseFloat(row[1]) || 0;
        }
      });
    }

    var def = DEFAULT_RATES[bankId] || {};
    var lem = preservedLem || def.lemBands || DEFAULT_LEM;
    var floats = preservedFloats.length ? preservedFloats : (def.floatingRates || []);
    var cashback = preservedCashback || def.cashback || '';
    var notes = preservedNotes || def.notes || '';

    var prevFixedRows = [];
    if (tsList.length > 1) {
      byTs[tsList[1]].rates.forEach(function(r){
        prevFixedRows.push(['PREV_FIXED', r.term, r.adv, r.disc, r.highLVR]);
      });
    }

    if (!bs) bs = ss.insertSheet(bankId);
    else bs.clearContents();

    var rows = [
      ['type','name_or_term','advertised_%','disc_lte80_%','adv_gt80_%'],
      ['PENDING',      'false','','',''],
      ['LAST_UPDATED', latest.lastUpdated || '','','',''],
      ['LEM_80_85',    lem.b80_85 !== undefined ? lem.b80_85 : 0,'','',''],
      ['LEM_85_90',    lem.b85_90 !== undefined ? lem.b85_90 : 0.25,'','',''],
      ['LEM_90_95',    lem.b90_95 !== undefined ? lem.b90_95 : 0.50,'','','']
    ];
    latest.rates.forEach(function(r){ rows.push(['FIXED', r.term, r.adv, r.disc, r.highLVR]); });
    floats.forEach(function(r){ rows.push(['FLOAT', r.name, r.adv, r.disc, r.highLVR]); });
    if (cashback) rows.push(['CASHBACK', cashback,'','','']);
    if (notes) rows.push(['NOTES', notes,'','','']);
    prevFixedRows.forEach(function(r){ rows.push(r); });

    bs.getRange(1,1,rows.length,5).setValues(rows);
    bs.getRange(1,1,1,5).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
    var dataStart = 7;
    if (rows.length > dataStart) bs.getRange(dataStart,3,rows.length-dataStart+1,3).setNumberFormat('0.00"%"');
    bs.autoResizeColumns(1,5);

    return JSON.stringify({success:true, revertedTo: latest.lastUpdated, ts: latest.ts});
  } catch (e) {
    Logger.log('revertBankToLatestSnapshot error: ' + e.message);
    return JSON.stringify({success:false, error:e.message});
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
    // Vision/PDF extraction routes through the higher-accuracy model.
    // Flash mis-OCRs digits in rate-card tables (e.g. 4.45 → 7.29).
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      responseText = callGemini(prompt, base64Data, mimeType, { highAccuracy: true });
    } else {
      const text = Utilities.newBlob(Utilities.base64Decode(base64Data)).getDataAsString().substring(0,8000);
      responseText = callGemini(prompt + '\n\nContent:\n' + text, null, null, { highAccuracy: true });
    }
    const cleaned = responseText.replace(/```json|```/g,'').trim();
    if (!cleaned || (cleaned[0] !== '{' && cleaned[0] !== '[')) {
      return JSON.stringify({success:false, error:'Not a rate card · ' + cleaned.substring(0,80)});
    }
    var data = JSON.parse(cleaned);

    // Sanity guard. Hallucinated/OCR-mangled extractions almost always
    // surface as out-of-band rates — NZ fixed home-loan rates sit in
    // 2.0–6.5% for the foreseeable future. Anything outside that range
    // is either a floating/test/penalty rate that slipped into fixedRates,
    // or a misread digit. Reject the whole payload so it doesn't poison
    // the sheet or the trend history.
    var bad = (data.fixedRates || []).filter(function(r){
      var vals = [r.adv, r.disc, r.highLVR].map(parseFloat).filter(function(v){ return !isNaN(v) && v > 0; });
      return vals.some(function(v){ return v < 2.0 || v > 6.5; });
    });
    if (bad.length) {
      Logger.log('extractRatesFromFile rejected (out-of-range): ' + JSON.stringify(data));
      return JSON.stringify({
        success:false,
        error:'Extraction rejected — rates out of plausible range (2.0–6.5%). Likely a floating/test rate or OCR miss. Bad rows: ' +
          bad.map(function(r){return r.term+' adv='+r.adv+' disc='+r.disc;}).join('; ')
      });
    }

    return JSON.stringify({success:true, data:data});
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
    'CRITICAL RULES:\n' +
    '1. fixedRates is ONLY for time-bound fixed-term home loan rates: "6 month","1 year","18 month","2 year","3 year","4 year","5 year".\n' +
    '2. NEVER include any of these in fixedRates — put them in floatingRates instead: floating, variable, Standard Variable, Housing Variable, Orbit, Orbit Variable, TotalMoney, Rapid Repay, Revolving Credit, Choices Everyday, Offset, Line of Credit.\n' +
    '3. NEVER include servicing test rates, test rates, stress test rates, penalty rates, default rates, business loan rates, overdraft rates, or personal loan rates anywhere.\n' +
    '4. NZ home-loan fixed rates currently sit between 4.0% and 6.0%. If a value you are about to write is outside 2.0–6.5%, you are reading the wrong row — re-check the table.\n' +
    '5. Transcribe each digit EXACTLY as printed. Do NOT round, estimate, infer, or add any margin. If a digit is unclear, omit that row rather than guess.\n' +
    '6. Convert term aliases: 12 mths→1 year, 24 mths→2 year, 36 mths→3 year, 48 mths→4 year, 60 mths→5 year. Skip non-standard terms.\n\n' +
    'Column mappings:\n' +
    '- BNZ: adv=Card, disc=0-80% LVR, highLVR=>80% LVR (table header says "80.01% - 100%")\n' +
    '- ASB: adv=Advertised Rate, disc=LVR<=80%, highLVR=LVR>80% (LEM applies)\n' +
    '- Westpac: adv=Adv Rate <80%, disc=Disc Rate <80%, highLVR=Adv Rate >80%\n' +
    '- Kiwibank: adv=Carded (<=80%), disc=Matrix (<=80%), highLVR=Carded (>80%). NO 18-month term.\n' +
    '- SBS: adv=Carded Special, disc=Exclusive Adviser (<80%), highLVR=Standard >80%\n' +
    '- ANZ: adv=Advertised, disc=Disc <=80%, highLVR=Adv >80%\n' +
    '- Other: adv=advertised, disc=discretionary <=80%, highLVR=advertised >80%\n\n' +
    'Date format: "7 April 2026". Rates numeric (no % sign). If a column is genuinely missing for that row, copy adv into it.\n' +
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

    var generated = callGemini(prompt, null, null) || '';

    var links = [
      { label: String(config.linkLabel1 || '').trim(), url: String(config.linkUrl1 || '').trim() },
      { label: String(config.linkLabel2 || '').trim(), url: String(config.linkUrl2 || '').trim() }
    ].filter(function(l){ return l.label && l.url; });

    var plainFooter = '';
    if (links.length) {
      plainFooter = '\n\n' + links.map(function(l){ return l.label + ': ' + l.url; }).join('\n');
    }
    var plainEmail = generated + plainFooter;
    var htmlEmail  = _buildEmailHtml_(generated, links);

    return JSON.stringify({success: true, email: plainEmail, emailHtml: htmlEmail, hasLinks: links.length > 0});
  } catch (e) {
    Logger.log('generateRefixEmail error: ' + e.message);
    return JSON.stringify({success: false, error: e.message});
  }
}

function _buildEmailHtml_(plainBody, links) {
  function esc(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var src = String(plainBody || '');
  var subject = '';
  var body = src;
  var m = src.match(/^\s*Subject:\s*([^\n]+)\n+/i);
  if (m) {
    subject = m[1].trim();
    body = src.slice(m[0].length);
  }
  var paras = body.split(/\n{2,}/).map(function(p){
    return '<p style="margin:0 0 12px;line-height:1.55;">' + esc(p).replace(/\n/g, '<br>') + '</p>';
  }).join('');
  var subjectHtml = subject ? ('<p style="margin:0 0 16px;line-height:1.55;"><strong>Subject:</strong> ' + esc(subject) + '</p>') : '';
  var linksHtml = '';
  if (links && links.length) {
    linksHtml = '<p style="margin:14px 0 0;line-height:1.55;">' +
      links.map(function(l){ return '<a href="' + esc(l.url) + '">' + esc(l.label) + '</a>'; }).join(' &middot; ') +
      '</p>';
  }
  // Explicit white background + dark text on the wrapper so the rich-text
  // copy doesn't inherit the dark-theme Rate Desk background when the user
  // pastes into Gmail.
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;background:#ffffff;">' + subjectHtml + paras + linksHtml + '</div>';
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
        var writeRes = JSON.parse(updateBankRates(bankId,JSON.stringify(rd)));
        if (writeRes.success && !writeRes.skipped) updated.push({bankId:bankId, date:rd.lastUpdated});
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

// Diagnostic — run from the Apps Script editor if you suspect multiple
// scan triggers exist. Logs every project trigger with its handler.
function listScheduledTriggers() {
  var lines = ScriptApp.getProjectTriggers().map(function(t){
    return t.getHandlerFunction() + ' · ' + t.getTriggerSource() + ' · id=' + t.getUniqueId();
  });
  var msg = lines.length
    ? lines.length + ' trigger(s):\n' + lines.join('\n')
    : 'No triggers configured.';
  Logger.log(msg);
  return msg;
}

// One-off cleanup — strips exact-duplicate rows from RateCardHistory.
// "Exact" = same bank + same term + same adv/disc/highLVR (within 0.005)
// captured within a 60-minute window. Keeps the earliest of each cluster.
// Safe to run repeatedly; subsequent runs find nothing to remove.
function cleanupDuplicateRateHistory() {
  try {
    var ss = _rateDeskSheet_();
    var sheet = ss.getSheetByName('RateCardHistory');
    if (!sheet || sheet.getLastRow() < 2) {
      return JSON.stringify({success:true, removed:0, reason:'empty'});
    }
    var range = sheet.getRange(2,1,sheet.getLastRow()-1,7);
    var data = range.getValues();
    var keep = [];
    var removed = 0;
    var seen = {}; // key: bank|term|adv|disc|highLVR → earliest ts (ms)
    var WINDOW_MS = 60 * 60 * 1000;
    data.forEach(function(row){
      var bank = String(row[1]);
      var term = String(row[2]);
      var adv = parseFloat(row[3]) || 0;
      var disc = parseFloat(row[4]) || 0;
      var hl = parseFloat(row[5]) || 0;
      var key = bank + '|' + term + '|' + adv.toFixed(3) + '|' + disc.toFixed(3) + '|' + hl.toFixed(3);
      var tsMs = 0;
      try { tsMs = new Date(String(row[0])).getTime(); } catch (e) { tsMs = 0; }
      if (seen[key] != null && Math.abs(tsMs - seen[key]) < WINDOW_MS) {
        removed++;
        return;
      }
      seen[key] = tsMs;
      keep.push(row);
    });
    range.clearContent();
    if (keep.length) sheet.getRange(2,1,keep.length,7).setValues(keep);
    return JSON.stringify({success:true, removed:removed, kept:keep.length});
  } catch (e) {
    Logger.log('cleanupDuplicateRateHistory error: ' + e.message);
    return JSON.stringify({success:false, error:e.message});
  }
}

// ============================================================
// REPAYMENT CALCULATOR PDF
// ============================================================
// Renders the calculator results as HTML, lets Apps Script convert
// to PDF, returns base64 so the browser can trigger a download.
// Apps Script's HTML-to-PDF supports basic CSS + tables + <img>
// data URLs (used for the chart).
// Guardian logo embedded as a base64 PNG so the PDF is self-contained.
// 240px source PNG, scaled down at render time.
var GUARDIAN_LOGO_PNG_B64 = "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";

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

  // 2-cell header table: title + 'Prepared by' on the left, Guardian
  // logo on the right. Tables render reliably in Apps Script's
  // HTML-to-PDF; flexbox / grid often don't.
  var headerHtml = '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:none;"><tr style="border:none;">'+
    '<td style="border:none;padding:0;vertical-align:top;">'+
      '<h1>Repayment Calculator</h1>'+
      '<div class="sub">Prepared by '+(caller||'Guardian Smith')+' &middot; '+dateStr+'</div>'+
    '</td>'+
    '<td style="border:none;padding:0;width:120px;vertical-align:top;text-align:right;">'+
      '<img src="data:image/png;base64,'+GUARDIAN_LOGO_PNG_B64+'" alt="Guardian" style="width:100px;height:auto;display:inline-block;">'+
    '</td>'+
  '</tr></table>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+
    headerHtml +
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
// ============================================================
// EMAIL TEMPLATES (refix / rate update / pre-meeting)
// ============================================================
// Stored on an EmailTemplates tab in the Rate Desk spreadsheet so
// templates set as defaults are shared across every adviser. Personal
// templates stay in the browser's localStorage on the client side.
// Schema (post-migration): id | type | name | body | updatedBy | updatedAt |
//                          linkLabel1 | linkUrl1 | linkLabel2 | linkUrl2
// Older sheets (6 columns) are auto-migrated additively on first read so
// existing rows aren't touched.
var RATEDESK_TPL_HEADERS = ['id','type','name','body','updatedBy','updatedAt','linkLabel1','linkUrl1','linkLabel2','linkUrl2'];

function _getEmailTemplatesTab_() {
  var ss = _rateDeskSheet_();
  var tab = ss.getSheetByName('EmailTemplates');
  if (!tab) {
    tab = ss.insertSheet('EmailTemplates');
    tab.getRange(1, 1, 1, RATEDESK_TPL_HEADERS.length).setValues([RATEDESK_TPL_HEADERS]);
    tab.getRange(1, 1, 1, RATEDESK_TPL_HEADERS.length).setBackground('#1B2A3B').setFontColor('#FFFFFF').setFontWeight('bold');
    tab.setFrozenRows(1);
    tab.setColumnWidth(1, 240);
    tab.setColumnWidth(4, 480);
  } else {
    var existing = tab.getRange(1, 1, 1, Math.max(tab.getLastColumn(), 1)).getValues()[0];
    var missing = RATEDESK_TPL_HEADERS.filter(function(h){ return existing.indexOf(h) === -1; });
    if (missing.length) {
      var startCol = existing.filter(function(h){ return h; }).length + 1;
      tab.getRange(1, startCol, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#1B2A3B').setFontColor('#FFFFFF');
    }
  }
  return tab;
}

// Seed the standard refix template on first read so the dropdown is
// never empty. Idempotent — checks for existing rows first.
// Server-side mirror of the client's DEFAULT_REFIX_TEMPLATE constant.
// Used to seed the EmailTemplates tab on first read so the dropdown
// is never empty. Keep these two definitions in sync.
var SERVER_DEFAULT_REFIX_TEMPLATE =
"Subject: Loan Refixing: [Client Name] - [Bank Name] Refix Window Open\n\n" +
"Hi [Client Name],\n\n" +
"Hope you're doing well and having a good week so far.\n\n" +
"Just touching base as one of your loans is coming up for refix on [Insert Date], so you're now within your [Refix Window] refix window with [Bank Name].\n\n" +
"There's been quite a bit happening with interest rates recently. Most economists are signaling that we have now hit the bottom of the interest rate market, and as a result, we're seeing a lot of clients looking to lock something in sooner rather than later for a bit of certainty.\n\n" +
"Currently, the two- and three-year terms seem to be the sweet spot. We've noticed the four- and five-year rates have increased slightly further recently, making them a bit less appealing compared to the other options. However, if flexibility is your priority, a shorter-term rate is always a good option to keep your doors open.\n\n" +
"Current [Bank Name] Rates (Under 80% LVR):\n\n" +
"[INSERT SCREENSHOT OF CURRENT RATES HERE]\n\n" +
"Please note: Rates change daily and nothing is locked in until I have your confirmation and have submitted this to the bank.\n\n" +
"Next Steps: Once you've had a look, let me know which option you'd like to go with, and whether you'd like to keep repayments at a specific level or move to the new minimum.\n\n" +
"Cheers, [Adviser Name]";

function _seedDefaultEmailTemplates_(tab) {
  if (tab.getLastRow() > 1) return;
  var now = new Date();
  tab.appendRow([Utilities.getUuid(), 'refix', 'Standard refix', SERVER_DEFAULT_REFIX_TEMPLATE, 'system', now]);
}

// type is optional — pass 'refix' / 'rateupdate' / 'premeeting' to filter.
function getEmailTemplates(type) {
  try {
    var tab = _getEmailTemplatesTab_();
    if (tab.getLastRow() <= 1) _seedDefaultEmailTemplates_(tab);
    var data = tab.getDataRange().getValues();
    if (data.length <= 1) return JSON.stringify({success:true, templates:[]});
    var headers = data[0];
    function col(name){ return headers.indexOf(name); }
    var cId = col('id'), cType = col('type'), cName = col('name'),
        cBody = col('body'), cUpBy = col('updatedBy'), cUpAt = col('updatedAt'),
        cL1 = col('linkLabel1'), cU1 = col('linkUrl1'),
        cL2 = col('linkLabel2'), cU2 = col('linkUrl2');
    var rows = data.slice(1).map(function(r){
      var upAt = cUpAt >= 0 ? r[cUpAt] : '';
      return {
        id:         cId   >= 0 ? String(r[cId]   || '') : '',
        type:       cType >= 0 ? String(r[cType] || '') : '',
        name:       cName >= 0 ? String(r[cName] || '') : '',
        body:       cBody >= 0 ? String(r[cBody] || '') : '',
        updatedBy:  cUpBy >= 0 ? String(r[cUpBy] || '') : '',
        updatedAt:  upAt instanceof Date ? upAt.toISOString() : String(upAt || ''),
        linkLabel1: cL1 >= 0 ? String(r[cL1] || '') : '',
        linkUrl1:   cU1 >= 0 ? String(r[cU1] || '') : '',
        linkLabel2: cL2 >= 0 ? String(r[cL2] || '') : '',
        linkUrl2:   cU2 >= 0 ? String(r[cU2] || '') : ''
      };
    }).filter(function(t){ return t.id && t.type && (!type || t.type === type); });
    return JSON.stringify({success:true, templates:rows});
  } catch(e) {
    Logger.log('getEmailTemplates error: ' + e.message);
    return JSON.stringify({success:false, error:e.message, templates:[]});
  }
}

// Save (insert or update). Payload: {id?, type, name, body, linkLabel1, linkUrl1, linkLabel2, linkUrl2}.
function saveEmailTemplate(payloadJson) {
  try {
    var p = JSON.parse(payloadJson);
    if (!p.type || !p.name || !p.body) return JSON.stringify({success:false, error:'type, name, and body are all required.'});
    var caller = ''; try { caller = Session.getActiveUser().getEmail(); } catch(_) {}
    var tab = _getEmailTemplatesTab_();
    var data = tab.getDataRange().getValues();
    var headers = data[0];
    function colFor(name){ return headers.indexOf(name); }

    var rowMap = {
      type:       p.type,
      name:       p.name,
      body:       p.body,
      updatedBy:  caller,
      updatedAt:  new Date(),
      linkLabel1: String(p.linkLabel1 || ''),
      linkUrl1:   String(p.linkUrl1   || ''),
      linkLabel2: String(p.linkLabel2 || ''),
      linkUrl2:   String(p.linkUrl2   || '')
    };

    if (p.id) {
      var idCol = colFor('id');
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(p.id)) {
          Object.keys(rowMap).forEach(function(k){
            var c = colFor(k);
            if (c !== -1) tab.getRange(i + 1, c + 1).setValue(rowMap[k]);
          });
          return JSON.stringify({success:true, id:p.id});
        }
      }
      return JSON.stringify({success:false, error:'Template not found.'});
    }
    var id = Utilities.getUuid();
    rowMap.id = id;
    tab.appendRow(headers.map(function(h){ return rowMap[h] === undefined ? '' : rowMap[h]; }));
    return JSON.stringify({success:true, id:id});
  } catch(e) {
    return JSON.stringify({success:false, error:e.message});
  }
}

function deleteEmailTemplate(id) {
  try {
    var tab = _getEmailTemplatesTab_();
    var data = tab.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        tab.deleteRow(i + 1);
        return JSON.stringify({success:true});
      }
    }
    return JSON.stringify({success:false, error:'Template not found.'});
  } catch(e) {
    return JSON.stringify({success:false, error:e.message});
  }
}

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
function callGemini(textPrompt, base64Data, mimeType, opts) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set. Get one free at aistudio.google.com');
  const parts = [];
  if (base64Data && mimeType) parts.push({inlineData:{mimeType:mimeType, data:base64Data}});
  parts.push({text: textPrompt});

  // highAccuracy is for rate-card OCR — pro model + dynamic thinking.
  // Flash with thinking disabled mis-reads digits in low-res table images.
  // Everything else (email drafting) stays on flash for speed/cost.
  var highAccuracy = opts && opts.highAccuracy;
  var model = highAccuracy ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  var thinkingConfig = highAccuracy ? { thinkingBudget: -1 } : { thinkingBudget: 0 };

  const res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+apiKey,
    { method:'post', headers:{'Content-Type':'application/json'},
      payload:JSON.stringify({contents:[{parts:parts}],generationConfig:{temperature:0.1,maxOutputTokens:8192,thinkingConfig:thinkingConfig}}),
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