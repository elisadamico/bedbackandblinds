// Online ordering: the cart, the header cart count, and the cart page.
// The cart lives in this browser only (localStorage). Prices come from /cart-catalog.json,
// and the checkout worker works the totals out again from the same file, so what
// the cart page shows is what Stripe charges.
(function () {
  var KEY = "bbb-cart";
  var checkoutUrl = document.documentElement.getAttribute("data-checkout");

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(cart) { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} showCount(cart); }
  function showCount(cart) {
    var n = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) { el.textContent = n; el.hidden = !n; });
  }
  function money(n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // Today's date in Dubuque, as "2026-10-29", for promo start and end dates.
  function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()); }
  function priceOf(item) {
    var p = item.promo, d = today();
    return p && d >= p.start && d <= p.end ? item.price - p.off : item.price;
  }

  // The thanks page after a paid checkout empties the cart.
  if (document.querySelector("[data-cart-clear]")) save([]);
  showCount(load());

  // --- Add to cart buttons ---
  document.querySelectorAll("[data-cart-add]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var size = btn.closest("form, div").querySelector("[data-cart-size]");
      var id = size ? size.value : btn.getAttribute("data-cart-add");
      var cart = load();
      var line = cart.filter(function (i) { return i.id === id; })[0];
      if (line) line.qty++; else cart.push({ id: id, qty: 1 });
      save(cart);
      var done = btn.parentNode.querySelector("[data-cart-added]");
      if (done) done.hidden = false;
    });
  });

  // --- Cart page ---
  var page = document.querySelector("[data-cart-page]");
  if (!page) return;
  var list = page.querySelector("[data-cart-lines]");
  var empty = page.querySelector("[data-cart-empty]");
  var order = page.querySelector("[data-cart-order]");
  var zipInput = page.querySelector("[data-zip]");
  var zipNote = page.querySelector("[data-zip-note]");
  var totals = page.querySelector("[data-totals]");
  var payBtn = page.querySelector("[data-pay]");
  var error = page.querySelector("[data-pay-error]");
  var catalog;

  function method() { var r = page.querySelector("[name=method]:checked"); return r ? r.value : "pickup"; }
  function delivery(zip) {
    var miles = catalog.zips[zip];
    if (miles == null) return null;
    for (var i = 0; i < catalog.delivery.length; i++) if (miles <= catalog.delivery[i].max_miles) return catalog.delivery[i];
    return null;
  }

  function render() {
    // Drop anything that is no longer for sale on the site.
    var cart = load().filter(function (i) { return catalog.items[i.id]; });
    save(cart);
    empty.hidden = cart.length > 0;
    order.hidden = cart.length === 0;
    list.innerHTML = "";
    var subtotal = 0;
    cart.forEach(function (line) {
      var item = catalog.items[line.id], each = priceOf(item);
      subtotal += each * line.qty;
      var row = document.createElement("div");
      row.className = "cart-line";
      row.innerHTML = '<a class="cart-thumb" href="' + item.url + '"><img alt="" src="' + item.image + '"></a>' +
        '<div class="cart-name"><a href="' + item.url + '"></a><span class="cart-each">' + money(each) + ' each</span></div>' +
        '<label class="cart-qty">Qty <input type="number" min="1" max="20" value="' + line.qty + '"></label>' +
        '<span class="cart-sum">' + money(each * line.qty) + '</span>' +
        '<button type="button" class="cart-remove" aria-label="Remove">Remove</button>';
      row.querySelector(".cart-name a").textContent = item.name;
      row.querySelector("input").addEventListener("change", function (e) {
        line.qty = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)); save(cart); render();
      });
      row.querySelector(".cart-remove").addEventListener("click", function () {
        cart.splice(cart.indexOf(line), 1); save(cart); render();
      });
      list.appendChild(row);
    });

    var m = method(), zip = zipInput.value.trim(), d = null;
    page.querySelector("[data-zip-row]").hidden = m !== "delivery";
    zipNote.textContent = "";
    if (m === "delivery" && zip.length === 5) {
      d = delivery(zip);
      zipNote.textContent = d ? d.label + ": " + money(d.fee) : "Sorry, we only deliver within 45 miles of our Dubuque store. You can choose store pickup instead.";
    }
    var tax = Math.round(subtotal * catalog.tax_rate * 100) / 100;
    var fee = m === "delivery" && d ? d.fee : 0;
    totals.innerHTML = "";
    [["Subtotal", subtotal], [m === "delivery" ? "Delivery" : "Store pickup", m === "delivery" ? (d ? fee : null) : 0], [catalog.tax_label, tax], ["Total", subtotal + fee + tax]]
      .forEach(function (r) {
        var row = document.createElement("div");
        row.innerHTML = "<span></span><span></span>";
        row.firstChild.textContent = r[0];
        row.lastChild.textContent = r[1] == null ? "Enter your ZIP code" : (r[1] === 0 && r[0] === "Store pickup" ? "Free" : money(r[1]));
        if (r[0] === "Total") row.className = "total";
        totals.appendChild(row);
      });
    payBtn.disabled = !cart.length || (m === "delivery" && !d);
  }

  page.querySelectorAll("[name=method]").forEach(function (r) { r.addEventListener("change", render); });
  zipInput.addEventListener("input", render);

  payBtn.addEventListener("click", function () {
    error.hidden = true;
    payBtn.disabled = true;
    payBtn.textContent = "Opening secure checkout…";
    fetch(checkoutUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: load(), method: method(), zip: zipInput.value.trim() })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res.url) throw new Error(res.error || "Checkout is not available right now.");
      location.href = res.url;
    }).catch(function (e) {
      error.textContent = e.message + " Please call us and we'll take your order by phone.";
      error.hidden = false;
      payBtn.textContent = "Check out";
      render();
    });
  });

  fetch("/cart-catalog.json").then(function (r) { return r.json(); }).then(function (c) { catalog = c; render(); });
})();
