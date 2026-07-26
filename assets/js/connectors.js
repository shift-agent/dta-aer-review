/* ============================================================
   CONNECTORS — the capability model that makes features adapt.

   Each source declares which capabilities it can back. The active
   source is stored in localStorage and shared across the admin AND
   the storefront, so switching the connector changes what the whole
   product surfaces — features "quietly deprecate" when the source
   can't provide the data behind them.

   Capability vocabulary (from the audit brief §3.1, + price):
     catalog   variants   media   price   stock   availability   orders
     syncScheduled   writeTags   writeCatalog
   Value: 1 = yes · 0 = no · 'pro' = yes but only on the Pro plan.

   THE CSV CONNECTOR IS SPECIAL. Its capability set is NOT hardcoded —
   it is DERIVED from the column mapping the user chose in the setup
   wizard. Map an image column → media lights up. Map a price column →
   price lights up. Don't map stock → no stock, so the storefront drops
   date-availability. The gating is driven by the real upload, exactly
   as the audit asks. The import (mapping + normalised rows) lives in
   localStorage; the wizard writes it, everything else reads it.
   ============================================================ */
( function () {
  'use strict';

  var CONNECTORS = {
    'current-rms': {
      id: 'current-rms', name: 'Current RMS', kind: 'Rental system · API',
      detail: 'decortoadore', connected: true,
      caps: { catalog:1, variants:1, media:1, price:0, stock:1, availability:1, orders:1,
              syncScheduled:1, writeTags:'pro', writeCatalog:0 },
      note: 'The richest source — every feature lights up. Write-back is a Pro capability.'
    },
    'csv': {
      id: 'csv', name: 'CSV / spreadsheet', kind: 'File upload',
      detail: 'not yet set up', connected: false,
      // BASE declaration (before any import). The live set is computed from
      // the column mapping — see csvCaps(). Catalog only until a file is mapped.
      caps: { catalog:1, variants:0, media:0, price:0, stock:0, availability:0, orders:0,
              syncScheduled:0, writeTags:0, writeCatalog:0 },
      note: 'A flat export. What it can back depends on which columns you map — no order history or live stock, so refresh = re-upload.'
    },
    'google': {
      id: 'google', name: 'Google Workspace', kind: 'Sheets + Drive · API',
      detail: 'one Google sign-in', connected: false,
      // One OAuth connection serves both: a Sheet is the catalog, a Drive
      // folder is the media. Capabilities are the UNION of the two.
      caps: { catalog:1, variants:0, media:1, price:0, stock:1, availability:0, orders:0,
              syncScheduled:1, writeTags:'pro', writeCatalog:'pro' },
      note: 'One Google connection — a live Sheet for the catalog and a Drive folder for images. Scheduled sync, an optional stock column, and (Pro) edits written back to the sheet.'
    },
    // THE EXIT STRATEGY (the "trap door"). Not a setup-able source — it's the
    // state after a customer detaches. The catalog is materialized into native
    // WordPress at publish, so on eject the active source becomes this local
    // snapshot declaring only what's already saved: catalog + variants + media.
    // Everything that needs a live source (stock, availability, most-rented,
    // scheduled sync, write-back, cart→RMS) quietly disappears via the SAME
    // capability model — the console goes dark, the website stays up.
    'snapshot': {
      id: 'snapshot', name: 'WordPress snapshot', kind: 'Detached · local',
      detail: 'last published catalog — no live source', connected: true,
      caps: { catalog:1, variants:1, media:1, price:0, stock:0, availability:0, orders:0,
              syncScheduled:0, writeTags:0, writeCatalog:0 },
      note: 'The frozen last-published catalog stored in WordPress. Browsing, categories, images and pairings survive; live features are paused until you reconnect a source.'
    }
  };

  var CAP_LABELS = {
    catalog:'catalog', variants:'variants', media:'images', price:'price', stock:'stock',
    availability:'availability', orders:'order history', syncScheduled:'scheduled sync',
    writeTags:'write tags', writeCatalog:'write catalog'
  };

  /* ── CSV import store (written by the setup wizard) ──────────────
     Shape: { fileName, rowCount, importedAt, mapping, products }
       mapping — { name, category, description, price, image, tags,
                   variantCount, stock } → each is a source-column
                   header string, or null if the user left it unmapped.
       products — normalised to the app's product shape:
                   { slug, base, group, img, tags[], nvar, variants[],
                     listings, price, description } */
  var IMPORT_KEY = 'simplitory_csv_import';
  function loadImport() {
    try { return JSON.parse(localStorage.getItem(IMPORT_KEY) || 'null'); } catch (e) { return null; }
  }
  function saveImport(obj) {
    try { localStorage.setItem(IMPORT_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function clearImport() { try { localStorage.removeItem(IMPORT_KEY); } catch (e) {} }
  function hasImport() { var i = loadImport(); return !!(i && i.products && i.products.length); }

  /* Derive the CSV capability set from what the user actually mapped. */
  function csvCaps() {
    var imp = loadImport();
    var m = imp && imp.mapping || {};
    return {
      catalog: 1,                       // name is always required to import
      variants: m.variantCount ? 1 : 0,
      media:    m.image ? 1 : 0,
      price:    m.price ? 1 : 0,
      stock:    m.stock ? 1 : 0,
      availability: 0,                  // a CSV never has free-on-a-date
      orders:   0,                      // …nor order history
      syncScheduled: 0,                 // refresh = re-upload
      writeTags: 0,                     // nothing to write back to
      writeCatalog: 0
    };
  }
  /* CSV detail line reflects import state. */
  function csvDetail() {
    var imp = loadImport();
    if (imp && imp.products) return (imp.fileName || 'upload') + ' · ' + imp.rowCount.toLocaleString() + ' rows · imported';
    return 'not yet set up';
  }

  var KEY = 'simplitory_source';
  function rawActiveId() {
    try { return localStorage.getItem(KEY) || 'current-rms'; } catch (e) { return 'current-rms'; }
  }
  function activeId() {
    var id = rawActiveId();
    // Guard: CSV is only a real active source once a file has been imported.
    // Otherwise fall back to the reference connector so nothing renders empty.
    if (id === 'csv' && !hasImport()) return 'current-rms';
    return CONNECTORS[id] ? id : 'current-rms';
  }
  // capabilities for a given connector id — computed for CSV.
  function capsFor(id) { return id === 'csv' ? csvCaps() : (CONNECTORS[id] ? CONNECTORS[id].caps : {}); }
  function active() {
    var id = activeId(), c = CONNECTORS[id];
    if (id !== 'csv') return c;
    // clone with the computed set + live detail/connected state
    var clone = {}; for (var k in c) clone[k] = c[k];
    clone.caps = csvCaps(); clone.detail = csvDetail(); clone.connected = hasImport();
    return clone;
  }
  function setActive(id) {
    if (!CONNECTORS[id]) return;
    try { localStorage.setItem(KEY, id); } catch (e) {}
  }
  // the catalog the whole app should read — CSV rows when a CSV is active
  // and imported, otherwise the reference (Current RMS) pull.
  function catalog() {
    if (activeId() === 'csv') { var imp = loadImport(); if (imp && imp.products) return imp.products; }
    return window.SS_PRODUCTS || [];
  }
  // capability check — honours the Pro plan for 'pro'-gated caps.
  function has(capName) {
    var v = active().caps[capName];
    if (v === 1) return true;
    if (v === 'pro') return !!(window.SIMPLITORY_tierIsPro && window.SIMPLITORY_tierIsPro());
    return false;
  }
  // raw declaration (ignores plan) — for the capability display.
  function declares(capName) { return active().caps[capName]; }

  window.SS_CONNECTORS = CONNECTORS;
  window.SS_CAP_LABELS = CAP_LABELS;
  window.SS_SOURCE = {
    activeId: activeId, active: active, setActive: setActive, has: has, declares: declares,
    capsFor: capsFor, catalog: catalog,
    importData: loadImport, saveImport: saveImport, clearImport: clearImport, hasImport: hasImport
  };

  // Cap-chip class, plan-aware: a Pro capability renders "locked" (struck)
  // in Basic and active in Pro — so write-back visibly turns off in Basic.
  window.SS_capClass = function (v) {
    if (v === 1) return 'cap on';
    if (v === 'pro') return (window.SIMPLITORY_tierIsPro && window.SIMPLITORY_tierIsPro()) ? 'cap pro' : 'cap locked';
    return 'cap off';
  };
} )();
