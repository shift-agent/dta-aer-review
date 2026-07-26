/* ============================================================
   SETTINGS — Source + Sync folded into one card-driven area, plus
   import/export and debugging. Connection lives here now (it's a
   setting, not a destination); the sidebar Data section is just
   "Settings". Capability-aware throughout.
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-settings]');
  if (!root) return;
  var S = window.SS_SOURCE, LBL = window.SS_CAP_LABELS || {};
  var CAP_ORDER = ['catalog', 'variants', 'media', 'price', 'stock', 'availability', 'orders', 'syncScheduled', 'writeTags'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,0);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 2400);
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCSV() {
    var cat = S.catalog();
    var rows = [['Name', 'Category', 'Colourways', 'Price', 'Tags', 'Image']];
    cat.forEach(function (p) { rows.push([p.base, p.group, p.nvar || 1, p.price != null ? p.price : '', (p.tags || []).join('; '), p.img || '']); });
    download('simplitory-catalog.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n'), 'text/csv');
    toast('Exported ' + cat.length.toLocaleString() + ' products to CSV.');
  }
  function exportJSON() {
    download('simplitory-catalog.json', JSON.stringify(S.catalog(), null, 2), 'application/json');
    toast('Exported catalog to JSON.');
  }

  function capChips(caps) {
    return CAP_ORDER.filter(function (n) { return n in caps; }).map(function (n) {
      var v = caps[n], cls = window.SS_capClass ? window.SS_capClass(v) : (v === 1 ? 'cap on' : (v === 'pro' ? 'cap pro' : 'cap off'));
      return '<span class="' + cls + '">' + esc(LBL[n] || n) + (v === 'pro' ? '&nbsp;· Pro' : '') + '</span>';
    }).join('');
  }

  function render() {
    var id = S.activeId(), c = S.active(), caps = S.capsFor(id);
    var pro = window.SIMPLITORY_tierIsPro ? window.SIMPLITORY_tierIsPro() : false;
    var proExp = function (inner) { return pro ? inner : '<span class="q-pill q-quoted">Pro</span>'; };
    var scheduled = !!S.declares('syncScheduled');
    var hasImport = S.hasImport();
    var count = S.catalog().length;
    var reconfHref = id === 'csv' ? 'csv-setup.html' : (id === 'current-rms' ? 'wizard.html' : 'source.html');
    var cad = [['manual', 'Manual'], ['nightly', 'Nightly'], ['hourly', 'Hourly'], ['webhook', 'On change']];

    root.innerHTML = '<div class="set-grid">' +

      /* Source */
      '<div class="set-card">' +
        '<div class="set-card__h"><h2>Source</h2><span class="set-dot' + (c.connected ? '' : ' off') + '"></span></div>' +
        '<p class="set-lead"><b>' + esc(c.name) + '</b> · ' + esc(c.detail) + '</p>' +
        '<div class="cxn__caps">' + capChips(caps) + '</div>' +
        '<div class="set-act"><a class="btn btn--pri" href="source.html">Change source</a>' +
          '<a class="btn" href="' + reconfHref + '">Reconfigure</a></div>' +
      '</div>' +

      /* Sync */
      '<div class="set-card">' +
        '<div class="set-card__h"><h2>Sync</h2><span class="set-mut">Last: 2h ago</span></div>' +
        (scheduled
          ? '<p class="set-lead">Re-pulls automatically and skips anything you\'ve overridden.</p>' +
            '<div class="wz-cadence">' + cad.map(function (x) { return '<button class="opt" data-cad="' + x[0] + '" aria-pressed="' + (x[0] === 'nightly') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
            '<div class="set-act"><button class="btn btn--pri" data-sync>Sync now</button></div>'
          : '<p class="set-lead">' + esc(c.name) + ' has no scheduled sync — re-upload the file to refresh.</p>' +
            '<div class="set-act"><a class="btn btn--pri" href="csv-setup.html">Re-upload to refresh</a></div>') +
      '</div>' +

      /* Import / Export */
      '<div class="set-card">' +
        '<div class="set-card__h"><h2>Import &amp; export</h2></div>' +
        '<p class="set-lead">' + count.toLocaleString() + ' products. Import runs through a connected source; direct in/out is Pro.</p>' +
        '<div class="set-rows">' +
          '<div class="set-row"><span>Bring in a catalog</span><span><a class="btn btn--sm" href="source.html">Connect</a> <a class="btn btn--sm" href="csv-setup.html">CSV</a></span></div>' +
          '<div class="set-row"><span>Export catalog</span><span>' + proExp('<button class="btn btn--sm" data-xcsv>CSV</button> <button class="btn btn--sm" data-xjson>JSON</button>') + '</span></div>' +
          '<div class="set-row"><span>Export shoot list</span><span>' + proExp('<button class="btn btn--sm" data-xshoot>CSV</button>') + '</span></div>' +
        '</div>' +
      '</div>' +

      /* Debug */
      '<div class="set-card">' +
        '<div class="set-card__h"><h2>Diagnostics</h2></div>' +
        '<div class="set-rows">' +
          '<div class="set-row"><span>Active source</span><b>' + esc(id) + '</b></div>' +
          '<div class="set-row"><span>Products loaded</span><b>' + count.toLocaleString() + '</b></div>' +
          '<div class="set-row"><span>Test connection</span><button class="btn btn--sm" data-test>Run</button></div>' +
          '<div class="set-row"><span>Clear cache</span><button class="btn btn--sm" data-cache>Clear</button></div>' +
          (hasImport ? '<div class="set-row"><span>CSV import</span><button class="btn btn--sm" data-reset>Reset to Current RMS</button></div>' : '') +
        '</div>' +
      '</div>' +

      /* Exit strategy — the "trap door" (keep the site, drop the management) */
      '<div class="set-card">' +
        '<div class="set-card__h"><h2>Exit strategy</h2>' +
          (id === 'snapshot' ? '<span class="set-dot off"></span>' : '') + '</div>' +
        (id === 'snapshot'
          ? '<p class="set-lead"><b>Detached.</b> The storefront is running on the last published <b>WordPress snapshot</b> — browsing, categories, images and pairings still work; live sync, stock, availability, most-rented and write-back are paused.</p>' +
            '<div class="set-act"><button class="btn btn--pri" data-reconnect>Reconnect a source</button>' +
              '<a class="btn" href="shop.html" target="_blank">View the still-working storefront →</a></div>'
          : '<p class="set-lead">Your catalog is materialized into native WordPress. Detach and the site keeps working on the last published snapshot — you only lose the management. This is reversible.</p>' +
            '<div class="set-act"><button class="btn" data-eject>Detach / eject to snapshot</button>' +
              '<span class="set-mut">Products &amp; storefront degrade live, via the capability model.</span></div>') +
      '</div>' +

    '</div>';

    // wiring
    root.querySelectorAll('[data-cad]').forEach(function (o) {
      o.addEventListener('click', function () { root.querySelectorAll('[data-cad]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === o)); }); });
    });
    var sn = root.querySelector('[data-sync]');
    if (sn) sn.addEventListener('click', function () { var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span> Syncing…'; setTimeout(function () { b.disabled = false; b.textContent = '✓ Synced just now'; }, 900); });
    var xc = root.querySelector('[data-xcsv]'); if (xc) xc.addEventListener('click', exportCSV);
    var xj = root.querySelector('[data-xjson]'); if (xj) xj.addEventListener('click', exportJSON);
    var xs = root.querySelector('[data-xshoot]'); if (xs) xs.addEventListener('click', function () {
      var miss = S.catalog().filter(function (p) { return !p.img; });
      download('shoot-list.csv', ['Name,Category'].concat(miss.map(function (p) { return csvCell(p.base) + ',' + csvCell(p.group); })).join('\n'), 'text/csv');
      toast(miss.length.toLocaleString() + ' products with no photo exported.');
    });
    root.querySelector('[data-test]').addEventListener('click', function () { var b = this; b.disabled = true; b.textContent = '…'; setTimeout(function () { b.disabled = false; b.textContent = 'Run'; toast('Connection OK — ' + esc(c.name) + ' responded.'); }, 700); });
    root.querySelector('[data-cache]').addEventListener('click', function () { toast('Cache cleared.'); });
    var rs = root.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', function () { S.clearImport(); S.setActive('current-rms'); toast('CSV import removed — active source is Current RMS.'); setTimeout(function () { location.reload(); }, 700); });
    var ej = root.querySelector('[data-eject]');
    if (ej) ej.addEventListener('click', function () { S.setActive('snapshot'); toast('Detached — the site now runs on the WordPress snapshot. Live features paused.'); setTimeout(function () { location.reload(); }, 800); });
    var rc = root.querySelector('[data-reconnect]');
    if (rc) rc.addEventListener('click', function () { S.setActive('current-rms'); toast('Reconnected to Current RMS — every capability returns.'); setTimeout(function () { location.reload(); }, 800); });
  }

  window.SIMPLITORY_onTier = function () { render(); };
  render();
} )();
