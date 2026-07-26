/* ============================================================
   GOOGLE WORKSPACE SETUP WIZARD — one Google sign-in, then point it at
   a Sheet (the catalog) and a Drive folder (the images). Same shell as
   the CSV / Current RMS wizards.

     1 Connect  — sign in with Google
     2 Choose   — pick the catalog Sheet + the images folder
     3 Import    — bring it in → Google Workspace becomes the active source

   Capabilities (media from Drive, stock from a sheet column, scheduled
   sync, Pro write-back to cells) are the union of Sheets + Drive.
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-google-wizard]');
  if (!root) return;
  var S = window.SS_SOURCE, LBL = window.SS_CAP_LABELS || {};

  // columns "detected" in the sheet — reuse the sample export's header
  var COLS = (function () {
    var raw = window.SS_SAMPLE_CSV; if (typeof raw !== 'string') return ['Item Name', 'Category', 'Image', 'Tags'];
    return (raw.split(/\r?\n/)[0] || '').split(',').map(function (h) { return h.trim(); }).filter(Boolean);
  })();
  var SHEETS = ['DTA Catalog 2026', 'Inventory Master', 'Products (Sheet1)'];
  var FOLDERS = ['Product Photos', 'Website Images', 'Shared/Catalog'];

  var st = { step: 'connect', signedIn: false, sheet: SHEETS[0], folder: FOLDERS[0] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var STEPS = [['connect', '1', 'Connect'], ['choose', '2', 'Choose'], ['import', '3', 'Import']];
  function stepper() {
    var order = STEPS.map(function (s) { return s[0]; }), at = order.indexOf(st.step);
    return '<ol class="csv-steps">' + STEPS.map(function (s, i) {
      return '<li class="' + (s[0] === st.step ? 'on' : (i < at ? 'done' : '')) + '"><span class="n">' + s[1] + '</span>' + s[2] + '</li>';
    }).join('') + '</ol>';
  }
  var CAP_ORDER = ['catalog', 'variants', 'media', 'price', 'stock', 'availability', 'orders', 'syncScheduled', 'writeTags', 'writeCatalog'];
  function capStrip() {
    var caps = S ? S.capsFor('google') : {};
    var chips = CAP_ORDER.filter(function (n) { return n in caps; }).map(function (n) {
      var v = caps[n], cls = window.SS_capClass ? window.SS_capClass(v) : (v === 1 ? 'cap on' : (v === 'pro' ? 'cap pro' : 'cap off'));
      return '<span class="' + cls + '">' + esc(LBL[n] || n) + (v === 'pro' ? '&nbsp;· Pro' : '') + '</span>';
    }).join('');
    return '<div class="wz-src"><span class="dot"></span> <b>Google Workspace</b> · Sheets + Drive<span class="caps">' + chips + '</span></div>';
  }
  function tile(v, l, a) { return '<div class="wz-tile' + (a ? ' accent' : '') + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  function render() {
    if (st.step === 'connect') return renderConnect();
    if (st.step === 'choose') return renderChoose();
    if (st.step === 'import') return renderImport();
  }

  function renderConnect() {
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-card"><h2 class="wz-h">Connect Google</h2>' +
        '<p class="hsub" style="margin:0 0 14px">One sign-in covers both Sheets and Drive — no tokens to copy.</p>' +
        '<button class="btn gbtn" id="g-signin"><span class="gmk">G</span> Sign in with Google</button>' +
        '<div class="wz-result" id="g-res"></div>' +
      '</div>' +
      '<div class="csv-actions"><a class="btn" href="source.html">Cancel</a>' +
        '<button class="btn btn--pri" data-next ' + (st.signedIn ? '' : 'disabled') + '>Continue →</button></div>';
    root.querySelector('#g-signin').addEventListener('click', function () {
      var b = this, r = root.querySelector('#g-res');
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Signing in…';
      setTimeout(function () {
        st.signedIn = true;
        b.innerHTML = '<span class="gmk">G</span> Signed in';
        r.classList.add('on'); r.innerHTML = '<b>Connected</b> as glenn@redshiftconsulting.co · Sheets + Drive access granted.';
        var nx = root.querySelector('[data-next]'); if (nx) nx.removeAttribute('disabled');
      }, 800);
    });
    wireNav();
  }

  function renderChoose() {
    var sheetOpts = SHEETS.map(function (s) { return '<option' + (s === st.sheet ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
    var folderOpts = FOLDERS.map(function (f) { return '<option' + (f === st.folder ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('');
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-card"><h2 class="wz-h">Catalog sheet</h2>' +
        '<label class="wz-field"><span>Google Sheet</span><select id="g-sheet">' + sheetOpts + '</select></label>' +
        '<div class="g-cols"><span class="wizlbl">Columns detected</span><div class="chips">' +
          COLS.map(function (c) { return '<span class="fchip on">' + esc(c) + '</span>'; }).join('') + '</div></div>' +
        '<p class="csv-note" style="margin-top:8px">Auto-mapped by header — adjust on the next sync if needed.</p>' +
      '</div>' +
      '<div class="wz-card"><h2 class="wz-h">Images folder</h2>' +
        '<label class="wz-field"><span>Drive folder</span><select id="g-folder">' + folderOpts + '</select></label>' +
        '<p class="csv-note" style="margin:0">Files are matched to products by name and re-hosted in WordPress.</p>' +
      '</div>' +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button><button class="btn btn--pri" data-next>Continue →</button></div>';
    root.querySelector('#g-sheet').addEventListener('change', function () { st.sheet = this.value; });
    root.querySelector('#g-folder').addEventListener('change', function () { st.folder = this.value; });
    wireNav();
  }

  function renderImport() {
    var n = (window.SS_PRODUCTS || []).length || 1174;
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-tiles">' + tile(n.toLocaleString(), 'Rows in “' + esc(st.sheet) + '”', true) + tile('Drive', esc(st.folder)) + '</div>' +
      '<div class="wz-card"><h2 class="wz-h">Ready to import</h2>' +
        '<div class="wz-sum">' +
          '<div class="row"><span>Catalog sheet</span><b>' + esc(st.sheet) + '</b></div>' +
          '<div class="row"><span>Images folder</span><b>' + esc(st.folder) + '</b></div>' +
          '<div class="row"><span>Sync</span><b>Nightly (Google is live)</b></div>' +
        '</div></div>' +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button>' +
        '<button class="btn btn--pri" id="g-import">Import ' + n.toLocaleString() + ' products →</button></div>';
    root.querySelector('#g-import').addEventListener('click', function () {
      var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span> Importing…';
      setTimeout(function () { if (S) S.setActive('google'); renderDone(n); }, 1000);
    });
    wireNav();
  }

  function renderDone(n) {
    root.innerHTML = stepper() +
      '<div class="csv-done"><div class="csv-done-mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h2>Imported — Google Workspace is now your active source</h2>' +
        '<p><b>' + n.toLocaleString() + ' products</b> from “' + esc(st.sheet) + '” with images from <b>' + esc(st.folder) + '</b>. ' +
        'It syncs nightly. Because a Sheet has no order history, “most rented” isn\'t offered — but images, stock and scheduled sync are.</p>' +
        '<div class="csv-done-actions">' +
          '<a class="btn btn--pri" href="products.html">Open Products →</a>' +
          '<a class="btn" href="shop.html">Open the storefront →</a>' +
          '<a class="btn" href="source.html">Back to Source</a>' +
        '</div></div>';
  }

  function wireNav() {
    var order = STEPS.map(function (s) { return s[0]; }), at = order.indexOf(st.step);
    var nx = root.querySelector('[data-next]'); if (nx) nx.addEventListener('click', function () { st.step = order[Math.min(order.length - 1, at + 1)]; render(); window.scrollTo(0, 0); });
    var pv = root.querySelector('[data-prev]'); if (pv) pv.addEventListener('click', function () { st.step = order[Math.max(0, at - 1)]; render(); window.scrollTo(0, 0); });
  }

  // demo deep-link: #choose / #import
  var h = (location.hash || '').replace('#', '').toLowerCase();
  if (['choose', 'import'].indexOf(h) > -1) { st.signedIn = true; st.step = h; }
  render();
} )();
