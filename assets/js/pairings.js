/* ============================================================
   PAIRINGS — one shared engine for "what rents together".

   The admin (storefront.js) curates pairings and the storefront FE
   (shop.js) surfaces them as "Completes the look". Both read THIS module
   so there is a single source of truth — the FE shows exactly what the
   admin curates, no drift.

   MODELLED, labelled: real source is Current RMS order co-occurrence
   (which products appear on the same opportunity). Here it's modelled
   deterministically from category affinity + rent frequency, so it is
   stable per product (never random) and the live data drops into the
   same slots. Gated on the `orders` capability by the callers.

   API:
     SS_PAIRINGS.for(slugOrProduct, limit)  → [product, …] paired items
     SS_PAIRINGS.catOf(product)             → category key or null
     SS_PAIRINGS.remove(heroSlug, slug)     → drop a pairing (session)
     SS_PAIRINGS.add(heroSlug)              → add the next natural match
     SS_PAIRINGS.listFor(heroSlug, limit)   → curated slugs (override-aware)
   ============================================================ */
( function () {
  'use strict';
  var PRODUCTS = window.SS_PRODUCTS || [];
  var RENT = (window.SS_RENTFREQ && window.SS_RENTFREQ.by_slug) || {};

  // the six customer categories → their source groups (matches shop.js / storefront.js)
  var CATGROUPS = {
    linens: ['Polyester','Premium Polyester','Runners','Sashes','Napkins','Dupioni','Satin','Lamour Satin','Drapery','Crinkle','Pintuck','Sequin','Spandex','Organza','Rosey','Bengaline','Burlap','Damask','Petal Taffeta','Pinched Taffeta','Satin Stripe','Skirts','Chair Cover','Specialty','Tensil'],
    chairs: ['Chairs'],
    tables: ['Tables','Furniture','Bars & Shelving'],
    tableware: ['China','Glassware','Flatware','Chargers','Serving Ware','Serving Pieces','Barware','Catering Equipment','Table Service'],
    lighting: ['Lighting'],
    structures: ['Stage','Tent','Dance Floor','Carpet','Infrastructure','Heating and Cooling','Decor']
  };
  var GMAP = {}; Object.keys(CATGROUPS).forEach(function (k) { CATGROUPS[k].forEach(function (g) { GMAP[g] = k; }); });

  // which categories naturally pair — the "pairs with" affinity
  var AFFINITY = { linens:['chairs','tableware'], chairs:['tables','linens'], tables:['linens','tableware'],
                   tableware:['linens','tables'], lighting:['structures','linens'], structures:['lighting','tables'] };

  var byslug = {}; PRODUCTS.forEach(function (p) { byslug[p.slug] = p; });

  function catOf(p) { return p ? (GMAP[p.group] || null) : null; }
  function rentScore(p) {
    var r = RENT[p.slug];
    if (r && r.orders != null) return r.orders;
    return (p.listings || 1) / 40 + (p.nvar || 1) * 0.5;    // modelled fallback (unrented long tail)
  }
  function hash(s) { var h = 0, i; s = String(s); for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  // photographed products of a category, ranked by rent (best pair candidates first)
  function topOf(catKey, excludeSlug) {
    return PRODUCTS.filter(function (p) { return catOf(p) === catKey && p.img && p.slug !== excludeSlug; })
                   .sort(function (a, b) { return rentScore(b) - rentScore(a); });
  }

  // deterministic seed: up to 2 from each affinity category, rotated per-hero
  // by a slug hash so different products surface different (stable) pairs.
  function seedFor(hero, limit) {
    limit = limit || 4;
    var cat = catOf(hero); if (!cat) return [];
    var affs = AFFINITY[cat] || [], off = hash(hero.slug), out = [], seen = {};
    affs.forEach(function (ac) {
      var pool = topOf(ac, hero.slug); if (!pool.length) return;
      var start = off % Math.min(pool.length, 5), taken = 0;
      for (var k = 0; k < pool.length && taken < 2 && out.length < limit; k++) {
        var cand = pool[(start + k) % pool.length];
        if (!seen[cand.slug]) { seen[cand.slug] = 1; out.push(cand.slug); taken++; }
      }
    });
    return out.slice(0, limit);
  }

  // session overrides (admin removes/adds) — kept in memory so the demo stays
  // deterministic across reloads; a real build persists these to WordPress meta.
  var overrides = {};   // heroSlug → [slug,…]

  function listFor(heroSlug, limit) {
    var hero = byslug[heroSlug]; if (!hero) return [];
    var base = overrides[heroSlug] || seedFor(hero, limit || 4);
    return base.slice(0, limit || 4);
  }
  function forProduct(slugOrProduct, limit) {
    var hero = typeof slugOrProduct === 'string' ? byslug[slugOrProduct] : slugOrProduct;
    if (!hero) return [];
    return listFor(hero.slug, limit).map(function (s) { return byslug[s]; }).filter(Boolean);
  }
  function remove(heroSlug, slug) {
    overrides[heroSlug] = listFor(heroSlug, 8).filter(function (s) { return s !== slug; });
  }
  function nextFor(heroSlug) {
    var hero = byslug[heroSlug]; if (!hero) return null;
    var have = listFor(heroSlug, 8), cat = catOf(hero), pool = [];
    (AFFINITY[cat] || []).forEach(function (ac) { topOf(ac, hero.slug).forEach(function (p) { pool.push(p.slug); }); });
    return pool.filter(function (s) { return have.indexOf(s) < 0; })[0] || null;
  }
  function add(heroSlug) {
    var nx = nextFor(heroSlug); if (!nx) return null;
    overrides[heroSlug] = listFor(heroSlug, 8).concat([nx]);
    return byslug[nx];
  }

  window.SS_PAIRINGS = {
    for: forProduct, listFor: listFor, catOf: catOf, rentScore: rentScore,
    topOf: topOf, remove: remove, add: add, nextFor: nextFor, affinity: AFFINITY
  };
} )();
