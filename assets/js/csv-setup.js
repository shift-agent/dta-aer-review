/* ============================================================
   CSV SETUP WIZARD — the per-connector setup flow (audit §4.1).

   upload a file → preview rows → map columns → import.

   Everything runs in the browser (FileReader — no backend, no fetch,
   file:// friendly). The "use the sample" path reads window.SS_SAMPLE_CSV
   (an embedded copy of assets/data/products-export.csv) because browsers
   block fetch() on file://.

   COLUMN MAPPING IS THE HEART OF IT. A CSV has no fixed schema, so the
   user maps their columns → Simplitory's fields. What they map decides
   the connector's capability set (connectors.js · csvCaps): map an image
   column → media; map a price column → price; leave stock unmapped → no
   stock, so the storefront quietly drops date-availability. On import the
   CSV becomes the active catalog with exactly those capabilities.
   ============================================================ */
( function () {
  'use strict';
  var S = window.SS_SOURCE;
  var root = document.querySelector('[data-csv-wizard]');
  if (!root || !S) return;

  /* ── Simplitory's target fields (what a product needs) ─────────── */
  var FIELDS = [
    { key:'name',        label:'Product name',  required:true,
      hint:'The item title. Required.', syn:['name','item','itemname','product','productname','title'] },
    { key:'category',    label:'Category',      cap:'catalog',
      hint:'Groups products (Linens, Chairs…). Feeds the storefront categories.', syn:['category','type','group','collection','department','kind'] },
    { key:'price',       label:'Price',         cap:'price',
      hint:'Enables a price column. Skip it and no price shows.', syn:['price','rate','dailyrate','cost','amount','rentalrate','dayrate'] },
    { key:'image',       label:'Image URL / path', cap:'media',
      hint:'Enables images. A CSV carries paths only, not the files.', syn:['image','imagefile','photo','img','picture','imageurl','imagepath','thumbnail'] },
    { key:'tags',        label:'Tags',          cap:'catalog',
      hint:'Split on ; | or , — feeds style & colour filters.', syn:['tags','keywords','labels','tag','colours','colors'] },
    { key:'description', label:'Description',
      hint:'Web copy. Stored in WordPress.', syn:['description','details','desc','notes','summary'] },
    { key:'variantCount',label:'Colourway count', cap:'variants',
      hint:'How many colours/options. Enables the “N colourways” note.', syn:['colorways','colourways','variants','variantcount','options','optioncount'] },
    { key:'stock',       label:'Stock / owned qty', cap:'stock',
      hint:'Owned quantity. Most CSV exports have none — leave it unmapped and stock features stay hidden.',
      syn:['stock','quantity','qty','owned','onhand','inventory','count','available'] }
  ];

  /* ── State ─────────────────────────────────────────────────────── */
  var st = { step:'upload', fileName:'', headers:[], rows:[], mapping:{}, error:'' };

  /* ── Helpers ───────────────────────────────────────────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  /* RFC4180-ish CSV parser — handles quoted fields, embedded commas,
     escaped "" quotes, and \r\n / \n line endings. */
  function parseCSV(text) {
    var rows = [], row = [], field = '', i = 0, inq = false, c, n;
    text = text.replace(/^﻿/, '');                       // strip BOM
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (inq) {
        if (c === '"') { n = text[i + 1]; if (n === '"') { field += '"'; i++; } else inq = false; }
        else field += c;
      } else if (c === '"') { inq = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
    return rows;
  }

  function loadText(text, fileName) {
    var grid = parseCSV(text);
    if (grid.length < 2) { st.error = 'That file has no data rows. A CSV needs a header row and at least one product.'; render(); return; }
    st.headers = grid[0].map(function (h) { return String(h).trim(); });
    st.rows = grid.slice(1).map(function (r) {
      var o = {}; st.headers.forEach(function (h, ix) { o[h] = r[ix] != null ? r[ix] : ''; }); return o;
    });
    st.fileName = fileName;
    st.mapping = autoGuess(st.headers);
    st.error = '';
    st.step = 'map';
    render();
  }

  function autoGuess(headers) {
    var m = {}, used = {};
    FIELDS.forEach(function (f) {
      var hit = headers.filter(function (h) { return !used[h]; }).filter(function (h) {
        var nh = norm(h);
        return f.syn.some(function (s) { return nh === s || nh.indexOf(s) > -1 || s.indexOf(nh) > -1; });
      })[0];
      m[f.key] = hit || null; if (hit) used[hit] = true;
    });
    return m;
  }

  /* mapping → live capability set (mirror of connectors.js · csvCaps) */
  function mappedCaps() {
    var m = st.mapping;
    return {
      catalog: 1,
      variants: m.variantCount ? 1 : 0,
      media: m.image ? 1 : 0,
      price: m.price ? 1 : 0,
      stock: m.stock ? 1 : 0,
      availability: 0, orders: 0, syncScheduled: 0, writeTags: 0, writeCatalog: 0
    };
  }

  function splitTags(v) {
    return String(v || '').split(/\s*[;|,]\s*/).map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function slugify(s, seen) {
    var base = String(s || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
    var slug = base, n = 2; while (seen[slug]) slug = base + '-' + (n++); seen[slug] = 1; return slug;
  }

  /* normalise mapped rows → the app's product shape */
  function buildProducts() {
    var m = st.mapping, seen = {}, out = [];
    st.rows.forEach(function (r) {
      var name = m.name ? String(r[m.name]).trim() : '';
      if (!name) return;                                       // skip nameless rows
      var nvar = m.variantCount ? parseInt(String(r[m.variantCount]).replace(/[^0-9]/g, ''), 10) : 0;
      var priceRaw = m.price ? String(r[m.price]).replace(/[^0-9.]/g, '') : '';
      out.push({
        slug: slugify(name, seen),
        base: name,
        group: m.category ? (String(r[m.category]).trim() || 'Uncategorised') : 'Uncategorised',
        img: m.image ? (String(r[m.image]).trim() || null) : null,
        tags: m.tags ? splitTags(r[m.tags]) : [],
        nvar: nvar > 0 ? nvar : 1,
        variants: [],
        listings: nvar > 0 ? nvar : 1,
        price: priceRaw ? parseFloat(priceRaw) : null,
        description: m.description ? String(r[m.description]).trim() : ''
      });
    });
    return out;
  }

  /* ── Render ────────────────────────────────────────────────────── */
  function render() {
    if (st.step === 'upload') return renderUpload();
    if (st.step === 'map')    return renderMap();
    if (st.step === 'done')   return renderDone();
  }

  function steps(active) {
    var s = [['upload','1','Upload'], ['map','2','Map columns'], ['done','3','Import']];
    return '<ol class="csv-steps">' + s.map(function (x) {
      var cls = x[0] === active ? 'on' : ((active === 'done' && x[0] !== 'done') || (active === 'map' && x[0] === 'upload') ? 'done' : '');
      return '<li class="' + cls + '"><span class="n">' + x[1] + '</span>' + x[2] + '</li>';
    }).join('') + '</ol>';
  }

  function renderUpload() {
    var hasSample = typeof window.SS_SAMPLE_CSV === 'string';
    root.innerHTML = steps('upload') +
      (st.error ? '<div class="csv-err">' + esc(st.error) + '</div>' : '') +
      '<div class="csv-up">' +
        '<div class="csv-drop" data-drop>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>' +
          '<b>Drop a CSV here, or choose a file</b>' +
          '<span>.csv exported from any spreadsheet — Excel, Google Sheets, your inventory tool</span>' +
          '<label class="btn btn--pri">Choose file<input type="file" accept=".csv,text/csv" data-file hidden></label>' +
        '</div>' +
        '<div class="csv-or"><span>or</span></div>' +
        '<div class="csv-sample">' +
          '<b>No file? Use the sample.</b>' +
          '<p>' + (hasSample ? '1,174' : 'sample') + ' real DTA products — name, category, rate, image, tags. No stock or order columns, so those features switch off.</p>' +
          '<button class="btn" data-sample' + (hasSample ? '' : ' disabled') + '>Use the sample file →</button>' +
          '<span class="csv-note">Sample rates are illustrative.</span>' +
        '</div>' +
      '</div>';

    var fileEl = root.querySelector('[data-file]');
    fileEl.addEventListener('change', function () { if (fileEl.files && fileEl.files[0]) readFile(fileEl.files[0]); });

    var drop = root.querySelector('[data-drop]');
    ['dragenter','dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) readFile(f);
    });

    var sampleBtn = root.querySelector('[data-sample]');
    if (sampleBtn) sampleBtn.addEventListener('click', function () {
      if (typeof window.SS_SAMPLE_CSV === 'string') loadText(window.SS_SAMPLE_CSV, 'products-export.csv');
    });
  }

  function readFile(file) {
    if (!/\.csv$/i.test(file.name) && file.type.indexOf('csv') < 0 && file.type.indexOf('text') < 0) {
      st.error = 'Please choose a .csv file. (' + esc(file.name) + ' looks like something else.)'; render(); return;
    }
    var fr = new FileReader();
    fr.onload = function () { loadText(String(fr.result), file.name); };
    fr.onerror = function () { st.error = 'Could not read that file.'; render(); };
    fr.readAsText(file);
  }

  function renderMap() {
    var caps = mappedCaps();
    var opts = function (sel) {
      return '<option value="">— not mapped —</option>' + st.headers.map(function (h) {
        return '<option value="' + esc(h) + '"' + (sel === h ? ' selected' : '') + '>' + esc(h) + '</option>';
      }).join('');
    };
    var mapRows = FIELDS.map(function (f) {
      var v = st.mapping[f.key] || '';
      var reqMissing = f.required && !v;
      return '<tr class="' + (reqMissing ? 'is-missing' : '') + '">' +
        '<td class="fk"><b>' + esc(f.label) + '</b>' + (f.required ? '<span class="req">required</span>' : '') +
          '<span class="fh">' + esc(f.hint) + '</span></td>' +
        '<td class="fs"><select data-map="' + f.key + '">' + opts(v) + '</select></td>' +
        '<td class="fc">' + (f.cap ? capPill(f.cap, !!v) : '') + '</td>' +
      '</tr>';
    }).join('');

    // raw preview — first rows as they sit in the file
    var prevN = Math.min(5, st.rows.length);
    var rawHead = '<tr>' + st.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
    var rawBody = st.rows.slice(0, prevN).map(function (r) {
      return '<tr>' + st.headers.map(function (h) { return '<td>' + esc(trunc(r[h], 42)) + '</td>'; }).join('') + '</tr>';
    }).join('');

    root.innerHTML = steps('map') +
      '<div class="csv-filebar"><span class="dot"></span> <b>' + esc(st.fileName) + '</b> · ' +
        st.rows.length.toLocaleString() + ' rows · ' + st.headers.length + ' columns detected ' +
        '<button class="btn btn--sm" data-restart>Choose a different file</button></div>' +

      '<div class="csv-two">' +
        '<div class="csv-mapcol">' +
          '<h2 class="csv-h2">Map your columns</h2>' +
          '<p class="csv-sub">We\'ve guessed from the headers — adjust anything off. What you map decides what this source can do.</p>' +
          '<table class="csv-maptable"><tbody>' + mapRows + '</tbody></table>' +
        '</div>' +
        '<div class="csv-sidecol">' +
          '<div class="csv-capbox" data-capbox>' + capBox(caps) + '</div>' +
          '<div class="csv-livebox"><h3>Live preview</h3><div data-livepreview>' + livePreview() + '</div></div>' +
        '</div>' +
      '</div>' +

      '<details class="csv-raw"><summary>Preview raw rows (' + prevN + ' of ' + st.rows.length.toLocaleString() + ')</summary>' +
        '<div class="csv-rawscroll"><table class="csv-rawtable"><thead>' + rawHead + '</thead><tbody>' + rawBody + '</tbody></table></div>' +
      '</details>' +

      '<div class="csv-actions">' +
        '<a class="btn" href="source.html">Cancel</a>' +
        '<button class="btn btn--pri" data-import' + (st.mapping.name ? '' : ' disabled') + '>Import ' + st.rows.length.toLocaleString() + ' products →</button>' +
      '</div>';

    root.querySelectorAll('[data-map]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        st.mapping[sel.dataset.map] = sel.value || null;
        // refresh only the reactive bits (keep selects' focus/scroll)
        var cb = root.querySelector('[data-capbox]'); if (cb) cb.innerHTML = capBox(mappedCaps());
        var lp = root.querySelector('[data-livepreview]'); if (lp) lp.innerHTML = livePreview();
        var imp = root.querySelector('[data-import]');
        if (imp) imp.disabled = !st.mapping.name;
        var trg = sel.closest('tr'); if (trg) {
          var f = FIELDS.filter(function (x) { return x.key === sel.dataset.map; })[0];
          trg.classList.toggle('is-missing', !!(f && f.required && !sel.value));
          var fc = trg.querySelector('.fc'); if (fc && f && f.cap) fc.innerHTML = capPill(f.cap, !!sel.value);
        }
      });
    });
    root.querySelector('[data-restart]').addEventListener('click', function () { st.step = 'upload'; st.error = ''; render(); });
    var impBtn = root.querySelector('[data-import]');
    impBtn.addEventListener('click', doImport);
  }

  function capPill(cap, on) {
    var lab = (window.SS_CAP_LABELS && window.SS_CAP_LABELS[cap]) || cap;
    return '<span class="cap ' + (on ? 'on' : 'off') + '">' + esc(lab) + (on ? '' : ' off') + '</span>';
  }

  function capBox(caps) {
    var ON = ['catalog','variants','media','price','stock'];
    var backed = ON.filter(function (c) { return caps[c]; });
    var missing = ['stock','availability','orders'].filter(function (c) { return !caps[c]; });
    var lbl = function (c) { return (window.SS_CAP_LABELS && window.SS_CAP_LABELS[c]) || c; };
    return '<h3>This source will back</h3>' +
      '<div class="capset">' + backed.map(function (c) { return '<span class="cap on">' + esc(lbl(c)) + '</span>'; }).join('') + '</div>' +
      '<h3 class="muted">Not offered from this source</h3>' +
      '<div class="capset">' + missing.map(function (c) { return '<span class="cap off">' + esc(lbl(c)) + '</span>'; }).join('') +
        '<span class="cap off">most rented</span><span class="cap off">date availability</span></div>' +
      '<p class="capnote">Unmapped = hidden, never broken.</p>';
  }

  function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function livePreview() {
    var m = st.mapping;
    if (!m.name) return '<p class="csv-livemuted">Map a <b>Product name</b> to see the preview.</p>';
    var rows = st.rows.slice(0, 3);
    return rows.map(function (r) {
      var name = String(r[m.name] || '').trim() || '(no name)';
      var cat = m.category ? String(r[m.category] || '').trim() : '';
      var priceRaw = m.price ? String(r[m.price] || '').replace(/[^0-9.]/g, '') : '';
      var img = m.image ? String(r[m.image] || '').trim() : '';
      var tags = m.tags ? splitTags(r[m.tags]).slice(0, 4) : [];
      var nvar = m.variantCount ? String(r[m.variantCount] || '').replace(/[^0-9]/g, '') : '';
      var thumb = img
        ? '<span class="lp-thumb" style="background-image:url(' + esc(img.indexOf('assets') === 0 ? img : 'assets/img/' + img) + ')"></span>'
        : '<span class="lp-thumb none">' + (m.image ? 'no path' : 'no image') + '</span>';
      return '<div class="lp-row">' + thumb +
        '<div class="lp-b"><b>' + esc(name) + '</b>' +
          '<span class="lp-meta">' + esc(cat || 'Uncategorised') + (nvar ? ' · ' + esc(nvar) + ' colourways' : '') + '</span>' +
          (tags.length ? '<span class="lp-tags">' + tags.map(function (t) { return '<em>' + esc(t) + '</em>'; }).join('') + '</span>' : '') +
        '</div>' +
        (priceRaw ? '<span class="lp-price">$' + esc(priceRaw) + '</span>' : '') +
      '</div>';
    }).join('');
  }

  function doImport() {
    var products = buildProducts();
    if (!products.length) { st.error = 'No rows had a value in the mapped name column. Check the mapping.'; st.step = 'map'; render(); return; }
    var record = {
      fileName: st.fileName, rowCount: products.length, importedAt: Date.now(),
      mapping: st.mapping, products: products
    };
    S.saveImport(record);
    S.setActive('csv');
    st.imported = record;
    st.step = 'done';
    render();
  }

  function renderDone() {
    var rec = st.imported || S.importData() || {};
    var caps = S.capsFor('csv');
    var lbl = function (c) { return (window.SS_CAP_LABELS && window.SS_CAP_LABELS[c]) || c; };
    var on = ['catalog','variants','media','price','stock'].filter(function (c) { return caps[c]; });
    var off = ['stock','availability','orders'].filter(function (c) { return !caps[c]; });
    root.innerHTML = steps('done') +
      '<div class="csv-done">' +
        '<div class="csv-done-mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h2>Imported — CSV is now your active source</h2>' +
        '<p><b>' + (rec.rowCount || 0).toLocaleString() + ' products</b> from <b>' + esc(rec.fileName || 'your file') + '</b> are live in Simplitory. ' +
        'The Products screen and the storefront now read this catalog — and show only what a CSV can back.</p>' +
        '<div class="csv-done-caps">' +
          '<div><span class="lbl">Backed</span>' + on.map(function (c) { return '<span class="cap on">' + esc(lbl(c)) + '</span>'; }).join('') + '</div>' +
          '<div><span class="lbl">Switched off</span>' + off.map(function (c) { return '<span class="cap off">' + esc(lbl(c)) + '</span>'; }).join('') +
            '<span class="cap off">most rented</span><span class="cap off">date availability</span><span class="cap off">write-back</span></div>' +
        '</div>' +
        '<div class="csv-done-actions">' +
          '<a class="btn btn--pri" href="products.html">See the Products screen →</a>' +
          '<a class="btn" href="shop.html">Open the storefront →</a>' +
          '<a class="btn" href="source.html">Back to Source</a>' +
        '</div>' +
        '<p class="csv-note">Changed your mind? Open <a href="source.html">Source</a> and switch back to Current RMS — every gated feature returns.</p>' +
      '</div>';
  }

  /* Demo / verification deep-links (harmless): open the wizard already
     advanced through the real flow using the sample file.
       csv-setup.html#sample   → jump to Map columns (auto-guessed mapping)
       csv-setup.html#imported → run the full import (lands on the Import step
                                  and makes CSV the active source) */
  var hash = (location.hash || '').toLowerCase();
  if (typeof window.SS_SAMPLE_CSV === 'string' && (hash.indexOf('sample') > -1 || hash.indexOf('import') > -1)) {
    loadText(window.SS_SAMPLE_CSV, 'products-export.csv');
    if (hash.indexOf('import') > -1) doImport();
  } else {
    render();
  }
} )();
