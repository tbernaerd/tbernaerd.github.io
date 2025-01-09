---
title: Produmex WMS Licensing explained
date: 2025-01-09 09:51:01 +0010
categories: [Produmex WMS, Administration]
description: How Produmex WMS Licensing works, and what you'll need to know to administer your WMS licenses
tags: [produmex, licensing, wms]
toc: true
image:
  path: /assets/2025/2/hero-warehouse.png
---

## Introduction

Produmex WMS licensing shares similarities with SAP Business One licensing but differs in key aspects, such as the flexibility to overprovision licenses. This article provides an overview of the different WMS license types, guidance on managing them, and the SAP licensing requirements to consider when implementing a Produmex WMS project.

## Produmex Professional License
![The Produmex WMS addon running on SAP Business One 10](/assets/2025/2/addoninsap.png){: width="972" height="589" .w-50 .left}

A **PMX Professional License** allows a user with access to the SAP Business One client to load the **Produmex add-on** and use features such as picklist generation, inventory queries, and reports on open PMX documents.

To initially log in to the **SAP Business One** client, the user must also have an assigned SAP license, such as a full SAP Professional License or a SAP Limited Logistics License.

### Overprovisioning of PMX Professional licenses

Unlike SAP licenses, which are assigned to specific users and are limited by the total license count, PMX licenses can be overprovisioned. For example, if you have 5 PMX Professional Licenses available and 8 users configured to use them, the first 5 users to log in will obtain a license. The remaining 3 will need to wait until a license is freed when one of the first users logs out of the SAP client.

This flexibility accommodates common logistics scenarios, such as shift work, where supervisors can share licenses across shifts.

> **Tip:** Users with a Produmex license don't need to set the add-on to auto-start if they only occasionally require PMX functionality. Assign the license but configure the add-on for manual start. Provide instructions to your end users on how to start the add-on when needed.
{: .prompt-tip }

## Produmex Terminal License

![The Produmex WMS device client](/assets/2025/2/device.png){: width="200" .w-45 .right}

A **Produmex Terminal License** is required to license a device (e.g., handheld scanner, packstation, or production client) to run the standalone Produmex Device Client.

A device in this context refers to any running instance of the Produmex device software on Windows. For example, during testing, if you have two scanners and a packstation running on one server session, this will count as three licenses in use.

### Licensing Behaviour

Produmex Terminal Licenses are not allocated to specific devices. Instead, any running client requests a license from the PMX Licensing Server, which is granted until all available licenses are in use. If no licenses are available, new clients will display licensing nag screens until a license becomes available.

A **Produmex Terminal License** is used to license a **device** to run the standalone Produmex device software. This can be the small screen interface on a mobile scan gun, or the packing and production touchscreen client interfaces on a bigger screen (and usually stationary) device. 

### SAP Licensing requirements for mobile users
When starting a Produmex device, the user is first presented with a login screen:

![Logon screen on the WMS device](/assets/2025/2/logonscreen.png)

Produmex uses the SAP user authentication system for sign-in. To access a device, users must have a SAP user account with a valid SAP license. 

- At minimum, a **SAP Indirect Access License** is required. This is suitable for warehouse operators who only use Produmex devices and do not require access to the full SAP client.
- Users with a full **SAP Professional License** or a **Limited Logistics/Finance License** do not need additional licenses to sign in on devices like scanners or packstations, as their existing licenses already covers device sign-on.

## Managing your Produmex WMS licenses

Produmex licensing is managed through the **Boyum Portal**, where you can find the correct license counts for a specific customer site. If the portal does not display the proper licensing information, contact your Boyum account manager for assistance, as you will not be able to proceed until the portal reflects the correct licensing data.

On the customer's infrastructure or cloud-hosted environment, you need to install and configure the **Produmex Licensing Configurator**. This tool consists of a Windows service and a small management application, which can be accessed from the Windows Start Menu, listed under **"Licensing Configurator"**.

![alt text](/assets/2025/2/licensingconfigurator.png)
_Produmex WMS Licensing Configurator Tool_

> **Important:** Always run the Licensing Configurator as **administrator**. This ensures it has the necessary permissions to read and write the license file and restart the Windows service after making licensing changes.
{: .prompt-tip }

### Users and Databases

The Produmex licensing model is database-agnostic. Although the Licensing Configurator displays databases in the top-right corner, these are only used to fetch usernames from the selected database for license assignment.

If you need to add a new database to display users from it:

1. Run the **Produmex Installer** again, and add your database to the first tab.
2. Use the **Update Connection Strings** button on your system-specific tab to add the new database. This will add it as an available connection string to all Produmex components on that system. 

After a restart of the Licensing Configurator tool, you'll be able to manage users specific to that database.

> **Simultaneous database access**
> 
> Although the Produmex licensing model is database-agnostic, the total license count in use is counted across all databases. If a user appears once in the licensed users list, they can only use PMX in **one database at a time**.
> 
> If the user needs to access PMX in multiple SAP company databases simultaneously, their username must be added to the licensed users list multiple times. This configuration allows for more than one concurrent session for the same user. However, each additional active session will consume an additional license.
{: .prompt-warning }


### Troubleshooting add-on licensing

A common support request is when an user reports not seeing some Produmex-specific buttons on SAP screens, such as the "**Get Free Stock**" button found on the SAP Sales Order screen, even though their addon is running just fine. In this case, the session is probably not licensed. 

### Testing for an Active License
To test if your session has an active license:

1. Open the PMX **Inventory Report**.
    - If you are licensed, the filter screen will appear.
    - If you are not licensed, a red error message will display in the status bar.
  ![License Error](/assets/2025/2/license-error.png)
1. Alternatively, open any other add-on screen except for the **Organizational Structure** screen, which will open even without a license.


### Check current license allocations in the Licensing Configurator
The Licensing Configurator tool can also be used for checking which licenses are currently in use via the **Active licenses** tab. If your user reports not having a license, you can check whether his username already holds a license. 

![Active licenses](/assets/2025/2/activelicenses.png)
_Active licenses tab in the Licensing Configurator_

To help with troubleshooting, the tab will show:

- The Windows Process ID for the process holding the license, which will match the addon process ID in Windows Task Manager
- The Windows user signed in
- The AD Domain for this user

You can compare this data to find the addon process occupying the license. It's possible the license is stuck on a stale session, or the user does have another session already running somewhere. 

The cure for a stuck or stale session is usually to **restart** the licensing service, which will redistribute licenses to current active clients immediately. This can be done safely during the day without affecting ongoing operations. 


## Does Everyone Need an Add-On License?

In short: **no**. Most companies running SAP Business One with Produmex WMS require WMS professional licenses only for individuals directly involved in logistics or production operations. Roles such as shift supervisors and administrative support (e.g., releasing picklists, managing goods-in scheduling, and handling outbound dispatching) typically need licenses to do their jobs. However, financial profiles and other roles that don’t require WMS-specific functionality often do not need a license.

Produmex WMS records SAP documents for all transactions beyond internal operations. This ensures that relevant transaction data—such as deliveries and purchase receipts—is accessible through standard SAP documents for roles not directly engaged with warehouse or production areas.

In practice, this typically results in a ratio of **3 to 10 WMS device licenses per WMS Professional license** in most environments. This reflects the operational needs of businesses where many warehouse and production tasks are carried out on devices, while a smaller number of users require full access to the WMS add-on for administrative and supervisory roles.

### Roles Needing Limited WMS Data

Certain roles may require limited WMS-specific information. For example, customer service agents often need detailed, read-only stock availability data. In such cases, you can use Boyum’s **B1 Usability Package** to create custom stock reports based on database tables, which typically fulfils their requirements without needing a full WMS license.

Similar read-only scenario's can often be solved in the same way. 
