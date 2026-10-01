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

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });

  // 1599 -> "$1,599"
  eleventyConfig.addFilter("money", (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 }));
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
