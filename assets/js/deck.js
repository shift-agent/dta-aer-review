/* Deck field persistence — any [data-persist="id"] field saves to localStorage,
   keyed per page (body[data-deck]). Dates, notes and accept/reject verdicts all
   survive a reload and a GitHub deploy (no DB), matching the deck's JSON model. */
(function () {
  var page = document.body.getAttribute('data-deck') || location.pathname.split('/').pop();
  var KEY = 'ss_deck2_' + page;
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  document.querySelectorAll('[data-persist]').forEach(function (el) {
    var id = el.getAttribute('data-persist');
    if (store[id] != null) {
      if (el.type === 'radio') el.checked = (store[id] === el.value);
      else if (el.type === 'checkbox') el.checked = !!store[id];
      else el.value = store[id];
    }
    var ev = (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'radio' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(ev, function () {
      if (el.type === 'radio') store[id] = el.value;
      else if (el.type === 'checkbox') store[id] = el.checked;
      else store[id] = el.value;
      localStorage.setItem(KEY, JSON.stringify(store));
    });
  });
})();
