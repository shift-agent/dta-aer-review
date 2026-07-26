/* ============================================================
   PRODUCTS — the master screen (the spine the wizard never had).

   Source-agnostic product-information view that ADAPTS to the active
   connector (SS_SOURCE). It reads SS_SOURCE.catalog() — the Current RMS
   pull, or the imported CSV rows when a CSV is the active source — and
   gates its columns and actions on what that source can back:

     • Stock ("Owned") column      — only when the source has stock.
     • Price column                — only when the source has price.
     • Write-back (Pro) actions    — only when the source can write back.
     • Advanced image (Pro) action — only when the source has media.

   Import a CSV that maps name + category + price + image + tags and you
   get exactly those: a price column appears, the stock column and the
   write-back actions disappear — because a CSV can't back them.

   Each row still splits SOURCE-OWNED fields (read-only, "from <source>")
   from WEB fields editable in Simplitory (category, brand, image, publish).
   Tier comes from simplitory.js (SIMPLITORY_tierIsPro); the screen
   re-renders on toggle via SIMPLITORY_onTier.
   ============================================================ */
( function () {
  'use strict';
  var SRC = window.SS_SOURCE;
  var PRODUCTS = (SRC ? SRC.catalog() : (window.SS_PRODUCTS || [])).slice();

  // Category collapse (same 6 key categories as the storefront)
  var CATS = [
    ['Linens', ['Polyester','Premium Polyester','Runners','Sashes','Napkins','Dupioni','Satin','Lamour Satin','Drapery','Crinkle','Pintuck','Sequin','Spandex','Organza','Rosey','Bengaline','Burlap','Damask','Petal Taffeta','Pinched Taffeta','Satin Stripe','Skirts','Chair Cover','Specialty','Tensil']],
    ['Chairs', ['Chairs']],
    ['Tables', ['Tables','Furniture','Bars & Shelving']],
    ['Tableware', ['China','Glassware','Flatware','Chargers','Serving Ware','Serving Pieces','Barware','Catering Equipment','Table Service']],
    ['Lighting', ['Lighting']],
    ['Structures', ['Stage','Tent','Dance Floor','Carpet','Infrastructure','Heating and Cooling','Decor']],
  ];
  var g2cat = {};
  CATS.forEach(function (c) { c[1].forEach(function (g) { g2cat[g] = c[0]; }); });
  var AVAIL = (window.SS_AVAIL && window.SS_AVAIL.by_slug) || {};

  // capability flags read from the active source (all true for Current RMS)
  var HAS_STOCK = SRC ? SRC.has('stock') : true;
  var HAS_PRICE = SRC ? SRC.has('price') : false;
  var HAS_MEDIA = SRC ? !!SRC.declares('media') : true;
  var CAN_WRITE = SRC ? (!!SRC.declares('writeTags') || !!SRC.declares('writeCatalog')) : true;
  var SRC_NAME  = (SRC && SRC.active().name) || 'Current RMS';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // web-side state (would be WordPress meta) — seed brand empty, category from
  // group (falling back to the raw group when it isn't one of the 6 buckets),
  // published from the image only when the source actually has images.
  var web = {};
  PRODUCTS.forEach(function (p) {
    web[p.slug] = { cat: g2cat[p.group] || p.group || '', brand: '', published: HAS_MEDIA ? !!p.img : true };
  });

  var state = { q: '', cat: '', status: '', page: 0, per: 20 };
  var root = document.querySelector('[data-products]');
  var strip = document.querySelector('[data-src-strip]');

  function ownedStock(p) { var a = AVAIL[p.slug]; return a && a.owned != null ? a.owned : null; }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return PRODUCTS.filter(function (p) {
      var pcat = g2cat[p.group] || p.group || '';
      if (state.cat && pcat !== state.cat) return false;
      if (state.status === 'live' && !web[p.slug].published) return false;
      if (state.status === 'hidden' && web[p.slug].published) return false;
      if (q && (p.base + ' ' + p.group + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function actIcon(name, cls, title, svg) {
    return '<button class="iact ' + cls + '" title="' + esc(title) + '" data-act="' + name + '">' + svg + '</button>';
  }
  var SVG = {
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    tag:  '<svg viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1"/></svg>',
    img:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    push: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    wand: '<svg viewBox="0 0 24 24"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M17.8 6.2l1.4-1.4M3 21l9-9M12.2 6.2 10.8 4.8"/></svg>',
  };

  /* ── the source strip: connector + the capabilities IT declares ──── */
  var CAP_ORDER = ['catalog','variants','media','price','stock','availability','orders','writeTags'];
  function renderStrip() {
    if (!strip || !SRC) return;
    var c = SRC.active(), caps = SRC.capsFor(SRC.activeId());
    var LBL = window.SS_CAP_LABELS || {};
    var chips = CAP_ORDER.filter(function (n) { return n in caps; }).map(function (n) {
      var v = caps[n];
      var cls = v === 1 ? 'cap on' : (v === 'pro' ? 'cap pro' : 'cap off');
      return '<span class="' + cls + '">' + esc(LBL[n] || n) + (v === 'pro' ? '&nbsp;· Pro' : '') + '</span>';
    }).join('');
    strip.innerHTML = '<span class="dot"></span> <b>' + esc(c.name) + '</b> · ' + esc(c.detail) +
      '<span class="caps">' + chips + '</span>';
  }

  var SEARCH_SVG = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  var FUNNEL_SVG = '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></svg>';

  function rowHtml(p) {
    var pro = window.SIMPLITORY_tierIsPro();
    var w = web[p.slug];
    var thumb = p.img
      ? '<span class="pthumb" style="background-image:url(' + esc(p.img.indexOf('assets') === 0 ? p.img : 'assets/img/' + p.img) + ')"></span>'
      : '<span class="pthumb none">no<br>photo</span>';
    var brandCell = w.brand
      ? '<span class="webfield" data-f="brand">' + esc(w.brand) + '</span>'
      : '<span class="webfield empty" data-f="brand">Set brand</span>';
    var catCell = '<span class="webfield" data-f="cat">' + esc(w.cat || 'Uncategorised') + '</span>';
    var ownedCell = HAS_STOCK
      ? '<td class="owned">' + (ownedStock(p) != null ? Number(ownedStock(p)).toLocaleString() : '—') + '<span class="src">from ' + esc(SRC_NAME) + '</span></td>' : '';
    var priceCell = HAS_PRICE
      ? '<td class="owned">' + (p.price != null ? '$' + Number(p.price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : '—') + '<span class="src">from ' + esc(SRC_NAME) + '</span></td>' : '';
    // Pro actions (write-back to the source, advanced image) only appear on Pro —
    // in Basic the source is read + display + publish, so they turn off.
    var acts = actIcon('edit', '', 'Edit web details (Basic)', SVG.edit) +
               actIcon('brand', '', 'Assign brand — stored in WordPress (Basic)', SVG.tag) +
               actIcon('img', '', 'Manage this photo — opens the media console', SVG.img) +
               (pro && CAN_WRITE ? actIcon('push', 'pro', 'Write brand + edits BACK to ' + SRC_NAME + ' (Pro)', SVG.push) : '') +
               (pro && HAS_MEDIA ? actIcon('wand', 'pro', 'Advanced image management — auto-crop, bg-removal, responsive (Pro)', SVG.wand) : '');
    return '<tr data-slug="' + esc(p.slug) + '">' +
      '<td>' + thumb + '</td>' +
      '<td><span class="pname">' + esc(p.base) + '</span><span class="pmeta">' + (p.nvar > 1 ? p.nvar + ' colourways · ' : '') + esc(p.group) + '</span></td>' +
      ownedCell + priceCell +
      '<td>' + catCell + '</td><td>' + brandCell + '</td>' +
      '<td><span class="pub ' + (w.published ? 'on' : 'off') + '">' + (w.published ? 'Live' : 'Hidden') + '</span></td>' +
      '<td><div class="pacts">' + acts + '</div></td></tr>';
  }

  // Live search + pagination update only the table body → the search box keeps focus.
  function renderTable() {
    var all = rows();
    var pages = Math.max(1, Math.ceil(all.length / state.per));
    if (state.page >= pages) state.page = 0;
    var slice = all.slice(state.page * state.per, state.page * state.per + state.per);
    var pro = window.SIMPLITORY_tierIsPro();
    root.querySelector('[data-tbody]').innerHTML = slice.map(rowHtml).join('') ||
      '<tr><td colspan="9" style="padding:16px 10px;color:var(--sy-muted);font-size:.8rem">No products match. Clear the search or filter.</td></tr>';
    var start = all.length ? (state.page * state.per + 1) : 0;
    var end = Math.min(all.length, state.page * state.per + state.per);
    var note = root.querySelector('[data-note]');
    note.className = 'prow-note pager-note';
    note.innerHTML = '<span class="pager">' +
      '<button class="pgbtn" data-prev' + (state.page === 0 ? ' disabled' : '') + '>‹ Prev</button>' +
      '<span class="pgmid"><b>' + start + '–' + end + '</b> of ' + all.length.toLocaleString() + ' products</span>' +
      '<button class="pgbtn" data-next' + (end >= all.length ? ' disabled' : '') + '>Next ›</button></span>';
    note.querySelector('[data-prev]').addEventListener('click', function () { if (state.page > 0) { state.page--; renderTable(); } });
    note.querySelector('[data-next]').addEventListener('click', function () { if ((state.page + 1) * state.per < all.length) { state.page++; renderTable(); } });
    root.querySelectorAll('.iact').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.dataset.act, slug = btn.closest('tr').dataset.slug, p = PRODUCTS.filter(function (x) { return x.slug === slug; })[0];
        // Photo management lives in the media console now (Media left the nav to
        // become a wizard step) — so the row's photo action opens it.
        if (act === 'img') { location.href = 'photos.html'; return; }
        toast(ACT_MSG(act, p, window.SIMPLITORY_tierIsPro()));
      });
    });
  }

  var _pdismiss = false;
  function render() {
    renderStrip();
    var pro = window.SIMPLITORY_tierIsPro();
    var head = '<th></th><th>Product</th>' + (HAS_STOCK ? '<th>Owned</th>' : '') + (HAS_PRICE ? '<th>Price</th>' : '') + '<th>Category</th><th>Brand</th><th>Status</th><th></th>';
    var filtered = !!(state.cat || state.status);
    var catChips = '<button class="fchip' + (!state.cat ? ' on' : '') + '" data-cat="">All</button>' +
      CATS.map(function (c) { return '<button class="fchip' + (state.cat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '">' + c[0] + '</button>'; }).join('');
    var statChips = [['', 'All'], ['live', 'Live'], ['hidden', 'Hidden']].map(function (s) {
      return '<button class="fchip' + (state.status === s[0] ? ' on' : '') + '" data-status="' + s[0] + '">' + s[1] + '</button>'; }).join('');

    root.innerHTML =
      '<div class="pbar">' +
        '<div class="psearch">' + SEARCH_SVG + '<input type="search" placeholder="Search products…" data-q value="' + esc(state.q) + '"></div>' +
        '<div class="pfilterwrap">' +
          '<button class="pfiltbtn' + (filtered ? ' is-active' : '') + '" data-filt>' + FUNNEL_SVG + ' Filter' + (filtered ? ' <em>•</em>' : '') + '</button>' +
          '<div class="pfilterpop" data-filtpop hidden>' +
            '<div class="row2"><h4>Category</h4><div class="chips">' + catChips + '</div></div>' +
            '<div class="row2" style="margin-bottom:0"><h4>Status</h4><div class="chips">' + statChips + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="bulk">' +
          (CAN_WRITE && pro ? '<button class="btn btn--pro" data-bulk-push>Write back to source</button>' : '') +
          (pro ? '' : '<button class="pro-link" data-tier-toggle>Unlock Pro</button>') +
        '</div>' +
      '</div>' +
      '<table class="ptable"><thead><tr>' + head + '</tr></thead><tbody data-tbody></tbody></table>' +
      '<p class="prow-note" data-note></p>';

    root.querySelector('[data-q]').addEventListener('input', function (e) { state.q = e.target.value; state.page = 0; renderTable(); });
    var ft = root.querySelector('[data-filt]'), fp = root.querySelector('[data-filtpop]');
    ft.addEventListener('click', function (e) { e.stopPropagation(); var o = fp.hasAttribute('hidden'); if (o) fp.removeAttribute('hidden'); else fp.setAttribute('hidden', ''); ft.classList.toggle('is-open', o); });
    root.querySelectorAll('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { state.cat = b.dataset.cat; state.page = 0; render(); }); });
    root.querySelectorAll('[data-status]').forEach(function (b) { b.addEventListener('click', function () { state.status = b.dataset.status; state.page = 0; render(); }); });
    var bp = root.querySelector('[data-bulk-push]');
    if (bp) bp.addEventListener('click', function () { toast('Pro — would write brand tags back to ' + SRC_NAME + '.'); });
    if (!_pdismiss) { _pdismiss = true; document.addEventListener('click', function (e) {
      var pop = root.querySelector('[data-filtpop]:not([hidden])'); if (!pop) return;
      if (e.target.closest('[data-filtpop]') || e.target.closest('[data-filt]')) return;
      pop.setAttribute('hidden', ''); var b = root.querySelector('[data-filt]'); if (b) b.classList.remove('is-open');
    }); }

    renderTable();
  }

  function ACT_MSG(act, p, pro) {
    switch (act) {
      case 'edit':  return 'Basic — edit web title, description &amp; category for “' + p.base + '”.';
      case 'brand': return 'Basic — assign DTA / AER / both. Stored in WordPress' + (pro && CAN_WRITE ? ' and written back to ' + SRC_NAME + ' (Pro).' : ' (Basic keeps it in WP only).');
      case 'img':   return 'Basic — upload a web image for “' + p.base + '” to the WordPress media library.';
      case 'push':  return 'Pro — write brand + web edits BACK to ' + SRC_NAME + ' as tags.';
      case 'wand':  return 'Pro — advanced image: auto-crop, background removal, responsive sizes' + (SRC_NAME === 'Current RMS' ? ', sync CRMS attachments.' : '.');
    }
    return '';
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'sy-toast'; document.body.appendChild(toastEl);
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,10px);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; }
    toastEl.innerHTML = msg; toastEl.style.opacity = '1'; toastEl.style.transform = 'translate(-50%,0)';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; toastEl.style.transform = 'translate(-50%,10px)'; }, 2600);
  }

  window.SIMPLITORY_onTier = function () { if (root) render(); };
  if (root && PRODUCTS.length) render();
  else if (root) { renderStrip(); root.innerHTML = '<p class="prow-note">This source has no products yet. <a href="csv-setup.html">Set up a CSV</a> or switch source.</p>'; }
} )();
