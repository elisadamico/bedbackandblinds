import { readFileSync } from "node:fs";
import { load as loadYaml } from "js-yaml";

// The same date schedule the browser uses to pick the live sale ad.
const adSchedule = {};
new Function("window", readFileSync("src/assets/js/ad-schedule.js", "utf8"))(adSchedule);
const AD_OFFERS = "Save up to $500 on select adjustable mattress sets, buy more and save more on blinds, shades, shutters, and drapery, and get free delivery or a bed frame, free in-home setup, and free removal. For a free in-home window treatment consultation, call Donna at 563-213-1141.";

export default function (eleventyConfig) {
  // Data files can be written as YAML (src/_data/*.yml), which is easier to edit by hand.
  eleventyConfig.addDataExtension("yml", (contents) => loadYaml(contents));

  // The sale ad that is live on the day the site is built. The browser checks
  // the date again (src/assets/js/site.js), so the ad changes on schedule anyway.
  eleventyConfig.addGlobalData("sale", () => {
    const { show, ads } = JSON.parse(readFileSync("src/_data/ads.json", "utf8"));
    for (const ad of Object.values(ads)) ad.alt = `${ad.ribbon} at Bed Back & Blinds. ${AD_OFFERS}`;
    const now = adSchedule.BBBAdSchedule.current(new Date());
    return { show, ads, ...ads[now.id], ends: now.ends };
  });

  // The manufacturer promotion a product is in (src/_data/promos.yml), if any. "live" is for the
  // day the site is built. The browser checks the dates again (site.js), so promos switch on schedule.
  const promos = loadYaml(readFileSync("src/_data/promos.yml", "utf8")) || [];
  const localDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  eleventyConfig.addFilter("promo", (p) => {
    for (const promo of promos) {
      const offer = promo.offers.find((o) => o.products.includes(p.slug));
      if (!offer) continue;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const end = localDay(promo.end);
      return {
        name: promo.name, off: offer.off, dates: `${promo.start}|${promo.end}`, details: promo.details,
        ends: `through ${end.toLocaleString("en-US", { month: "long" })} ${end.getDate()}`,
        live: today >= localDay(promo.start) && today <= end,
      };
    }
    return null;
  });

  // Everything the cart can sell, with selling prices and the delivery and tax settings.
  // Built to /cart-catalog.json, which both the cart page and the checkout worker read,
  // so the browser never decides a price. Pillows priced "From" are left out.
  eleventyConfig.addFilter("cartCatalog", (products, furniture, fprices, shop, zips) => {
    const items = {};
    const url = (p) => `/${p.section || "mattresses"}/${p.slug}/`;
    for (const p of products) {
      // Bedding needs a Malouf SKU (or a choice of SKUs) so the order can be placed on the WRC.
      if (p.section === "bedding" && !p.sku && !p.options) continue;
      if (p.price_from && !p.options) continue;
      const promo = promos.flatMap((pr) => pr.offers.filter((o) => o.products.includes(p.slug))
        .map((o) => ({ off: o.off, start: pr.start, end: pr.end })))[0];
      const base = { image: p.images[0], url: url(p), ...(promo && { promo }), ...(p.ship_free && { ship: true }) };
      const size = p.price_label.split(" ")[0];
      if (p.options) {
        for (const c of p.options.choices) {
          items[`p:${p.slug}|${c.sku}`] = { ...base, name: `${p.brand} ${p.name}, ${size}, ${c.name} (SKU ${c.sku})`, price: c.price || p.price };
        }
      } else if (p.sku) {
        items[`p:${p.slug}`] = { ...base, name: `${p.brand} ${p.name} (${p.price_label}, SKU ${p.sku})`, price: p.price };
      } else if (p.size_prices) {
        p.size_prices.forEach((r, i) => {
          items[`p:${p.slug}:${i}`] = { ...base, name: `${p.brand} ${p.name}, ${r.size} mattress`, price: r.mattress };
        });
      } else {
        items[`p:${p.slug}`] = { ...base, name: `${p.brand} ${p.name} (${p.price_label})`, price: p.price };
      }
    }
    for (const f of furniture.items) {
      const fp = fprices[f.sku];
      if (!fp) continue;
      items[`f:${f.sku}`] = { name: `Coaster ${f.full_name} (item ${f.sku})`, price: fp.sale || fp.price,
        ...(fp.sale && { was: fp.price }), image: f.image, url: `/furniture/item/${f.slug}/` };
    }
    const { note, checkout_url, ...settings } = shop;
    return { ...settings, zips, items };
  });

  // Furniture sale percent off, rounded down so it never overstates the savings.
  eleventyConfig.addFilter("percentOff", (fp) => Math.floor(100 * (1 - fp.sale / fp.price)));
  // Furniture with a sale price in furniture_prices.yml, biggest percent off first.
  eleventyConfig.addFilter("furnitureOnSale", (items, prices) =>
    items.filter((i) => prices[i.sku]?.sale).sort((a, b) => prices[a.sku].sale / prices[a.sku].price - prices[b.sku].sale / prices[b.sku].price));

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });

  // 1599 -> "$1,599"
  eleventyConfig.addFilter("money", (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 }));
  eleventyConfig.addFilter("shipsFree", (products) => products.filter((p) => p.ship_free));
  eleventyConfig.addFilter("mattressesOnly", (products) => products.filter((p) => p.section !== "bedding"));
  eleventyConfig.addFilter("inCollection", (products, c) => products.filter((p) => p.collection === c));
  eleventyConfig.addFilter("productUrl", (p) => `/${p.section || "mattresses"}/${p.slug}/`);
  eleventyConfig.addFilter("byBrand", (products, brand) => products.filter((p) => p.brand === brand));
  eleventyConfig.addFilter("bySlugs", (products, slugs) => slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean));
  eleventyConfig.addFilter("related", (products, product, n = 3) =>
    products.filter((p) => p.brand === product.brand && p.slug !== product.slug && (p.section !== "bedding" || p.collection === product.collection)).slice(0, n));
  eleventyConfig.addFilter("containsUrl", (items, url) => items.some((i) => i.url === url));
  eleventyConfig.addFilter("urlencode", (s) => encodeURIComponent(s));
  // Furniture (Coaster catalog, see scripts/import-coaster.py)
  eleventyConfig.addFilter("furnitureIn", (items, room, cat) => items.filter((i) => i.room === room && (!cat || i.cat === cat)));
  eleventyConfig.addFilter("furnitureRoom", (rooms, slug) => rooms.find((r) => r.slug === slug));
  eleventyConfig.addFilter("furnitureNew", (items, n) => {
    const seen = new Set();
    // The newest pieces, one per category so the row has some variety.
    return items.filter((i) => i.new && !seen.has(i.cat) && seen.add(i.cat)).slice(0, n);
  });
  eleventyConfig.addFilter("furnitureRelated", (items, f, n = 4) => {
    const same = items.filter((i) => i.slug !== f.slug && f.collection && i.collection === f.collection);
    const pool = same.length ? same : items.filter((i) => i.slug !== f.slug && i.cat === f.cat && i.room === f.room);
    return pool.slice(0, n);
  });
  eleventyConfig.addFilter("uniqueValues", (items, key) => [...new Set(items.flatMap((i) => [].concat(i[key] ?? [])))].filter(Boolean).sort());
  // Window treatment lines that can be motorized, leaving out the brand's motorization system itself.
  eleventyConfig.addFilter("motorLines", (groups, system) =>
    groups.flatMap((g) => g.lines).filter((l) => l.name !== system && /motor|powerview|bliss|somfy|automat/i.test([l.summary, ...(l.features || [])].join(" "))));
  eleventyConfig.addFilter("findLine", (groups, name) => groups.flatMap((g) => g.lines).find((l) => l.name === name));
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  // Links that leave the site open in a new tab.
  eleventyConfig.addTransform("external-links", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    return content.replace(/<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>/g, (tag, url) => {
      if (/^https?:\/\/(www\.)?bedbackandblinds\.com/.test(url) || /\btarget=/.test(tag)) return tag;
      const withRel = /\brel="/.test(tag)
        ? tag.replace(/\brel="([^"]*)"/, (rel, v) => `rel="${/noopener/.test(v) ? v : v + " noopener"}"`)
        : tag.replace(/>$/, ' rel="noopener">');
      return withRel.replace(/>$/, ' target="_blank">');
    });
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
