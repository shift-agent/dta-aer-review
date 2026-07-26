/* ============================================================
   CURRENT RMS SETUP WIZARD — the per-connector setup flow for the API
   source, matched to the CSV wizard's shell (upload→map→import).

   Five simple steps, interaction over prose:
     1 Connect   — token → test → live counts
     2 Organize  — map each RMS group → category + "group sizes" toggle
     3 Brand     — DTA / AER chips per product (writes brand tags back)
     4 Media     — photo coverage + shoot priorities (links to full console)
     5 Publish   — summary + sync cadence → publish

   Capabilities are shown on every step (Current RMS lights up all of
   them), so the flow reads as "this is what this connection can back."
   Real data: SS_GROUPS (55 groups) + SS_PRODUCTS.
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-rms-wizard]');
  if (!root) return;
  var S = window.SS_SOURCE, LBL = window.SS_CAP_LABELS || {};
  var GROUPS = (window.SS_GROUPS || []).map(function (g) { return { id: g.id, name: g.name, category: g.category, fabric: !!g.fabric }; });
  var PRODUCTS = (window.SS_PRODUCTS || []).filter(function (p) { return p.variants && p.variants.length; });
  var FLAT = PRODUCTS.reduce(function (s, p) { return s + (p.listings || 1); }, 0);
  var BRANDABLE = PRODUCTS.slice(0, 24);
  var CATS = ['Linens', 'Chairs', 'Tables', 'Tableware', 'Lighting', 'Structures', 'Uncategorised'];

  var st = { step: 'connect', connected: false, cadence: 'nightly',
             brands: BRANDABLE.map(function () { return { dta: true, aer: false }; }) };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Photo coverage — read from the real catalog (SS_CATALOG, the same data the
  // full media console uses) so the Media step and Publish agree. Falls back to a
  // modeled split if the catalog isn't loaded.
  var COV = ( function () {
    var C = window.SS_CATALOG;
    if (C && C.length) {
      var have = C.filter(function (p) { return p.img && !p.lowres; }).length;
      var low = C.filter(function (p) { return p.img && p.lowres; }).length;
      var miss = C.filter(function (p) { return !p.img; }).length;
      // weakest categories first — where a shoot unblocks the most product
      var by = {};
      C.forEach(function (p) { var g = by[p.group] || (by[p.group] = { n: 0, ok: 0 }); g.n++; if (p.img) g.ok++; });
      var cats = Object.keys(by).map(function (g) { return { g: g, n: by[g].n, ok: by[g].ok, pct: Math.round(by[g].ok / by[g].n * 100) }; })
                       .sort(function (a, b) { return (a.pct - b.pct) || (b.n - a.n); });
      return { total: C.length, have: have, low: low, miss: miss, pct: Math.round(have / C.length * 100), cats: cats };
    }
    var t = FLAT, h = 508;
    return { total: t, have: h, low: 0, miss: t - h, pct: Math.round(h / t * 100), cats: [] };
  } )();

  var STEPS = [['connect', '1', 'Connect'], ['organize', '2', 'Organize'], ['brand', '3', 'Brand'], ['media', '4', 'Media'], ['publish', '5', 'Publish']];
  function stepper() {
    var order = STEPS.map(function (s) { return s[0]; });
    var at = order.indexOf(st.step);
    return '<ol class="csv-steps">' + STEPS.map(function (s, i) {
      var cls = s[0] === st.step ? 'on' : (i < at ? 'done' : '');
      return '<li class="' + cls + '"><span class="n">' + s[1] + '</span>' + s[2] + '</li>';
    }).join('') + '</ol>';
  }

  // capability strip — Current RMS backs everything (write tags = Pro)
  var CAP_ORDER = ['catalog', 'variants', 'media', 'stock', 'availability', 'orders', 'syncScheduled', 'writeTags'];
  function capStrip() {
    var caps = S ? S.capsFor('current-rms') : {};
    var chips = CAP_ORDER.map(function (n) {
      var v = caps[n], cls = v === 1 ? 'cap on' : (v === 'pro' ? 'cap pro' : 'cap off');
      return '<span class="' + cls + '">' + esc(LBL[n] || n) + (v === 'pro' ? '&nbsp;· Pro' : '') + '</span>';
    }).join('');
    return '<div class="wz-src"><span class="dot"></span> <b>Current RMS</b> · decortoadore' +
      '<span class="caps">' + chips + '</span></div>';
  }

  function tile(v, l, accent) { return '<div class="wz-tile' + (accent ? ' accent' : '') + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  function render() {
    if (st.step === 'connect') return renderConnect();
    if (st.step === 'organize') return renderOrganize();
    if (st.step === 'brand') return renderBrand();
    if (st.step === 'media') return renderMedia();
    if (st.step === 'publish') return renderPublish();
  }

  /* ── 1 · Connect ── */
  function renderConnect() {
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-card">' +
        '<h2 class="wz-h">Connect</h2>' +
        '<label class="wz-field"><span>Account</span><input type="text" id="wz-sub" value="decortoadore"></label>' +
        '<label class="wz-field"><span>API token</span><input type="password" id="wz-tok" value="••••••••••••••••"></label>' +
        '<button class="btn btn--pri" id="wz-test">Test connection</button>' +
        '<div class="wz-result" id="wz-res"></div>' +
      '</div>' +
      '<div class="csv-actions"><a class="btn" href="source.html">Cancel</a>' +
        '<button class="btn btn--pri" data-next ' + (st.connected ? '' : 'disabled') + '>Continue →</button></div>';

    root.querySelector('#wz-test').addEventListener('click', function () {
      var b = this, res = root.querySelector('#wz-res');
      b.disabled = true; b.innerHTML = '<span class="spin"></span> Testing…';
      setTimeout(function () {
        b.disabled = false; b.textContent = 'Test connection';
        st.connected = true;
        res.classList.add('on');
        res.innerHTML = '<b>Connected.</b> ' + FLAT.toLocaleString() + ' listings · ' + GROUPS.length + ' groups.';
        var nx = root.querySelector('[data-next]'); if (nx) nx.removeAttribute('disabled');
      }, 800);
    });
    wireNav();
  }

  /* ── 2 · Organize (map groups → category + group sizes) ── */
  function renderOrganize() {
    var buildN = GROUPS.filter(function (g) { return g.fabric; }).length;
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-tiles">' +
        tile(GROUPS.length, 'RMS groups', true) +
        tile('<span data-buildn>' + buildN + '</span>', 'Group sizes into products') +
        tile(FLAT.toLocaleString() + ' → ' + PRODUCTS.length.toLocaleString(), 'Listings → products') +
      '</div>' +
      '<div class="wz-card"><h2 class="wz-h">Map groups to categories</h2>' +
        '<div class="wz-scroll"><table class="wz-map"><thead><tr><th>RMS group</th><th>Category</th><th>Group sizes</th></tr></thead><tbody>' +
        GROUPS.map(function (g, i) {
          var opts = CATS.map(function (c) { return '<option' + (c === g.category ? ' selected' : '') + '>' + c + '</option>'; }).join('');
          return '<tr><td><b>' + esc(g.name) + '</b></td>' +
            '<td><select data-cat="' + i + '">' + opts + '</select></td>' +
            '<td><label class="wz-tog"><input type="checkbox" data-fab="' + i + '"' + (g.fabric ? ' checked' : '') + '><span class="tk"></span></label></td></tr>';
        }).join('') +
        '</tbody></table></div></div>' +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button><button class="btn btn--pri" data-next>Continue →</button></div>';

    root.querySelectorAll('[data-cat]').forEach(function (sel) { sel.addEventListener('change', function () { GROUPS[+sel.dataset.cat].category = sel.value; }); });
    root.querySelectorAll('[data-fab]').forEach(function (c) { c.addEventListener('change', function () {
      GROUPS[+c.dataset.fab].fabric = c.checked;
      var n = root.querySelector('[data-buildn]'); if (n) n.textContent = GROUPS.filter(function (g) { return g.fabric; }).length;
    }); });
    wireNav();
  }

  /* ── 3 · Brand ── */
  function renderBrand() {
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-tiles">' +
        tile('<span data-dta>0</span>', 'Decor To Adore', true) +
        tile('<span data-aer>0</span>', 'Alabama Event Rentals') +
        tile('<span data-both>0</span>', 'Both brands') +
      '</div>' +
      '<div class="wz-card"><h2 class="wz-h">Assign brands <span style="font-weight:500;color:var(--sy-muted);font-size:.72rem">· tags written back to Current RMS (Pro)</span></h2>' +
        '<div class="wz-scroll"><table class="wz-blist"><tbody>' +
        BRANDABLE.map(function (p, i) {
          return '<tr><td><b>' + esc(p.base) + '</b><div class="pmeta">' + esc(p.group) + ' · ' + (p.listings || 1) + ' listings</div></td>' +
            '<td><button class="bchip" data-b="dta" data-p="' + i + '" data-on="' + st.brands[i].dta + '">DTA</button>' +
                '<button class="bchip" data-b="aer" data-p="' + i + '" data-on="' + st.brands[i].aer + '">AER</button></td>' +
            '<td><code data-tags="' + i + '"></code></td></tr>';
        }).join('') +
        '</tbody></table></div></div>' +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button><button class="btn btn--pri" data-next>Continue →</button></div>';

    root.querySelectorAll('.bchip').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.p; st.brands[i][b.dataset.b] = !st.brands[i][b.dataset.b];
        b.dataset.on = String(st.brands[i][b.dataset.b]); recount();
      });
    });
    recount();
    wireNav();
  }
  function recount() {
    var dta = 0, aer = 0, both = 0;
    st.brands.forEach(function (v, i) {
      if (v.dta) dta++; if (v.aer) aer++; if (v.dta && v.aer) both++;
      var tags = [v.dta && 'brand:dta', v.aer && 'brand:aer'].filter(Boolean).join(' ') || '—';
      var el = root.querySelector('[data-tags="' + i + '"]'); if (el) el.textContent = tags;
    });
    var q = function (s) { return root.querySelector(s); };
    if (q('[data-dta]')) q('[data-dta]').textContent = dta;
    if (q('[data-aer]')) q('[data-aer]').textContent = aer;
    if (q('[data-both]')) q('[data-both]').textContent = both;
  }

  /* ── 4 · Media (photo coverage — the launch constraint) ── */
  function renderMedia() {
    // Current RMS backs media, so this step shows. A source without `media`
    // would skip it (see wireNav's skip); the storefront hides images anyway.
    var haveP = COV.pct;
    var barMiss = COV.total - COV.have - COV.low;
    var shoot = COV.cats.filter(function (c) { return c.n >= 8; }).slice(0, 4);
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-card"><h2 class="wz-h">Photography</h2>' +
        '<p class="hsub" style="margin:.1rem 0 .9rem">Photos live in the WordPress media library, so the site keeps them even if you disconnect the source. ' +
        'You can finish setup now and shoot the gaps later — nothing here blocks publishing.</p>' +
        '<div class="wz-cov">' +
          '<div class="have" style="flex:' + Math.max(COV.have, 1) + '"><span>' + haveP + '% have a photo</span></div>' +
          (COV.low ? '<div class="miss" style="flex:' + COV.low + '"><span>' + COV.low + ' low-res</span></div>' : '') +
          '<div class="miss" style="flex:' + Math.max(barMiss, 1) + '"><span>' + barMiss.toLocaleString() + ' need a photo</span></div>' +
        '</div>' +
        '<div class="wz-tiles" style="margin-top:14px">' +
          tile(haveP + '%', 'Have a usable photo', true) +
          tile(COV.miss.toLocaleString(), 'Still need one') +
        '</div>' +
      '</div>' +
      (shoot.length
        ? '<div class="wz-card"><h2 class="wz-h">Shoot these first <span style="font-weight:500;color:var(--sy-muted);font-size:.72rem">· weakest coverage unblocks the most product</span></h2>' +
          '<div class="wz-sum">' + shoot.map(function (c) {
            return '<div class="row"><span>' + esc(c.g) + '</span><b>' + (c.n - c.ok).toLocaleString() + ' of ' + c.n.toLocaleString() + ' need a photo</b></div>';
          }).join('') + '</div>' +
          '<a class="btn btn--sm" href="photos.html" style="margin-top:12px">Open the full media console →</a></div>'
        : '') +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button><button class="btn btn--pri" data-next>Continue →</button></div>';
    wireNav();
  }

  /* ── 5 · Publish ── */
  function renderPublish() {
    var have = COV.have, total = COV.total, miss = COV.miss, pct = COV.pct;
    var branded = st.brands.filter(function (v) { return v.dta || v.aer; }).length;
    var cad = [['manual', 'Manual'], ['nightly', 'Nightly'], ['hourly', 'Hourly'], ['webhook', 'On change']];
    root.innerHTML = stepper() + capStrip() +
      '<div class="wz-card"><h2 class="wz-h">Review</h2>' +
        '<div class="wz-sum">' +
          '<div class="row"><span>Groups mapped</span><b>' + GROUPS.length + '</b></div>' +
          '<div class="row"><span>Products (from ' + FLAT.toLocaleString() + ' listings)</span><b>' + PRODUCTS.length.toLocaleString() + '</b></div>' +
          '<div class="row"><span>Brand-tagged</span><b>' + branded + ' of ' + BRANDABLE.length + '</b></div>' +
          '<div class="row"><span>With photography</span><b>' + pct + '%</b></div>' +
        '</div>' +
        '<div style="margin-top:14px"><div class="wz-cov"><div class="have" style="flex:' + have + '"><span>' + have + '</span></div>' +
          '<div class="miss" style="flex:' + miss + '"><span>' + miss.toLocaleString() + ' need a photo</span></div></div>' +
          '<a class="btn btn--sm" href="photos.html">Open Media →</a></div>' +
      '</div>' +
      '<div class="wz-card"><h2 class="wz-h">Keep in sync</h2>' +
        '<div class="wz-cadence">' + cad.map(function (c) {
          return '<button class="opt" data-cad="' + c[0] + '" aria-pressed="' + (st.cadence === c[0]) + '">' + c[1] + '</button>';
        }).join('') + '</div></div>' +
      '<div class="csv-actions"><button class="btn" data-prev>← Back</button>' +
        '<button class="btn btn--pri" id="wz-pub">Publish to storefront</button></div>';

    root.querySelectorAll('[data-cad]').forEach(function (o) {
      o.addEventListener('click', function () {
        st.cadence = o.dataset.cad;
        root.querySelectorAll('[data-cad]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === o)); });
      });
    });
    root.querySelector('#wz-pub').addEventListener('click', function () {
      var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span> Publishing…';
      setTimeout(function () { renderDone(branded); }, 1000);
    });
    wireNav();
  }

  function renderDone(branded) {
    root.innerHTML = stepper() +
      '<div class="csv-done"><div class="csv-done-mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h2>Published — Current RMS is live</h2>' +
        '<p><b>' + PRODUCTS.length.toLocaleString() + ' products</b> published, ' + branded + ' brand-tagged, syncing <b>' + st.cadence + '</b>. ' +
        'Every capability is available because Current RMS backs them all.</p>' +
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

  // Demo / verification deep-link: wizard.html#organize jumps to a step
  // (connect stays gated — mark connected so later steps render).
  var hstep = (location.hash || '').replace('#', '').toLowerCase();
  if (['organize', 'brand', 'media', 'publish'].indexOf(hstep) > -1) { st.connected = true; st.step = hstep; }
  render();
} )();
