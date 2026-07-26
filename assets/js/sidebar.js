/* ============================================================
   SIDEBAR — one registry, rendered once, capability-driven.

   The nav used to be hardcoded on every page (and lied — Categories,
   Brands, Sync, Cart all routed to the wizard). Now it renders from a
   single NAV registry into a [data-sidebar] mount, and reads the active
   source's capabilities so items the source can't back go quiet:

     • no `media`         → Media dims ("not available from <source>")
     • no `syncScheduled` → Sync relabels to "Refresh" (re-upload)
     • Cart & Quotes      → Pro-locked
     • Brands             → shown only for a multi-brand setup

   Active item is detected from the filename, so pages don't repeat markup.
   Load AFTER connectors.js and BEFORE simplitory.js (which wires the
   drawer + tier on the rendered #sb).
   ============================================================ */
( function () {
  'use strict';
  var mount = document.querySelector('[data-sidebar]');
  if (!mount) return;
  var S = window.SS_SOURCE;
  var MULTIBRAND = true;   // DTA + AER — this engagement is two-brand

  var I = {
    overview:  '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    products:  '<rect x="3" y="4" width="18" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="16" width="18" height="4"/>',
    categories:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    media:     '<rect x="3" y="5" width="18" height="14"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-4 4-2-2-7 7"/>',
    brands:    '<path d="M12 3v18M3 8h18M3 16h18"/>',
    storefront:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    cart:      '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 13h11l2-9H6"/>',
    source:    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    sync:      '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>',
    settings:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    wand:      '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M17.8 6.2l1.4-1.4M3 21l9-9M12.2 6.2 10.8 4.8"/>',
    quotes:    '<path d="M14 3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'
  };

  // registry — CATALOG (do the work) + MANAGE (display + settings).
  // `cap` gates on the active source; `pro` shows the Pro lock.
  var NAV = [
    { sec:'Catalog' },
    { key:'start',      label:'Start',      href:'simplitory.html', icon:I.overview },
    { key:'products',   label:'Products',   href:'products.html',   icon:I.products },
    { key:'quotes',     label:'Quotes',     href:'quotes.html',     icon:I.quotes, pro:true },
    { key:'cart',       label:'Cart',       href:'cart.html',       icon:I.cart, pro:true },
    { sec:'Manage' },
    { key:'storefront', label:'Storefront', href:'storefront.html',  icon:I.storefront },
    { key:'settings',   label:'Settings',   href:'settings.html',   icon:I.settings }
  ];

  // active item by filename — the wizards + setup screens highlight Wizards;
  // the media console is reached from Products, so it highlights Products;
  // Source/Sync live under Settings. (categories.html / brands.html now redirect
  // into the wizard steps, so they no longer render a sidebar.)
  var file = (location.pathname.split('/').pop() || 'simplitory.html').toLowerCase();
  var ACTIVE = { 'source.html':'wizards', 'wizard.html':'wizards', 'csv-setup.html':'wizards',
                 'google-setup.html':'wizards', 'photos.html':'products',
                 'sync.html':'settings' }[file] ||
               (NAV.filter(function (n) { return n.href && n.href.toLowerCase() === file; })[0] || {}).key;

  var srcName = (S && S.active && S.active().name) || 'this source';
  function declares(cap) { return S ? !!S.declares(cap) : true; }

  function iconSpan(inner) {
    return '<span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + inner + '</svg></span>';
  }

  function itemHtml(n) {
    if (n.sec) return '<div class="sb-sec">' + n.sec + '</div>';
    if (n.multi && !MULTIBRAND) return '';
    var on = n.key === ACTIVE ? ' on' : '';

    // Pro-locked (Cart) — keep the existing lock affordance
    if (n.pro) {
      return '<a class="nav pro-locked' + on + '" href="' + n.href + '">' + iconSpan(n.icon) + n.label +
        '<span class="lock"><span class="lock--pad">Pro</span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span></a>';
    }

    // capability gating
    if (n.cap && !declares(n.cap)) {
      // soft-degrade (Sync → Refresh) instead of disabling, where it makes sense
      if (n.softLabel) return '<a class="nav' + on + '" href="' + n.href + '" title="Manual refresh — ' + srcName + ' has no scheduled sync">' + iconSpan(n.icon) + n.softLabel + '</a>';
      return '<span class="nav nav--off" title="Not available from ' + srcName + '">' + iconSpan(n.icon) + n.label + '<span class="nav-off-tag">—</span></span>';
    }
    return '<a class="nav' + on + '" href="' + n.href + '">' + iconSpan(n.icon) + n.label + '</a>';
  }

  mount.className = 'sb';
  mount.id = 'sb';
  mount.innerHTML =
    '<div class="sb-brand">' +
      '<span class="mk">SY</span>' +
      '<span><b>Simplitory</b><span>Product manager for WordPress</span></span>' +
      '<span class="tierpill" title="Toggle plan"><span data-tier-label>Basic</span></span>' +
    '</div>' +
    NAV.map(itemHtml).join('') +
    '<div class="sb-foot">' +
      '<div class="sb-tray">' +
        '<a href="dta/index.html" title="View site"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg></a>' +
        '<a href="simplesuite.html" title="SimpleSuite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></a>' +
        '<a href="architecture.html" title="Architecture"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v18M5 8l7-5 7 5"/></svg></a>' +
        '<a href="#" title="Log out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></a>' +
      '</div>' +
      '<div class="sb-ver">Simplitory 0.2 · prototype</div>' +
    '</div>';
} )();
