# ZENITH_LMS Technical Design Document: Identity & Logistics Foundation

**Date:** 2026-04-18  
**Version:** v1.0  
**Status:** Approved by ZEN_CEO

---

## 1. Middleware & Session Stability (v2.0)

### 1.1 Technical Background
The default Next.js `NextResponse.cookies` API occasionally misses existing attributes (Path, HttpOnly, etc.) when merging new cookies like `locale`. This led to session instability and redirect loops.

### 1.2 Solution: Header-based Cookie Fusion
We bypass the high-level API and manipulate the `Set-Cookie` header directly.
- **Mechanism**: Parse the existing `Set-Cookie` string, check for duplicates, and append new values while preserving all original attributes.
- **Guardrail**: Every redirect in the middleware is forced through a `Locale-pinned Base Path` to ensure the session and language context settle correctly.

---

## 2. Identity & Approval Architecture

### 2.1 User States
- **PENDING**: New registration waiting for admin review. Restricted to `/pending` pages.
- **ACTIVE**: Approved by Admin. Full access to respective dashboard (Dispatcher/Carrier).
- **INACTIVE**: Temporarily suspended account.

### 2.2 Organization Verification
- **Sequential Corporate ID**: Once approved, organizations are assigned a unique 6-digit ID (starting from `010001`) via a database sequence.
- **Document Management**: `organization_documents` table tracks proof types (BIZ_REG, ID_CARD) and review statuses.

---

## 3. Logistics Master Data (Data Prerequisites)

### 3.1 Prerequisite Chain
A Shipper cannot place a `Logistics Order` without the following data path being active:
1. **Ports (Nexus Ports)**: Origin/Destination codes (ICN, LAX, etc.).
2. **Carriers**: Registered organizations with `type = 'CARRIER'`.
3. **Rate Cards**: A link between `Carrier`, `Origin`, `Destination`, and `Mode`.
4. **Slab Tiers**: Pricing rules based on weight/CBM brackets (e.g., $10/kg for <45kg, $8/kg for >45kg).

### 3.2 Pricing Engine Logic
- **Formula**: `Total Cost = (Base Rate * Quantity) + Surcharges`.
- **Selection**: The system selects the best `Rate Card` based on the requested route and mode, then applies the matching `Slab Tier` based on the shipment specifications.

---

## 4. Governance Compliance
All UI components, including Admin tools, MUST adhere to the **Nexus Premium (Dark Glassmorphism)** design system to ensure brand authority across all user levels.
