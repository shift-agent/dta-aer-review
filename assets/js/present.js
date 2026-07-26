/* ============================================================
   PRESENTATION LAYER — one definition of the running order.

   Every deck page includes assets/present.css + this file. The bar,
   the step order, the current-step highlight and the prev/next walk
   are all built here, so reordering the meeting means editing ONE
   array rather than sixteen pages.

   Pages inside dta/ and aer/ carry <body data-base="../">; root
   pages carry nothing. Every href below is written relative to the
   prototype root and prefixed with that base at build time, so the
   same bar works from any depth over file:// — no server, no
   absolute paths, opens by double-click.
   ============================================================ */
( function () {
  'use strict';

  // v2 running order (Monday review): scope+solutions live on ONE page, so it's
  // one stop. Four stops: Scope & Solutions → the designs → Simplitory →
  // SimpleSuite. Reordering the meeting is still one array.
  var STEPS = [
    { label: 'Scope & Solutions', href: 'scope.html'      },
    { label: 'Design Review',     href: 'dta/index.html'  },
    { label: 'Simplitory',        href: 'simplitory.html' },
    { label: 'SimpleSuite',       href: 'simplesuite.html' }
  ];

  // Which step a page belongs to. First match wins; -1 = not in the deck.
  function stepForPath( path ) {
    if ( /(^|\/)scope\.html$/.test( path ) )            return 0;
    // "Design Review" = walking the real brand designs + the storefront.
    if ( /\/(dta|aer)\/[^/]*$/.test( path ) )          return 1;
    if ( /(^|\/)shop\.html$/.test( path ) )            return 1;
    if ( /(^|\/)(simplitory|wizard|photos|source|products|storefront|settings|sync|quotes|cart|categories|brands|csv-setup|google-setup)\.html$/.test( path ) ) return 2;
    if ( /(^|\/)simplesuite\.html$/.test( path ) )     return 3;
    return -1; // status.html (full report) + index.html (architecture map) — reachable, not deck steps
  }

  var base = document.body.getAttribute( 'data-base' ) || '';
  var current = stepForPath( location.pathname );

  function el( tag, cls, html ) {
    var n = document.createElement( tag );
    if ( cls ) n.className = cls;
    if ( html != null ) n.innerHTML = html;
    return n;
  }

  var bar = el( 'nav', 'presentbar' );
  bar.setAttribute( 'aria-label', 'Presentation running order' );

  // The wordmark is the most clickable thing in the bar, so it goes to the top
  // of the deck — not the architecture map, which is developer-facing (token
  // tables, brand contracts) and the wrong register to land a client on. The
  // map stays reachable from the Simplitory pages, alongside the other
  // technical surfaces where it belongs.
  var mark = el( 'a', 'presentbar__mark',
    '<b>Simpliment</b> <span>&middot; Decor To Adore &amp; Alabama Event Rentals</span>' );
  mark.href = base + STEPS[ 0 ].href;
  mark.title = 'Back to the start of the deck';
  bar.appendChild( mark );

  var steps = el( 'div', 'presentbar__steps' );
  STEPS.forEach( function ( s, i ) {
    var a = el( 'a', 'pstep' + ( i === current ? ' is-current' : ( i < current ? ' is-done' : '' ) ) );
    a.href = base + s.href;
    a.innerHTML = '<span class="pstep__n">' + ( i + 1 ) + '</span><span>' + s.label + '</span>';
    if ( i === current ) a.setAttribute( 'aria-current', 'step' );
    steps.appendChild( a );
  } );
  bar.appendChild( steps );

  // Page-specific links (the photo console, the second brand) travel in a
  // <template> the page supplies. Kept deliberately thin — the bar is the
  // running order, not a menu.
  var extrasTpl = document.getElementById( 'present-extras' );
  var extras = el( 'div', 'presentbar__extras' );

  // Section-label overlay: an on/off switch, not a text link. Only offered on
  // pages that actually carry labelled sections.
  if ( document.querySelector( '[data-ssla]' ) ) {
    var toggle = el( 'button', 'psw' );
    toggle.type = 'button';
    toggle.title = 'Show which Launch section each band is';
    toggle.innerHTML =
      '<span class="psw__track"><span class="psw__dot"></span></span>' +
      '<span class="psw__label">Sections</span>';
    var sync = function () {
      var on = document.body.classList.contains( 'show-sections' );
      toggle.setAttribute( 'aria-pressed', on ? 'true' : 'false' );
    };
    toggle.addEventListener( 'click', function () {
      document.body.classList.toggle( 'show-sections' );
      sync();
    } );
    sync();
    extras.appendChild( toggle );
  }

  if ( extrasTpl ) extras.appendChild( extrasTpl.content.cloneNode( true ) );
  if ( extras.childNodes.length ) bar.appendChild( extras );

  var move = el( 'div', 'presentbar__move' );
  function arrow( idx, glyph, label ) {
    var a = el( 'a', null, glyph );
    a.title = label;
    a.setAttribute( 'aria-label', label );
    if ( idx < 0 || idx >= STEPS.length || current < 0 ) {
      a.setAttribute( 'aria-disabled', 'true' );
      a.href = '#';
    } else {
      a.href = base + STEPS[ idx ].href;
    }
    return a;
  }
  move.appendChild( arrow( current - 1, '&#8592;', 'Previous step' ) );
  move.appendChild( arrow( current + 1, '&#8594;', 'Next step' ) );
  bar.appendChild( move );

  document.body.classList.add( 'has-present' );
  document.body.insertBefore( bar, document.body.firstChild );

  // Left/right arrow keys walk the deck, but never while the presenter is
  // typing into the storefront's live search or any other field.
  document.addEventListener( 'keydown', function ( e ) {
    if ( e.metaKey || e.ctrlKey || e.altKey ) return;
    var t = e.target;
    if ( t && ( /^(INPUT|TEXTAREA|SELECT)$/.test( t.tagName ) || t.isContentEditable ) ) return;
    if ( current < 0 ) return;
    var to = e.key === 'ArrowRight' ? current + 1 : ( e.key === 'ArrowLeft' ? current - 1 : null );
    if ( to === null || to < 0 || to >= STEPS.length ) return;
    location.href = base + STEPS[ to ].href;
  } );

  // Step 1 and 2 are the same document; keep the highlight honest when the
  // presenter jumps between them by anchor rather than by reload.
  window.addEventListener( 'hashchange', function () {
    var now = stepForPath( location.pathname );
    if ( now === current ) return;
    current = now;
    var links = steps.querySelectorAll( '.pstep' );
    for ( var i = 0; i < links.length; i++ ) {
      links[ i ].className = 'pstep' + ( i === current ? ' is-current' : ( i < current ? ' is-done' : '' ) );
    }
  } );
} )();
