#!/usr/bin/env python3
"""
Two brands, one roof — multi-page functional prototype.

7 pages x 2 brands from ONE set of templates and ONE structural
stylesheet. Only the brand preset differs.

  home · collections · product · events · about · contact · quote

Copy and palettes are taken from the REAL staging site
(staging.decortoadore.com, recovered from the tarball DB dump):
  DTA  navy #2F4D6A · sage #8FB58A · olive #6F8A5C · gold #D9B25F · paper #FDF9F5
  AER  coal #111315 · metal #313841 · brass #9F8654 · white #F5F7F8

Every section is labelled with the ss-launch section type it maps to
(data-ssla); all of them already exist in the SSLA registry.

    python3 build.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FAB  = json.load(open(os.path.join(HERE, "assets/data/fabrics.json")))
NCOL = sum(len(f["colours"]) for f in FAB)
NROW = sum(f["rows_total"] for f in FAB)
NTOT = sum(f["colour_total"] for f in FAB)

# "Collections" retired from the top nav — the browse-first Shop replaces it.
NAV = [("Events", "events.html"), ("About", "about.html"), ("Contact", "contact.html")]

BRANDS = [
  dict(
    slug="dta", name="Decor To Adore", preset="decor-to-adore", css="brand-dta.css",
    hero_class="hero--bg hero--angle",
    logo="assets/img/site/logo-dta.png",
    mark="Decor to Adore<small>Birmingham, Alabama</small>",
    fonts="Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Gilda+Display"
          "&family=Montserrat:wght@300;400;500&family=Mr+De+Haviland",
    tel="205.637.8695", email="info@decortoadore.com", where="Irondale, Alabama",
    # ---- home
    eyebrow="Weddings &middot; Events &middot; &amp; More",
    h1="Design something <em>beautiful</em>.",
    lead="Your vision. Our expertise. A flawless event.",
    cta="Plan Your Event", cta2="Explore Collections",
    script="Adore the details",
    search_ph="Search for anything - a colour, a fabric, a size...",
    cards_h="Elevated events, executed with intention",
    cards=[("Weddings","Romantic ceremony spaces, lush reception tables, and seamless timelines for your most meaningful day."),
           ("Events","Corporate gatherings, galas, mitzvahs and more &mdash; styled with intention and executed flawlessly."),
           ("Celebrations","Linens, chair covers, tables, napkins and specialty pieces curated to match your vision.")],
    split_eyebrow="Full-Service Event Styling",
    split_h="Complete styling support",
    split_p="From an empty ballroom to a fully dressed reception, Decor to Adore coordinates every "
            "detail so your space feels considered from the first glance. We partner with planners, "
            "venues, caterers and florists across Alabama.",
    split_list=["Custom linen selections","Chair covers &amp; sashes","Tables, chairs &amp; staging",
                "Setup and breakdown","Washing &amp; pressing service"],
    split_cta="Explore Services",
    stats=[("30+","Years styling Alabama events"),("3,889","Pieces in inventory"),("1&nbsp;day","Typical quote turnaround")],
    quote_txt="Kendall was great. She had great attention to detail and thought of things that I "
              "certainly would have forgotten &mdash; patient with me even as I made changes again "
              "and again as the reception took shape. Quality at a steal.",
    quote_by="Casey &mdash; Temple Emanu-El",
    collection_title="The Collection",
    band_h="Every detail, considered.",
    band_p="Three decades dressing weddings, galas and gatherings across Birmingham.",
    strip_h="Planning something lovely?",
    strip_p="Tell us the date, the venue and the palette. We'll build the look with you.",
    strip_section="cta-banner",
    # ---- about
    about_eyebrow="About Our Family Business",
    about_h="A family business, dressing Alabama events",
    about_lead="A family-owned Alabama business dedicated to beautifully styled weddings, events "
               "and celebrations &mdash; created with care, and delivered with intention.",
    about_h2="Meet the people behind the details",
    about_p1="Decor to Adore is very much a family business. My husband Barrett and I met during our "
             "freshman orientation in college. We dated through college and officially tied the knot "
             "in November of 2010 at Big Canoe in Jasper, Georgia.",
    about_p2="We are both involved with the business and are often seen together throughout the week "
             "and at our events on the weekends. We also have several wonderful assistants who you "
             "may see out with us during event setups.",
    about_h3="Our story continues",
    about_p3="Our first child, Finley, arrived in November of 2012 &mdash; a content and happy child, "
             "quite the daredevil, always seeking out his next adrenaline rush. Our second child, "
             "Sutton, blessed us with her arrival in August of 2015.",
    about_p4="If you see them out with us at a job or around town, be sure to say hello. They love "
             "meeting new people.",
    # ---- events
    ev_eyebrow="What We Style",
    ev_h="Events we're honoured to dress",
    ev_services_h="Three ways we work with you",
    ev_lead="From first consultation to final breakdown, our team handles linens, seating, tables "
            "and full-room styling so the day runs without you thinking about it.",
    ev_tracks=[("Weddings","Romantic, classic, modern or rustic &mdash; your wedding style is our starting point. "
                "Whether you're planning a rustic-chic celebration or a black-tie soiree, our linens, "
                "covers and seating build the room around you."),
               ("Corporate &amp; Galas","From company parties to grand galas, we cover them all. We'll help you plan and "
                "implement ideas that align with your brand and your budget."),
               ("Celebrations","Showers, birthdays, mitzvahs and intimate gatherings &mdash; done beautifully, "
                "at whatever scale suits the moment.")],
    ev_faq=[("How far ahead should we book?","Most clients reach out three to six months before the date. "
             "We'll happily hold a conversation earlier for peak-season weekends."),
            ("Do you set up and break down?","Yes &mdash; complete setup and breakdown is our standard service, "
             "coordinated with your venue and planner."),
            ("Can you work with linens we already own?","We do. We also offer washing and pressing for venues "
             "and individuals who own their own linens.")],
    # ---- contact
    ct_h="We'd love to hear from you",
    ct_lead="Share a few details about your celebration and we'll be in touch to discuss the right "
            "combination of colours, materials and pieces.",
    ct_h2="Let's plan a time to meet",
    ct_p="We currently take meetings by appointment only at our Irondale office. Please call or email "
         "to inquire about availability.",
    ct_expect=["A walk-through of your event style and priorities.",
               "Linen, seating and rental recommendations tailored to your venue.",
               "Discussion of timelines, logistics and next steps for booking."],
  ),
  dict(
    slug="aer", name="Alabama Event Rentals", preset="alabama-event-rentals", css="brand-aer.css",
    hero_class="hero--bg",
    logo=None, mark="ALABAMA<small>Event Rentals</small>",
    fonts="Fjalla+One&family=Libre+Franklin:wght@300;400;500;600",
    tel="205.637.8695", email="info@alabamaeventrentals.com", where="Birmingham, Alabama",
    eyebrow="Serving the Southeast",
    h1="Everything the room needs",
    lead="Tables, chairs, china, glass and staging &mdash; held in inventory, delivered and set "
         "on schedule.",
    cta="Request a Quote", cta2="Browse Rentals",
    script=None,
    search_ph="Search for anything - a chair, a size, a colour...",
    cards_h="Browse our rentals",
    cards=[("Table Linens","Rounds, rectangles, napkins, overlays and runners in every colour we stock."),
           ("Tables","Farm tables, rounds, cocktail tables, highboys and more."),
           ("Chairs","Chiavari, folding and specialty seating options for any room size.")],
    split_eyebrow="How We Work",
    split_h="Stocked deep. Delivered on time.",
    split_p="One warehouse, one crew, one number to call. We hold the inventory, we load the truck "
            "and we set the room &mdash; so your timeline holds from delivery through breakdown.",
    split_list=["Same-day quotes","Delivery &amp; on-site setup","Breakdown &amp; collection",
                "Planner &amp; venue accounts","Weekend logistics"],
    split_cta="Browse Rentals",
    stats=[("3,889","Items in inventory"),("56","Product categories"),("Same&nbsp;day","Quote turnaround")],
    quote_txt="They handled a 400-guest gala without a single missed detail. The crew arrived when "
              "they said they would, set the room, and were back for breakdown before we asked.",
    quote_by="Event Manager &mdash; Birmingham venue",
    collection_title="The Inventory",
    band_h="Stocked deep. Delivered on time.",
    band_p="One warehouse, one crew, one number to call.",
    strip_h="Building an event?",
    strip_p="Send us the list. We'll confirm availability and price it the same day.",
    strip_section="cta-dark",
    about_eyebrow="About Us",
    about_h="The warehouse behind the room",
    about_lead="Alabama Event Rentals supplies planners, venues and caterers across the Southeast "
               "with the pieces that make an event work.",
    about_h2="Inventory you can count on",
    about_p1="We hold a deep, maintained inventory so you're not chasing substitutions the week of "
             "the event. Everything is checked in, cleaned and staged before it goes out again.",
    about_p2="We work alongside Decor To Adore &mdash; sharing one inventory across both brands means "
             "a wider range available to you, and a single team accountable for it.",
    about_h3="How we operate",
    about_p3="Our crew handles delivery, on-site setup and breakdown. We coordinate directly with "
             "your venue so load-in and load-out fit the building's rules and your run of show.",
    about_p4="Accounts are available for planners, venues and caterers who work with us regularly.",
    ev_eyebrow="What We Supply",
    ev_h="Events we equip",
    ev_services_h="Three ways we supply an event",
    ev_lead="Corporate, social and large-format &mdash; if the room needs it, we most likely stock it.",
    ev_tracks=[("Corporate &amp; Conference","Staging, pipe and drape, seating and catering equipment for "
                "conferences, meetings and product launches."),
               ("Weddings &amp; Receptions","Chiavari seating, farm and round tables, china, glass and "
                "flatware &mdash; delivered and set."),
               ("Large Format","Dance floors, staging, barstools and volume seating for galas and "
                "multi-room events.")],
    ev_faq=[("Do you deliver outside Birmingham?","We serve the Southeast. Delivery is quoted by "
             "distance and load size."),
            ("Can we collect ourselves?","Will-call is available for smaller orders by arrangement."),
            ("How is availability confirmed?","Send the list and dates &mdash; we confirm availability "
             "and price the same day.")],
    ct_h="Tell us about the event",
    ct_lead="Send the list and the dates. We'll confirm availability and come back with pricing the "
            "same day.",
    ct_h2="Delivery, setup and breakdown",
    ct_p="We coordinate directly with your venue on load-in and load-out. Accounts available for "
         "planners, venues and caterers.",
    ct_expect=["Availability confirmed against live inventory.",
               "Delivery and setup quoted by load size and distance.",
               "Breakdown and collection scheduled to your run of show."],
  ),
]

# ------------------------------------------------------------------ shell
SHELL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} &middot; {name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={fonts}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="../assets/{css}">
<!-- goes in the ss-launch `custom-css` section -->
<link rel="stylesheet" href="../assets/custom-css.css">
<link rel="stylesheet" href="../assets/present.css">
</head>
<body data-brand="{slug}" data-page="{pageslug}" data-base="../">

<template id="present-extras">
  <a href="../{other}/{samepage}">{othername} &rarr;</a>
</template>

<header class="chrome" data-ssla="chrome (theme)"><div class="wrap chrome__inner">
  <a class="brandmark" href="index.html">{markup}</a>
  <nav class="nav">{nav}</nav>
  <a class="btn quotepill" href="quote.html">Quote<span data-quote-count class="is-empty"></span></a>
</div></header>

{body}

<section class="strip" data-ssla="g-cta"><div class="wrap strip__inner">
  <div><h2>{strip_h}</h2><p>{strip_p}</p></div>
  <a class="btn" href="contact.html">{cta}</a>
</div></section>

<footer class="foot" data-ssla="chrome (theme)"><div class="wrap">
  <div class="foot__grid">
    <div class="foot__brand">
      <a class="brandmark" href="index.html">{markup}</a>
      <p class="foot__blurb">{footblurb}</p>
    </div>
    <div><h4>Explore</h4><ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="collections.html">Collections</a></li>
      <li><a href="events.html">Events</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html">Contact</a></li></ul></div>
    <div><h4>Collections</h4><ul>{footfabrics}</ul></div>
    <div><h4>Get in touch</h4><ul>
      <li><a href="mailto:{email}">{email}</a></li>
      <li><a href="tel:{tel}">{tel}</a></li>
      <li>{where}</li>
      <li>By appointment</li></ul>
      <form class="foot__sub" onsubmit="return false">
        <input type="email" placeholder="Stay connected" aria-label="Email address">
        <button class="btn" type="submit">Join</button>
      </form>
    </div>
  </div>
  <div class="foot__base">
    <small>&copy; 2026 {name}. Prototype for design review &mdash; not a live site.</small>
    <small>{ncol} colourways across {nfab} fabrics &middot; {nrow} size listings</small>
  </div>
</div></footer>

<script src="../assets/data/fabrics.js"></script>
<script src="../assets/data/catalog.js"></script>
<script src="../assets/data/products.js"></script>
<script src="../assets/js/app.js"></script>
<script src="../assets/js/present.js"></script>
</body>
</html>
"""

# ------------------------------------------------------------------ bodies
HOME = """
<section class="hero {hero_class}" data-ssla="g-hero">
  <div class="hero__media"></div>
  <div class="wrap hero__body">
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p>{lead}</p>
    <div class="searchrow">
      <div class="searchwrap">
        <input class="search" type="search" data-search placeholder="{search_ph}" aria-label="Search the catalog">
      </div>
      <button class="iconbtn" data-filter aria-label="Filter by category" title="Filter by category">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M3 5h18M6 12h12M10 19h4"/></svg>
        <span class="fbadge" data-filter-count hidden></span>
      </button>
      <button class="iconbtn iconbtn--clear" data-clear aria-label="Clear search and filters" title="Clear" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="filterpanel" data-filterpanel hidden>
        <p class="fp__h">Filter by category</p>
        <div class="chips" data-chips></div>
      </div>
    </div>
    <div class="herobtns"><a class="btn" href="contact.html">{cta}</a>
      <a class="btn" href="collections.html">{cta2}</a></div>
  </div>
</section>

<main class="wrap sec" data-search-results hidden data-ssla="Simplitory">
  <div class="sec__head">
    <div><h2 data-results-for>Results</h2><p class="sec__note" data-count></p></div>
    <a class="btn" href="collections.html">Open full collection</a>
  </div>
  <div class="grid" data-grid></div>
</main>

<div data-home-default>

  <section class="sec sec--white" data-ssla="g-cards"><div class="wrap">
    <div class="sec__head"><div><h2>{cards_h}</h2></div></div>
    <div class="cards3">{cards}</div>
  </div></section>

  <section class="sec splitsec" data-ssla="g-content-split"><div class="wrap split">
    <div class="split__media"><img src="../{split_img}" alt=""></div>
    <div class="split__body">
      <p class="eyebrow">{split_eyebrow}</p>
      <h2>{split_h}</h2>
      <p>{split_p}</p>
      <ul class="ticks">{split_list}</ul>
      <a class="btn" href="events.html">{split_cta}</a>
    </div>
  </div></section>

  <section class="sec stats" data-ssla="g-proof"><div class="wrap statrow">{stats}</div></section>

  <section class="sec quote1" data-ssla="g-proof"><div class="wrap">
    <blockquote>{quote_txt}<cite>{quote_by}</cite></blockquote>
  </div></section>

  <section class="hero hero--bg band" data-ssla="g-cta">
    <div class="hero__media"></div>
    <div class="wrap hero__body">
      <h1 class="band__h">{band_h}</h1>
      <p>{band_p}</p>
      <div class="herobtns"><a class="btn" href="collections.html">{cta2}</a></div>
    </div>
  </section>
</div>
"""

COLLECTIONS = """
<section class="pagehead" data-ssla="g-hero"><div class="wrap">
  <p class="eyebrow">{eyebrow}</p>
  <h1>{collection_title}</h1>
  <p class="pagehead__lead">Every fabric we stock, with its full colour range. Each card collapses
     dozens of individual size listings into one product.</p>
</div></section>

<main class="wrap sec" data-ssla="Simplitory">
  <div class="searchrow">
      <div class="searchwrap">
        <input class="search" type="search" data-search placeholder="{search_ph}" aria-label="Search the catalog">
      </div>
      <button class="iconbtn" data-filter aria-label="Filter by category" title="Filter by category">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M3 5h18M6 12h12M10 19h4"/></svg>
        <span class="fbadge" data-filter-count hidden></span>
      </button>
      <button class="iconbtn iconbtn--clear" data-clear aria-label="Clear search and filters" title="Clear" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="filterpanel" data-filterpanel hidden>
        <p class="fp__h">Filter by category</p>
        <div class="chips" data-chips></div>
      </div>
    </div>
  <p class="sec__note" data-count style="margin:1.2rem 0 1.4rem"></p>
  <div class="grid" data-grid></div>
</main>
"""

PRODUCT = """
<main class="wrap sec" data-ssla="g-content-split">
  <div data-detail></div>
</main>
<section class="sec" data-ssla="Simplitory"><div class="wrap">
  <div class="sec__head"><div><h2>More from the collection</h2></div>
    <a class="btn" href="collections.html">Browse all</a></div>
  <div class="grid" data-related></div>
</div></section>
"""

EVENTS = """
<section class="pagehead" data-ssla="g-hero"><div class="wrap">
  <p class="eyebrow">{ev_eyebrow}</p>
  <h1>{ev_h}</h1>
  <p class="pagehead__lead">{ev_lead}</p>
</div></section>

<section class="sec splitsec" data-ssla="g-content-split"><div class="wrap split">
  <div class="split__body">
    <p class="eyebrow">{ev_eyebrow}</p>
    <h2>{ev_services_h}</h2>
    <div class="tracks">{ev_tracks}</div>
    <a class="btn tracks__cta" href="contact.html">{cta}</a>
  </div>
  <div class="split__media"><img src="../{about_img2}" alt=""></div>
</div></section>

<section class="sec splitsec alt" data-ssla="g-content-split"><div class="wrap split split--rev">
  <div class="split__media"><img src="../{split_img2}" alt=""></div>
  <div class="split__body">
    <p class="eyebrow">{split_eyebrow}</p>
    <h2>{split_h}</h2>
    <p>{split_p}</p>
    <ul class="ticks">{split_list}</ul>
    <p class="split__aside">See how one fabric works in practice:
       <a href="product.html?f=Dupioni">Dupioni &mdash; 57 colourways, 8 sizes &rarr;</a></p>
    <a class="btn" href="contact.html">{cta}</a>
  </div>
</div></section>

<section class="sec" data-ssla="g-cards"><div class="wrap">
  <div class="sec__head"><div><h2>Common questions</h2></div></div>
  <div class="faq">{ev_faq}</div>
</div></section>
"""

ABOUT = """
<section class="hero hero--bg hero--page" data-ssla="g-hero"
         style="--proto-page-photo:url(../{page_photo})">
  <div class="hero__media"></div>
  <div class="wrap hero__body">
    <p class="eyebrow">{about_eyebrow}</p>
    <h1>{about_h}</h1>
    <p>{about_lead}</p>
  </div>
</section>

<section class="sec splitsec" data-ssla="g-about-bio"><div class="wrap split">
  <div class="split__media"><img src="../{about_img}" alt=""></div>
  <div class="split__body">
    <h2>{about_h2}</h2>
    <p>{about_p1}</p>
    <p>{about_p2}</p>
  </div>
</div></section>

<section class="sec splitsec alt" data-ssla="g-content-split"><div class="wrap split split--rev">
  <div class="split__media"><img src="../{about_img2}" alt=""></div>
  <div class="split__body">
    <h2>{about_h3}</h2>
    <p>{about_p3}</p>
    <p>{about_p4}</p>
    <a class="btn" href="contact.html">{cta}</a>
  </div>
</div></section>

<section class="sec stats" data-ssla="g-proof"><div class="wrap statrow">{stats}</div></section>

<section class="sec quote1" data-ssla="g-proof"><div class="wrap">
  <blockquote>{quote_txt}<cite>{quote_by}</cite></blockquote>
</div></section>
"""

CONTACT = """
<section class="pagehead" data-ssla="g-hero"><div class="wrap">
  <p class="eyebrow">Contact</p>
  <h1>{ct_h}</h1>
  <p class="pagehead__lead">{ct_lead}</p>
</div></section>

<main class="sec" data-ssla="g-contact"><div class="wrap contact">
  <form class="contact__form" onsubmit="return false">
    <h2>Request availability</h2>
    <p class="sec__note">Tell us a bit about your event and we'll respond with next steps and pricing.</p>
    <div class="f2">
      <label class="fld"><span>Name</span><input type="text" placeholder="Your name"></label>
      <label class="fld"><span>Email</span><input type="email" placeholder="you@example.com"></label>
    </div>
    <div class="f2">
      <label class="fld"><span>Event date</span><input type="date"></label>
      <label class="fld"><span>Venue</span><input type="text" placeholder="Where is it?"></label>
    </div>
    <label class="fld"><span>Guest count</span><input type="number" placeholder="120"></label>
    <label class="fld"><span>Tell us about the event</span><textarea rows="5" placeholder="Colours, style, pieces you have in mind..."></textarea></label>
    <button class="btn" type="submit">Send request</button>
    <p class="sec__note" style="margin-top:.8rem">Prototype &mdash; nothing is sent. On the real site this
       creates a <strong>quote request</strong> for {name}.</p>
  </form>
  <aside class="contact__side">
    <h2>{ct_h2}</h2>
    <p>{ct_p}</p>
    <p class="detail__label">What to expect</p>
    <ul class="ticks">{ct_expect}</ul>
    <div class="contact__card">
      <p><strong>Email</strong><br><a href="mailto:{email}">{email}</a></p>
      <p><strong>Phone</strong><br><a href="tel:{tel}">{tel}</a></p>
      <p><strong>Where</strong><br>{where}</p>
    </div>
  </aside>
</div></main>
"""

QUOTE = """
<section class="pagehead" data-ssla="g-hero"><div class="wrap">
  <p class="eyebrow">Your selection</p>
  <h1>Your quote</h1>
  <p class="pagehead__lead">Items you've selected. Nothing is sent &mdash; this is a prototype.</p>
</div></section>
<main class="wrap sec" data-ssla="g-form"><div data-quote></div></main>
"""

PAGES = [
  ("index.html",       "Home",        HOME,        "home"),
  ("collections.html", "Collections", COLLECTIONS, "collections"),
  ("product.html",     "Product",     PRODUCT,     "product · gallery + selection"),
  ("events.html",      "Events",      EVENTS,      "events"),
  ("about.html",       "About",       ABOUT,       "about"),
  ("contact.html",     "Contact",     CONTACT,     "contact"),
  ("quote.html",       "Quote",       QUOTE,       "quote basket"),
]

# Photography lifted from the staging site's own uploads (wp-content/uploads).
IMG = dict(
  dta=dict(split="assets/img/site/stg-reception.jpg",  split2="assets/img/site/stg-detail.jpg",
           about="assets/img/site/stg-about.jpg",      about2="assets/img/site/stg-reception2.jpg",
           page="assets/img/site/stg-alt.jpg"),
  aer=dict(split="assets/img/site/stg-aer-2.jpg",      split2="assets/img/site/stg-reception2.jpg",
           about="assets/img/site/stg-aer-1.jpg",      about2="assets/img/site/stg-events.jpg",
           page="assets/img/site/stg-events.jpg"),
)

def build():
    for b in BRANDS:
        other = next(x for x in BRANDS if x["slug"] != b["slug"])
        os.makedirs(os.path.join(HERE, b["slug"]), exist_ok=True)
        markup = (f'<img src="../{b["logo"]}" alt="{b["name"]}" style="height:50px;width:auto">'
                  if b["logo"] else b["mark"])
        im = IMG[b["slug"]]
        cards = "".join(
            f'<article class="c3"><h3>{t}</h3><p>{d}</p>'
            f'<a class="c3__link" href="collections.html">Explore &rarr;</a></article>'
            for t, d in b["cards"])
        stats = "".join(f'<div class="stat"><b>{v}</b><span>{l}</span></div>' for v, l in b["stats"])
        ticks = "".join(f"<li>{x}</li>" for x in b["split_list"])
        expect = "".join(f"<li>{x}</li>" for x in b["ct_expect"])
        tracks = "".join(
            f'<article class="track"><h3>{t}</h3><p>{d}</p></article>' for t, d in b["ev_tracks"])
        # ss-launch's canonical FAQ is g-list's `faq` display-type: marker=none,
        # {text: question, detail: answer}, and it ships STATIC-OPEN — every
        # answer visible, no accordion (accordion is a documented follow-up in
        # g-list.php). The prototype matches that, so what the client sees here
        # is what Launch renders.
        faq = "".join(f'<div class="faq__i"><h3>{q}</h3><p>{a}</p></div>'
                      for q, a in b["ev_faq"])
        footfab = "".join(f'<li><a href="collections.html?q={f["fabric"]}">{f["fabric"]}</a></li>'
                          for f in FAB[:5])
        # DTA gets the new browse-first Shop (../shop.html, at the prototype
        # "Shop" leads the nav. DTA points at the browse-first shop.html (repo
        # root); AER has no shop.html yet, so its Shop entry points at its own
        # collections page (its product listing) — either way the label is Shop,
        # not Collections.
        brand_nav = [("Shop", "../shop.html")] + NAV if b["slug"] == "dta" else [("Shop", "collections.html")] + NAV
        for fname, title, tpl, label in PAGES:
            ACTIVE = ' class="is-active"'
            nav = "".join('<a href="' + href + '"' + (ACTIVE if href == fname else '')
                          + '>' + txt + '</a>' for txt, href in brand_nav)
            body = tpl.format(
                eyebrow=b["eyebrow"], h1=b["h1"], lead=b["lead"], cta=b["cta"], cta2=b["cta2"],
                hero_class=b["hero_class"], page_photo=im["page"],
                search_ph=b["search_ph"], collection_title=b["collection_title"],
                cards_h=b["cards_h"], cards=cards, stats=stats,
                split_eyebrow=b["split_eyebrow"], split_h=b["split_h"], split_p=b["split_p"],
                split_list=ticks, split_cta=b["split_cta"],
                split_img=im["split"], split_img2=im["split2"],
                about_img=im["about"], about_img2=im["about2"],
                quote_txt=b["quote_txt"], quote_by=b["quote_by"],
                band_h=b["band_h"], band_p=b["band_p"],
                about_eyebrow=b["about_eyebrow"], about_h=b["about_h"], about_lead=b["about_lead"],
                about_h2=b["about_h2"], about_p1=b["about_p1"], about_p2=b["about_p2"],
                about_h3=b["about_h3"], about_p3=b["about_p3"], about_p4=b["about_p4"],
                ev_eyebrow=b["ev_eyebrow"], ev_h=b["ev_h"], ev_lead=b["ev_lead"],
                ev_services_h=b["ev_services_h"],
                ev_tracks=tracks, ev_faq=faq,
                ct_h=b["ct_h"], ct_lead=b["ct_lead"], ct_h2=b["ct_h2"], ct_p=b["ct_p"],
                ct_expect=expect, email=b["email"], tel=b["tel"], where=b["where"], name=b["name"],
                nfab=len(FAB), ncol=NCOL, ntot=NTOT, nrow=NROW,
                script_html=(f'<p class="script">{b["script"]}</p>' if b.get("script") else ""))
            html = SHELL.format(
                title=title, name=b["name"], fonts=b["fonts"], css=b["css"], slug=b["slug"],
                pageslug=fname.replace(".html", ""),
                preset=b["preset"], pagelabel=label, other=other["slug"],
                othername=other["name"], samepage=fname, markup=markup, nav=nav, body=body,
                strip_section=b["strip_section"], strip_h=b["strip_h"], strip_p=b["strip_p"],
                cta=b["cta"], email=b["email"], tel=b["tel"], where=b["where"],
                footblurb=b["about_lead"], footfabrics=footfab,
                ncol=NCOL, nfab=len(FAB), nrow=NROW)
            open(os.path.join(HERE, b["slug"], fname), "w", encoding="utf-8").write(html)
        print(f"  {b['slug']}/  {len(PAGES)} pages  preset={b['preset']}")

if __name__ == "__main__":
    print(f"inventory: {len(FAB)} fabrics · {NCOL} colourways shown · {NTOT} colourways in RMS · {NROW} flat listings")
    print("building:")
    build()
    print("done.")
