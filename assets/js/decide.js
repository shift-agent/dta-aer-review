/* Decide layer — Accept / Reject buttons on approval & decision cards.
   A card marked [data-decide="id"] gains squared Accept (solid olive) and
   Reject (ghost) buttons below its notes field. Deciding MOVES the card into
   the page's [data-decide-zone="accepted"] / [data-decide-zone="rejected"]
   list with an "Accepted · date" / "Rejected · date" badge; notes ride along
   read-only; a small Undo returns it to its original slot. State persists in
   localStorage under the deck's ss_deck2_* pattern (own key, so deck.js's
   field store and this never overwrite each other). Sections marked
   [data-decide-sec] hide themselves while they contain no cards; counters
   marked [data-decide-counter="group"] live-update ("Five open calls" →
   "3 open · 2 accepted"). Dependency-free; load after deck.js. */
(function () {
  'use strict';
  var page = document.body.getAttribute('data-deck') || location.pathname.split('/').pop();
  var KEY = 'ss_deck2_' + page + '_decide';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '.decide{display:flex;gap:.5rem;margin-top:.65rem}'
    + '.decide[hidden],[data-decide-pending][hidden]{display:none}'
    + '.decide button{font:inherit;font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:.5rem 1rem;cursor:pointer}'
    + '.decide__accept{background:var(--olive);border:1px solid var(--olive);color:#fff}'
    + '.decide__accept:hover{background:#5c7449;border-color:#5c7449}'
    + '.decide__reject{background:none;border:1px solid var(--line);color:var(--body)}'
    + '.decide__reject:hover{border-color:var(--red);color:var(--red)}'
    + '.decide-undo{font:inherit;font-size:.72rem;background:none;border:none;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0;margin-top:.55rem}'
    + '.decide-undo:hover{color:var(--ink)}'
    + '.pill--rej{color:#fff;background:var(--red)}'
    + '.mrow--rej{border-left-color:var(--red);background:#fff}'
    + '.mrow--rej .mnum{background:var(--red);color:#fff}';
  document.head.appendChild(css);

  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-decide]'));
  var WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  function fmt(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  cards.forEach(function (card) {
    var id = card.getAttribute('data-decide');
    // Invisible marker holding the card's home slot, so Undo (this session or
    // a later one) returns it exactly where it was authored.
    var home = document.createElement('span');
    home.hidden = true;
    home.setAttribute('data-decide-home', id);
    card.parentNode.insertBefore(home, card);
    card.__homeClass = card.className;

    var cell = card.querySelector(':scope > div') || card;
    var row = document.createElement('div');
    row.className = 'decide';
    row.innerHTML =
      '<button type="button" class="decide__accept">Accept</button>'
      + '<button type="button" class="decide__reject">Reject</button>';
    cell.appendChild(row);
    var undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'decide-undo';
    undo.hidden = true;
    undo.textContent = 'Undo — return to the open list';
    cell.appendChild(undo);

    row.querySelector('.decide__accept').addEventListener('click', function () { decide(card, 'accepted'); });
    row.querySelector('.decide__reject').addEventListener('click', function () { decide(card, 'rejected'); });
    undo.addEventListener('click', function () { revert(card); });
  });

  function apply(card, st) {
    var zone = document.querySelector('[data-decide-zone="' + (st.s === 'accepted' ? 'accepted' : 'rejected') + '"]');
    if (zone) zone.appendChild(card);
    card.className = card.__homeClass.replace(/\bmrow--gold\b/, '').trim()
      + ' is-decided ' + (st.s === 'accepted' ? 'mrow--done' : 'mrow--rej');
    var h3 = card.querySelector('h3');
    var old = h3.querySelector('.decide-badge');
    if (old) old.remove();
    var b = document.createElement('span');
    b.className = 'pill decide-badge ' + (st.s === 'accepted' ? 'pill--done' : 'pill--rej');
    b.innerHTML = (st.s === 'accepted' ? 'Accepted' : 'Rejected') + ' &middot; ' + fmt(st.at);
    h3.appendChild(document.createTextNode(' '));
    h3.appendChild(b);
    var pend = card.querySelector('[data-decide-pending]');
    if (pend) pend.hidden = true;
    card.querySelector('.decide').hidden = true;
    card.querySelector('.decide-undo').hidden = false;
    var n = card.querySelector('.notes');
    if (n) n.readOnly = true;
  }

  function reset(card) {
    var id = card.getAttribute('data-decide');
    var home = document.querySelector('[data-decide-home="' + id + '"]');
    if (home) home.parentNode.insertBefore(card, home.nextSibling);
    card.className = card.__homeClass;
    var b = card.querySelector('.decide-badge');
    if (b) b.remove();
    var pend = card.querySelector('[data-decide-pending]');
    if (pend) pend.hidden = false;
    card.querySelector('.decide').hidden = false;
    card.querySelector('.decide-undo').hidden = true;
    var n = card.querySelector('.notes');
    if (n) n.readOnly = false;
  }

  function decide(card, status) {
    state[card.getAttribute('data-decide')] = { s: status, at: new Date().toISOString() };
    save(); apply(card, state[card.getAttribute('data-decide')]); refresh();
  }
  function revert(card) {
    delete state[card.getAttribute('data-decide')];
    save(); reset(card); refresh();
  }

  function refresh() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-decide-sec]'), function (sec) {
      sec.hidden = !sec.querySelector('.mlist .mrow');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-decide-counter]'), function (el) {
      var g = el.getAttribute('data-decide-counter');
      var open = 0, acc = 0, rej = 0;
      cards.forEach(function (c) {
        if (c.getAttribute('data-decide-group') !== g) return;
        var st = state[c.getAttribute('data-decide')];
        if (!st) open++; else if (st.s === 'accepted') acc++; else rej++;
      });
      if (!acc && !rej) {
        el.textContent = (WORDS[open] || open) + ' open call' + (open === 1 ? '' : 's');
      } else {
        var parts = [open + ' open'];
        if (acc) parts.push(acc + ' accepted');
        if (rej) parts.push(rej + ' rejected');
        el.textContent = parts.join(' · ');
      }
    });
  }

  cards.forEach(function (card) {
    var st = state[card.getAttribute('data-decide')];
    if (st) apply(card, st);
  });
  refresh();
})();
