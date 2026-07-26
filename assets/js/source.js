/* ============================================================
   SOURCE — pick the connector. Switching the active source changes
   the capability set, which the Products screen and the storefront
   read. This is where "capabilities match the connection method"
   becomes visible: connect a CSV and the features it can't back go
   away everywhere.
   ============================================================ */
( function () {
  'use strict';
  var C = window.SS_CONNECTORS, S = window.SS_SOURCE, LBL = window.SS_CAP_LABELS;
  var root = document.querySelector('[data-source]');
  if (!root || !C) return;

  var CAP_ORDER = ['catalog','variants','media','stock','availability','orders','syncScheduled','writeTags','writeCatalog'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function capChip(v, name) {
    var cls = window.SS_capClass ? window.SS_capClass(v) : (v === 1 ? 'cap on' : (v === 'pro' ? 'cap pro' : 'cap off'));
    var lab = LBL[name] + (v === 'pro' ? ' · Pro' : '');
    return '<span class="' + cls + '">' + esc(lab) + '</span>';
  }

  function render() {
    var activeId = S.activeId();
    var imp = S.importData();
    root.innerHTML = Object.keys(C).filter(function (id) { return id !== 'snapshot'; }).map(function (id) {
      var c = C[id], on = id === activeId;
      // capabilities come from S.capsFor — for CSV that's the DERIVED set
      // (what the last import actually mapped), not the static declaration.
      var capset = S.capsFor(id);
      var caps = CAP_ORDER.map(function (n) { return capChip(capset[n], n); }).join('');
      var detail = c.detail;
      var foot;
      if (id === 'csv') {
        // CSV setup is a guided flow, not a one-click switch.
        var imported = !!(imp && imp.products && imp.products.length);
        detail = imported ? (esc(imp.fileName) + ' · ' + imp.rowCount.toLocaleString() + ' rows · imported')
                          : 'not yet set up';
        if (on) {
          foot = '<span class="badge-active">✓ Active source</span>' +
                 '<a class="btn btn--sm" href="csv-setup.html">Reconfigure</a>';
        } else if (imported) {
          foot = '<button class="btn btn--pri" data-use="csv">Use this source</button>' +
                 '<a class="btn btn--sm" href="csv-setup.html">Reconfigure</a>';
        } else {
          foot = '<a class="btn btn--pri" href="csv-setup.html">Set up this source →</a>';
        }
        return '<div class="cxn' + (on ? ' active' : '') + '">' +
          '<div class="cxn__h"><b>' + esc(c.name) + '</b></div>' +
          '<div class="cxn__k">' + esc(c.kind) + '</div>' +
          '<div class="cxn__d">' + detail + '</div>' +
          '<div class="cxn__caps">' + caps + '</div>' +
          '<div class="cxn__note">' + esc(c.note) + '</div>' +
          '<div class="cxn__foot">' + foot + '</div></div>';
      }
      // Google Workspace has a guided setup too (sign in → pick Sheet + folder).
      if (id === 'google') {
        var gfoot = on
          ? '<span class="badge-active">✓ Active source</span><a class="btn btn--sm" href="google-setup.html">Reconfigure</a>'
          : '<a class="btn btn--pri" href="google-setup.html">Set up this source →</a>';
        return '<div class="cxn' + (on ? ' active' : '') + '">' +
          '<div class="cxn__h"><b>' + esc(c.name) + '</b></div>' +
          '<div class="cxn__k">' + esc(c.kind) + '</div>' +
          '<div class="cxn__d">' + esc(detail) + '</div>' +
          '<div class="cxn__caps">' + caps + '</div>' +
          '<div class="cxn__note">' + esc(c.note) + '</div>' +
          '<div class="cxn__foot">' + gfoot + '</div></div>';
      }
      foot = on
        ? '<span class="badge-active">✓ Active source</span>'
        : '<button class="btn btn--pri" data-use="' + id + '">Use this source</button>';
      // Current RMS has its own setup wizard (like the CSV card).
      if (id === 'current-rms') foot += '<a class="btn btn--sm" href="wizard.html">' + (on ? 'Reconfigure' : 'Set up') + '</a>';
      return '<div class="cxn' + (on ? ' active' : '') + '">' +
        '<div class="cxn__h"><b>' + esc(c.name) + '</b></div>' +
        '<div class="cxn__k">' + esc(c.kind) + '</div>' +
        '<div class="cxn__d">' + esc(detail) + '</div>' +
        '<div class="cxn__caps">' + caps + '</div>' +
        '<div class="cxn__note">' + esc(c.note) + '</div>' +
        '<div class="cxn__foot">' + foot + '</div></div>';
    }).join('');

    root.querySelectorAll('[data-use]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.setActive(b.dataset.use);
        render();
        toast('Switched active source to ' + C[b.dataset.use].name + '. Products and the storefront now match its capabilities.');
      });
    });
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'sy-toast'; document.body.appendChild(toastEl);
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,10px);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; }
    toastEl.textContent = msg; toastEl.style.opacity = '1'; toastEl.style.transform = 'translate(-50%,0)';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 2800);
  }

  // re-render on tier toggle so Pro caps flip locked/active live
  window.SIMPLITORY_onTier = function () { render(); };

  // Deep-link: source.html#use=current-rms sets the active source on load
  // (handy for resetting the demo without a click).
  var mu = (location.hash || '').match(/use=([a-z-]+)/i);
  if (mu && C[mu[1]]) S.setActive(mu[1]);

  render();
} )();
