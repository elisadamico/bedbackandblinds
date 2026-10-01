# bedbackandblinds.com

Website for Bed Back & Blinds, Dubuque, Iowa. Built with [Eleventy](https://www.11ty.dev/).

## Common edits

| To change | Edit |
| --- | --- |
| The sale banner on the home page | Eight ads rotate by date on their own (Presidents' Day, Spring, Memorial Day, 4th of July, Labor Day, Fall, Black Friday, Holiday). To update one, save the new image over its file in `src/assets/img/ads/`. The dates live in `src/assets/js/ad-schedule.js`, and `src/_data/ads.json` holds the ribbon text (set `"show": false` to hide all ads) |
| Mattress products and prices | `src/_data/products.yml` (each product gets its own page automatically) |
| Gallery photos | `src/_data/gallery.yml`, with photos in `src/assets/img/gallery/` |
| Phone, email, address, hours, menu | `src/_data/site.json` |
| Page text | the matching file in `src/` (for example `src/window-treatments.md`) |

## Preview locally

```
npm install     # first time only
npm start       # then open http://localhost:8080
```

## Furniture (Coaster)

The Furniture section is built from Coaster's online catalog, collected into `~/Developer/bedbackandblinds-work/brands/coaster/`. To refresh it after a new collection, run `python3 scripts/import-coaster.py` from this folder. That rewrites `src/_data/furniture.json` and adds any new images to `src/assets/img/furniture/`. The rooms and categories are set at the top of that script. Coaster publishes no prices, so the pages ask people to call or send a question instead.
