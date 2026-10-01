// Menu, dropdowns, product filters, product photo switcher, and the gallery viewer.
(function () {
  // --- Menu and dropdowns ---
  var nav = document.querySelector(".site-header");
  var menuToggle = document.querySelector(".nav-toggle");
  var subToggles = document.querySelectorAll(".sub-toggle");
  function closeSubs(except) { subToggles.forEach(function (b) { if (b !== except) b.setAttribute("aria-expanded", "false"); }); }
  if (menuToggle) menuToggle.addEventListener("click", function () {
    var open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
  subToggles.forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      closeSubs(b); b.setAttribute("aria-expanded", String(!open));
    });
  });
  document.addEventListener("click", function (e) { if (nav && !nav.contains(e.target)) closeSubs(null); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeSubs(null); closeViewer(); } });

  // --- Product filters and sorting (Mattresses page) ---
  var grid = document.querySelector("[data-product-grid]");
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".product-card"));
    var chips = document.querySelectorAll("[data-filter]");
    var sort = document.querySelector("[data-sort]");
    var count = document.querySelector("[data-count]");
    function apply() {
      var active = document.querySelector("[data-filter][aria-pressed='true']");
      var f = active ? active.getAttribute("data-filter") : "all";
      var shown = 0;
      cards.forEach(function (c) {
        var ok = f === "all" || c.dataset.brand === f || c.dataset.type === f;
        c.hidden = !ok; if (ok) shown++;
      });
      var how = sort ? sort.value : "featured";
      var sorted = cards.slice();
      if (how === "low") sorted.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
      if (how === "high") sorted.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
      sorted.forEach(function (c) { grid.appendChild(c); });
      if (count) count.textContent = shown + (shown === 1 ? " product" : " products");
    }
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", "true"); apply();
      });
    });
    if (sort) sort.addEventListener("change", apply);
    apply();
  }

  // --- Furniture filters (type chips, color, material) ---
  var fGrid = document.querySelector("[data-furniture-grid]");
  if (fGrid) {
    var fCards = Array.prototype.slice.call(fGrid.querySelectorAll(".product-card"));
    var fChips = document.querySelectorAll("[data-group-chip]");
    var fColor = document.querySelector("[data-color]");
    var fMaterial = document.querySelector("[data-material]");
    var fCount = document.querySelector("[data-count]");
    var fEmpty = document.querySelector("[data-empty]");
    function applyFurniture() {
      var active = document.querySelector("[data-group-chip][aria-pressed='true']");
      var g = active ? active.getAttribute("data-group-chip") : "all";
      var shown = 0;
      fCards.forEach(function (c) {
        var ok = (g === "all" || c.dataset.group === g) &&
          (!fColor.value || c.dataset.colors.indexOf("|" + fColor.value + "|") > -1) &&
          (!fMaterial.value || c.dataset.material === fMaterial.value);
        c.hidden = !ok; if (ok) shown++;
      });
      fCount.textContent = shown + (shown === 1 ? " piece" : " pieces");
      fEmpty.hidden = shown > 0;
    }
    fChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        fChips.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        chip.setAttribute("aria-pressed", "true"); applyFurniture();
      });
    });
    fColor.addEventListener("change", applyFurniture);
    fMaterial.addEventListener("change", applyFurniture);
  }

  // --- Product photo switcher ---
  var main = document.querySelector("[data-main-photo]");
  document.querySelectorAll("[data-thumb]").forEach(function (t) {
    t.addEventListener("click", function () {
      main.src = t.getAttribute("data-thumb");
      document.querySelectorAll("[data-thumb]").forEach(function (o) { o.setAttribute("aria-current", "false"); });
      t.setAttribute("aria-current", "true");
    });
  });

  // --- Sale ad: show the one scheduled for today, even if the site was built earlier ---
  var adData = document.getElementById("ad-data");
  var live = adData && window.BBBAdSchedule && window.BBBAdSchedule.current(new Date());
  var ad = live && JSON.parse(adData.textContent)[live.id];
  if (ad) {
    var adImg = document.querySelector("[data-sale-img]");
    if (adImg && adImg.getAttribute("src") !== ad.image) { adImg.src = ad.image; adImg.alt = ad.alt; }
    document.querySelectorAll("[data-sale-ribbon]").forEach(function (el) { el.textContent = ad.ribbon; });
    document.querySelectorAll("[data-sale-ends]").forEach(function (el) { el.textContent = live.ends; });
  }

  // --- Contact form: fill in the product someone asked about ---
  var about = new URLSearchParams(location.search).get("about");
  var msg = document.querySelector("[data-message]");
  if (about && msg && !msg.value) msg.value = "Hi, I have a question about the " + about + ".\n\n";

  // --- Gallery viewer ---
  var viewer = document.querySelector("[data-viewer]");
  var viewerImg = viewer && viewer.querySelector("img");
  var photos = Array.prototype.slice.call(document.querySelectorAll("[data-photo]"));
  var current = -1;
  function show(i) {
    current = (i + photos.length) % photos.length;
    viewerImg.src = photos[current].getAttribute("href");
    viewerImg.alt = photos[current].querySelector("img").alt;
    viewer.hidden = false; document.body.style.overflow = "hidden";
  }
  function closeViewer() { if (viewer && !viewer.hidden) { viewer.hidden = true; document.body.style.overflow = ""; } }
  photos.forEach(function (a, i) { a.addEventListener("click", function (e) { e.preventDefault(); show(i); }); });
  if (viewer) {
    viewer.querySelector("[data-close]").addEventListener("click", closeViewer);
    viewer.querySelector("[data-prev]").addEventListener("click", function () { show(current - 1); });
    viewer.querySelector("[data-next]").addEventListener("click", function () { show(current + 1); });
    viewer.addEventListener("click", function (e) { if (e.target === viewer) closeViewer(); });
    document.addEventListener("keydown", function (e) {
      if (viewer.hidden) return;
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }
})();
