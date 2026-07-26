/* ============================================================
   SELL — the back-office side of the storefront cart/quote flow.
   One file, keyed by [data-sell]: quotes · cart. Pro module.
     • quotes — incoming requests; respond or push to the RMS.
     • cart   — enable + configure what the storefront offers.
   Capability-aware: pushing a quote creates an RMS opportunity when
   the source supports orders, otherwise it emails/queues the request.
   ============================================================ */
( function () {
  'use strict';
  var root = document.querySelector('[data-sell]');
  if (!root) return;
  var S = window.SS_SOURCE;
  var kind = root.getAttribute('data-sell');
  var srcName = (S && S.active().name) || 'the source';
  var canOrder = S ? S.has('orders') : true;   // create RMS opportunity vs email/queue

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tile(v, l, accent) { return '<div class="wz-tile' + (accent ? ' accent' : '') + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translate(-50%,0);background:#10141A;color:#fff;padding:11px 16px;font:13px/1.4 Montserrat,system-ui,sans-serif;opacity:0;transition:.2s;z-index:200;max-width:80vw;text-align:center;pointer-events:none'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 2600);
  }

  /* ── Quotes inbox ── */
  var QUOTES = [
    { ref: 'Q-1042', who: 'Ashley B.',        ev: 'Wedding · Oct 17',  n: 8,  total: '$1,240', st: 'new' },
    { ref: 'Q-1041', who: 'Grace Community',  ev: 'Gala · Nov 2',      n: 22, total: '$4,850', st: 'quoted' },
    { ref: 'Q-1040', who: 'Meredith K.',      ev: 'Shower · Oct 5',    n: 6,  total: '$540',   st: 'new' },
    { ref: 'Q-1039', who: 'Priya & Sam',      ev: 'Reception · Sep 28',n: 5,  total: '$420',   st: 'won' },
    { ref: 'Q-1035', who: 'Northside HS',     ev: 'Prom · May 3',      n: 14, total: '$2,110', st: 'lost' }
  ];
  var ST = { new: ['New', 'q-new'], quoted: ['Quoted', 'q-quoted'], won: ['Won', 'q-won'], lost: ['Lost', 'q-lost'] };

  function quotes() {
    var counts = { new: 0, open: 0, won: 0 };
    QUOTES.forEach(function (q) { if (q.st === 'new') counts.new++; if (q.st === 'new' || q.st === 'quoted') counts.open++; if (q.st === 'won') counts.won++; });
    root.innerHTML =
      '<div class="wz-tiles">' + tile(counts.new, 'New requests', true) + tile(counts.open, 'Open', false) + tile(counts.won, 'Won', false) + '</div>' +
      '<div class="wz-card"><div class="wz-scroll"><table class="wz-blist"><thead><tr><th>Ref</th><th>Customer</th><th>Event</th><th>Items</th><th>Est.</th><th>Status</th><th></th></tr></thead><tbody>' +
      QUOTES.map(function (q, i) {
        var s = ST[q.st];
        return '<tr><td><b>' + esc(q.ref) + '</b></td><td>' + esc(q.who) + '</td><td class="pmeta">' + esc(q.ev) + '</td>' +
          '<td>' + q.n + '</td><td>' + esc(q.total) + '</td>' +
          '<td><span class="q-pill ' + s[1] + '">' + s[0] + '</span></td>' +
          '<td style="text-align:right"><button class="btn btn--sm" data-view="' + i + '">View</button> ' +
            (q.st === 'new' || q.st === 'quoted' ? '<button class="btn btn--sm btn--pri" data-push="' + i + '">Push to RMS</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<p class="prow-note">On push, ' + (canOrder ? 'Simplitory creates a <b>' + esc(srcName) + '</b> opportunity for the quote.' : esc(srcName) + ' can\'t take orders, so the request is <b>emailed &amp; queued</b> for the team.') + '</p>';
    root.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { toast('Opening ' + QUOTES[+b.dataset.view].ref + ' — line items, customer, event date.'); }); });
    root.querySelectorAll('[data-push]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = QUOTES[+b.dataset.push];
        toast(canOrder ? 'Created a ' + srcName + ' opportunity for ' + q.ref + ' (' + q.n + ' items).' : 'Emailed ' + q.ref + ' to the team — ' + srcName + ' has no order API.');
      });
    });
  }

  /* ── Cart config ── */
  function cart() {
    root.innerHTML =
      '<div class="set-grid">' +
        '<div class="set-card">' +
          '<div class="set-card__h"><h2>Storefront cart</h2></div>' +
          '<p class="set-lead">Let customers build a request from the browse-first shop.</p>' +
          '<div class="set-rows">' +
            '<div class="set-row"><span>Enable add-to-quote</span><label class="wz-tog"><input type="checkbox" checked><span class="tk"></span></label></div>' +
            '<div class="set-row"><span>Show prices</span><label class="wz-tog"><input type="checkbox"><span class="tk"></span></label></div>' +
          '</div>' +
        '</div>' +
        '<div class="set-card">' +
          '<div class="set-card__h"><h2>What customers can do</h2></div>' +
          '<div class="wz-cadence">' +
            '<button class="opt" data-mode="quote" aria-pressed="true">Request a quote</button>' +
            '<button class="opt" data-mode="deposit" aria-pressed="false">Reserve with deposit</button>' +
            '<button class="opt" data-mode="checkout" aria-pressed="false">Full checkout</button>' +
          '</div>' +
          '<p class="set-lead" style="margin:12px 0 0">Deposit &amp; checkout collect money through <b>CashFlow</b> — Simplitory never holds funds.</p>' +
        '</div>' +
        '<div class="set-card">' +
          '<div class="set-card__h"><h2>On submit</h2></div>' +
          '<p class="set-lead">' + (canOrder ? 'A request creates a <b>' + esc(srcName) + '</b> opportunity automatically.' : esc(srcName) + ' has no order API, so a request is <b>emailed &amp; queued</b> in Quotes.') + '</p>' +
          '<div class="set-act"><a class="btn" href="quotes.html">Open Quotes →</a></div>' +
        '</div>' +
        '<div class="set-card">' +
          '<div class="set-card__h"><h2>SimpleSuite</h2></div>' +
          '<div class="set-rows">' +
            '<div class="set-row"><span>Payments</span><b>CashFlow</b></div>' +
            '<div class="set-row"><span>Customer accounts</span><b>Identity</b></div>' +
            '<div class="set-row"><span>Notifications</span><b>Hub mailer</b></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="csv-actions" style="margin-top:16px"><span></span><button class="btn btn--pri" data-save>Save cart settings</button></div>';
    root.querySelectorAll('[data-mode]').forEach(function (o) { o.addEventListener('click', function () { root.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === o)); }); }); });
    root.querySelector('[data-save]').addEventListener('click', function () { toast('Cart settings saved.'); });
  }

  if (kind === 'quotes') quotes();
  else if (kind === 'cart') cart();
} )();
