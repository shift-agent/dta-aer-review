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
  // Data-driven milestone list — add/rename/reorder review points here and the
  // bar + the Commit layer follow. (Built generic on purpose: this is the shape
  // Action Studio reuses as a client-facing project-progress view.)
  // Running order (2026-07-28, Glenn's project-flow): 1 Project Review (status +
  // issues; Simplitory + SimpleSuite are LINKED from here, not bar steps) → 2 the
  // original Design Review → 3 Commit (today's meeting notes) → 4 Milestone 1
  // (goals + decisions) → 5 Design Review 2 (the 3 approvals) → 6 Commit (the 3
  // approvals + key decisions, accept/reject w/ notes) → 7 Path to Completion
  // (remaining approvals + launch, with dates). Past/approved sit LEFT; the
  // current step is highlighted. Reordering the meeting is still one array.
  var STEPS = [
    { id: 'projreview', label: 'Project Review',     href: 'project-review.html' },
    // Step 2 = the ORIGINAL design as presented today — archived locally in
    // original/ (design pages only, deck stripped; fetched from the 2026-07-27
    // GH-Pages deploy, self-hosted Cormorant). Just the design, no old tabs.
    { id: 'design',     label: 'Design Review',      href: 'original/dta/index.html' },
    { id: 'commit1',    label: 'Commit',             href: 'commitments.html'    },
    { id: 'milestone1', label: 'Milestone 1',        href: 'milestone1.html'     },
    { id: 'review2',    label: 'Design Review 2',    href: 'review2.html'        },
    { id: 'commit2',    label: 'Commit',             href: 'commit2.html'        },
    { id: 'path',       label: 'Path to Completion', href: 'path.html'           }
  ];

  // Which step a page belongs to. First match wins; -1 = not in the deck.
  function stepForPath( path ) {
    if ( /(^|\/)(project-review|scope)\.html$/.test( path ) ) return 0;
    // Simplitory + SimpleSuite (+ their tool pages) are linked FROM Project Review.
    if ( /(^|\/)(simplitory|simplesuite|wizard|photos|source|products|storefront|settings|sync|quotes|cart|categories|brands|csv-setup|google-setup)\.html$/.test( path ) ) return 0;
    // The archived ORIGINAL design (original/*) = Design Review (step index 1).
    if ( /\/original\//.test( path ) )                 return 1;
    // The LOCAL storefront is the NEW design → Design Review 2 (step index 4).
    if ( /\/(dta|aer)\/[^/]*$/.test( path ) )          return 4;
    if ( /(^|\/)shop\.html$/.test( path ) )            return 4;
    if ( /(^|\/)commitments\.html$/.test( path ) )    return 2;
    if ( /(^|\/)milestone1\.html$/.test( path ) )      return 3;
    if ( /(^|\/)review2\.html$/.test( path ) )         return 4;
    if ( /(^|\/)commit2\.html$/.test( path ) )         return 5;
    // Client-facing briefs opened FROM the Commit page (photo naming approval,
    // AI recolor brief, the form field-inventory review, the banner-treatment
    // mock board) belong to the same Commit stop.
    if ( /(^|\/)(photo-naming|ai-color-brief|form-review|banner-treatments)\.html$/.test( path ) ) return 5;
    if ( /(^|\/)(path|milestone2)\.html$/.test( path ) ) return 6;
    return -1; // status.html (full report) + index.html (architecture map) — reachable, not deck steps
  }

  var base = document.body.getAttribute( 'data-base' ) || '';
  var current = stepForPath( location.pathname );

  // External steps (e.g. the live original-design deploy) keep their absolute URL
  // and open in a new tab; internal steps are prefixed with the page's base path.
  function hrefOf( s ) { return s.ext ? s.href : ( base + s.href ); }

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
    '<b>Simpliment</b> <span>&middot; Decor To Adore</span>' );
  mark.href = hrefOf( STEPS[ 0 ] );
  mark.title = 'Back to the start of the deck';
  bar.appendChild( mark );

  var steps = el( 'div', 'presentbar__steps' );
  STEPS.forEach( function ( s, i ) {
    var a = el( 'a', 'pstep' + ( i === current ? ' is-current' : ( i < current ? ' is-done' : '' ) ) );
    a.href = hrefOf( s );
    if ( s.ext ) { a.target = '_blank'; a.rel = 'noopener'; }
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
  if ( document.querySelector( '[data-ssla], [data-ssla-section]' ) ) {
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

  // Mobile preview — a centered phone frame (~390×844, squared corners, dark
  // scrim) holding an iframe of the CURRENT page URL, so real media queries
  // engage at the iframe's width. Dependency-free; exposed as window.SS_PHONE
  // so page-level controls (the PDP's preview-eye cluster) can reuse the mechanic.
  function phoneEl() { return document.querySelector( '.pphone' ); }
  function phoneClose() {
    var ov = phoneEl();
    if ( ov ) ov.remove();
    document.removeEventListener( 'keydown', phoneEsc );
  }
  function phoneEsc( e ) { if ( e.key === 'Escape' ) phoneClose(); }
  function phoneOpen() {
    // no phone-in-a-phone: inside the preview iframe the toggle is inert
    if ( window.self !== window.top ) return;
    if ( phoneEl() ) return;
    var ov = el( 'div', 'pphone' );
    ov.innerHTML =
      '<div class="pphone__scrim"></div>' +
      '<div class="pphone__frame">' +
        '<button class="pphone__x" type="button" aria-label="Close mobile preview">&times;</button>' +
        '<iframe title="Mobile preview"></iframe>' +
      '</div>';
    ov.querySelector( 'iframe' ).src = location.href;
    ov.querySelector( '.pphone__scrim' ).addEventListener( 'click', phoneClose );
    ov.querySelector( '.pphone__x' ).addEventListener( 'click', phoneClose );
    document.addEventListener( 'keydown', phoneEsc );
    document.body.appendChild( ov );
  }
  window.SS_PHONE = {
    isOpen: function () { return !!phoneEl(); },
    open: phoneOpen, close: phoneClose,
    toggle: function () { if ( phoneEl() ) phoneClose(); else phoneOpen(); }
  };
  // Skip the bar button INSIDE the phone iframe (the framed page runs this
  // file too); the frame is a desktop demonstration control.
  if ( window.self === window.top ) {
    var mob = el( 'button', 'psw pmob' );
    mob.type = 'button';
    mob.title = 'Preview this page at phone width';
    mob.innerHTML = '<span class="pmob__icon"></span><span class="psw__label">Mobile</span>';
    mob.addEventListener( 'click', function () { window.SS_PHONE.toggle(); } );
    extras.appendChild( mob );
  }

  // Swatch toggle — REVIEW option (Glenn 2026-07-30): pages that carry a
  // "Request a swatch" affordance ([data-swatchline]) get a bar switch that
  // shows/hides it, so the client can be shown both options. Lives HERE in
  // the deck bar (review chrome that never ships), not on the page. State
  // persists to sessionStorage so the phone-frame iframe and reloads keep
  // the same with/without-swatch view (the page script applies it on load).
  if ( document.querySelector( '[data-swatchline]' ) ) {
    var SWKEY = 'ss_swatch_state';
    var swt = el( 'button', 'psw' );
    swt.type = 'button';
    swt.title = 'Review option: show or hide the Request-a-swatch affordance';
    swt.innerHTML =
      '<span class="psw__track"><span class="psw__dot"></span></span>' +
      '<span class="psw__label">Swatch</span>';
    var swGet = function () {
      var v = null;
      try { v = sessionStorage.getItem( SWKEY ); } catch ( e ) {}
      if ( v !== 'on' && v !== 'off' ) v = document.body.getAttribute( 'data-swatch' ) || 'on';
      return v;
    };
    var swSync = function () { swt.setAttribute( 'aria-pressed', swGet() === 'on' ? 'true' : 'false' ); };
    swt.addEventListener( 'click', function () {
      var next = swGet() === 'on' ? 'off' : 'on';
      document.body.setAttribute( 'data-swatch', next );
      try { sessionStorage.setItem( SWKEY, next ); } catch ( e ) {}
      swSync();
    } );
    swSync();
    extras.appendChild( swt );
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
      a.href = hrefOf( STEPS[ idx ] );
      if ( STEPS[ idx ].ext ) { a.target = '_blank'; a.rel = 'noopener'; }
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
    if ( STEPS[ to ].ext ) window.open( STEPS[ to ].href, '_blank', 'noopener' );
    else location.href = hrefOf( STEPS[ to ] );
  } );

  // Step 1 and 2 are the same document; keep the highlight honest when the
  // presenter jumps between them by anchor rather than by reload.
  window.addEventListener( 'hashchange', function () {
    var now = stepForPath( location.pathname );
    if ( now === current ) return;
    current = now;
    paintSteps();
  } );

  function paintSteps() {
    var links = steps.querySelectorAll( '.pstep' );
    for ( var i = 0; i < links.length; i++ ) {
      links[ i ].className = 'pstep'
        + ( i === current ? ' is-current' : ( i < current ? ' is-done' : '' ) )
        + ( isCommitted( STEPS[ i ].id ) ? ' is-committed' : '' );
    }
  }

  /* ===============================================================
     COMMIT / MILESTONE LAYER
     Each phase ends with a "Commit" so a meeting can lock a decision
     set and mark where to resume next time. Driven entirely off the
     STEPS array (change the array → change the milestones). Persisted
     to localStorage as JSON — no database. Kept generic on purpose:
     this is the mechanism Action Studio reuses as a client-facing
     project-progress view. window.SS_DECK exposes it to the
     Commitments summary page.
     =============================================================== */
  var CKEY = 'ss_deck_commits_v1';
  function readCommits() { try { return JSON.parse( localStorage.getItem( CKEY ) ) || {}; } catch ( e ) { return {}; } }
  var commits = readCommits(); commits.phases = commits.phases || {};
  function saveCommits() { try { localStorage.setItem( CKEY, JSON.stringify( commits ) ); } catch ( e ) {} }
  function isCommitted( id ) { return !!( commits.phases[ id ] && commits.phases[ id ].committed ); }
  function firstOpenIdx() { for ( var i = 0; i < STEPS.length; i++ ) { if ( STEPS[ i ].id !== 'commit' && !isCommitted( STEPS[ i ].id ) ) return i; } return -1; }

  var cst = el( 'style' );
  cst.textContent =
    '.pstep.is-committed .pstep__n{background:#6F8A5C;border-color:#6F8A5C;color:#fff}'
    + '.pcommit{position:fixed;right:1rem;bottom:1rem;z-index:60;display:flex;align-items:center;gap:.8rem;'
    + 'background:#fff;border:1px solid rgba(21,32,43,.16);box-shadow:0 10px 30px rgba(21,32,43,.18);'
    + 'padding:.55rem .6rem .55rem .95rem;font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif;color:#15202B}'
    + '.pcommit__lbl b{display:block;font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:#8A97A5;margin-bottom:.15rem}'
    + '.pcommit__btn{font:inherit;cursor:pointer;border:1px solid #6F8A5C;background:#6F8A5C;color:#fff;padding:.55rem .95rem}'
    + '.pcommit__btn:hover{background:#5c7449;border-color:#5c7449}'
    + '.pcommit__undo{font:inherit;cursor:pointer;border:none;background:none;color:#8A97A5;text-decoration:underline;padding:.2rem}'
    + '@media(max-width:640px){.pcommit{left:1rem;right:1rem;justify-content:space-between}}';
  document.head.appendChild( cst );

  // Floating Commit control on every deck phase page (not the Commitments summary,
  // not off-deck pages like status/architecture).
  if ( current >= 0 && STEPS[ current ] && STEPS[ current ].id !== 'commit' ) {
    var cur = STEPS[ current ];
    var box = el( 'div', 'pcommit' );
    var renderCommit = function () {
      var done = isCommitted( cur.id );
      var when = done ? new Date( commits.phases[ cur.id ].at ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } ) : '';
      box.innerHTML =
        '<span class="pcommit__lbl"><b>' + ( done ? 'Committed &middot; ' + when : 'Stage ' + ( current + 1 ) + ' of ' + ( STEPS.length - 1 ) ) + '</b>' + cur.label + '</span>'
        + ( done ? '<button class="pcommit__undo" type="button">Undo</button>'
                 : '<button class="pcommit__btn" type="button">Commit this stage &rarr;</button>' );
      var b = box.querySelector( '.pcommit__btn' );
      if ( b ) b.addEventListener( 'click', function () {
        commits.phases[ cur.id ] = { committed: true, at: new Date().toISOString(), label: cur.label };
        commits.resume = firstOpenIdx(); saveCommits(); paintSteps(); renderCommit();
      } );
      var u = box.querySelector( '.pcommit__undo' );
      if ( u ) u.addEventListener( 'click', function () {
        delete commits.phases[ cur.id ]; commits.resume = firstOpenIdx(); saveCommits(); paintSteps(); renderCommit();
      } );
    };
    renderCommit();
    document.body.appendChild( box );
  }
  paintSteps();

  window.SS_DECK = {
    steps: STEPS, current: current, base: base, key: CKEY,
    read: readCommits,
    isCommitted: isCommitted,
    setNextReview: function ( v ) { commits.nextReview = v; saveCommits(); },
    getNextReview: function () { return commits.nextReview || ''; }
  };
} )();
