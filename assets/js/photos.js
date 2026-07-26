/* Fix my photos — media console. Real data: catalog.js (SS_CATALOG) —
   2,572 grouped products from 3,889 Current RMS listings; 353 photographed,
   26 of those low-res references.

   Simplified per R3, then reworked to Glenn's punch-list:
     • hero headline + coverage meter on one row (2 col)
     • product-page search + Filter popup (photo status + category)
     • "Start here" = colored button → biggest-wins popup (quick jump)
     • "AI scene (BYOK)" = a one-time, cached "see it in action" staging:
       recolor a staged room to a product's colour. The render is a single
       token spend (your key, via the Hub AI broker) that CACHES a variant
       set — so browsing colours afterward is free, unlike a live per-view
       render that would burn tokens every load. */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  let ALL = [], VIEW = [], SEL = new Set(), SHOOT = new Set();
  let filter = 'missing', group = '', q = '', page = 0;
  const PAGE = 48;

  const isLow = p => p.img && p.lowres;
  const pstate = p => !p.img ? 'missing' : (p.lowres ? 'lowres' : 'ok');

  // event-colour palette for the AI scene (BYOK "see it in action")
  const AI_COLORS = [['Blush','#E7B7BE'],['Sage','#A9BBA0'],['Dusty Blue','#8EA6BE'],['Navy','#2C3A57'],
                     ['Gold','#C6A15B'],['Burgundy','#6E2438'],['Ivory','#EFE7D6'],['Emerald','#1F6E52']];

  function apply() {
    VIEW = ALL.filter(p => {
      if (group && p.group !== group) return false;
      if (filter === 'missing' && p.img) return false;
      if (filter === 'lowres'  && !isLow(p)) return false;
      if (filter === 'ok'      && (!p.img || p.lowres)) return false;
      if (q) {
        const h = (p.name + ' ' + p.group + ' ' + (p.tags||[]).join(' ')).toLowerCase();
        if (!q.toLowerCase().split(/\s+/).every(t => h.includes(t))) return false;
      }
      return true;
    });
    page = 0; paint();
  }

  /* ── hero: heading + text (left) · coverage meter (right), one row ── */
  function hero() {
    const n = ALL.length, ok = ALL.filter(p => p.img && !p.lowres).length;
    const low = ALL.filter(isLow).length, miss = ALL.filter(p => !p.img).length;
    const pct = Math.round(ok / n * 100);
    $('#hero').innerHTML =
      `<div class="ph-hero__grid">
        <div class="ph-hero__text">
          <div class="ph-hero__big"><span class="ph-hero__n">${miss.toLocaleString()}</span>` +
            `<span class="ph-hero__lab">products still need a photo</span></div>
          <p class="ph-hero__ctx"><b>${ok}</b> have a usable photo${low ? ` · ${low} low-res reference only` : ''} · ${n.toLocaleString()} products in the catalog</p>
        </div>
        <div class="ph-hero__meter">
          <p class="ph-meter__h">Photo coverage</p>
          <div class="ph-prog"><div class="have" style="flex:${ok}"></div>${low ? `<div class="low" style="flex:${low}"></div>` : ''}<div style="flex:${miss}"></div></div>
          <p class="ph-prog__cap"><b>${pct}% photographed</b> — the rest is your launch to-do list</p>
        </div>
      </div>`;
  }

  // per-category coverage (biggest wins = most product still missing a photo)
  function bigWins() {
    const by = {};
    ALL.forEach(p => { const g = by[p.group] || (by[p.group] = { n:0, ok:0 }); g.n++; if (p.img) g.ok++; });
    return Object.entries(by).map(([g,v]) => ({ g, n:v.n, ok:v.ok, miss:v.n - v.ok }));
  }

  /* ── Filter popup (photo status + category) — mirrors the Products page ── */
  function renderFilters() {
    const stats = [['missing','Needs a photo'],['lowres','Low-res only'],['ok','Has a photo'],['all','All']];
    $('#statchips').innerHTML = stats.map(s => `<button class="fchip${filter===s[0]?' on':''}" data-f="${s[0]}">${s[1]}</button>`).join('');
    const cats = bigWins().sort((a,b) => b.n - a.n);
    const cc = $('#catchips');
    cc.style.maxHeight = '168px'; cc.style.overflow = 'auto';
    cc.innerHTML = `<button class="fchip${group===''?' on':''}" data-cat="">All</button>` +
      cats.map(c => `<button class="fchip${group===c.g?' on':''}" data-cat="${esc(c.g)}">${esc(c.g)} <em>${c.miss}</em></button>`).join('');
    $$('#statchips .fchip').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; apply(); renderFilters(); updateFilterBtn(); }));
    $$('#catchips .fchip').forEach(b => b.addEventListener('click', () => { group = b.dataset.cat; apply(); renderFilters(); renderStart(); updateFilterBtn(); }));
  }
  function updateFilterBtn() {
    const active = (filter !== 'missing') || group !== '';
    const btn = $('#filtbtn');
    btn.classList.toggle('is-active', active);
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></svg> Filter${active ? ' <em>•</em>' : ''}`;
  }

  /* ── Start here popup (biggest wins, one-click jump) ── */
  function renderStart() {
    const rows = bigWins().filter(r => r.miss > 0).sort((a,b) => b.miss - a.miss).slice(0, 8);
    $('#startpop').innerHTML =
      `<h4>Start here — the biggest wins</h4>` +
      `<p>Categories with the most products still missing a photo. Pick one to jump to its shoot list.</p>` +
      `<div class="startpop__row">` +
        `<button class="startchip reset${group===''?' is-on':''}" data-g=""><b>All categories</b><span>${ALL.length.toLocaleString()} products</span></button>` +
        rows.map(r => `<button class="startchip${group===r.g?' is-on':''}" data-g="${esc(r.g)}"><b>${esc(r.g)}</b><span>${r.miss.toLocaleString()} to shoot</span></button>`).join('') +
      `</div>`;
    $$('#startpop .startchip').forEach(b => b.addEventListener('click', () => {
      group = b.dataset.g;
      if (group) filter = 'missing';
      closePops(); apply(); renderStart(); renderFilters(); updateFilterBtn();
    }));
  }

  function closePops() {
    $('#filtpop').setAttribute('hidden',''); $('#filtbtn').classList.remove('is-open');
    $('#startpop').setAttribute('hidden',''); $('#startbtn').classList.remove('is-open');
  }

  /* ── grid card ── */
  function card(p) {
    const st = pstate(p);
    const initials = p.name.replace(/[^A-Za-z ]/g,' ').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'SS';
    const media = p.img ? `<img src="assets/img/${p.img}" alt="" loading="lazy">` : `<span class="ph">${initials}</span>`;
    const badge = st==='ok' ? `<b class="b ok">${p.w?p.w+'×'+p.h:'OK'}</b>`
      : st==='lowres' ? `<b class="b low">${p.w}&times;${p.h}</b>` : '<b class="b miss">No photo</b>';
    return `<article class="pc${SEL.has(p.id)?' is-sel':''}" data-id="${p.id}">
      <div class="pc__m ${p.img?'':'is-empty'}">${media}${badge}
        <input type="checkbox" class="pc__ck" ${SEL.has(p.id)?'checked':''} aria-label="select">
      </div>
      <div class="pc__b">
        <h4>${esc(p.name)}</h4>
        <p>${esc(p.group)}${p.n>1?' · '+p.n+' sizes':''}${p.kb?' · '+p.kb+'KB':''}</p>
        <div class="pc__a">
          <button data-act="upload">Upload</button>
          <button data-act="crms">CRMS</button>
          <button data-act="shoot" class="${SHOOT.has(p.id)?'is-on':''}">Shoot</button>
          <button data-act="ai" class="ai" title="See it in action (AI scene)">&#10022;</button>
        </div>
      </div></article>`;
  }

  function paint() {
    const slice = VIEW.slice(0, (page+1)*PAGE);
    $('#grid').innerHTML = slice.length ? slice.map(card).join('') : '<p class="empty2">Nothing matches those filters.</p>';
    $('#more').style.display = slice.length < VIEW.length ? 'inline-flex' : 'none';
    $('#more').textContent = `Load more (${VIEW.length - slice.length} remaining)`;
    paintCounts();
    $('#shootn').textContent = SHOOT.size;

    $$('.pc__ck').forEach(ck => ck.addEventListener('change', e => {
      const id = +e.target.closest('.pc').dataset.id;
      e.target.checked ? SEL.add(id) : SEL.delete(id);
      e.target.closest('.pc').classList.toggle('is-sel', e.target.checked);
      paintCounts();
    }));
    $$('.pc__a button').forEach(b => b.addEventListener('click', e => {
      const pc = e.target.closest('.pc'), id = +pc.dataset.id, act = e.target.dataset.act;
      const p = ALL.find(x => x.id === id);
      if (act === 'shoot') {
        SHOOT.has(id) ? SHOOT.delete(id) : SHOOT.add(id);
        e.target.classList.toggle('is-on', SHOOT.has(id));
        $('#shootn').textContent = SHOOT.size;
      } else if (act === 'ai') {
        aiOpen(p);
      } else {
        toast(act === 'upload'
          ? 'Prototype — file picker would open, then the image is re-hosted in the WordPress media library.'
          : 'Prototype — would list this product’s Current RMS attachments to pick from.');
      }
    }));
  }
  function paintCounts() {
    const withImg = VIEW.filter(p=>p.img).length;
    $('#vcount').innerHTML = `<b>${VIEW.length.toLocaleString()}</b> shown · ${withImg} with a photo`
      + (SEL.size ? ` · <b>${SEL.size}</b> selected` : '');
    $('#bulk').style.display = SEL.size ? 'flex' : 'none';
  }
  function toast(m) {
    let t = $('.toast2'); if (!t) { t = document.createElement('div'); t.className='toast2'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(t._t);
    t._t = setTimeout(()=>t.classList.remove('on'), 2600);
  }

  /* ── AI scene (BYOK) — one-time render, cached variant set ── */
  let aiProduct = null, aiColorIdx = 0;
  function lighten(hex, amt) { return mix(hex, 255, amt); }
  function darken(hex, amt)  { return mix(hex, 0, amt); }
  function mix(hex, target, amt) {
    const c = hex.replace('#',''); const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    const f = v => Math.round(v + (target - v) * amt);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function aiScene(hex) {
    const cloth = hex, top = lighten(hex, .16), drape = lighten(hex, .34), fold = darken(hex, .12);
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill="#F1ECE4"/>
      <rect y="212" width="400" height="88" fill="#E3DACC"/>
      <rect x="24" y="18" width="66" height="196" fill="${drape}"/>
      <rect x="52" y="18" width="10" height="196" fill="${fold}" opacity=".35"/>
      <rect x="310" y="18" width="66" height="196" fill="${drape}"/>
      <rect x="338" y="18" width="10" height="196" fill="${fold}" opacity=".35"/>
      <ellipse cx="200" cy="256" rx="128" ry="24" fill="rgba(0,0,0,.10)"/>
      <rect x="176" y="150" width="14" height="58" fill="#7A6650"/>
      <rect x="210" y="150" width="14" height="58" fill="#7A6650"/>
      <path d="M104 188 Q200 172 296 188 L308 262 Q200 284 92 262 Z" fill="${cloth}"/>
      <path d="M104 188 Q200 172 296 188 L296 196 Q200 182 104 196 Z" fill="${fold}" opacity=".4"/>
      <ellipse cx="200" cy="188" rx="96" ry="22" fill="${top}"/>
      <ellipse cx="200" cy="178" rx="15" ry="9" fill="#8FA98A"/>
      <circle cx="190" cy="172" r="6" fill="#E9C6CE"/><circle cx="210" cy="173" r="6" fill="#F0D9A8"/>
      <circle cx="200" cy="168" r="5" fill="#EBD3DA"/>
      <circle cx="148" cy="182" r="4" fill="#D8CBB6"/><circle cx="252" cy="182" r="4" fill="#D8CBB6"/>
    </svg>`;
  }
  function aiStatus(loading) {
    if (loading) return `<div class="aitokens"><div class="aitok-head"><b>One-time render</b>` +
      `<span class="aitok-cached" style="color:var(--sy-muted);background:none">rendering…</span></div>` +
      `<div class="aitok-bar">${'<i style="opacity:.28"></i>'.repeat(8)}</div>` +
      `<p>Generating a colour-variant set with your key…</p></div>`;
    return `<div class="aitokens"><div class="aitok-head"><b>One-time render · 8 variants</b>` +
      `<span class="aitok-cached">&#10003; cached</span></div>` +
      `<div class="aitok-bar">${'<i></i>'.repeat(8)}</div>` +
      `<p><b>8 tokens</b> spent once to render the set. Switching colours now is instant and free — the variants are cached, not re-rendered live (which would burn tokens on every view).</p>` +
      `<p class="aitok-key">Uses your own AI key (BYOK) via the Hub AI broker.</p></div>`;
  }
  function aiName(p) { return p ? esc(p.name || p.base || 'a product') : 'a product'; }
  function aiHtml(p) {
    const c = AI_COLORS[aiColorIdx];
    const thumb = p && p.img ? `style="background-image:url(assets/img/${esc(p.img)})"` : '';
    return `<div class="aimodal__scrim" data-aiclose></div>
      <div class="aimodal__panel">
        <button class="aimodal__x" data-aiclose aria-label="Close">&times;</button>
        <div class="aimodal__hd">
          <h2>See it in action <span class="aibadge">AI &middot; BYOK</span></h2>
          <p class="aimodal__sub">Stage your palette in a real room and recolor the scene to match a product. Rendered once with your own AI key via the Hub broker, then cached — browsing colours afterward costs nothing.</p>
        </div>
        <div class="aimodal__body">
          <div class="aiscene">
            <div class="aiscene__load"><div><span class="spin"></span><br>Rendering variant set…<br><small>one-time · your key</small></div></div>
            <div data-aisvg>${aiScene(c[1])}</div>
            <div class="aiscene__tag">Staging <b>${aiName(p)}</b> · <b data-aicolorname>${c[0]}</b></div>
          </div>
          <div class="aiside">
            <div class="aiside__prod"><span class="aiside__thumb" ${thumb}></span>
              <div><b>${aiName(p)}</b><span>${p ? esc(p.group||'') : ''}</span></div></div>
            <p class="aiside__lbl">Recolor the scene</p>
            <div class="aiswatches">${AI_COLORS.map((cc,i) => `<button class="aisw${i===aiColorIdx?' is-on':''}" data-ai="${i}" style="background:${cc[1]}" title="${cc[0]}"></button>`).join('')}</div>
            <div data-aistatus>${aiStatus(true)}</div>
            <button class="btn btn--pri aiside__use" data-aiuse>Use as this product’s “see it in action” image</button>
          </div>
        </div>
      </div>`;
  }
  function aiOpen(p) {
    aiProduct = p || VIEW[0] || ALL[0]; aiColorIdx = 0;
    const m = $('#aimodal');
    m.innerHTML = aiHtml(aiProduct);
    m.removeAttribute('hidden');
    wireAi(m);
    setTimeout(() => {
      const load = m.querySelector('.aiscene__load'); if (load) load.style.display = 'none';
      const st = m.querySelector('[data-aistatus]'); if (st) st.innerHTML = aiStatus(false);
    }, 950);
  }
  function aiClose() { const m = $('#aimodal'); m.setAttribute('hidden',''); m.innerHTML = ''; }
  function wireAi(m) {
    m.querySelectorAll('[data-aiclose]').forEach(b => b.addEventListener('click', aiClose));
    m.querySelectorAll('[data-ai]').forEach(b => b.addEventListener('click', () => {
      aiColorIdx = +b.dataset.ai;
      m.querySelector('[data-aisvg]').innerHTML = aiScene(AI_COLORS[aiColorIdx][1]);
      m.querySelector('[data-aicolorname]').textContent = AI_COLORS[aiColorIdx][0];
      m.querySelectorAll('.aisw').forEach(s => s.classList.toggle('is-on', s === b));
    }));
    const use = m.querySelector('[data-aiuse]');
    if (use) use.addEventListener('click', () => toast('Prototype — would save the AI-staged scene as “' + aiName(aiProduct) + '” in the ' + AI_COLORS[aiColorIdx][0] + ' colourway.'));
  }

  function boot(d) {
    ALL = d;
    hero(); renderFilters(); updateFilterBtn(); renderStart(); apply();

    $('#q').addEventListener('input', e => { q = e.target.value; apply(); });

    $('#filtbtn').addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#filtpop'), opening = pop.hasAttribute('hidden');
      closePops();
      if (opening) { pop.removeAttribute('hidden'); $('#filtbtn').classList.add('is-open'); }
    });
    $('#startbtn').addEventListener('click', e => {
      e.stopPropagation();
      const pop = $('#startpop'), opening = pop.hasAttribute('hidden');
      closePops();
      if (opening) { pop.removeAttribute('hidden'); $('#startbtn').classList.add('is-open'); }
    });
    document.addEventListener('click', e => {
      if (e.target.closest('#filtpop') || e.target.closest('#filtbtn') ||
          e.target.closest('#startpop') || e.target.closest('#startbtn')) return;
      closePops();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePops(); aiClose(); } });

    $('#aibtn').addEventListener('click', () => aiOpen(null));

    $('#more').addEventListener('click', () => { page++; paint(); });
    $('#selall').addEventListener('click', () => { VIEW.slice(0,(page+1)*PAGE).forEach(p=>SEL.add(p.id)); paint(); });
    $('#clear').addEventListener('click', () => { SEL.clear(); paint(); });
    $('#addshoot').addEventListener('click', () => { SEL.forEach(id=>SHOOT.add(id)); SEL.clear(); paint(); toast('Added to the shoot list.'); });
    $('#export').addEventListener('click', () => {
      const rows = ALL.filter(p=>SHOOT.has(p.id));
      if (!rows.length) return toast('Shoot list is empty — add products, then export.');
      toast(`Prototype — would export ${rows.length} rows as CSV (name, category, sizes, RMS ids).`);
    });
  }

  if (window.SS_CATALOG) boot(window.SS_CATALOG);
  else fetch('assets/data/catalog.json').then(r=>r.json()).then(boot)
    .catch(e => { console.error(e);
      document.getElementById('grid').innerHTML = '<p class="empty2">Data could not be loaded — assets/data/catalog.js missing.</p>'; });
})();
