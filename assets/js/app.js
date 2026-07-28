/* ============================================================
   Storefront runtime. Brand-agnostic — reads data-brand.

   Model mirrors the real plugin: FABRIC is the product,
   COLOUR is the variation, SIZE is an attribute.
     Dupioni → 57 colourways → 8 sizes each

   Capabilities:
     search-live      -> proposed ss-theme primitive
     gallery + select -> Inventory bolt-on surfaces
     quote basket     -> Inventory bolt-on + brand-aware inbound
   ============================================================ */
(function () {
  const BRAND = document.body.dataset.brand || 'dta';
  const BASE  = document.body.dataset.base || '';
  // BASE points at the PROTOTYPE ROOT — that is where assets/ and data/ live,
  // so a brand page carries data-base="../". Sibling PAGES (product.html,
  // collections.html) sit next to the current page inside dta/ or aer/, so they
  // must NOT take that prefix. Prefixing them sent every generated link one
  // directory too high, to a file that does not exist — dead cards, dead
  // breadcrumbs, dead quote links.
  const PAGE  = '';
  const KEY   = 'ssproto_quote_' + BRAND;
  let FABRICS = [];
  let CATALOG = [];
  let PRODUCTS = [];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // a catalog row's name -> its base-product slug (strip the variant suffix)
  function slugOf(name) {
    for (const sep of [' - ', ' – ', '- ', '– ']) {
      if (name.includes(sep)) return slug(name.split(sep)[0]);
    }
    return slug(name);
  }

  /* ---------------------------------------------- basket */
  const read  = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const write = b => { localStorage.setItem(KEY, JSON.stringify(b)); paintCount(); };
  function add(fabric, colour, size, qty) {
    const b = read();
    const hit = b.find(x => x.fabric === fabric && x.colour === colour && x.size === size);
    if (hit) hit.qty += qty; else b.push({ fabric, colour, size, qty });
    write(b);
  }
  /* Demo seed — the quote basket is localStorage-backed, so a fresh browser
     shows an empty basket and the Quote page cannot be demonstrated without
     first walking the whole add-to-quote flow. Seed two real, photographed
     Dupioni lines ONCE, on a browser that has never touched the basket.
     Emptying the basket during a demo is respected: the flag is already set,
     so it does not refill behind the presenter. Both brands get the same two
     lines — same fabric, one shared inventory, which is the point. */
  const SEEDED = KEY + '_seeded';
  function seedDemo() {
    try {
      if (localStorage.getItem(SEEDED) || localStorage.getItem(KEY) !== null) return;
      localStorage.setItem(KEY, JSON.stringify([
        // Colours chosen from the curated set in fabrics.json — the quote row
        // resolves its swatch from there, so a colour outside it renders with a
        // blank thumbnail. Sizes are real for both.
        { fabric: 'Dupioni', colour: 'Camel',    size: '120"',      qty: 12 },
        { fabric: 'Dupioni', colour: 'Burgundy', size: '90"x156"',  qty: 6  }
      ]));
      localStorage.setItem(SEEDED, '1');
    } catch (e) { /* private mode — the basket just stays empty */ }
  }

  function paintCount() {
    const n = read().reduce((s, x) => s + x.qty, 0);
    document.querySelectorAll('[data-quote-count]').forEach(el => {
      el.textContent = n ? String(n) : '';
      el.classList.toggle('is-empty', !n);
    });
  }
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('is-on'), 2000);
  }

  /* ---------------------------------------------- search (full catalog) */
  const hay = f => (f.fabric
      ? (f.fabric + ' ' + f.group + ' ' + (f.tags||[]).join(' ') + ' ' +
         f.colours.map(c => c.name).join(' ') + ' ' + f.sizes.join(' '))
      : (f.name + ' ' + f.group + ' ' + (f.tags||[]).join(' ') + ' ' + (f.sizes||[]).join(' '))
    ).toLowerCase();
  const match = (f, q) => !q || q.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay(f).includes(t));

  /* a catalog row (may have no photograph — 87% of the live catalog) */
  function catCard(p) {
    const initials = p.name.replace(/[^A-Za-z ]/g,' ').trim().split(/\s+/)
      .slice(0,2).map(w => w[0]).join('').toUpperCase() || 'SS';
    const media = p.img
      ? `<div class="card__media${p.lowres ? ' is-lowres' : ''}">
           <img src="${BASE}assets/img/${p.img}" alt="${esc(p.name)}" loading="lazy">
           ${p.lowres ? '<span class="card__flag">Reference photo</span>' : ''}
         </div>`
      : `<div class="card__media is-empty"><span>${initials}</span>
           <span class="card__flag card__flag--none">No photo</span></div>`;
    const href = `${PAGE}product.html?p=${encodeURIComponent(slugOf(p.name))}`;
    return `<article class="card"><a class="card__link" href="${href}">${media}
      <div class="card__body"><h3>${esc(p.name)}</h3>
        <p class="card__meta">${esc(p.group)}${p.n > 1 ? ' &middot; ' + p.n + ' sizes' : ''}</p>
      </div></a></article>`;
  }

  /* ---------------------------------------------- cards */
  function card(f) {
    const c = f.colours[0];
    const sw = f.colours.slice(1, 6).map(x =>
      `<span class="mini" style="background-image:url(${BASE}assets/img/${x.img})" title="${esc(x.name)}"></span>`).join('');
    const more = f.colour_total > 6 ? `<span class="mini mini--n">+${f.colour_total - 6}</span>` : '';
    return `<article class="card">
      <a class="card__link" href="${PAGE}product.html?f=${encodeURIComponent(f.fabric)}">
        <div class="card__media${c.lowres ? ' is-lowres' : ''}">
          <img src="${BASE}assets/img/${c.img}" alt="${esc(f.fabric)}" loading="lazy">
        </div>
        <div class="card__body">
          <h3>${esc(f.fabric)}</h3>
          <p class="card__meta">${f.colour_total} colors &middot; ${f.sizes.length} sizes</p>
          <div class="minis">${sw}${more}</div>
        </div>
      </a></article>`;
  }

  /* Key customer categories — collapse the 55 raw Current RMS groups into the
     six top levels the FE displays. Back-office groups are excluded, not shown
     as shop categories. Mirrors shop.js TOPCATS. */
  const CATS = [
    ['Linens',    ['Polyester','Premium Polyester','Runners','Sashes','Napkins','Dupioni','Satin','Lamour Satin','Drapery','Crinkle','Pintuck','Sequin','Spandex','Organza','Rosey','Bengaline','Burlap','Damask','Petal Taffeta','Pinched Taffeta','Satin Stripe','Skirts','Chair Cover','Specialty','Tensil']],
    ['Chairs',    ['Chairs']],
    ['Tables',    ['Tables','Furniture','Bars & Shelving']],
    ['Tableware', ['China','Glassware','Flatware','Chargers','Serving Ware','Serving Pieces','Barware','Catering Equipment','Table Service']],
    ['Lighting',  ['Lighting']],
    ['Structures',['Stage','Tent','Dance Floor','Carpet','Infrastructure','Heating and Cooling','Decor']],
  ];
  const G2CAT = {};
  CATS.forEach(([c, gs]) => gs.forEach(g => { G2CAT[g] = c; }));
  const catOf = p => G2CAT[p.group] || null;

  const CAP = 60;   // render cap — the real build would paginate / lazy-load
  function renderGrid() {
    const grid = document.querySelector('[data-grid]'); if (!grid) return;
    const q = (document.querySelector('[data-search]') || {}).value || '';
    const on = document.querySelector('[data-chip][aria-pressed="true"]');
    const cat = on ? on.dataset.chip : '';
    const searching = !!q.trim();

    // no query + no filter -> the curated fabric view; otherwise the full catalog
    const rows = (searching || cat)
      ? CATALOG.filter(p => match(p, q) && (!cat || catOf(p) === cat))
      : FABRICS;
    const shown = rows.slice(0, CAP);
    grid.innerHTML = rows.length
      ? shown.map(r => r.fabric ? card(r) : catCard(r)).join('')
      : `<p class="empty">Nothing matches &ldquo;${esc(q)}&rdquo;. Try a fabric, a color, a size or a category.</p>`;

    const badge = document.querySelector('[data-filter-count]');
    if (badge) { badge.hidden = !cat; badge.textContent = cat ? '1' : ''; }
    const clr = document.querySelector('[data-clear]');
    if (clr) clr.hidden = !(searching || cat);

    const cnt = document.querySelector('[data-count]');
    if (cnt) {
      if (searching || cat) {
        const listings = rows.reduce((s, p) => s + (p.n || 1), 0);
        const withImg = rows.filter(p => p.img).length;
        const pct = rows.length ? Math.round(withImg / rows.length * 100) : 0;
        cnt.innerHTML = `<b>${rows.length}</b> product${rows.length === 1 ? '' : 's'} · `
          + `${listings} Current RMS listings · ${withImg} with a photo (${pct}%)`
          + (rows.length > CAP ? ` &middot; showing first ${CAP}` : '');
      } else {
        const cols = FABRICS.reduce((s, f) => s + f.colour_total, 0);
        cnt.textContent = `${FABRICS.length} fabrics · ${cols} colors`;
      }
    }
  }

  /* ---------------------------------------------- product: gallery + selection
     One selector for BOTH brands. Adapts to the data:
       • variants with photos  -> swatch grid
       • variants without      -> labelled chips
       • sizes present         -> size chips  (linens)
       • no sizes              -> size row hidden (hard goods)                */
  function renderDetail() {
    const host = document.querySelector('[data-detail]'); if (!host) return;

    // Two link shapes reach this page: catalog cards use ?p=<slug>, the
    // Collections fabric cards use ?f=<fabric name>. Only ?p was handled, so
    // every click from Collections silently fell through to PRODUCTS[0] and
    // landed on Polyester regardless of what was clicked.
    const qs   = new URLSearchParams(location.search);
    const want = qs.get('p');
    const fab  = qs.get('f');
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    let p =
      (want && PRODUCTS.find(x => x.slug === want)) ||
      (fab  && PRODUCTS.find(x => norm(x.base) === norm(fab) || x.slug === slugOf(fab))) ||
      // Landing here with no product asked for is the presentation path.
      // Dupioni is the showcase: 58 colourways x 10 sizes = 267 Current RMS
      // listings folded into one product, and it is well photographed.
      PRODUCTS.find(x => x.slug === 'dupioni') || PRODUCTS[0];
    if (!p) return;
    document.title = p.base;

    // Suppress the back-office records flagged in the gap analysis (9.5) —
    // "(copy 20181218155445)" and operator notes must never reach a customer's
    // colour picker. Filtering here mirrors what the importer should do at source.
    const JUNK = /\(copy\s|\*/i;
    if (p.variants.some(v => !JUNK.test(v.name))) {
      p = Object.assign({}, p, { variants: p.variants.filter(v => !JUNK.test(v.name)) });
    }

    let vi = Math.max(0, p.variants.findIndex(v => v.img));
    let size = p.sizes[0] || null, qty = 1;
    const anyPhoto = p.nphoto > 0;

    function paint() {
      const v = p.variants[vi];
      const sizes = (v.sizes && v.sizes.length ? v.sizes : p.sizes);
      if (size && !sizes.includes(size)) size = sizes[0] || null;

      const swatches = p.variants.map((x, i) => x.img
        ? `<button class="sw${i===vi?' is-on':''}" data-v="${i}" title="${esc(x.name)}"
             style="background-image:url(${BASE}assets/img/${x.img})"><span>${esc(x.name)}</span></button>`
        : `<button class="sw sw--none${i===vi?' is-on':''}" data-v="${i}" title="${esc(x.name)}">
             <em>${esc(x.name)}</em></button>`).join('');

      const sizeRow = sizes.length ? `
        <p class="detail__label">Size <span class="lbl-n">${sizes.length}</span></p>
        <div class="sizes">${sizes.map(sz =>
          `<button class="size${sz===size?' is-on':''}" data-s="${esc(sz)}">${esc(sz)}</button>`).join('')}</div>` : '';

      const media = v.img
        ? `<div class="gallery__main${v.lowres?' is-lowres':''}">
             <img src="${BASE}assets/img/${v.img}" alt="${esc(p.base)} ${esc(v.name)}">
             ${v.lowres?'<span class="card__flag">Reference photo</span>':''}</div>`
        : `<div class="gallery__main is-empty"><span>${esc(v.name)}</span>
             <span class="card__flag card__flag--none">No photo yet</span></div>`;

      host.innerHTML = `
      <nav class="crumbs"><a href="${PAGE}collections.html">Collections</a> <span>/</span>
        <a href="${PAGE}collections.html?q=${encodeURIComponent(p.group)}">${esc(p.group)}</a>
        <span>/</span> <em>${esc(p.base)}</em></nav>
      <div class="detail">
        <div class="gallery">
          ${media}
          <div class="gallery__strip">${swatches}</div>
          <p class="gallery__note">${p.nvar} option${p.nvar===1?'':'s'} &middot;
            ${anyPhoto ? p.nphoto + ' photographed' : 'none photographed yet'}</p>
        </div>
        <div class="detail__body">
          <p class="eyebrow">${esc(p.group)}</p>
          <h1>${esc(p.base)}</h1>
          <p class="detail__colour">${p.nvar>1?'Option':'Item'}: <strong>${esc(v.name)}</strong></p>
          <p class="detail__note">Held in Current RMS as
            <strong>${p.listings} separate listing${p.listings===1?'':'s'}</strong>${
              p.nvar>1 ? ` &mdash; ${p.nvar} option${p.nvar===1?'':'s'}` : ''}${
              p.sizes.length ? ` &times; ${p.sizes.length} size${p.sizes.length===1?'':'s'}` : ''
            }. Grouped here into one product.</p>
          ${p.nvar>1 ? `<p class="detail__label">${p.sizes.length?'Colour / finish':'Option'} <span class="lbl-n">${p.nvar}</span></p>
            <p class="pickhint">Choose below &mdash; the gallery follows your selection.</p>` : ''}
          ${sizeRow}
          <div class="detail__buy">
            <label class="qty">Qty <input type="number" min="1" value="${qty}" data-qty></label>
            <button class="btn btn--solid" data-add>Add to quote</button>
          </div>
          ${(p.tags||[]).length?`<p class="detail__tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</p>`:''}
        </div>
      </div>`;

      host.querySelectorAll('.sw').forEach(b => b.addEventListener('click', () => { vi = +b.dataset.v; paint(); }));
      host.querySelectorAll('.size').forEach(b => b.addEventListener('click', () => { size = b.dataset.s; paint(); }));
      const q = host.querySelector('[data-qty]');
      q.addEventListener('input', () => { qty = Math.max(1, parseInt(q.value,10) || 1); });
      host.querySelector('[data-add]').addEventListener('click', () => {
        add(p.base, v.name, size || '—', qty);
        toast(`Added ${qty} × ${p.base} — ${v.name}${size?' ('+size+')':''}`);
      });
    }
    paint();

    const rel = document.querySelector('[data-related]');
    if (rel) rel.innerHTML = PRODUCTS.filter(x => x.group === p.group && x.slug !== p.slug && x.img)
      .slice(0,4).map(x => `<article class="card"><a class="card__link" href="${PAGE}product.html?p=${x.slug}">
        <div class="card__media"><img src="${BASE}assets/img/${x.img}" alt="" loading="lazy"></div>
        <div class="card__body"><h3>${esc(x.base)}</h3>
          <p class="card__meta">${esc(x.group)}${x.nvar>1?' · '+x.nvar+' options':''}</p></div></a></article>`).join('');
  }

  /* ---------------------------------------------- quote */
  function renderQuote() {
    const host = document.querySelector('[data-quote]'); if (!host) return;
    const b = read();
    if (!b.length) {
      host.innerHTML = `<p class="empty">Your quote is empty. <a href="${PAGE}collections.html">Browse the collection</a>.</p>`;
      return;
    }
    const rows = b.map((it, i) => {
      const f = FABRICS.find(x => x.fabric === it.fabric);
      const c = f && f.colours.find(x => x.name === it.colour);
      return `<tr>
        <td class="qt__img">${c ? `<img src="${BASE}assets/img/${c.img}" alt="">` : ''}</td>
        <td><strong>${esc(it.fabric)}</strong><br><small>${esc(it.colour)}</small></td>
        <td>${esc(it.size)}</td><td>${it.qty}</td>
        <td><button class="linkbtn" data-rm="${i}">remove</button></td></tr>`;
    }).join('');
    host.innerHTML = `
      <table class="qt"><thead><tr><th></th><th>Item</th><th>Size</th><th>Qty</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="f2" style="margin-top:2rem;max-width:640px">
        <label class="fld"><span>Event start</span><input type="date"></label>
        <label class="fld"><span>Event end</span><input type="date"></label>
      </div>
      <div class="qt__foot">
        <p class="detail__note">On submit this becomes a <strong>Current RMS opportunity</strong> for
          <strong>${BRAND === 'dta' ? 'Decor To Adore' : 'Alabama Event Rentals'}</strong> &mdash; real
          <code>opportunity_items</code> with <code>item_id</code>, size and quantity, plus
          <code>starts_at</code>/<code>ends_at</code>, routed to that brand's store.</p>
        <button class="btn btn--solid" data-submit>Send quote request</button>
      </div>`;
    host.querySelectorAll('[data-rm]').forEach(btn => btn.addEventListener('click', () => {
      const b2 = read(); b2.splice(+btn.dataset.rm, 1); write(b2); renderQuote();
    }));
    host.querySelector('[data-submit]').addEventListener('click', () => toast('Prototype — nothing sent.'));
  }

  /* ---------------------------------------------- search mode */
  function syncSearchMode() {
    const s = document.querySelector('[data-search]');
    const q = s ? s.value.trim() : '';
    const res = document.querySelector('[data-search-results]');
    const def = document.querySelector('[data-home-default]');
    if (res && def) {
      res.hidden = !q; def.hidden = !!q;
      const lbl = res.querySelector('[data-results-for]');
      if (lbl) lbl.textContent = q ? '“' + q + '”' : 'Results';
    }
    // Search collapses the hero into a search header (see base.css). The hero
    // is 72vh on DTA / 78vh on AER, so without this the results grid starts
    // below the fold and a user who types sees nothing happen — badly so on a
    // phone, where the hero IS the viewport.
    document.body.classList.toggle('is-searching', !!q);
    renderGrid();
  }

  function wire() {
    // Home hero search jumps to the brand's browse page (search results live
    // there now, not inline on the home page). The target template is on the
    // form's data-searchnav attribute, ending in the query key —
    //   DTA: "../shop.html#q="   AER: "collections.html?q="
    // Submit or Enter appends the encoded query (or drops the key if empty).
    const navForm = document.querySelector('[data-searchnav]');
    if (navForm) navForm.addEventListener('submit', e => {
      e.preventDefault();
      const inp = navForm.querySelector('input');
      const q = inp && inp.value.trim();
      const tpl = navForm.getAttribute('data-searchnav') || '../shop.html#q=';
      location.href = q ? tpl + encodeURIComponent(q) : tpl.replace(/[#?]q=$/, '');
    });

    const s = document.querySelector('[data-search]');
    if (s) {
      s.addEventListener('input', syncSearchMode);
      const q = new URLSearchParams(location.search).get('q');
      if (q) s.value = q;
    }
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-chip]'); if (!c) return;
      const on = c.getAttribute('aria-pressed') === 'true';
      document.querySelectorAll('[data-chip]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', on ? 'false' : 'true');
      renderGrid();
    });
    const fbtn = document.querySelector('[data-filter]');
    const panel = document.querySelector('[data-filterpanel]');
    if (fbtn && panel) {
      fbtn.setAttribute('aria-expanded', 'false');
      fbtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = panel.hidden;
        panel.hidden = !open;
        fbtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', e => {
        if (!panel.hidden && !panel.contains(e.target) && e.target !== fbtn) {
          panel.hidden = true; fbtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    const clr = document.querySelector('[data-clear]');
    if (clr) clr.addEventListener('click', () => {
      const s2 = document.querySelector('[data-search]');
      if (s2) s2.value = '';
      document.querySelectorAll('[data-chip]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      if (panel) { panel.hidden = true; if (fbtn) fbtn.setAttribute('aria-expanded', 'false'); }
      syncSearchMode();
    });
    document.querySelectorAll('[data-toggle-sections]').forEach(a =>
      a.addEventListener('click', e => { e.preventDefault(); document.body.classList.toggle('show-sections'); }));
  }

  function boot(d, cat, prods) {
    FABRICS = d || []; CATALOG = cat || []; PRODUCTS = prods || [];
    const chips = document.querySelector('[data-chips]');
    if (chips && CATALOG.length) {
      const counts = {};
      CATALOG.forEach(p => { const c = catOf(p); if (c) counts[c] = (counts[c] || 0) + 1; });
      chips.innerHTML = CATS.filter(([c]) => counts[c]).map(([c]) =>
        `<button class="chip" data-chip="${esc(c)}" aria-pressed="false">${esc(c)} <em>${counts[c]}</em></button>`).join('');
    }
    const feat = document.querySelector('[data-featured]');
    if (feat) feat.innerHTML = FABRICS.slice(0, 4).map(card).join('');
    seedDemo();
    wire(); paintCount(); renderDetail(); renderQuote(); syncSearchMode();
  }

  // Data is inlined as <script> globals so the prototype works when opened
  // directly from disk — browsers block fetch() on file:// URLs.
  if (window.SS_FABRICS && window.SS_CATALOG && window.SS_PRODUCTS) {
    boot(window.SS_FABRICS, window.SS_CATALOG, window.SS_PRODUCTS);
  } else {
    Promise.all([
      fetch(BASE + 'assets/data/fabrics.json').then(r => r.json()),
      fetch(BASE + 'assets/data/catalog.json').then(r => r.json()),
      fetch(BASE + 'assets/data/products.json').then(r => r.json()),
    ]).then(([d, c, p]) => boot(d, c, p))
      .catch(e => {
        console.error('data load failed', e);
        document.querySelectorAll('[data-grid],[data-featured]').forEach(el =>
          el.innerHTML = '<p class="empty">Data could not be loaded. Open via a local server, '
            + 'or ensure assets/data/*.js are present.</p>');
      });
  }
})();
