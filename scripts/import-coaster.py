"""Turn the Coaster catalog (collected into ../bedbackandblinds-work/brands/coaster)
into the Furniture section's data and images.

    python3 scripts/import-coaster.py

Writes src/_data/furniture.json and src/assets/img/furniture/<sku>.jpg.
The room and category layout is set in ROOMS below.
"""
import json, os, re, sys
from PIL import Image

SRC = os.path.expanduser("~/Developer/bedbackandblinds-work/brands/coaster")
OUT_IMG = "src/assets/img/furniture"
IMG_SIZE = 560

# Each category lists the Coaster categories it takes, as "Category" or
# "Category > finer type". Accent pieces are pulled out of Living Room.
ROOMS = [
    ("living-room", "Living Room", "Sofas, sectionals, recliners, and the tables and media stands that go with them.", [
        ("sofas-loveseats", "Sofas & Loveseats", ["Sofas", "Loveseats", "Living Room Sets", "Sofa Beds & Futons"]),
        ("sectionals", "Sectionals", ["Sectionals"]),
        ("recliners-chairs", "Recliners & Chairs", ["Chairs & Seating > Recliners", "Chairs & Seating > Power Recliners", "Chairs & Seating > Theater Seating", "Chairs & Seating > Rocking Chairs"]),
        ("coffee-end-tables", "Coffee & End Tables", ["Coffee Tables & End Tables"]),
        ("tv-stands-media", "TV Stands & Media", ["TV Stands & Media Storage"]),
    ]),
    ("bedroom", "Bedroom", "Beds, full bedroom sets, dressers, chests, and nightstands.", [
        ("beds", "Beds & Headboards", ["Beds", "Headboards", "Daybeds", "Adjustable Beds & Bed Frames"]),
        ("bedroom-sets", "Bedroom Sets", ["Bedroom Sets"]),
        ("dressers-chests", "Dressers & Chests", ["Dressers & Dresser Mirrors", "Chests", "Trunks & Cedar Chests"]),
        ("nightstands", "Nightstands", ["Nightstands"]),
        ("bunk-loft-beds", "Bunk & Loft Beds", ["Bunk & Loft Beds"]),
        ("vanities", "Vanities", ["Makeup Vanities & Jewelry Armoires"]),
    ]),
    ("dining", "Dining", "Dining sets, tables, chairs, stools, and sideboards.", [
        ("dining-sets", "Dining Sets", ["Dining Room Sets"]),
        ("dining-tables", "Dining Tables", ["Dining Tables & Bar Tables", "Glass Tops"]),
        ("dining-chairs-benches", "Chairs & Benches", ["Dining Chairs & Benches"]),
        ("stools", "Bar & Counter Stools", ["Counter & Bar Stools"]),
        ("sideboards-bars", "Sideboards & Bars", ["Dining Cabinets", "Home Bars & Wine Cabinets", "Bar Carts", "Kitchen Islands & Carts"]),
    ]),
    ("home-office", "Home Office", "Desks, bookcases, and filing cabinets.", [
        ("desks", "Desks", ["Desks"]),
        ("bookcases", "Bookcases & Shelves", ["Bookcases"]),
        ("office-storage", "Filing Cabinets", ["Office Storage"]),
    ]),
    ("accents", "Accents", "Accent chairs, cabinets, consoles, mirrors, benches, and the finishing pieces for any room.", [
        ("accent-chairs", "Accent Chairs", ["Chairs & Seating > Accent Chairs"]),
        ("cabinets-consoles", "Cabinets & Consoles", ["Cabinets & Consoles"]),
        ("ottomans", "Ottomans", ["Ottomans & Poufs"]),
        ("benches", "Benches & Shoe Storage", ["Benches & Shoe Storage"]),
        ("mirrors", "Mirrors", ["Mirrors"]),
        ("coat-racks", "Coat Racks", ["Coat Racks"]),
        ("room-dividers", "Room Dividers", ["Room Dividers"]),
        ("lamps", "Lamps", ["Lamps"]),
    ]),
]
# Rooms shown as one page with filters, without category subpages.
SINGLE_PAGE = {"home-office", "accents"}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def place(p):
    for room, _, _, cats in ROOMS:
        for cat, _, rules in cats:
            for r in rules:
                sub, _, detail = r.partition(" > ")
                if p["subcategory"] == sub and (not detail or detail in (p["subcategory_detail"] or [])):
                    return room, cat
    return None, None


products = json.load(open(os.path.join(SRC, "products.json")))
os.makedirs(OUT_IMG, exist_ok=True)
items, skipped, used = [], {}, set()
for p in sorted(products, key=lambda p: (p.get("list_position") or 0)):
    room, cat = place(p)
    if not room:
        skipped[p["subcategory"]] = skipped.get(p["subcategory"], 0) + 1
        continue
    slug = slugify(p["short_name"])
    if slug in used:
        slug = slug + "-" + slugify(p["sku"])
    used.add(slug)
    img = f"{OUT_IMG}/{slugify(p['sku'])}.jpg"
    if not os.path.exists(img):
        im = Image.open(os.path.join(SRC, p["image"])).convert("RGB")
        im.thumbnail((IMG_SIZE, IMG_SIZE))
        im.save(img, quality=76, optimize=True, progressive=True)
    detail = p["subcategory_detail"] or [p["subcategory"]]
    items.append({
        "slug": slug, "sku": p["sku"], "room": room, "cat": cat,
        "name": p["short_name"], "full_name": p["name"],
        "type": detail[0], "collection": p["collection"],
        "color": p["color"] if p["color_source"].startswith("product") else None,
        "color_family": p["color_family"] or [], "material": p["materials"],
        "description": p["description"], "features": p["features"] or [],
        "pieces": [{"name": x.get("Piece Name"), "sku": x.get("SKU"), "dims": x.get("Dimension")} for x in (p["pieces"] or [])],
        "dimensions": p["dimensions"],
        "variants": [v["name"] for v in (p["variants"] or [])],
        "new": bool(p.get("new_arrival")), "image": "/" + img.removeprefix("src/"), "coaster_url": p["url"],
    })

titles = {(room, cat): (title, ctitle) for room, title, _, cats in ROOMS for cat, ctitle, _ in cats}
for i in items:
    i["room_title"], i["cat_title"] = titles[(i["room"], i["cat"])]

rooms = []
for room, title, blurb, cats in ROOMS:
    cs = []
    for cat, ctitle, _ in cats:
        mine = [i for i in items if i["room"] == room and i["cat"] == cat]
        if mine:
            cs.append({"slug": cat, "title": ctitle, "count": len(mine), "image": mine[0]["image"]})
    rooms.append({"slug": room, "title": title, "blurb": blurb, "single": room in SINGLE_PAGE,
                  "count": sum(c["count"] for c in cs), "image": cs[0]["image"], "cats": cs})

json.dump({"rooms": rooms, "items": items}, open("src/_data/furniture.json", "w"), indent=0, ensure_ascii=False)
print(len(items), "products;", "left out:", skipped)
for r in rooms:
    print(r["title"], r["count"], [(c["title"], c["count"]) for c in r["cats"]])
