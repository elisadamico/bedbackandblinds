// Checkout for bedbackandblinds.com. The cart page posts { items, method, zip } here,
// and this creates a Stripe Checkout session and returns its URL.
// Prices, delivery fees, and the tax rate all come from the live site's
// /cart-catalog.json, so nothing the browser sends can change what is charged.
const SITE = "https://www.bedbackandblinds.com";
const ORIGINS = [SITE, "https://bedbackandblinds.com", "http://localhost:8080"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : SITE,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return reply({ error: "Not found." }, 404, cors);
    try {
      const { url } = await createCheckout(await request.json(), env);
      return reply({ url }, 200, cors);
    } catch (e) {
      return reply({ error: e.message }, 400, cors);
    }
  },
};

async function createCheckout({ items, method, zip }, env) {
  const res = await fetch(`${SITE}/cart-catalog.json`, { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new Error("Checkout is not available right now.");
  const catalog = await res.json();

  if (!Array.isArray(items) || !items.length) throw new Error("Your cart is empty.");
  if (items.length > 50) throw new Error("That's too many items for one order.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const cents = (dollars) => Math.round(dollars * 100);

  let subtotal = 0, allShip = true;
  const lines = items.map(({ id, qty }) => {
    const item = catalog.items[id];
    if (!item) throw new Error("Something in your cart is no longer available. Please refresh the cart page.");
    allShip = allShip && !!item.ship;
    const quantity = Math.floor(Number(qty));
    if (!(quantity >= 1 && quantity <= 20)) throw new Error("Quantities must be between 1 and 20.");
    const p = item.promo;
    const each = cents(p && today >= p.start && today <= p.end ? item.price - p.off : item.price);
    subtotal += each * quantity;
    return { price_data: { currency: "usd", unit_amount: each, product_data: { name: item.name, images: [SITE + item.image] } }, quantity };
  });

  // Sales tax on the items (not on the delivery fee), as its own line. Orders shipped
  // by UPS outside Iowa aren't taxed.
  const prefix = Number(String(zip || "").slice(0, 3));
  if (method !== "ship" || (prefix >= 500 && prefix <= 528)) {
    lines.push({ price_data: { currency: "usd", unit_amount: Math.round(subtotal * catalog.tax_rate), product_data: { name: catalog.tax_label } }, quantity: 1 });
  }

  const params = {
    mode: "payment",
    line_items: lines,
    phone_number_collection: { enabled: true },
    success_url: `${SITE}/order-thanks/`,
    cancel_url: `${SITE}/cart/`,
    metadata: { method, zip: method === "delivery" ? zip : "" },
  };

  if (method === "delivery") {
    const miles = catalog.zips[zip];
    const zone = miles != null && catalog.delivery.find((d) => miles <= d.max_miles);
    if (!zone) throw new Error("We only deliver within 45 miles of our Dubuque store.");
    params.metadata.miles = String(miles);
    params.shipping_address_collection = { allowed_countries: ["US"] };
    params.shipping_options = [{ shipping_rate_data: { type: "fixed_amount", display_name: zone.label, fixed_amount: { amount: cents(zone.fee), currency: "usd" } } }];
    params.custom_text = { shipping_address: { message: `Delivery is priced for ZIP code ${zip}. Please enter an address in that ZIP code. We'll call to schedule delivery and set up.` } };
  } else if (method === "ship") {
    // Free UPS shipping from Tempur Sealy, lower 48 states only. The store orders it on the
    // Tempur Sealy B2B portal with the shipping address from the Stripe order.
    if (!allShip) throw new Error("Free shipping is only for items marked as shipping free. Choose pickup or delivery.");
    const p = prefix;
    if (!/^\d{5}$/.test(zip) || (p >= 6 && p <= 9) || (p >= 90 && p <= 98) || p === 340 || (p >= 962 && p <= 969) || p >= 995) {
      throw new Error("Free shipping is for the lower 48 states only.");
    }
    params.metadata.zip = zip;
    params.shipping_address_collection = { allowed_countries: ["US"] };
    params.shipping_options = [{ shipping_rate_data: { type: "fixed_amount", display_name: catalog.ship_label, fixed_amount: { amount: 0, currency: "usd" } } }];
    params.custom_text = { shipping_address: { message: `Tax was worked out for ZIP code ${zip}, so please ship to an address in that ZIP code. Your mattress ships by UPS straight from Tempur-Pedic.` } };
  } else if (method === "pickup") {
    params.custom_text = { submit: { message: `${catalog.pickup_label}. We'll call when your order is ready.` } };
  } else {
    throw new Error("Choose pickup or delivery.");
  }

  const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params),
  });
  const session = await stripe.json();
  if (!stripe.ok) {
    console.log("Stripe error", JSON.stringify(session.error));
    throw new Error("Checkout is not available right now.");
  }
  return session;
}

// Stripe takes nested form fields, e.g. line_items[0][price_data][currency]=usd.
function form(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === "object") form(v, key, out);
    else if (v !== undefined) out.append(key, String(v));
  }
  return out.toString();
}

function reply(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
