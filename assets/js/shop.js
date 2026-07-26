/* ============================================================
   SHOP — browse-first storefront, replacing the WooCommerce
   collections template.

   Flow (Glenn 2026-07-25): browse-by-category is the LANDING, with a
   By category / By event toggle beside a LIVE search box, and a filter
   that opens as an anchored popup. On a category listing the search,
   event date and filter sit in one control row; the filter popup holds
   all the style/colour facets. Search is live everywhere.

   DATA HONESTY. Everything here runs on the REAL catalog
   (products.json, 1,174 base products). Two signals are NOT in
   that pull and are MODELLED, clearly, so the UI is right and
   the live data drops into the same slots:

     • rentScore()  — "how often it rents". Real source is the
       Current RMS order history (opportunity_items over a date
       window). Modelled here from stock breadth (listings +
       colourways), which correlates but is not the truth.
       Labelled "modeled" wherever shown.

     • availableOn() — yes/no for a date. Real source is the
       Current RMS availability endpoint for that product on
       that date. Modelled here deterministically from id+date
       so it is STABLE per date (never random), and tuned so a
       minority read as unavailable. Labelled "modeled".

   Category is the `group` field (zero new data). Style + colour
   facets come from the tags that already exist on the products
   that matter — see analysis in the client thread.
   ============================================================ */
( function () {
  'use strict';
  var BASE = document.body.dataset.base || '';
  var PBASE = document.body.dataset.pbase || '';  // product-page prefix (dta/ or aer/)
  // The catalog follows the active source: the Current RMS pull, or the
  // imported CSV rows when a CSV is the active connector. Capability gating
  // below then hides what that source can't back.
  var PRODUCTS = window.SS_SOURCE ? window.SS_SOURCE.catalog() : (window.SS_PRODUCTS || []);
  var RENT = (window.SS_RENTFREQ && window.SS_RENTFREQ.by_slug) || {};
  var RENT_LIVE = !!(window.SS_RENTFREQ && window.SS_RENTFREQ.opportunities_scanned);
  var AVAIL = (window.SS_AVAIL && window.SS_AVAIL.by_slug) || {};
  var AVAIL_LIVE = !!(window.SS_AVAIL && window.SS_AVAIL.products_with_stock);
  // Capability gating — the storefront only offers what the connected source
  // can back. No order history → no "most rented". No stock/availability →
  // no date control. This is the audit's capability model, live on the FE.
  var SRC = window.SS_SOURCE;
  var CAN_RENT  = SRC ? SRC.has('orders') : true;
  var CAN_AVAIL = SRC ? (SRC.has('stock') || SRC.has('availability')) : true;
  // Exit strategy: on a detached WordPress snapshot the LIVE order signal (most
  // rented) goes dark, but pairings survive because they were materialized at
  // publish — so the "Completes the look" strip stays on the frozen catalog.
  var IS_SNAPSHOT = SRC ? SRC.activeId() === 'snapshot' : false;
  var CAN_PAIR = CAN_RENT || IS_SNAPSHOT;

  /* ── Top-level categories from the group field ─────────────── */
  var TOPCATS = [
    { key: 'linens',   label: 'Linens',    blurb: 'Tablecloths, runners, napkins, sashes and overlays',
      groups: ['Polyester','Premium Polyester','Runners','Sashes','Napkins','Dupioni','Satin','Lamour Satin',
               'Drapery','Crinkle','Pintuck','Sequin','Spandex','Organza','Rosey','Bengaline','Burlap','Damask',
               'Petal Taffeta','Pinched Taffeta','Satin Stripe','Skirts','Chair Cover','Specialty','Tensil'] },
    { key: 'chairs',   label: 'Chairs',    blurb: 'Chiavari, folding and specialty seating',
      groups: ['Chairs'] },
    { key: 'tables',   label: 'Tables',    blurb: 'Rounds, farm tables, cocktail and highboys',
      groups: ['Tables','Furniture','Bars & Shelving'] },
    { key: 'tableware',label: 'Tableware', blurb: 'China, glassware, flatware and chargers',
      groups: ['China','Glassware','Flatware','Chargers','Serving Ware','Serving Pieces','Barware','Catering Equipment','Table Service'] },
    { key: 'lighting', label: 'Lighting',  blurb: 'Uplighting, fixtures and effects',
      groups: ['Lighting'] },
    { key: 'structures',label: 'Structures',blurb: 'Staging, dance floors, tenting and drape',
      groups: ['Stage','Tent','Dance Floor','Carpet','Infrastructure','Heating and Cooling','Decor'] }
  ];
  var g2cat = {};
  TOPCATS.forEach(function (c) { c.groups.forEach(function (g) { g2cat[g] = c.key; }); });

  /* ── EVENT-LED entry (the "uber-simple decision space") ──────────────
     type of event → the pieces you'll usually want → common add-ons.
     PLACEHOLDER TAXONOMY — sensible DTA defaults, meant to be edited (this
     is exactly the kind of merchandising a shop owner would tune). `needs`
     are category keys (TOPCATS); `addons` are quick searches into the
     catalog. All catalog-only, so it works on any source. */
  var EVENTS = [
    { key:'wedding',    label:'Wedding',            blurb:'Ceremony + reception',
      icon:'<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z"/></svg>',
      needs:['linens','chairs','tables','tableware','lighting'],
      addons:[['Chargers','charger'],['Table runners','runner'],['Chiavari chairs','chiavari'],['Uplighting','uplighting'],['Dance floor','dance floor']] },
    { key:'corporate',  label:'Corporate & Gala',   blurb:'Conferences, galas, awards',
      icon:'<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      needs:['tables','chairs','linens','lighting','structures'],
      addons:[['Staging','stage'],['Draping','drape'],['Cocktail tables','cocktail'],['Uplighting','uplighting'],['Bars','bar']] },
    { key:'celebration',label:'Party / Celebration',blurb:'Birthdays, anniversaries',
      icon:'<svg viewBox="0 0 24 24"><path d="M4 21h16M6 21V11l6-4 6 4v10M12 3v4"/></svg>',
      needs:['linens','chairs','tables','tableware'],
      addons:[['Sequin linens','sequin'],['Chargers','charger'],['Bars','bar'],['Specialty chairs','chiavari']] },
    { key:'shower',     label:'Shower',             blurb:'Bridal & baby showers',
      icon:'<svg viewBox="0 0 24 24"><path d="M12 21v-8M8 13a4 4 0 0 1 8 0M5 8l1-4h12l1 4"/></svg>',
      needs:['linens','tableware','tables','chairs'],
      addons:[['Blush linens','blush'],['Napkins','napkin'],['Chargers','charger'],['Runners','runner']] },
    { key:'fundraiser', label:'Nonprofit',          blurb:'Fundraisers & benefits',
      icon:'<svg viewBox="0 0 24 24"><path d="M20.8 6.6a4.5 4.5 0 0 0-6.4 0L12 9l-2.4-2.4a4.5 4.5 0 0 0-6.4 6.4L12 21l8.8-8.8a4.5 4.5 0 0 0 0-6.4z"/></svg>',
      needs:['tables','chairs','linens','lighting'],
      addons:[['Staging','stage'],['Draping','drape'],['Uplighting','uplighting'],['Bars','bar']] },
  ];

  /* ── Facet vocabularies (from the real tag universe) ───────── */
  var COLORS = ['White','Ivory','Black','Gold','Silver','Blue','Navy','Green','Sage','Pink','Blush',
                'Purple','Red','Burgundy','Gray','Brown','Tan','Champagne','Coral','Orange'];
  var STYLES = ['Polyester','Premium Polyester','Satin','Dupioni','Lamour','Crinkle','Pintuck',
                'Sequin','Organza','Taffeta','Damask','Burlap','BBJ','Estate','Chiavari'];
  var norm = function (s) { return String(s || '').trim().toLowerCase(); };

  function catOf(p)     { return g2cat[p.group] || null; }
  function tagset(p)    { return (p.tags || []).map(norm); }
  function productColors(p) {
    var ts = tagset(p), out = [];
    COLORS.forEach(function (c) { if (ts.indexOf(norm(c)) > -1) out.push(c); });
    // colours also live on the variants
    (p.variants || []).forEach(function (v) {
      COLORS.forEach(function (c) { if (norm(v.name).indexOf(norm(c)) > -1 && out.indexOf(c) < 0) out.push(c); });
    });
    return out;
  }
  function productStyles(p) {
    var ts = tagset(p), hay = norm(p.base) + ' ' + ts.join(' '), out = [];
    STYLES.forEach(function (s) { if (hay.indexOf(norm(s)) > -1) out.push(s); });
    return out;
  }

  /* ── MODELLED signals (labelled everywhere shown) ──────────── */
  // "how often it rents". LIVE: distinct Current RMS orders this product
  // appears on (rentfreq.js, pulled from 422 opportunities). Falls back to a
  // stock-breadth proxy only for products with no rental history on file.
  function rentScore(p) {
    var r = RENT[p.slug];
    if (r && r.orders != null) return r.orders * 10;      // real, scaled to sit above the proxy floor
    return (p.listings || 1) / 40 + (p.nvar || 1) * 0.5;  // modeled fallback (unrented long tail)
  }
  function rentIsLive(p) { return !!(RENT[p.slug] && RENT[p.slug].orders != null); }
  function rentBand(p, max) {
    var r = rentScore(p) / (max || 1);
    return r > 0.5 ? 'high' : (r > 0.18 ? 'mid' : 'low');
  }
  // yes/no availability for a date. LIVE: owned stock (quantity_held) minus the
  // quantity committed on real Current RMS orders whose window covers the date
  // (avail.js). Any date resolves offline from the real commitments. Falls back
  // to a modeled read only for products with no stock record.
  function isoToDay(iso) {
    var p = iso.split('-'); if (p.length !== 3) return null;
    return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }
  function availableOn(p, isoDate) {
    if (!isoDate) return true;
    var a = AVAIL[p.slug];
    if (a && a.owned != null) {
      var day = isoToDay(isoDate);
      if (day == null) return true;
      var committed = 0, w = a.commit || [], i;
      for (i = 0; i < w.length; i++) { if (day >= w[i][0] && day <= w[i][1]) committed += w[i][2]; }
      return (a.owned - committed) > 0;                 // real
    }
    // modeled fallback (product with no stock record on file)
    var s = String(p.slug) + '|' + isoDate, h = 0, j;
    for (j = 0; j < s.length; j++) { h = (h * 31 + s.charCodeAt(j)) >>> 0; }
    return (h % 100) >= 14;
  }
  function availIsLive(p) { return !!(AVAIL[p.slug] && AVAIL[p.slug].owned != null); }

  /* ── State ─────────────────────────────────────────────────── */
  var state = { view: 'category', cat: null, style: null, color: null, date: '', pop: false, q: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var root = document.querySelector('[data-shop]');

  /* ── Search + product card ─────────────────────────────────── */
  function searchHay(p) {
    return (norm(p.base) + ' ' + norm(p.group) + ' ' + tagset(p).join(' ') + ' ' +
            productColors(p).map(norm).join(' ') + ' ' + productStyles(p).map(norm).join(' '));
  }
  function searchRows(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    return PRODUCTS.filter(function (p) { var h = searchHay(p); return toks.every(function (t) { return h.indexOf(t) > -1; }); });
  }
  // One result card — shared everywhere, so source-gating (rents-often /
  // availability badges) is identical across category, event and search.
  function productCard(p, max) {
    var ok = CAN_AVAIL ? availableOn(p, state.date) : true;
    var band = rentBand(p, max);
    var media = p.img ? '<img src="' + BASE + 'assets/img/' + esc(p.img) + '" alt="">' :
                        '<span class="ph">' + esc(p.base.slice(0, 2)) + '</span>';
    var availBadge = (CAN_AVAIL && state.date)
      ? '<span class="avail ' + (ok ? 'yes' : 'no') + '">' + (ok ? 'Available' : 'Not available') + '</span>' : '';
    var pop = CAN_RENT
      ? (band === 'high' ? '<span class="pop">Rents often</span>' : (band === 'mid' ? '<span class="pop mid">Popular</span>' : '')) : '';
    var sw = (p.variants || []).filter(function (v) { return v.img; }).slice(0, 5).map(function (v) {
      return '<span class="mini" style="background-image:url(' + BASE + 'assets/img/' + esc(v.img) + ')" title="' + esc(v.name) + '"></span>';
    }).join('');
    return '<article class="rc' + (state.date && !ok ? ' is-out' : '') + '">' +
      '<a class="rc__link" href="' + PBASE + 'product.html?p=' + encodeURIComponent(p.slug) + '">' +
      '<div class="rc__m">' + media + pop + availBadge + '</div>' +
      '<div class="rc__b"><h4>' + esc(p.base) + '</h4>' +
      '<p class="rc__meta">' + esc(p.group) + (p.nvar > 1 ? ' &middot; ' + p.nvar + ' colourways' : '') + '</p>' +
      '<div class="minis">' + sw + '</div></div></a></article>';
  }

  /* ── "Completes the look" — pairings surfaced in results ───────
     The pairing engine (pairings.js) is the SAME one the admin curates
     in Storefront, so the FE shows exactly what's curated. Gated on the
     `orders` capability (co-occurrence needs order history) — a CSV with
     no orders shows no pairings, just like it hides "most rented". */
  function pairHero(rows) {
    var hero = null, max = -1;
    rows.forEach(function (p) { var s = rentScore(p); if (s > max) { max = s; hero = p; } });
    return hero;
  }
  function pairStrip(rows) {
    if (!CAN_PAIR || !window.SS_PAIRINGS) return '';
    var hero = pairHero(rows); if (!hero) return '';
    var pairs = window.SS_PAIRINGS.for(hero, 4).filter(function (p) { return p && p.slug !== hero.slug; });
    if (!pairs.length) return '';
    var cards = pairs.map(function (p) {
      var media = p.img ? '<img src="' + BASE + 'assets/img/' + esc(p.img) + '" alt="">' : '<span class="ph">' + esc(p.base.slice(0, 2)) + '</span>';
      return '<a class="pairmini" href="' + PBASE + 'product.html?p=' + encodeURIComponent(p.slug) + '">' +
        '<div class="pairmini__m">' + media + '</div>' +
        '<div class="pairmini__b"><b>' + esc(p.base) + '</b><span>' + esc(p.group) + '</span></div></a>';
    }).join('');
    var src = IS_SNAPSHOT ? 'last published pairings' : 'modelled from order history';
    return '<section class="pairstrip"><h3 class="pairstrip__h">Completes the look</h3>' +
      '<p class="pairstrip__sub">Often booked with <b>' + esc(hero.base) + '</b> · ' + src + '</p>' +
      '<div class="pairstrip__row">' + cards + '</div></section>';
  }

  /* ── Category tiles ────────────────────────────────────────── */
  function catCounts() {
    var counts = {}; PRODUCTS.forEach(function (p) { var c = catOf(p); if (c) counts[c] = (counts[c] || 0) + 1; }); return counts;
  }
  function catCard(key, withBlurb, counts) {
    var c = TOPCATS.filter(function (t) { return t.key === key; })[0]; if (!c) return '';
    // skip CAD floor-plans / non-product artwork as a category hero (gap 9.4)
    var CAD = /lighting|floor ?plan|layout|diagram|pavilion/i;
    var rep = PRODUCTS.filter(function (p) { return catOf(p) === key && p.img && !CAD.test(p.base); })
                      .sort(function (a, b) { return rentScore(b) - rentScore(a); })[0];
    var media = rep ? '<img src="' + BASE + 'assets/img/' + esc(rep.img) + '" alt="">' :
                      '<span class="ph">' + esc(c.label[0]) + '</span>';
    return '<a class="catcard" href="#" data-cat="' + c.key + '">' +
      '<div class="catcard__m">' + media + '</div>' +
      '<div class="catcard__b"><h3>' + esc(c.label) + '</h3>' +
      (withBlurb ? '<p>' + esc(c.blurb) + '</p>' : '') +
      '<span class="catcard__n">' + (counts[c.key] || 0) + ' products</span></div></a>';
  }

  var FUNNEL  = '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></svg>';
  var SEARCHI = '<svg viewBox="0 0 24 24" class="shopsearch__i"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

  /* ── Filter popup plumbing (anchored dropdown, closes on outside click) ── */
  function bindFilter() {
    var ft = root.querySelector('[data-filtertoggle]'), pop = root.querySelector('[data-filterpop]');
    if (!ft || !pop) return;
    ft.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = pop.hasAttribute('hidden');
      if (opening) pop.removeAttribute('hidden'); else pop.setAttribute('hidden', '');
      ft.classList.toggle('is-open', opening);
    });
  }
  var _dismissWired = false;
  function wireDismiss() {
    if (_dismissWired) return; _dismissWired = true;
    document.addEventListener('click', function (e) {
      var pop = root.querySelector('[data-filterpop]:not([hidden])'); if (!pop) return;
      if (e.target.closest('[data-filterpop]') || e.target.closest('[data-filtertoggle]')) return;
      closePopup();
    });
  }
  function closePopup() {
    var pop = root.querySelector('[data-filterpop]'); if (pop) pop.setAttribute('hidden', '');
    var ft = root.querySelector('[data-filtertoggle]'); if (ft) ft.classList.remove('is-open');
  }

  function goCat(key) { state.q = ''; state.cat = key; state.style = state.color = null; viewWizard(); }
  function openSearch(q) { viewHome(); var i = root.querySelector('[data-q]'); if (i) { i.value = q; live(); i.focus(); } }

  /* ── VIEW: landing — browse by category / by event, with live search ── */
  function viewHome() {
    state.cat = null; state.style = state.color = null; state.q = '';
    var counts = catCounts();
    var catChips = TOPCATS.map(function (c) {
      return '<button class="chip" data-cat="' + c.key + '">' + esc(c.label) + ' <em>' + (counts[c.key] || 0) + '</em></button>';
    }).join('');
    root.innerHTML =
      '<div class="shophead"><p class="eyebrow">Browse the collection</p><h1>What are you dressing?</h1>' +
        '<p class="shoplede">Browse by category or plan by event, then narrow it down' +
        (CAN_AVAIL ? ' — we\'ll show what\'s free for your date' : '') + '.</p></div>' +
      '<div class="shopbar">' +
        '<div class="viewtoggle">' +
          '<button class="vt" data-view="category">By category</button>' +
          '<button class="vt" data-view="event">By event</button>' +
        '</div>' +
        '<div class="shopsearch">' + SEARCHI +
          '<input type="search" data-q placeholder="Search the catalog…" aria-label="Search the catalog"></div>' +
        '<div class="filterwrap">' +
          '<button class="filtbtn" data-filtertoggle aria-label="Filter">' + FUNNEL + '<span>Filter</span></button>' +
          '<div class="filterpop" data-filterpop hidden>' +
            '<div class="filterpop__sec"><span class="wizlbl">View</span><div class="chips">' +
              '<button class="chip" data-view="category">By category</button>' +
              '<button class="chip" data-view="event">By event</button></div></div>' +
            '<div class="filterpop__sec"><span class="wizlbl">Jump to a category</span><div class="chips">' + catChips + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div data-body></div>';

    bindFilter(); wireDismiss();
    root.querySelector('[data-q]').addEventListener('input', live);
    root.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
    root.querySelectorAll('[data-filterpop] [data-cat]').forEach(function (a) {
      a.addEventListener('click', function () { closePopup(); goCat(a.dataset.cat); });
    });
    syncToggle(); renderBody();
  }
  function setView(v) { state.view = v; closePopup(); syncToggle(); renderBody(); }
  function syncToggle() {
    root.querySelectorAll('.viewtoggle [data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === state.view); });
    root.querySelectorAll('.filterpop [data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === state.view); });
  }
  function live() {
    var qEl = root.querySelector('[data-q]'); state.q = qEl ? qEl.value.trim() : '';
    renderBody();
  }
  function renderBody() {
    var body = root.querySelector('[data-body]'); if (!body) return;
    if (state.q) {
      var rows = searchRows(state.q), max = rows.length ? Math.max.apply(null, rows.map(rentScore)) : 1;
      body.innerHTML = '<p class="rescount">' + rows.length + ' product' + (rows.length === 1 ? '' : 's') +
          ' matching &ldquo;' + esc(state.q) + '&rdquo;</p>' +
        '<div class="resgrid">' + (rows.slice(0, 60).map(function (p) { return productCard(p, max); }).join('') ||
          '<p class="resempty">Nothing matches. Try a colour, a fabric or a category.</p>') + '</div>' +
        (rows.length ? pairStrip(rows) : '');
      return;
    }
    if (state.view === 'event') {
      body.innerHTML = '<div class="evrow">' + EVENTS.map(function (ev) {
        return '<button class="evcard" data-event="' + ev.key + '"><span class="evcard__i">' + ev.icon + '</span>' +
          '<b>' + esc(ev.label) + '</b><span>' + esc(ev.blurb) + '</span></button>';
      }).join('') + '</div>';
      body.querySelectorAll('[data-event]').forEach(function (b) { b.addEventListener('click', function () { viewEvent(b.dataset.event); }); });
      return;
    }
    var counts = catCounts();
    body.innerHTML = '<div class="catgrid">' + TOPCATS.map(function (c) { return catCard(c.key, true, counts); }).join('') + '</div>';
    body.querySelectorAll('[data-cat]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); goCat(a.dataset.cat); }); });
  }

  /* ── VIEW: event starter — needed pieces + common add-ons ──── */
  function viewEvent(key) {
    var ev = EVENTS.filter(function (e) { return e.key === key; })[0];
    if (!ev) return viewHome();
    var counts = catCounts();
    var needCards = ev.needs.map(function (ck) { return catCard(ck, false, counts); }).join('');
    var addonBtns = ev.addons.map(function (a) { return '<button class="addon" data-q="' + esc(a[1]) + '">' + esc(a[0]) + '</button>'; }).join('');
    root.innerHTML =
      '<div class="crumb"><a href="#" data-home>Browse</a> <span>/</span> <a href="#" data-events>By event</a> <span>/</span> <b>' + esc(ev.label) + '</b></div>' +
      '<div class="shophead"><p class="eyebrow">Event starter</p><h1>For a ' + esc(ev.label.toLowerCase()) + ', you\'ll usually want…</h1>' +
        '<p class="shoplede">Pick a piece to start, then narrow by style, colour' + (CAN_AVAIL ? ' and date' : '') +
        '. Add the extras that finish the look.</p></div>' +
      '<div class="catgrid catgrid--needs">' + needCards + '</div>' +
      '<div class="entrysec"><p class="entrysec__h">Common add-ons</p><div class="addons">' + addonBtns + '</div></div>';
    root.querySelector('[data-home]').addEventListener('click', function (e) { e.preventDefault(); state.view = 'category'; viewHome(); });
    root.querySelector('[data-events]').addEventListener('click', function (e) { e.preventDefault(); state.view = 'event'; viewHome(); });
    root.querySelectorAll('[data-cat]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); goCat(a.dataset.cat); }); });
    root.querySelectorAll('.addon[data-q]').forEach(function (b) { b.addEventListener('click', function () { openSearch(b.dataset.q); }); });
  }

  /* ── VIEW: category listing — search + date + filter in one row ── */
  function viewWizard() {
    var cat = TOPCATS.filter(function (c) { return c.key === state.cat; })[0];
    if (!cat) return viewHome();
    var pool = PRODUCTS.filter(function (p) { return catOf(p) === state.cat; });

    // facets present in THIS category only
    var styleSet = {}, colorSet = {};
    pool.forEach(function (p) {
      productStyles(p).forEach(function (s) { styleSet[s] = (styleSet[s] || 0) + 1; });
      productColors(p).forEach(function (c) { colorSet[c] = (colorSet[c] || 0) + 1; });
    });
    var styles = Object.keys(styleSet).sort(function (a, b) { return styleSet[b] - styleSet[a]; });
    var colors = COLORS.filter(function (c) { return colorSet[c]; });
    function chip(kind, val, n) {
      var on = state[kind] === val;
      return '<button class="chip' + (on ? ' is-on' : '') + '" data-' + kind + '="' + esc(val) + '">' +
        esc(val) + (n != null ? ' <em>' + n + '</em>' : '') + '</button>';
    }
    var filtered = !!(state.style || state.color);

    root.innerHTML =
      '<div class="crumb"><a href="#" data-home>All categories</a> <span>/</span> <b>' + esc(cat.label) + '</b></div>' +
      '<div class="shophead shophead--tight"><p class="eyebrow">Browse</p><h1>' + esc(cat.label) + '</h1></div>' +
      '<div class="shopbar shopbar--listing">' +
        '<div class="shopsearch">' + SEARCHI +
          '<input type="search" data-q value="' + esc(state.q) + '" placeholder="Search ' + esc(cat.label) + '…" aria-label="Search"></div>' +
        (CAN_AVAIL ? '<label class="datefld datefld--inline"><span>Event date</span><input type="date" data-date value="' + esc(state.date) + '"></label>' : '') +
        (CAN_RENT ? '<label class="popfld"><input type="checkbox" data-pop' + (state.pop ? ' checked' : '') + '> Most rented</label>' : '') +
        '<div class="filterwrap">' +
          '<button class="filtbtn' + (filtered ? ' is-active' : '') + '" data-filtertoggle aria-label="Filter">' + FUNNEL +
            '<span>Filter' + (filtered ? ' <em>•</em>' : '') + '</span></button>' +
          '<div class="filterpop filterpop--wide" data-filterpop hidden>' +
            '<div class="filterpop__sec"><span class="wizlbl">Style</span><div class="chips">' +
              '<button class="chip' + (!state.style ? ' is-on' : '') + '" data-style="">Any</button>' +
              styles.map(function (s) { return chip('style', s, styleSet[s]); }).join('') + '</div></div>' +
            '<div class="filterpop__sec"><span class="wizlbl">Colour</span><div class="chips">' +
              '<button class="chip' + (!state.color ? ' is-on' : '') + '" data-color="">Any</button>' +
              colors.map(function (c) { return chip('color', c, colorSet[c]); }).join('') + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="rescount" data-rescount></p>' +
      '<div class="resgrid" data-resgrid></div>' +
      '<div data-pairstrip></div>';

    root.querySelector('[data-home]').addEventListener('click', function (e) { e.preventDefault(); state.view = 'category'; viewHome(); });
    bindFilter(); wireDismiss();
    root.querySelectorAll('[data-style]').forEach(function (b) {
      b.addEventListener('click', function () { state.style = b.dataset.style || null; viewWizard(); }); });
    root.querySelectorAll('[data-color]').forEach(function (b) {
      b.addEventListener('click', function () { state.color = b.dataset.color || null; viewWizard(); }); });
    var dEl = root.querySelector('[data-date]'); if (dEl) dEl.addEventListener('input', function (e) { state.date = e.target.value; renderResults(pool); });
    var pEl = root.querySelector('[data-pop]'); if (pEl) pEl.addEventListener('change', function (e) { state.pop = e.target.checked; renderResults(pool); });
    var qEl = root.querySelector('[data-q]'); if (qEl) qEl.addEventListener('input', function (e) { state.q = e.target.value.trim(); renderResults(pool); });

    if (filtered) { var fti = root.querySelector('[data-filtertoggle]'); if (fti) fti.classList.add('is-active'); }
    renderResults(pool);
  }

  function renderResults(pool) {
    // band relative to THIS category — 'rents often' among what you're browsing
    var max = Math.max.apply(null, pool.map(rentScore));
    var toks = state.q ? norm(state.q).split(/\s+/).filter(Boolean) : [];
    var rows = pool.filter(function (p) {
      if (state.style && productStyles(p).indexOf(state.style) < 0) return false;
      if (state.color && productColors(p).indexOf(state.color) < 0) return false;
      if (toks.length) { var h = searchHay(p); if (!toks.every(function (t) { return h.indexOf(t) > -1; })) return false; }
      return true;
    });
    if (state.pop && CAN_RENT) rows.sort(function (a, b) { return rentScore(b) - rentScore(a); });

    var grid = root.querySelector('[data-resgrid]'), cnt = root.querySelector('[data-rescount]');
    var avail = rows.filter(function (p) { return availableOn(p, state.date); }).length;
    cnt.innerHTML = rows.length + ' product' + (rows.length === 1 ? '' : 's') +
      (CAN_AVAIL && state.date ? ' &middot; <b>' + avail + '</b> available on ' + esc(fmtDate(state.date)) : '') +
      (state.q ? ' matching &ldquo;' + esc(state.q) + '&rdquo;' : '');

    grid.innerHTML = rows.slice(0, 60).map(function (p) { return productCard(p, max); }).join('') ||
      '<p class="resempty">Nothing matches. Loosen a filter or clear the search.</p>';

    var strip = root.querySelector('[data-pairstrip]');
    if (strip) strip.innerHTML = rows.length ? pairStrip(rows) : '';
  }

  function fmtDate(iso) {
    var p = iso.split('-'); if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // Deep-links (handy for demos and for showing the source-gated controls):
  //   shop.html#browse          → landing, browse-by-category
  //   shop.html#events          → landing, by-event view
  //   shop.html#c=chairs        → straight into a category listing
  //   shop.html#event=wedding   → the event starter
  //   shop.html#q=gold sequin   → landing with a live search
  function openPopupNow() {
    var pop = root.querySelector('[data-filterpop]'); if (pop) pop.removeAttribute('hidden');
    var ft = root.querySelector('[data-filtertoggle]'); if (ft) ft.classList.add('is-open');
  }
  function openFromHash() {
    var h = location.hash || '', wantFilter = /filter/i.test(h);
    if (/^#events\b/i.test(h)) { state.view = 'event'; viewHome(); return true; }
    if (/^#browse\b/i.test(h)) { state.view = 'category'; viewHome(); if (wantFilter) openPopupNow(); return true; }
    var mc = h.match(/c=([a-z]+)/i);
    if (mc && TOPCATS.some(function (c) { return c.key === mc[1].toLowerCase(); })) {
      state.q = ''; state.cat = mc[1].toLowerCase(); state.style = state.color = null; viewWizard();
      if (wantFilter) openPopupNow(); return true;
    }
    var me = h.match(/event=([a-z]+)/i);
    if (me && EVENTS.some(function (e) { return e.key === me[1].toLowerCase(); })) { viewEvent(me[1].toLowerCase()); return true; }
    var mq = h.match(/q=([^&]+)/i);
    if (mq) { viewHome(); var i = root.querySelector('[data-q]'); if (i) { i.value = decodeURIComponent(mq[1].replace(/\+/g, ' ')); live(); } return true; }
    return false;
  }

  if (root && PRODUCTS.length) { if (!openFromHash()) viewHome(); }
} )();
