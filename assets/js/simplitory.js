/* ============================================================
   SIMPLITORY — shared shell behaviour for the redesigned IA.

   1. Drawer (sidebar off-canvas at <=860px).
   2. Tier switch: Basic ⇄ Pro. Basic = read + display (CSV / CRMS /
      other sources). Pro = write-back to source + advanced image
      management. Toggling flips body.tier-pro; CSS + the Products
      screen react. Persisted in localStorage so the whole app stays
      in one tier as you navigate.
   ============================================================ */
( function () {
  'use strict';

  /* ── Theme temperature (warm / cool) — re-tones the neutral --sy-* set.
     Applied to <body class="sy"> early so there's no flash, and persisted
     per browser. Cool is the default. ── */
  var TKEY = 'simplitory_temp';
  function temp() { try { return localStorage.getItem(TKEY) || 'cool'; } catch (e) { return 'cool'; } }
  function applyTemp() {
    var warm = temp() === 'warm';
    document.body.classList.toggle('temp-warm', warm);
    document.querySelectorAll('[data-temp]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-temp') === temp()); });
  }
  applyTemp();

  /* ── Suite top header — ‹ back · page title left · user right (the
     SimpleSuite chrome). Built from the existing .topbar so every admin
     page gets it; the page title comes from <title>. ── */
  ( function () {
    var tb = document.querySelector('.topbar'); if (!tb) return;
    var title = (document.title.split('—')[0] || '').trim() || 'Simplitory';
    tb.innerHTML =
      '<button class="burger" id="burger" aria-label="Menu" aria-expanded="false">☰</button>' +
      '<button class="hdr-back" aria-label="Back" title="Back">‹</button>' +
      '<strong class="hdr-title">' + title + '</strong>' +
      '<span class="hdr-right">' +
        '<span class="tempseg" role="group" aria-label="Theme temperature">' +
          '<button class="tempseg__b" data-temp="cool" title="Cool theme" aria-label="Cool theme">❄</button>' +
          '<button class="tempseg__b" data-temp="warm" title="Warm theme" aria-label="Warm theme">☀</button>' +
        '</span>' +
        '<span class="tierctx">Plan: <b data-tier-label>Basic</b> <button class="tglt" data-tier-toggle>Unlock Pro</button></span>' +
        '<span class="hdr-user" title="Glenn">TO</span>' +
      '</span>';
    tb.querySelector('.hdr-back').addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'simplitory.html';
    });
    applyTemp();
  } )();

  document.addEventListener('click', function (e) {
    var seg = e.target.closest('[data-temp]'); if (!seg) return;
    e.preventDefault();
    try { localStorage.setItem(TKEY, seg.getAttribute('data-temp')); } catch (err) {}
    applyTemp();
  });

  /* ── Tier ── */
  var KEY = 'simplitory_tier';
  function tier() { try { return localStorage.getItem(KEY) || 'basic'; } catch (e) { return 'basic'; } }
  function applyTier() {
    var pro = tier() === 'pro';
    document.body.classList.toggle('tier-pro', pro);
    document.querySelectorAll('[data-tier-label]').forEach(function (n) { n.textContent = pro ? 'Pro' : 'Basic'; });
    document.querySelectorAll('[data-tier-toggle]').forEach(function (b) {
      b.textContent = pro ? 'Switch to Basic' : 'Unlock Pro';
    });
    if (window.SIMPLITORY_onTier) window.SIMPLITORY_onTier(pro);
  }
  function flip() {
    try { localStorage.setItem(KEY, tier() === 'pro' ? 'basic' : 'pro'); } catch (e) {}
    applyTier();
  }
  window.SIMPLITORY_tierIsPro = function () { return tier() === 'pro'; };
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-tier-toggle]') || e.target.closest('.tierpill')) { e.preventDefault(); flip(); }
  });
  applyTier();

  /* ── Drawer ── */
  var sb = document.getElementById('sb'),
      b  = document.getElementById('burger'),
      sc = document.getElementById('scrim');
  if (sb && b && sc) {
    function set(o) { sb.classList.toggle('open', o); sc.classList.toggle('on', o); b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    b.addEventListener('click', function () { set(!sb.classList.contains('open')); });
    sc.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  }
} )();
