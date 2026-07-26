/* ============================================================
   MANAGE SCREENS — the three "forever" jobs the wizard used to hide.
   One file, keyed by [data-manage]: categories · brands · sync. These
   are the ongoing-management counterparts to the setup wizard steps, so
   the sidebar nav points at real screens instead of routing to the wizard.
   Capability-aware (Sync adapts to whether the source can schedule).
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-manage]');
  if (!root) return;
  var S = window.SS_SOURCE;
  var kind = root.getAttribute('data-manage');
  var CATS = ['Linens', 'Chairs', 'Tables', 'Tableware', 'Lighting', 'Structures', 'Uncategorised'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tile(v, l, accent) { return '<div class="wz-tile' + (accent ? ' accent' : '') + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,0);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 2400);
  }

  /* ── Categories: map source groups → customer categories ── */
  function categories() {
    var groups = (window.SS_GROUPS || []).map(function (g) { return { name: g.name, category: g.category || 'Uncategorised' }; });
    function used() { var s = {}; groups.forEach(function (g) { s[g.category] = 1; }); return Object.keys(s).length; }
    root.innerHTML =
      '<div class="wz-tiles">' + tile(groups.length, 'Source groups', true) + tile('<span data-uc>' + used() + '</span>', 'Customer categories') + '</div>' +
      '<div class="wz-card"><div class="wz-scroll"><table class="wz-map"><thead><tr><th>Source group</th><th>Customer category</th></tr></thead><tbody>' +
      groups.map(function (g, i) {
        var opts = CATS.map(function (c) { return '<option' + (c === g.category ? ' selected' : '') + '>' + c + '</option>'; }).join('');
        return '<tr><td><b>' + esc(g.name) + '</b></td><td><select data-cat="' + i + '">' + opts + '</select></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="csv-actions"><span></span><button class="btn btn--pri" data-save>Save mapping</button></div>';
    root.querySelectorAll('[data-cat]').forEach(function (sel) {
      sel.addEventListener('change', function () { groups[+sel.dataset.cat].category = sel.value; var u = root.querySelector('[data-uc]'); if (u) u.textContent = used(); });
    });
    root.querySelector('[data-save]').addEventListener('click', function () { toast('Saved — group → category mapping stored.'); });
  }

  /* ── Brands: assign products to DTA / AER ── */
  function brands() {
    var products = (window.SS_PRODUCTS || []).filter(function (p) { return p.variants && p.variants.length; }).slice(0, 30);
    var state = products.map(function () { return { dta: true, aer: false }; });
    root.innerHTML =
      '<div class="wz-tiles">' + tile('<span data-dta>0</span>', 'Decor To Adore', true) + tile('<span data-aer>0</span>', 'Alabama Event Rentals') + tile('<span data-both>0</span>', 'Both brands') + '</div>' +
      '<div class="wz-card"><div class="wz-scroll"><table class="wz-blist"><tbody>' +
      products.map(function (p, i) {
        return '<tr><td><b>' + esc(p.base) + '</b><div class="pmeta">' + esc(p.group) + '</div></td>' +
          '<td><button class="bchip" data-b="dta" data-p="' + i + '" data-on="true">DTA</button>' +
              '<button class="bchip" data-b="aer" data-p="' + i + '" data-on="false">AER</button></td>' +
          '<td><code data-tags="' + i + '"></code></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="csv-actions"><span></span><button class="btn btn--pri" data-save>Save brands</button></div>';
    function recount() {
      var d = 0, a = 0, b = 0;
      state.forEach(function (v, i) {
        if (v.dta) d++; if (v.aer) a++; if (v.dta && v.aer) b++;
        var el = root.querySelector('[data-tags="' + i + '"]'); if (el) el.textContent = [v.dta && 'brand:dta', v.aer && 'brand:aer'].filter(Boolean).join(' ') || '—';
      });
      root.querySelector('[data-dta]').textContent = d; root.querySelector('[data-aer]').textContent = a; root.querySelector('[data-both]').textContent = b;
    }
    root.querySelectorAll('.bchip').forEach(function (bt) {
      bt.addEventListener('click', function () { var i = +bt.dataset.p; state[i][bt.dataset.b] = !state[i][bt.dataset.b]; bt.dataset.on = String(state[i][bt.dataset.b]); recount(); });
    });
    recount();
    root.querySelector('[data-save]').addEventListener('click', function () { toast('Saved — brand tags queued for write-back (Pro).'); });
  }

  /* ── Sync: capability-aware — scheduled cadence, or manual refresh ── */
  function sync() {
    var scheduled = S ? S.declares('syncScheduled') : true;
    var name = (S && S.active().name) || 'the source';
    var cad = [['manual', 'Manual'], ['nightly', 'Nightly'], ['hourly', 'Hourly'], ['webhook', 'On change']];
    root.innerHTML =
      '<div class="wz-tiles">' + tile('2h ago', 'Last sync', true) + tile((window.SS_PRODUCTS || []).length.toLocaleString(), 'Products in catalog') + '</div>' +
      (scheduled
        ? '<div class="wz-card"><h2 class="wz-h">Schedule</h2><div class="wz-cadence">' +
            cad.map(function (c) { return '<button class="opt" data-cad="' + c[0] + '" aria-pressed="' + (c[0] === 'nightly') + '">' + c[1] + '</button>'; }).join('') +
          '</div></div>'
        : '<div class="wz-card"><h2 class="wz-h">Refresh</h2><p class="hsub" style="margin:0">' + esc(name) + ' has no scheduled sync — re-upload the file to refresh the catalog.</p></div>') +
      '<div class="csv-actions"><span></span><button class="btn btn--pri" data-sync>' + (scheduled ? 'Sync now' : 'Re-upload to refresh') + '</button></div>';
    root.querySelectorAll('[data-cad]').forEach(function (o) {
      o.addEventListener('click', function () { root.querySelectorAll('[data-cad]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === o)); }); });
    });
    root.querySelector('[data-sync]').addEventListener('click', function () {
      if (!scheduled) { location.href = 'csv-setup.html'; return; }
      var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span> Syncing…';
      setTimeout(function () { b.disabled = false; b.textContent = '✓ Synced just now'; }, 900);
    });
  }

  if (kind === 'categories') categories();
  else if (kind === 'brands') brands();
  else if (kind === 'sync') sync();
} )();
