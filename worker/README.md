# Checkout worker

A small Cloudflare Worker that turns the website cart into a Stripe Checkout page.
The website itself can't hold the Stripe secret key (its files are public), so this does.

## One-time setup

1. Make a Stripe account in the store's name at stripe.com and finish the business details.
   In Settings → Emails, turn on "Successful payments" so the store is emailed about each order,
   and turn on customer receipts.
2. Make a free Cloudflare account at dash.cloudflare.com.
3. From this `worker` folder:

   ```
   npx wrangler login
   npx wrangler secret put STRIPE_SECRET_KEY   # paste the Stripe secret key (sk_live_...)
   npx wrangler deploy
   ```

   `deploy` prints the worker's address, like `https://bbb-checkout.<name>.workers.dev`.
4. Put that address in `checkout_url` in `src/_data/shop.json` and push. The cart then appears on the site.

To test first, use the Stripe test key (`sk_test_...`) and Stripe's test card 4242 4242 4242 4242,
then swap in the live key with `npx wrangler secret put STRIPE_SECRET_KEY` again.

## Changing things later

- Delivery fees, the tax rate, and the pickup wording: `src/_data/shop.json` on the website.
  The worker reads them from the live site, so there's nothing to redeploy here.
- Delivery ZIP codes: `src/_data/delivery_zips.json` (miles from the store to each ZIP's center).
- Prices: the usual website files (`products.yml`, `promos.yml`, `furniture_prices.yml`).

## Filling orders

Each paid order arrives as a Stripe email and shows in the Stripe dashboard under Payments,
with the customer's phone number, the method (pickup, delivery, or ship), and the address.

- Pickup and delivery: call the customer to schedule.
- Ship (free UPS, TEMPUR-Cloud only for now): log into the Tempur Sealy B2B portal, order the
  mattress on the dealer account, and paste the customer's shipping address from Stripe.
  To make another product ship free, add `ship_free: true` to it in `src/_data/products.yml`.
