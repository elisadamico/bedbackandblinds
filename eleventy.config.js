import { load as loadYaml } from "js-yaml";

export default function (eleventyConfig) {
  // Data files can be written as YAML (src/_data/*.yml), which is easier to edit by hand.
  eleventyConfig.addDataExtension("yml", (contents) => loadYaml(contents));

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });

  // 1599 -> "$1,599"
  eleventyConfig.addFilter("money", (n) => "$" + Number(n).toLocaleString("en-US"));
  eleventyConfig.addFilter("byBrand", (products, brand) => products.filter((p) => p.brand === brand));
  eleventyConfig.addFilter("bySlugs", (products, slugs) => slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean));
  eleventyConfig.addFilter("related", (products, product, n = 3) =>
    products.filter((p) => p.brand === product.brand && p.slug !== product.slug).slice(0, n));
  eleventyConfig.addFilter("containsUrl", (items, url) => items.some((i) => i.url === url));
  eleventyConfig.addFilter("urlencode", (s) => encodeURIComponent(s));
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
