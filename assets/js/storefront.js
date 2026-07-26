/* ============================================================
   STOREFRONT (merchandising) — how the catalog PRESENTS on the site:
   which categories show, which search filters the shop offers, and
   the product pairings surfaced as "pairs with" in FE search.

   Filters are capability-gated (a facet that needs the source, like
   date-availability, hides when the source can't back it). Pairings
   start from natural RMS logic (order co-occurrence — modelled here
   from category affinity + rent frequency) and are override-able.
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-merch]');
  if (!root) return;
  var S = window.SS_SOURCE;
  var PRODUCTS = (window.SS_PRODUCTS || []);
  var RENT = (window.SS_RENTFREQ && window.SS_RENTFREQ.by_slug) || {};

  var TOPCATS = [
    { key:'linens', label:'Linens', groups:['Polyester','Premium Polyester','Runners','Sashes','Napkins','Dupioni','Satin','Lamour Satin','Drapery','Crinkle','Pintuck','Sequin','Spandex','Organza','Rosey','Bengaline','Burlap','Damask','Petal Taffeta','Pinched Taffeta','Satin Stripe','Skirts','Chair Cover','Specialty','Tensil'] },
    { key:'chairs', label:'Chairs', groups:['Chairs'] },
    { key:'tables', label:'Tables', groups:['Tables','Furniture','Bars & Shelving'] },
    { key:'tableware', label:'Tableware', groups:['China','Glassware','Flatware','Chargers','Serving Ware','Serving Pieces','Barware','Catering Equipment','Table Service'] },
    { key:'lighting', label:'Lighting', groups:['Lighting'] },
    { key:'structures', label:'Structures', groups:['Stage','Tent','Dance Floor','Carpet','Infrastructure','Heating and Cooling','Decor'] }
  ];
  var g2cat = {}; TOPCATS.forEach(function (c) { c.groups.forEach(function (g) { g2cat[g] = c.key; }); });
  function catOf(p) { return g2cat[p.group] || null; }
  function rentScore(p) { var r = RENT[p.slug]; return (r && r.orders != null) ? r.orders : (p.listings || 1) / 40; }

  // which categories naturally pair (the "pairs with" affinity)
  var AFFINITY = { linens:['chairs','tableware'], chairs:['tables','linens'], tables:['linens','tableware'],
                   tableware:['linens','tables'], lighting:['structures','linens'], structures:['lighting','tables'] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tile(v, l, a) { return '<div class="wz-tile' + (a ? ' accent' : '') + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  var toastEl;
  function toast(m) { if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,0);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; document.body.appendChild(toastEl); }
    toastEl.textContent = m; toastEl.style.opacity = '1'; clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 2400); }

  // top photographed product per category, ranked by rent
  function topOf(catKey, exclude) {
    return PRODUCTS.filter(function (p) { return catOf(p) === catKey && p.img && p.slug !== exclude; })
                   .sort(function (a, b) { return rentScore(b) - rentScore(a); });
  }

  // ── pairings: heroes + their paired slugs come from the SHARED engine
  // (pairings.js), so what the admin curates here is exactly what the
  // storefront FE surfaces as "Completes the look". ──
  var P = window.SS_PAIRINGS;
  var byslug = {}; PRODUCTS.forEach(function (p) { byslug[p.slug] = p; });
  var HEROES = [];
  ['linens','chairs','tables','tableware','lighting'].forEach(function (ck) {
    var t = (P ? P.topOf(ck) : topOf(ck))[0]; if (t) HEROES.push(t);
  });

  /* capability-gated FE facets */
  function facets() {
    return [
      { key:'style', label:'Style', on:true },
      { key:'colour', label:'Colour', on:true },
      { key:'price', label:'Price', cap:'price' },
      { key:'rented', label:'Most rented', cap:'orders' },
      { key:'date', label:'Date availability', cap2:['stock','availability'] }
    ].map(function (f) {
      var ok = true;
      if (f.cap) ok = S ? !!S.declares(f.cap) : true;
      if (f.cap2) ok = S ? f.cap2.some(function (c) { return S.declares(c); }) : true;
      return { label:f.label, ok:ok, on:f.on && ok };
    });
  }

  function render() {
    var counts = {}; PRODUCTS.forEach(function (p) { var c = catOf(p); if (c) counts[c] = (counts[c] || 0) + 1; });
    var srcName = (S && S.active().name) || 'the source';

    root.innerHTML =
      '<div class="merch-top"><span class="wz-tiles" style="flex:1;margin:0">' +
        tile(TOPCATS.length, 'Customer categories', true) + tile(HEROES.length, 'Curated pairings') +
      '</span><a class="btn btn--pri" href="shop.html">View live storefront →</a></div>' +

      /* Categories */
      '<div class="wz-card"><h2 class="wz-h">Categories</h2>' +
        '<div class="wz-scroll"><table class="wz-map"><thead><tr><th>Category</th><th>Products</th><th>Featured</th><th>Visible</th></tr></thead><tbody>' +
        TOPCATS.map(function (c, i) {
          return '<tr><td><b>' + esc(c.label) + '</b></td><td>' + (counts[c.key] || 0) + '</td>' +
            '<td><label class="wz-tog"><input type="checkbox" ' + (i < 3 ? 'checked' : '') + '><span class="tk"></span></label></td>' +
            '<td><label class="wz-tog"><input type="checkbox" checked><span class="tk"></span></label></td></tr>';
        }).join('') + '</tbody></table></div></div>' +

      /* Filters */
      '<div class="wz-card"><h2 class="wz-h">Search filters <span style="font-weight:500;color:var(--sy-muted);font-size:.72rem">· what the shop offers</span></h2>' +
        '<div class="set-rows">' + facets().map(function (f) {
          return '<div class="set-row"><span>' + esc(f.label) + (f.ok ? '' : ' <em style="font-style:normal;color:var(--sy-muted);font-size:.72rem">— not available from ' + esc(srcName) + '</em>') + '</span>' +
            '<label class="wz-tog"><input type="checkbox"' + (f.on ? ' checked' : '') + (f.ok ? '' : ' disabled') + '><span class="tk"></span></label></div>';
        }).join('') + '</div></div>' +

      /* Pairings */
      '<div class="wz-card"><h2 class="wz-h">Pairings <span style="font-weight:500;color:var(--sy-muted);font-size:.72rem">· “pairs with” in storefront search</span></h2>' +
        '<div class="merch-pairs" data-pairs></div>' +
        '<p class="prow-note">Suggested from <b>' + esc(srcName) + '</b> order history (what rents together). Remove or add to override.</p>' +
      '</div>';

    renderPairs();
    root.querySelector('[href="shop.html"]');
  }

  function pairSlugs(h) { return P ? P.listFor(h.slug, 4) : []; }

  function renderPairs() {
    var box = root.querySelector('[data-pairs]');
    box.innerHTML = HEROES.map(function (h) {
      var chips = pairSlugs(h).map(function (s) {
        var p = byslug[s]; if (!p) return '';
        return '<span class="pair-chip">' + esc(p.base) + '<button data-rm="' + esc(h.slug) + '|' + esc(s) + '" aria-label="Remove">×</button></span>';
      }).join('');
      var thumb = h.img ? '<span class="pair-thumb" style="background-image:url(assets/img/' + esc(h.img) + ')"></span>' : '<span class="pair-thumb"></span>';
      return '<div class="pair-row">' + thumb +
        '<div class="pair-b"><b>' + esc(h.base) + '</b><span class="pmeta">pairs with</span></div>' +
        '<div class="pair-chips">' + chips + '<button class="pair-add" data-add="' + esc(h.slug) + '">+ Add</button></div></div>';
    }).join('');
    box.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function () { var x = b.dataset.rm.split('|'); if (P) P.remove(x[0], x[1]); renderPairs(); });
    });
    box.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var h = byslug[b.dataset.add], added = P ? P.add(h.slug) : null;
        renderPairs();
        toast(added ? ('Paired “' + added.base + '” with “' + h.base + '”.') : 'No more natural matches — all paired.');
      });
    });
  }

  render();
} )();
