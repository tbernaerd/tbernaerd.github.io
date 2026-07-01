---
title: How Produmex decides what to pick (and from where)
date: 2026-06-17 10:00:00 +0100
categories: [Produmex WMS, Picking]
description: Stock allocation, picklist proposals, location locking, and picking strategies in Produmex WMS. A deep dive into how the system selects batches, reserves stock, and assigns pick locations.
tags: [produmex, picking, wms, stock-allocation, picklist]
toc: true
hidden: true
---

> This article is accurate as of **Produmex WMS 2026.06**.
{: .prompt-info }

## Introduction

When a picker scans a picklist on the warehouse floor and the system tells them to grab batch X from location Y, a lot of decisions have already been made. Picking in Produmex WMS is a chain of steps at different stages, each narrowing down what stock is available and where it should come from.

The logic spans multiple configuration screens, extension parameters, and some subtleties that are easy to miss. This post walks through the full chain, from sales order to the picker on the floor.

We'll focus on the **sales order flow** here. Production orders and inventory transfer requests follow similar allocation logic, but have their own quirks that deserve separate posts.

In standard SAP, the path from order to shipment goes through a picklist. Produmex adds a picklist proposal step that handles stock validation and reservation:

![Sales order to delivery flow](/assets/2026/2/picking-flow.svg)

Each stage makes the allocation more specific. The proposal picks the *what*, the picklist resolves the *where* and is an actionable document on the warehouse floor.

## Why the picklist proposal exists

Standard SAP Business One has no proposal stage. You go from a sales order to picking and delivery. While sales orders do commit inventory, there's no intermediate step prior to the picklist that evaluates bin-level availability or locks specific stock against competing picks.

The Produmex [picklist proposal](https://wiki.produmex.name/doku.php?id=implementation:wms:picklistproposal) solves both of these problems:

1. **It checks availability.** The proposal evaluates whether there is enough stock in the warehouse that meets all the criteria: right quality status, not expired, not locked for someone else.
2. **It locks the stock.** Once a proposal is generated, the allocated stock is reserved for that sales order. No other picklist proposal or manual allocation can claim it.

This is the stage where **batch selection** happens. The system determines which batch (typically the earliest BBD, following FEFO principles) should be picked. The physical location where that batch sits is deliberately left unresolved at this point. More on why later.

## Stock locking

Before diving into the allocation algorithm, it helps to understand how Produmex locks stock. The [locking mechanism](https://wiki.produmex.name/doku.php?id=implementation:wms:stockallocation) reserves inventory for specific documents or customers, preventing it from being claimed by other processes.

### Lock levels

> **SSCC and LUID**: An SSCC (Serial Shipping Container Code) is a GS1-standard 18-digit number that identifies a pallet or smaller logistic unit. In the Produmex database, every SSCC is tracked through a **LUID** (Logistic Unit ID), which is the internal primary key in the `PMX_LUID` table. Wherever you see "LUID" in this article, think "pallet" or "logistic unit."
{: .prompt-info }

Locks operate at four levels of granularity:

| Level | What's defined |
|-------|----------------|
| Item / Quality status | Item, warehouse, quality status |
| Batch | Item, warehouse, quality status, batch |
| LUID | Item, warehouse, quality status, batch, LUID (pallet) |
| Detail | Item, warehouse, quality status, batch, LUID, **location** |

**Each level is progressively more specific**. A Batch-level lock says "this quantity of this batch is reserved" without specifying where it is. A **detail**-level lock pins it down to a specific location. The system moves through these levels deliberately as the picking process advances. It adds just enough locking to not interrupt warehouse operations while still being able to deliver what was promised.

### When locks are created

**System-generated locks:**

| Trigger | Lock level | Linked to |
|---------|-----------|-----------|
| Batch added to sales order | Batch | Base document |
| Picklist proposal generated | Batch or LUID | Base document |
| Picklist generated | Batch or LUID | Base document |
| Picklist (line) status set to `Ready` | Detail | Base document |
| Item picked (ad hoc picking) | Detail | Base document |

**User-created locks** can be created through:
- The **Stock Allocation screen**: Batch or LUID level, linked to a customer or base document
- The **PMX Inventory Report**: Select a stock line, go to Locking, and add a lock
- **Locking in advance**: LUID level, linked to a customer. Typically created right after reception for products with a shippable quality status
- A custom **PMX Robot** script

> The **Do not lock stock on picking** setting on [General Settings](https://wiki.produmex.name/doku.php?id=implementation:wms:main) disables lock creation for picklist proposals and picklists generated for sales and transfer documents. Production orders always get locks regardless of this setting. With this setting enabled, you are forced to use ad hoc picking only.
{: .prompt-warning }

## Picklist proposal: deciding what to pick

When a picklist proposal is generated for a sales order, the [stock allocation algorithm](https://wiki.produmex.name/doku.php?id=implementation:wms:stockallocation) follows a strict priority order.

### Step 1: Fixed batches and existing locks first

Before the system even looks at free stock, it checks:

- **Is a batch fixed on the sales order line?** If the SAP batch number is specified on the order line, the proposal is constrained to exactly that batch. The allocation logic still runs (quality status, expiry, shelf life are all checked), but only for that specific batch.
- **Is stock locked for this document?** Any stock already locked with a reference to this sales order is proposed first.
- **Is stock locked for this customer?** If the above checks didn't yield enough, the system checks for customer-level locks. If the locked quantity exceeds the ordered quantity, it sorts by the "Stock order by" setting and allocates from the first matching line.

This is why manual stock allocation matters. If a warehouse manager has pre-allocated specific batches to a customer (via the Stock Allocation screen or locking in advance), the proposal respects those decisions before doing any automatic selection.

### Step 2: Free stock selection

When existing locks don't cover the full ordered quantity, the system looks at free stock. A stock line qualifies only if **all** of these conditions are met:

- Located in the selected warehouse
- Not locked for another customer or base document
- Quality status has "can be shipped" enabled
- Not expired
- Within the shelf life delivery (see below)
- Matches batch attributes from the sales order, if batch attribute selection was used
- Not on a location where "Block stock from being used for picking process" is enabled
- Not on a disallowed location (more on this below)

> **Shelf life delivery** is the minimum remaining shelf life (in days) a batch must have before it can be shipped to a customer. The system resolves it through a cascading priority. The first match wins.
>
> 1. Shelf life override on the sales order line (values ≤ 0 are ignored, falling through to the next level)
> 2. Shelf life by customer/country grid on the item master data (`PMX_ICSL`), most specific match wins: customer+country > customer only > country only
> 3. [`@PMX_CSSL`](https://wiki.produmex.name/doku.php?id=implementation:wms:cssl) user table for customer/country combinations, same specificity ordering
> 4. Default shelf life delivery on the item master data (`U_PMX_SLID`)
>
> The [documentation](https://wiki.produmex.name/doku.php?id=implementation:wms:shelflifecalculation) states that negative values are not supported, but in practice they work at levels 2-4: the value is passed directly to a date calculation, so a shelf life of -5 allows batches that expired up to 5 days before the due date.
{: .prompt-info }

### Batch is leading, location is not

This is the most important concept to internalize. At proposal time, **the batch drives the selection**. If the "Stock order by" is set to a FEFO variant, the system finds the batch with the earliest best-before date. It locks that batch. It does not yet commit to a specific location.

The physical location is resolved later, when the picklist is made `Ready`. This is by design, and understanding it explains a lot of the behavior that can seem confusing at first.

### The "Stock order by" setting (Picklist Proposal Generator)

This is arguably the single most impactful configuration decision in the entire picking process. It's configured on the **Picklist Proposal Generator** in the [Extension Parameters](https://wiki.produmex.name/doku.php?id=implementation:wms:extensionparameters).

The available options:

**`FEFO_PickLocation`** -- First Expired First Out. This is the most common choice and the safe default. When "Prioritize pick locations over bulk locations?" is enabled, stock on pick locations is proposed before stock in bulk storage for batches with the same BBD. This reduces the need for replenishment moves.

**`FEFO_ITRI_PickLocation`** -- Similar to above, but sorts by ITRI key (batch number + second batch + BBD combination) instead of BBD alone. Useful when multiple batches share the same best-before date and you need a deterministic tiebreaker.

**`LUID`** -- Groups allocation by pallet. Stock without a LUID is proposed first, then each LUID in order, with BBD and batch number as tiebreakers. Locks are created at LUID level instead of batch level. Use this when the warehouse works in whole pallets and you want the proposal to commit to specific LUIDs early.

**`Bulk,Full LUID,LUID,BBD,Itri`** -- Prioritizes bulk locations, then full pallets, then individual LUIDs, then BBD, then ITRI key. Designed for warehouses where emptying bulk storage takes priority. Less common, but valuable in high-volume environments with active replenishment flows.

**`Bulk,Full LUID,BBD,Itri,LUID`** -- Similar, but BBD takes priority over individual LUID selection within the same tier.

**`CustomizedCode`** -- The escape hatch. Accepts a custom SQL ORDER BY clause for full control over sort priority. Available columns include Quantity, ItemCode, QualityStatusCode, BatchNumber, BestBeforeDate, and others. Test thoroughly.

> Two batch-related settings are easy to confuse. **"Force the proposed batch?"** (`PPGG-FB` on the Picklist Proposal Generator) does not restrict the proposal to a single batch. It forces the picker to use the batch the proposal selected, preventing them from switching to a different batch during picking. The setting that restricts the proposal to a single batch per line is **"Allow multiple batches on sales doc."** on the item master data. When set to N, the proposal only allocates if one batch can cover the full line quantity. If no single batch suffices, the remaining quantity stays unallocated.
{: .prompt-tip }

### Disallowed locations

The `PMX_DISALLOWED_LOCATIONS_FOR_PICKING` view controls which locations are excluded from proposals. By default, it contains:

- Locations in `PMX_CDLP`: a table of explicitly excluded location codes (production line input locations, damaged goods locations, etc.)
- Locations in `PMX_OSSL` that are currently locked (e.g., during a cycle count)

This view is not intended for customization. The standard exclusions cover the right cases. If you need to block a specific location from picking, use the **"Block stock from being used for picking process"** flag on the location itself in the organizational structure.

### When multiple proposals are generated

A single sales order can produce multiple picklist proposals when:

- Order lines have different **shipping types** (automatic shipping vs. customer collect)
- Order lines are in different **warehouses**
- Order lines have different **Ship-to Names**
- The picklist type has **"Split PL on item pick type"** enabled and items have different pick types
- The number of pallets exceeds the **"Number of pallets"** setting on the picklist type (calculated from the item's "Default quantity on logistical unit" and the ordered quantity)

## From proposal to picklist

Once a proposal is complete, it can be converted into a **picklist**. This is the document the picker works with on the floor. The conversion copies the allocated batches and quantities from the proposal onto picklist lines, maintaining the same locks.

Picklist generation can be triggered in several ways:

- **From the proposal itself**: the most common path. Open the proposal and generate a picklist from it.
- **From the Open Document Report**: select one or more proposals and generate picklists in bulk.
- **Via the PMX Robot**: the robot can automatically generate both proposals and picklists on a schedule, controlled by the "Create proposals?" and "Create picklists?" settings on the Robot Controller.

If the proposal couldn't fully allocate the ordered quantity (not enough qualifying stock), the remaining quantity stays open on the sales order. It can be proposed again later when stock becomes available.

## Picklist goes `Ready`: deciding where to pick from

A generated picklist starts in `NotReady` status. The batch is locked, but no specific location has been committed to.

### Why so late?

By design, Produmex delays location-level locking as long as possible. The batch is secured at proposal time, but the exact location stays unlocked until the picklist (or even the individual line) is made `Ready`.

This matters for warehouse operations. While a picklist sits in `NotReady` status, stock can be moved between locations freely. Replenishment can fill pick locations. Other picklists for different orders can be worked. Ad hoc moves can reorganize the warehouse. None of these operations conflict with a pending pick, because the pending pick only claims a batch, not a location.

Only when the picker is about to start does the system commit to a specific location and create a `Detail`-level lock.

### What triggers `Ready` status

There are several ways a picklist transitions to `Ready`, configured on the **Picklist Controller** in the [Extension Parameters](https://wiki.produmex.name/doku.php?id=implementation:wms:extensionparameters):

**"Only pick items on location on same or lower level as dock?"**
: Auto-sets to `Ready` on creation. The available locations are already constrained to those under the dock, so the system resolves them immediately.

**"Auto select the wave?"**
: Picklists in a wave are set to `Ready` when the wave is opened. A **wave** groups multiple picklists (typically for the same route or shipping window) so they can be released and worked together.

**"Make picklist ready before print?"**
: Set to `Ready` during printing.

**"Make picklist ready for selected line?"**
: Each line stays `NotReady` until the picker selects it on the scanner. This is the most granular version of the late-locking philosophy. Even within a single picklist, only the line the picker is actively working on gets a location lock. Every other line remains flexible.

### "Stock order by" on the Picklist Controller

When a picklist goes `Ready` (or a line is selected), the system must decide which specific location to allocate. This uses a **separate** "Stock order by" setting on the **Picklist Controller**, distinct from the one on the Proposal Generator.

| Option | Behavior |
|--------|----------|
| `DEFAULT` | Standard sort based on pick location sequence and batch matching |
| `BIGGEST PALLET FIRST` | Allocates the fullest pallets first, reducing partial picks |
| Custom SQL ORDER BY | Full control over location sort order |

### Bulk location settings

These settings on the Picklist Controller control whether and how stock from bulk (non-pick) locations gets allocated. Remember that the batch is already locked at this point. These settings determine which *locations* holding that batch are considered, not which batch to pick.

- **Can the user pick full pallet from bulk location?** Allows picking a full pallet directly from bulk storage.
- **Must the user first pick full pallet from bulk location?** Forces full-pallet allocation from bulk before considering pick locations. Only applies to the `DEFAULT` stock order.
- **Can the user pick bulk quantity from bulk location?** Allows picking partial quantities from bulk locations.

### Force full pallet picking

When "Force the user pick full pallet?" is enabled, the picker must pick a complete pallet. The pallet's quantity must be equal to or less than the quantity to pick. If no full pallets remain and there's a remaining quantity, the system falls back to normal allocation.

## On the floor: ad hoc picking sort order

All the picking flows discussed so far use the `Ready` mechanism: the system pre-assigns a specific location to each picklist line, locks it, and directs the picker there. The **ad hoc picking flow** skips that step entirely. Picklist lines stay in `NotReady` status. No locations are locked upfront. Instead, the picker selects an item from the picklist and the system presents available locations, sorted by the order below. `Detail`-level locks are only created as each item is actually picked.

This makes ad hoc picking more flexible (no location conflicts, no dependency on replenishment timing) but less controlled (no guaranteed pick path, no upfront capacity check on the dock).

The default sort order for ad hoc location suggestions is:

1. **Priority picking locations first** (locations flagged with PriorityPicking on the bin)
2. **Pick locations before bulk locations**
3. **Earliest BBD first** (FEFO)
4. **Batch with the smallest free stock** (empty smaller batches first)
5. **Location with the most LUIDs** (consolidate picks)
6. **Non-full pallets first** (use open pallets before sealed ones)
7. **Smallest quantities per inventory line**
8. **Location sequence** (follow the physical warehouse path)

This sort order prioritizes designated pick zones and then enforces FEFO compliance while minimizing partial pallets and optimizing the pick path.

The logic lives in the `PMX_FN_GetAllLocationsForItemForAdHocPicking` function. The **"Function/SP name to get the locations"** setting on the Picklist Controller lets you replace it with a custom function that uses a different sort order.

## Troubleshooting: "Why wasn't my stock proposed?"

This is the question you'll hear most often. Here's a checklist to work through:

- **Quality status**: Can the quality status be shipped? Both proposal and picking check the "can be shipped" flag. The "can be picked for production" and "can be picked for replenish" flags are unrelated to sales picking.
- **Expiry**: Is the batch expired?
- **Shelf life delivery**: Is the remaining shelf life too short for this customer/country combination?
- **Locked for another document**: Is the stock locked for a different sales order or customer?
- **Blocked location**: Is "Block stock from being used for picking process" enabled on the location?
- **Disallowed location**: Is the location in the `PMX_CDLP` table, or locked for cycle counting?
- **Batch fixed on SO line**: Is a specific batch set on the sales order line that doesn't exist in stock or doesn't meet the quality/shelf life criteria?
- **"Do not lock stock on picking" enabled**: If this setting is on, proposals are created but stock is not reserved. The stock might have been claimed by the time someone tries to pick it.
- **Batch attributes**: Were batch attributes selected on the sales order that don't match available stock?

When investigating, the **PMX Inventory Report** is your best friend. Filter by item and warehouse, check the quality status, BBD, and lock status of each stock line. Cross-reference with the picklist proposal's "Stock order by" setting to understand why one batch was chosen over another.

> The "Show pick list proposal info screen on incomplete proposal?" setting on the Picklist Proposal Generator shows a diagnostic screen when a proposal can't fully allocate. Enable this during implementation to catch allocation issues early.
{: .prompt-tip }

## Further reading

- [Stock Allocation Algorithm](https://wiki.produmex.name/doku.php?id=implementation:wms:stockallocation) on the Produmex Wiki
- [Picklist Proposal](https://wiki.produmex.name/doku.php?id=implementation:wms:picklistproposal)
- [Picklist](https://wiki.produmex.name/doku.php?id=implementation:wms:picklist)
- [Picking Flow](https://wiki.produmex.name/doku.php?id=implementation:wms:picking)
- [Extension Parameters](https://wiki.produmex.name/doku.php?id=implementation:wms:extensionparameters)

