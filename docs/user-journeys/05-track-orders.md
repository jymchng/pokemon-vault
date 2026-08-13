# 05 — Track Orders

The order you placed in [04 — Shop & checkout](04-shop-and-checkout.md) is
persisted server-side and visible in **Orders**.

## Order list

`/orders` lists every order with its number, date, items, status and total.
Each row has a **Details** link.

![Orders list](images/19-orders-list.png)

## Order detail

Opening an order shows the full detail: a **status timeline** (Order Placed →
Processing → Packed → Shipped → Delivered), the items, order summary, shipping
address, and tracking information when available.

![Order detail](images/20-order-detail.png)

## Statuses

The backend drives a state machine; the storefront renders the current step.
Staff can advance orders through the admin API; customers see the latest
status and delivery estimate.

## Next

→ [06 — Manage your collection](06-manage-collection.md)
