# Draply — Schema Reference

> **Rule**: Every future prompt that touches the database MUST reference this file.
> Do NOT invent fields. Do NOT rename fields. Every field listed here is canonical.
> All money fields are **integer paise** (100 paise = ₹1). Never floats.

---

## Models

| Model | Purpose |
|---|---|
| `User` | Any person in the system — customer, merchant owner, admin, or rider. One row per phone number. |
| `Address` | Saved delivery address belonging to a User. Stores lat/lng for map routing. |
| `Merchant` | Legal entity that owns one or more Stores. Linked 1-to-1 with a User via `ownerId`. |
| `Store` | A physical shop that fulfils orders. Belongs to a Merchant. Has geo-coordinates, service radius, and operating hours. |
| `Category` | Self-referential product taxonomy (parent → children). Has a slug and sort order. |
| `Product` | A fashion item listed in a Store under a Category. Holds free-form `attributes` JSON (gender, fabric, etc.). |
| `Variant` | A specific size/colour combination of a Product. Has its own SKU, price (paise), images, and weight. |
| `InventoryLedger` | Denormalised available qty for a (Variant, Store) pair. Uses `version` for optimistic locking. |
| `InventoryReservation` | Temporary qty hold placed when a customer begins checkout. Has an `expiresAt` for TTL cleanup. |
| `Cart` | One cart per User (`userId` unique). Contains CartItems. |
| `CartItem` | One Variant + qty inside a Cart. Unique per (cartId, variantId). |
| `Order` | A customer's purchase. May span multiple Stores (→ SubOrders). Tracks all payment amounts in paise. |
| `OrderItem` | One Variant line within an Order and its parent SubOrder. |
| `SubOrder` | The slice of an Order that belongs to a single Store. Carries OTPs for pickup and drop. |
| `Trial` | Appended to an Order of type `TRIAL`. Holds deposit amount and trial duration. |
| `TrialItem` | Per-variant keep/return decision within a Trial. |
| `Rider` | Delivery rider profile linked 1-to-1 to a User. Carries real-time lat/lng and status. |
| `Assignment` | Maps a SubOrder to a Rider. Tracks accept, pick, and deliver timestamps. |
| `Return` | Customer return request for a specific OrderItem. Has photo evidence and QC notes. |
| `Refund` | Financial refund record tied to an Order (and optionally a Return). Tracks gateway txn ID. |
| `OrderEvent` | Append-only audit log for every state change or notable event on an Order. |

---

## Enums

| Enum | Values |
|---|---|
| `UserRole` | `CUSTOMER` `MERCHANT` `ADMIN` `RIDER` |
| `MerchantKycStatus` | `PENDING` `APPROVED` `REJECTED` `SUSPENDED` |
| `StoreStatus` | `ONLINE` `OFFLINE` `PAUSED` |
| `OrderType` | `NORMAL` `TRIAL` |
| `OrderStatus` | `CREATED` `PAYMENT_PENDING` `PAID` `STORE_NOTIFIED` `ACCEPTED` `REJECTED_BY_STORE` `PACKED` `RIDER_ASSIGNED` `PICKED_UP` `OUT_FOR_DELIVERY` `TRIAL_IN_PROGRESS` `TRIAL_DECISION_DONE` `DELIVERED` `COMPLETED` `CANCELLED` `FAILED` |
| `SubOrderStatus` | `PENDING` `ACCEPTED` `REJECTED` `PACKED` `PICKED_UP` `DELIVERED` `CANCELLED` |
| `PaymentMode` | `UPI` `CARD` `COD` `WALLET` |
| `PaymentStatus` | `INITIATED` `AUTHORIZED` `CAPTURED` `FAILED` `REFUNDED` `PARTIALLY_REFUNDED` |
| `ReturnReason` | `FITTING_ISSUE` `QUALITY_ISSUE` `COLOR_MISMATCH` `WRONG_ITEM` `DAMAGED_IN_TRANSIT` `OTHER` |
| `ReturnStatus` | `REQUESTED` `APPROVED` `REJECTED` `PICKUP_SCHEDULED` `PICKED` `IN_TRANSIT_TO_STORE` `AT_STORE_QC` `QC_PASSED` `QC_FAILED` `REFUND_INITIATED` `REFUND_COMPLETED` `CLOSED` |
| `RefundStatus` | `INITIATED` `PROCESSING` `COMPLETED` `FAILED` |
| `RefundMode` | `ORIGINAL_PAYMENT` `WALLET_CREDIT` |
| `RiderStatus` | `OFFLINE` `AVAILABLE` `ASSIGNED` `EN_ROUTE_TO_STORE` `AT_STORE` `EN_ROUTE_TO_CUSTOMER` `AT_CUSTOMER` `ON_BREAK` |
| `TrialItemDecision` | `PENDING` `KEPT` `RETURNED` |

---

## Key Relationships

```
User ──< Address
User ──1 Merchant (via ownerId)
User ──1 Rider
Merchant ──< Store
Store ──< Product ──< Variant
Variant ──< InventoryLedger (unique per Variant+Store)
Variant ──< InventoryReservation
Order ──< SubOrder ──< OrderItem
Order ──1 Trial ──< TrialItem
SubOrder ──1 Assignment ──1 Rider
OrderItem ──< Return ──1 Refund
Order ──< OrderEvent
```

## Money Convention
All `*Paise` fields are `Int` in Postgres. Use `lib/utils/money.ts` helpers:
- `toPaise(rupees)` — convert input
- `formatINR(paise)` — display
- Never store or compute with floats.

## Stack note (Prisma 7)
`PrismaClient` is initialised with `PrismaPg` adapter (see `lib/db/prisma.ts`).
`DATABASE_URL` (transaction-mode pooler, port 6543) is used at runtime.
`DIRECT_URL` (session-mode pooler, port 5432) is used for `prisma db push` / migrations.
