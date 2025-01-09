---
title: Produmex WMS database structure - Tips & Tricks
date: 2025-01-03 09:51:01 +0010
categories: [Produmex WMS, Data]
description: A brief overview of the Produmex WMS database structure documentation and some helpful tips
tags: [produmex, sql, database, wms]  
toc: true   
image: 
  path: /assets/2025/1/hero-db.png
---

## Introduction
One of the key advantages of Produmex WMS is its seamless integration with SAP Business One. All its data is stored within the same company database, enhancing operational efficiency and streamlining reporting. Any tool capable of accessing data from the SAP HANA or SQL database that houses the SAP company database can also be used to generate specific reports related to WMS.
This includes several popular BI tools such as [PowerBI](https://www.microsoft.com/en-us/power-platform/products/power-bi), [Tableau](https://www.tableau.com/), [Qlik Sense](https://www.qlik.com/us/products/qlik-sense) and [Sharperlight](https://www.sharperlight.com/sap-business-one/). All of these have a connector for SAP HANA and Microsoft SQL. 

The benefits of this one-database approach extend beyond reporting. Storing data in the same database allows it to be utilized in operational dashboards, such as Boyum's excellent [B1Up Dashboards](https://help.boyum-it.com/B1UP/index.html?b1-web-dashboards.html). It also supports custom logic and validations implemented through tools like the [B1 Usability Package](https://www.boyum-solutions.com/solutions/b1-usability-package/) or [Coresuite](https://www.coresystems.ch/en/coresuite).

This post delves into the data structure, referencing the Produmex documentation, highlighting the most important tables, and offering practical tips for working with the data.

> This article will be expanded to include more relevant tables and views in the future. Need some help with tables not mentioned yet? Contact me, so I can point you in the right direction and expand this article.
{: .prompt-info }

## Wiki documentation
Boyum provides a full overview of the Produmex data structure. The current version (WMS 2024.10 at the time of writing) can be found directly here: [Produmex DB Schema](http://wiki.produmex.name/lib/exe/fetch.php?media=implementation:wms:sbo_certification_table_descriptions_2024_10.html)


... but, you probably want the latest version, which is always linked on the [main Produmex WMS overview page](http://wiki.produmex.name/doku.php?id=implementation:wms:main).
This overview page lists the standard SAP tables first, for these tables only the Produmex UDF's are listed. Further down the page, you can find the actual Produmex UDT's and Produmex Tables.  

> **Tip: Search efficiently**
> 
> You can use your browser search function to jump to a specific table directly. 
> 
> For example: try to search for _**Table PMX_LUID**_. Using just _**PMX_LUID**_ as a search term is not efficient as that string occurs in a lot of UDF's as well.
{: .prompt-tip }

## Important Produmex tables
Below is an overview of the main tables you'll often need for reporting purposes. 

### PMX_INVT - Inventory Totals
This is arguably the most important table in Produmex, as it contains current stock holdings. It is the main source of truth on what is currently in inventory in all Produmex warehouses. As such, it needs to match up to SAP stock levels (on the batch level) for the respective warehouses at all times. 

While it is important, for most current inventory purposes you could use the `PMX_INVENTORY_REPORT_DETAIL` view (see below) as it already contains the necessary joins to other tables for complete stock info.

### PMX_INVD - Inventory Details (but really history)
This table contains a record for every single stock transaction that has occurred in a Produmex warehouse, regardless of whether this transaction is Produmex specific (e.g. a move between two locations) or happened as part of a SAP transaction (e.g. a goods receipt).

The `TransType` field will contain either a SAP Object Type (e.g. `20` for a GRPO) or a PMX object type (`PMX_PLHE` for a picklist).  

Because this table contains everything that ever happened in your Produmex warehouse, it is the best starting point to report on logistical transactions. A SAP GRPO document will also contain extended WMS information such as the Produmex batch2, best before date, SSCC's. Those would be listed in the UDF's on line level, but this data is much more inconvenient to work with as multiple values are concatenated. For example, if one line has two SSCC's this would show as  `123456789123456789|123456789123456796` in `U_PMX_SSCC`.  

However, the `PMX_INVD` table will contain two lines for this `BaseType`, `BaseEntry` and `BaseLine`. Much easier to work with. 

### PMX_ITRI - Item Transactional Info Record (or batch info)
In Produmex WMS, the batch number itself is not the primary key for batches. It uses what's called an ITRI (Item Transactional Info Record) key, which holds an unique relation between Batch Number, Second Batch Number (if applicable), and Best Before Date (if applicable).  
  
Every combination of those three values (if present) needs to be unique and distinct per item, and therefore have only one ITRI key in `PMX_ITRI`.  

Whenever you see a field called `ItemTransactionalInfoKey` in any of the Produmex tables, you can left join `PMX_ITRI` on `PMX_ITRI.InternalKey` and access the BatchNumber, InternalBatch and BestBeforeDate of the batch.  

For example:

```sql
SELECT 
	PMX_MVLI.*,
	PMX_ITRI."BatchNumber" AS "Batch",
	PMX_ITRI."InternalBatchNumber" AS "Batch2",
	PMX_ITRI."BestBeforeDate" AS "BBD"
FROM PMX_MVLI
LEFT JOIN PMX_ITRI ON PMX_ITRI."InternalKey" = PMX_MVLI."ItemTransactionalInfoKey"
```
This snippet returns line level data for moves, adding in the batch information where applicable.

### PMX_LUID - Logistical Unit, or SSCC
An SSCC is an 18 digit number, compliant to the GS1 Standard, and commonly used to identify a pallet. In some instances, it is used for smaller quantities of stock.  
  
The SSCC number itself is not the primary key, in any Produmex tables you will more commonly see references to a `LUID` or `LogUnitIdentKey`. When you see this and you need to fetch the SSCC number, you can do that by left joining this value on `PMX_LUID.InternalKey` and displaying the `PMX_LUID.SSCC` field.  
  
Note that the same 18 digit SSCC key can appear multiple times in `PMX_LUID`, with different `InternalKey`s. Every time an SSCC becomes empty, it ceases to exist in inventory records. That same SSCC can come back later on, for example when someone moves some stock to it again, or a customer returns the pallet. If that happens via a scanner flow, the SSCC will get a new entry (and `LUID`) in `PMX_LUID`.  
  
> Some tables, such as `PMX_INVD`, will already contain the SSCC number as well, in addition to the `LogUnitIdentKey`. Convenient if you just need the value, but because of the fact that distinct SSCC's can have more than one `PMX_LUID` record, it is not a great idea to join on this field. Always use LogUnitIdentKey instead.
{: .prompt-tip }

**Other useful fields**

* **IsFullPallet** (Y/N): Also visible as a checkbox in the inventory report. A 'Full Pallet' is a pallet that has not had any quantities or items altered since it was created. Usually, that means the wrapper is still on. This field is used in the picking flow to distinguish between an item pick and a full pallet pick 
* **IsReadyForPacking** (Y/N): If Yes, then the SSCC was picked and finalized during picking but not packed yet
* **ReadyForShipping** (Y/N): If Yes, then the pallet is picked and packed
* **Length, Width and Height**: Dimensions as entered after packing if the [Picklist Type](http://wiki.produmex.name/doku.php?id=implementation:wms:plty) has "Ask for length, width, height" turned on. 

### PMX_MVHE and PMX_MVLI - Produmex moves




## Views
In addition to the base tables, Produmex comes bundled with a few views that can make your life easier. In most cases, they are intended for data screens in the application. But that does not mean you can't also use them for other purposes.  

### Adapting views for use in the addon
Several standard views can be overridden in the [Extension Parameters](http://wiki.produmex.name/doku.php?id=implementation:wms:extensionparameters) configuration. The most common one that gets overridden is probably the Inventory Report view. It is often adapted to show additional stock related information. 

> **Never change the included views**
> 
> On the next PMX upgrade, your changes will be overwritten. Instead, duplicate the views and give them a customer-specific prefix, which you can then use in the Extension Parameters config or for your own reporting.
{: .prompt-danger }

In your customer-specific version of the view, add any new fields at the back and don't remove any of the standard columns. Some screens in Produmex depend on the proper order of the fields, so if you put one in between it messes up the table headers. Adding extra fields at the back is fine. 

### PMX_INVENTORY_REPORT_DETAILS

This view contains data from PMX_INVT (Inventory Totals) and is the standard view used for the Inventory Report in the addon. As such, it contains all the necessary links to PMX_ITRI (Batch info). It also contains information on which GRPO document a particular stock line came in on, which can be useful.

### PMX_FREE_STOCK

To expand

