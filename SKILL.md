---
name: matvaru
description: Compares grocery prices across Swedish stores (Willys, ICA, Coop, Lidl) to find the cheapest basket. Use when the user wants to compare prices, find the best deal on a shopping list, see weekly offers, or manage their Willys cart.
argument-hint: "[basket \"vara:antal, ...\" | search <sökord> | deals]"
allowed-tools: Bash(matvaru *)
---

# Matvaru — Swedish Grocery Price Comparison CLI

Compares prices across Willys, ICA, Coop, and Lidl Sweden to find the cheapest
basket of goods. Also supports Willys cart management.

Credentials are read from environment variables or a `.env` file:
- `WILLYS_USERNAME`, `WILLYS_PASSWORD` — required for Willys (search + cart)
- `ICA_STORE_ID` — optional ICA store override (default: 1300, ICA Maxi Online)
- `COOP_STORE_ID` — optional Coop store override (default: 5080, Coop Online)
- ICA, Coop, and Lidl do not require login for product search.

## Commands

### Compare prices for a shopping basket

The primary use case. Searches all stores and returns a ranked price comparison.

```bash
# Inline list: "item:quantity, item:quantity, ..."
matvaru basket "mjölk 3%:2, pasta fusilli:1, äpplen:1, smör:1"

# From a file (one item per line, format: "item:quantity" or just "item")
matvaru basket --file inköpslista.txt

# Limit to specific stores
matvaru basket "mjölk:2, bröd:1" --stores willys,ica,coop
```

Output shows:
- Each store ranked cheapest first with a total price
- Per-item match with regular price, sale price (if active), and line total
- Items the store couldn't find marked with ✗
- Best single store that covers the full list
- Theoretical minimum price by mixing stores

### Search for a product across stores

```bash
# Search all stores
matvaru search "oatly havregrädde"

# Search specific stores with more results
matvaru search "pasta" --stores willys,ica --count 20
```

### View weekly offers / deals

```bash
# Show current deals (Lidl weekly offers, Willys promotions if available)
matvaru deals
matvaru deals --stores lidl,willys
```

### Willys cart management (requires WILLYS_USERNAME/WILLYS_PASSWORD)

```bash
matvaru cart                          # show cart
matvaru add 101233933_ST 2            # add product by code
matvaru remove 101233933_ST           # remove product
matvaru clear                         # empty cart
matvaru categories                    # list Willys category tree
matvaru browse frukt-och-gront/frukt  # browse a Willys category
```

## Shopping list file format

```
# Kommentarer ignoreras
mjölk 3%:2
pasta fusilli:1
äpplen
smör ekologiskt:1
```

Lines without a quantity default to 1.

## Typical workflows

### Find cheapest full shop
1. `matvaru basket "mjölk:2, ägg:1, bröd:1, pasta:2, tomater:3"`
2. Look at the ★ store at the top — that's the cheapest complete basket.
3. Check "Teoretiskt lägsta pris" to see if splitting across stores saves significantly.

### Check if something is on sale
1. `matvaru search "smör" --stores willys,ica,coop`
2. Products with 🏷 tags are on promotion. The sale price is shown after →.

### Build and price a Willys cart
1. `matvaru search mjölk --stores willys` — find the product code
2. `matvaru add 101233933_ST 2` — add to cart
3. `matvaru cart` — review

## Tips

- For basket comparisons, use descriptive queries like "ekologisk mjölk 1l" rather
  than just "mjölk" to get more accurate matches.
- Lidl only shows products currently on weekly offer — items not on sale won't appear.
- Product codes (e.g. `101233933_ST`) appear in search output. `_ST` = per item, `_KG` = by weight.
- `--stores` accepts a comma-separated list: `willys,ica,coop,lidl`
- When comparing unit prices, look at the kr/kg or kr/l figure rather than pack price.
