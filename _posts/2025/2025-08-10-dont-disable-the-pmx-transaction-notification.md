---
title: Don't disable the Produmex Transaction Notification!
date: 2025-08-10 08:51:01 +0100
categories: [Produmex WMS, SQL]
description: Understanding the critical role of the Produmex Transaction Notification and why disabling it will break your WMS inventory data
tags: [produmex, transactionnotification, wms, sap]
toc: true
image:
  path: /assets/2025/3/hero.png
---

## The dreaded 5-digit error codes

If you've tried to quickly create a manual SAP document in a Produmex-managed warehouse, you've likely encountered annoying error messages with 5-digit codes. These errors can appear when attempting to:

- **Create a Goods Receipt or Goods Receipt Purchase Order** 
- **Book an Inventory Transfer** between Produmex WMS warehouses, or to a Produmex WMS warehouse
- **Process a Delivery Note** directly in SAP

... or any other document that alters SAP stock levels.

![Produmex error message](/assets/2025/3/sc-error.png)

You're just trying to test something finance related, for which you need some documents quickly. So why is Produmex interfering with your work? 
These errors can often lead to the tempting but dangerous thought: "Let me just temporarily disable this validation..." 

## What is the Transaction Notification?

The Transaction Notification is a stored procedure (`SBO_SP_TRANSACTIONNOTIFICATION`) that runs automatically whenever a transaction is posted in SAP Business One. In non-WMS environments, it's primarily used for custom validations - preventing users from posting documents that don't meet business rules.

In a Produmex WMS environment, the Transaction Notification still performs validations, but also becomes the critical synchronization mechanism between SAP and Produmex stock levels. The Produmex WMS-specific code snippet in your Transaction Notification looks something like this:

```sql
----**********************************************************************************************************
----Start executing Produmex Logex Addon code
----**********************************************************************************************************
IF error = 0 THEN
	BEGIN
		DECLARE EXIT HANDLER FOR SQLEXCEPTION
		BEGIN
			error := ::SQL_ERROR_CODE;
			error_message := SUBSTRING( 'PMX_SP(' || object_type
							|| ',' || transaction_type 
							|| ',' || list_of_key_cols_tab_del
							|| ',' || list_of_cols_val_tab_del || ')'
							|| CHAR(13) || CHAR(10)
							|| ::SQL_ERROR_MESSAGE, 1, 200 );
		END;
		CALL "PMX_SP_TransactionNotification" (
		  object_type,
		  transaction_type,
		  num_of_cols_in_key,
		  list_of_key_cols_tab_del,
		  list_of_cols_val_tab_del,
		  error,
		  error_message );
	END;
END IF;
------**********************************************************************************************************
------End executing Produmex Logex Addon code
------**********************************************************************************************************
```

This seemingly simple piece of code is doing heavy lifting behind the scenes, cascading into multiple stored procedures that handle specific validation and Produmex WMS business logic. 

## How the Produmex WMS Transaction Notification works

When you post a document that affects inventory in a Produmex WMS warehouse, the Transaction Notification:

1. **Validates Produmex WMS-specific UDFs**: Checks that all required Produmex fields on the document line level contain valid values
2. **Updates PMX_INVT**: Synchronizes the Produmex inventory totals table with SAP stock changes
3. **Records in PMX_INVD**: Creates detailed transaction history including location, SSCC, and batch2 information
4. **Maintains ITRI records**: Updates the Item Transactional Info Records for batch tracking
5. **Ensures data integrity**: Prevents stock discrepancies between SAP and Produmex

Without these validations and updates, your Produmex system loses track of:
- Where specific stock is located within the warehouse
- Which pallets (SSCCs) contain which items
- Secondary batch information and best-before dates
- The detailed transaction history needed for traceability

## The consequences of disabling it

Disabling the Produmex WMS Transaction Notification snippet creates an immediate **stock discrepancy** between SAP and Produmex inventory levels. This is a DEFCON 1 situation in any WMS environment.

The typical symptom is that SAP shows stock available (visible in the Item Master Data "Stock" tab), but the Produmex inventory reports show no stock in those locations. When you try to create pick lists for this inventory, Produmex will block the operation because according to its records, that stock doesn't exist. This creates an operational deadlock where you have phantom inventory - visible in SAP but unusable through the WMS.

The inverse scenario is equally problematic: if Produmex WMS has stock records that SAP doesn't know about, you can successfully create pick lists and complete the pick & pack process, but the operation will fail at the shipping stage when Produmex tries to create the SAP Delivery Note - SAP will reject it due to insufficient stock.

**In test environments**, the typical solution is to discard the database and create a new one from a known good backup or fresh copy from production.

**In production environments**, recovery requires:
- Querying stock records in both SAP and Produmex WMS to identify all discrepancies
- Manually inserting SQL records into `PMX_INVD` (transaction history) and `PMX_INVT` (stock totals) tables to realign with SAP
- This process can be complex and time-consuming, depending on the number of affected transactions

## Understanding which warehouses are managed by Produmex

![Is Managed by Produmex checkbox](/assets/2025/3/sc-ismanagedbypmx.png)

When Produmex WMS is installed, it creates the "Is managed by Produmex" UDF (`U_PMX_IMBP`) on the SAP warehouse master data and sets all existing warehouses to "Yes" by default. This means every warehouse in your system becomes subject to Produmex WMS validations, even those that aren't actually managed by Produmex. Your WMS consultant should have set these UDFs up correctly after the installation, but mistakes happen. 

To determine if a warehouse should be managed by Produmex:
1. Check the Produmex Organizational Structure in the addon
2. Look for SAP warehouses that are linked to Produmex WMS warehouse entities
3. Only these linked warehouses need `U_PMX_IMBP = 'Y'`

If you're encountering Produmex WMS validation errors in a warehouse that isn't listed in the Produmex Organizational Structure, you can safely set "Is Managed by Produmex" to "No" for that warehouse. This will allow you to process documents normally without triggering the Produmex WMS Transaction Notification logic (and errors).

## So your warehouse is indeed a Produmex warehouse - here's how to post documents properly

Now that we've established your warehouse is legitimately managed by Produmex, let's explore the proper ways to post documents without triggering those pesky 5-digit error codes.

Instead of disabling the Transaction Notification, here are the correct ways to handle Produmex WMS validation errors:

### Option 1: Use a Produmex WMS scanner

![Produmex scanner](/assets/2025/3/sc-scanner.png){: width="200" height="150" .left}
The most straightforward approach is to book the transaction through a Produmex scanner or device client. The scanner handles all Produmex WMS UDFs automatically and ensures proper data entry. This method eliminates validation errors entirely since the scanner interface is designed to work seamlessly with the Produmex WMS Transaction Notification requirements.

<br style="clear:both"/>

### Option 2: Fill the UDFs manually
You can manually populate the required Produmex WMS fields on your SAP document. They will still need to pass validation, but when they do, your document can be posted and will keep Produmex WMS stock in line. 

![Produmex UDF fields](/assets/2025/3/sc-fields.png)

1. Find an example document posted by a scanner
2. Check which UDFs are populated (You may need to unhide some columns in the form settings)
3. Look for these fields, and fill them with a valid value:
   - `U_PMX_LOCO`: Location code where stock resides (outbound) or where stock needs to be put (inbound)
   - `U_PMX_LUID`: Logistical Unit ID (if using SSCCs, which is optional) 
   - `U_PMX_SSCC`: 18-digit SSCC (also optional)
   - `U_PMX_BATC`: First batch number (= SAP Batch), if batch managed
   - `U_PMX_BAT2`: Second batch number, if needed
   - `U_PMX_BBDT`: Best before date, if needed. The format needs to be `YYYYMMDD`, for example: `20251225` if you're targeting Christmas day 2025
   - `U_PMX_QYSC`: The quality status, must be an existing value
   - `U_PMX_QUAN`: The Produmex WMS quantity, usually equal to the SAP quantity


> **Tip:** On some documents like deliveries, the Produmex Add-on provides a "Select stock" button. Click it to open the Produmex inventory for the item code and warehouse, select your desired stock, and the add-on will automatically populate all the required UDF fields for you!
{: .prompt-tip }

#### Some SSCC handling hints:
- The LUID and SSCC are usually not both needed. In fact, if you fill them both then that SSCC needs to be already existing in the `PMX_LUID` table, with the LUID you specified. 
- If you are booking an inbound document, and you want to create a fresh SSCC in the process, put -1 in the LUID field and leave SSCC blank. 
- If you want to use a valid SSCC (previously used, or not), put it in the SSCC field but leave LUID blank, Produmex will figure it out.


### Option 3: Work in a non-WMS warehouse
Create or use a warehouse that isn't managed by Produmex:

1. Find an existing non-Produmex WMS warehouse or create a temporary one
2. Verify the warehouse settings: `OWHS.U_PMX_IMBP` should be `'N'`
3. Book your transactions there - no Produmex WMS validations will trigger

> **Warning**: Never change `U_PMX_IMBP` from `'Y'` to `'N'` on an existing Produmex WMS warehouse without consulting your WMS consultant. This will cause the same stock discrepancy issues as disabling the Transaction Notification.
{: .prompt-danger }

## Getting help

Still stuck? 

Given that you are working on a project with Produmex WMS, there is likely someone with more Produmex WMS experience available to help. This could be:

- The assigned Produmex WMS consultant or support consultant for the project
- Your SAP/WMS implementation partner

## In summary

The Produmex Transaction Notification is not just another validation - it's the cornerstone of inventory synchronization between SAP and your WMS. Disabling it, even temporarily, creates immediate and potentially severe data integrity issues that can take days to resolve.

When you encounter Produmex WMS validation errors, resist the temptation to disable the Transaction Notification. Instead, use the proper workarounds: book through a scanner, fill the UDFs correctly, or work in a non-PMX warehouse.

It's always better to ask your WMS consultant for help than to spend hours and even days fixing a stock discrepancy. Don't disable the Produmex WMS Transaction Notification - your warehouse data depends on it.