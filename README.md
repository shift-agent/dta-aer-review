# Two Brands, One Roof — multi-page functional prototype

Design + architecture prototype for the Decor To Adore / Alabama Event Rentals rescue.
Spec: `_Development/dta/docs/STRATEGY-two-brands-one-roof.md`.

**Start at [`index.html`](index.html)** (P1, the architecture map), then enter either site.

```
index.html    P1 - architecture map
wizard.html   P4 - Simplitory import wizard (admin surface)
dta/  home · collections · product · events · about · contact · quote
aer/  home · collections · product · events · about · contact · quote
```
14 storefront pages, 7 per brand, from ONE template set + ONE structural stylesheet.

## Built from the REAL staging site
Staging (staging.decortoadore.com) is WAF-gated against automation, but the whole site **and its
database** were in the tarball — so palettes, copy and IA come from `aco_posts` in the DB dump
(70 published pages), not invented.

| | Decor To Adore | Alabama Event Rentals |
|---|---|---|
| Palette | navy `#2F4D6A` · sage `#8FB58A` · olive `#6F8A5C` · gold `#D9B25F` · paper `#FDF9F5` | coal `#111315` · metal `#313841` · brass `#9F8654` · white `#F5F7F8` |
| Source | staging `--navy/--sage/--olive/--gold/--paper` | staging `--aer-coal/--aer-metal/--aer-accent` |

Copy is lifted from the staging pages: *"Making your vision come true"*, *"Complete styling
support"*, the Consultation/Coordination/Execution model, the family story (Kendall & Barrett,
Finley & Sutton), the Irondale by-appointment note, and the real testimonial.

**Note:** staging already contains an AER design too (`--aer-*` tokens, Homepage/Rentals/About/
Contact - Alabama Event Rentals pages), and it is *dark industrial + brass* — quite different from
their live Squarespace (monochrome + coral). This prototype follows the **staging** direction.

## Real-data search + photo management (P5)
The prototype now runs on a **full catalog pull**: `assets/data/catalog.json` — **2,572 products
grouped from 3,889 live Current RMS listings**, with all **379 available photographs downloaded and
re-hosted**.

**Search** (home + collections) runs over that whole corpus, so results are representative:
| query | products | RMS listings | with a photo |
|---|--:|--:|--:|
| gold | 157 | 211 | 42 (27%) |
| napkin | 176 | 176 | 16 (9%) |
| chiavari | 24 | 24 | 11 (46%) |
| dance floor | 47 | 47 | **0 (0%)** |
Products with no image render an honest "No photo" plate rather than being hidden.

**[`photos.html`](photos.html) — photo management console.** Filter by Missing / Low-res / Has photo,
a category rail sorted worst-coverage-first, live search, multi-select, shoot-list builder and export.
Per product: Upload (re-host), CRMS (browse that product's attachments), Shoot list.

### What the real data exposed
- **Coverage: 353 usable · 26 low-res · 2,193 none** (14% / 1% / 85%).
- **Eight categories sit at 0%** — Cleaning (115), Fees (79), Stage (77), Dance Floor (44), Tent (41),
  Tables (39), Decor (34), Infrastructure (28).
- **"Cleaning" and "Fees" are back-office groups** appearing as customer-facing categories — they
  should be excluded at the group-mapping step, not published.
- **Current RMS mixes image formats and the extension lies** — 76 of 379 "…jpg" files are actually
  PNG. An importer must sniff the bytes, not trust the URL.
- Some "photos" are **CAD floor-plan drawings** (Aldridge Lighting), not sellable product imagery.

## Custom CSS — kept separate on purpose
`assets/custom-css.css` holds the bespoke geometry that SSLA has **no field or variant for**, so in
a real Launch build it goes into the registered **`custom-css` section**
(`ss-launch/pages/sections/custom-css.php`) — not the theme, not the preset manifest:

1. **Angled hero split** (`.hero--angle`) — the diagonal paper panel, driven by `--proto-angle`
   (position) and `--proto-angle-deg` (steepness), with a mobile fallback to a flat scrim.
2. **Page hero** (`.hero--page`) — photo + dark scrim for interior pages (About).
3. **Two-tone headline** — the emphasised span takes `--proto-h1-accent`.
4. **Ghost button on a dark hero.**

`base.css` now contains **zero** bespoke geometry (verified), so both brand presets stay cleanly
convertible into a preset `manifest.json` palette.

## Photography — from staging's own uploads
The tarball includes staging's full `wp-content/uploads` (1.4 GB). The hero is the **actual staging
homepage hero** (`The-Reception-31`, confirmed as the first image before the H1 in the page content),
plus real event photography for the split sections, About and Events. AER uses its own staging
imagery (`The-Details-0452`).

## Inventory display — fabric → colour → size
Refined to match how the real plugin models the catalog: **fabric is the product, colour is the
variation, size is an attribute.**
- **Collections** shows 7 fabric cards with a mini colour strip, not 17 near-identical rows.
- **Product** page is a real gallery: main image + **12 real fabric swatches as the colour picker**,
  size chips, qty, and an honest *"12 of 57 colourways photographed"*.
- Value line per product: *"Current RMS holds this fabric as 267 separate listings — 57 colourways
  × 8 sizes. Grouped here into one product."*
- **Low-res warehouse reference shots** (an audit found 16/26 were 120×160 thumbnails) are detected
  and rendered `contain` on a hatched plate with a *Reference photo* flag, instead of being
  upscaled into a blur.

## P4 — inventory management wizard ([`wizard.html`](wizard.html))
The admin side of **Simplitory** (Simple Inventory for Current RMS). A 6-step flow, functional, driven by the real data:
1. **Connect** — subdomain + token, "Test connection" pulls 3,889 products / 55 groups.
2. **Map groups** — all 55 real Current RMS groups → site categories, with a "Build variations" toggle
   (23 fabric groups pre-flagged); live count.
3. **Variations** — the 26 grouped products; expand any row to see the underlying size listings it merges
   (e.g. Polyester-White → 13 real listings with their CRMS #IDs); approve / override, persisted.
4. **Brands** — assign DTA / AER / both per product; the **tags written to Current RMS** column updates live
   (`brand:dta brand:aer`); tile counters recount. This is where the brand dimension is *created*.
5. **Images** — live coverage bar (13% have photos / 87% missing), worst-covered lines, export shoot list.
6. **Publish + schedule** — summary, sync cadence (manual / nightly / hourly / on-change), publish.

## Home-page live search
Both home heroes carry a "Search for anything" field. Typing filters **live on the page** — the featured
section is replaced by a results grid with category chips and result counts (search spans name, category,
tags and sizes). Empty query restores the default home. Enter is not required; no page jump.

## What it proves

**1. One source, two brands.** All 14 storefront pages come from one `build.py`, one template set
and one structural stylesheet (`assets/base.css`, which names no brand). Only the preset differs.

**2. ss-launch conformance — adopted, not reinvented.**
- `base.css` consumes ss-launch's real `--shell-*` vocabulary (28 tokens), all verified present in
  `class-ssla-preset-painting.php`. Prototype-only extras are namespaced `--proto-*`.
- **All 17 section types used already exist in the SSLA registry** — `nav-standard`, `hero-bg`,
  `g-hero-half`, `g-cards`, `g-content-split`, `g-content-tracks`, `g-about-bio`, `g-stats`,
  `g-testimonial-single`, `g-faq`, `g-contact-split`, `showcase-grid`, `form-full`, `cta-accent`,
  `cta-banner`, `cta-dark`, `footer-expanded`. **Nothing new invented.** Hit *toggle SSLA sections*
  on any page to see them labelled in place.
- **The split image/text is not custom CSS.** `g-content-split` is a registered section with five
  fields (`eyebrow`, `heading`, `body` rich, `cta` link, `media` required) plus tone/density variant
  controls. In Launch you insert it and fill fields; layout and colour come from the preset.
- Each brand's `:root` is written with SSLA palette key names in comments, so it converts directly
  into a preset `manifest.json` `"palette"` (cf. `ss-launch/presets/editorial/manifest.json`).

**3. Shared inventory, real data.** Both sites render the same 7 fabrics / 67 photographed
colourways, representing **1,304 flat Current RMS listings** (368 colourways in the live account).

**4. Functional.** Live home-page search, category chips, colour-swatch gallery, size selection,
qty, add-to-quote with a persistent basket, and a quote page carrying event start/end dates that
map to `opportunity.starts_at` / `ends_at`.

## Assets — all real
- **Logo + lifestyle photography** from the live decortoadore.com.
- **Fabric photography** pulled live from Current RMS (`icon.url`). Those URLs are **expiring S3
  presigned links (~21 min)** — downloaded and re-hosted. Any real build must do the same.

## Two things that do NOT exist in SSLA yet
1. **Live search** (`search-live`) — proposed **ss-theme** primitive.
2. **Inventory-aware catalog grid / gallery** — belongs to **Simplitory** (brand-scoped
   query + fabric/colour/size grouping). Everything else is existing Launch capability.

## Rebuild
```bash
python3 build.py     # regenerates all 14 storefront pages
```

## Verification run
- Token contract: 82 required tokens; both presets define all 82. *(Caught three real bugs across
  passes — `--proto-chip-pad`, `--proto-search-pad`, and a hero forcing white text onto DTA's
  ivory panel.)*
- All 17 SSLA section types confirmed present in the registry.
- All internal links resolve across both brands.
- Rendered and inspected headlessly via Brave (Chrome is not installed; the in-app preview pane
  cannot live-reload `file://` outside the project root).

## Open
- Not yet measured against the client's design requests (still pending).
- AER hero uses shared event photography as a stand-in — their live site is product-cutout heavy.
- Photography remains the real constraint: **87% of the live catalog has no image**, and many that
  do are warehouse reference thumbnails.
