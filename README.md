# تاج كلاس | Taj Class

Website for Taj Class, luxury oriental sweets (Jasim, Damascus, Homs, Amman).
Plain HTML, CSS and JavaScript with no build step. Arabic first, with an English toggle.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Intro animation, hero, the pinned sweets showcase, gifts teaser, branches, Instagram wall |
| `sweets.html` | Full catalog: Arabic-aware search, type and filling filters, sort, detail sheet with quantity. Filters live in the URL (`?cat=knafeh&tags=pistachio`, `?item=warbat` opens a sweet) |
| `gifts.html` | Boxes filtered by occasion (`?occ=eid`), add a box to the order, and a four-step custom box request sent to WhatsApp |
| `branches.html` | Each branch with its shopfront photo, live map, hours and phones. `branches.html#barzeh` jumps to a branch |

All pages share one basket (saved in the visitor's browser) and send orders to WhatsApp.

## Preview locally

```bash
npm start          # http://localhost:4747
```

## Deploy

The site is static, so upload the folder as-is to any static host. Skip `source-media/`, which holds original photos kept for reference only.

- **Netlify:** drag the project folder onto https://app.netlify.com/drop.
- **Cloudflare Pages / Vercel:** import the repo. Framework is "None", build command is empty, output directory is `/`.
- **GitHub Pages:** push the repo, then Settings → Pages → deploy from branch `main`, folder `/ (root)`.

`404.html` is picked up automatically by Netlify, Cloudflare Pages and GitHub Pages.

### After you have a domain

In `index.html`, add these inside `<head>`, replacing `https://example.com` with the real domain:

```html
<link rel="canonical" href="https://example.com/">
<meta property="og:url" content="https://example.com/">
```

Also change `og:image` to the full URL (`https://example.com/assets/img/post04.webp`) so link previews on WhatsApp and Facebook show the photo. Add `Sitemap: https://example.com/sitemap.xml` to `robots.txt` if you create a sitemap.

## Editing content

| What | Where |
|---|---|
| Sweets (name, description, photo, type, fillings) | `PRODUCTS` in `assets/js/data.js` |
| Types and filling filters | `CATEGORIES` and `TAGS` in `assets/js/data.js` |
| Gift boxes and occasions | `BOXES` and `OCCASIONS` in `assets/js/data.js` |
| Branches: phones, hours, map pin, shopfront photo | `BRANCHES` in `assets/js/data.js` |
| WhatsApp number that receives orders | `WA_NUMBER` in `assets/js/data.js` |
| English text | `EN` and `UI` in `assets/js/data.js`. Arabic page text lives in the HTML |
| Header menu, mobile tab bar, footer | `tools/sync-partials.py`, then run `python tools/sync-partials.py` |
| Colours and fonts | top of `styles.css` |

Scripts: `assets/js/core.js` is shared by every page (language, basket, smooth scroll, page transitions); each page has its own file next to it.

Photos live in `assets/img/` as WebP. To add one, save it as `postNN.webp` (up to 1600px) and reference it by name.

## Confirm with the shop before launch

- Product names that were inferred from photos rather than captions: كنافة بالقشطة، عش البلبل، كنافة بالفستق، معمول، تارت القشطة بالفراولة، تارت القشطة بالفستق، كرات القشطة بالفستق، مشكّل البقلاوة، صحن الضيافة.
- Shopfront photos for **Jasim** and **Arnous Square**. Until then they show a designed sign panel. Save the photo as `assets/img/branch-jasim.webp` (or `branch-arnous.webp`) and set `img: "branch-jasim"` on that branch in `data.js`. The Ramadan shopfront in `source-media/instagram/post33.jpg` is a Taj branch other than Barzeh (it was posted before Barzeh opened); the shop can say which.
- Exact map pins for Jasim, Arnous and Homs. They currently show the area. Get the coordinates from Google Maps (right-click the shop, copy the numbers) and set `map: { ll: "lat,lng" }`.
- Opening hours for Jasim, Arnous and Homs. Barzeh (10 am to 1 am) and Amman (9 am to 1 am) come from their Google Maps listings.
- A phone number for the Homs (الحضارة) branch. It currently links to WhatsApp.
- That all orders should go to WhatsApp +963 965 875 990, or whether each branch has its own number.

## Notes

- The intro plays every time the home page loads (visitors can tap to skip it) and is skipped entirely for visitors who set "reduce motion".
- GSAP, ScrollTrigger and Lenis are bundled in `assets/vendor/`, so the site doesn't depend on third-party script CDNs. Fonts load from Google Fonts.
- The basket is saved in the visitor's browser. Orders are sent as a pre-filled WhatsApp message, so no server or database is needed.
