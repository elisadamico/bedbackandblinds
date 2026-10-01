# bedbackandblinds.com

Website for Bed Back & Blinds, Dubuque, Iowa. Built with [Eleventy](https://www.11ty.dev/).

## Common edits

| To change | Edit |
| --- | --- |
| The sale banner on the home page | Put the image in `src/assets/img/site/`, then update `src/_data/sale.json` (set `"show": false` to hide it) |
| Mattress products and prices | `src/_data/products.yml` (each product gets its own page automatically) |
| Gallery photos | `src/_data/gallery.yml`, with photos in `src/assets/img/gallery/` |
| Phone, email, address, hours, menu | `src/_data/site.json` |
| Page text | the matching file in `src/` (for example `src/window-treatments.md`) |

## Preview locally

```
npm install     # first time only
npm start       # then open http://localhost:8080
```
