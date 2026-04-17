# Architecture Writeup

## Overview
ShopFast is a frontend-only secure checkout application built with React + Vite.
No backend services are used. All logic, validation, and orchestration live entirely on the frontend.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool |
| Zustand | State Management |
| @tanstack/react-virtual | List Virtualization |
| React Router DOM | Client-side Routing |

---

## Data Flow

```
FakeStore API (Products + Categories)
        ↓
    HomePage
    (1000 products replicated client-side)
        ↓
    Zustand Store (cartStore)
        ↓
    CartPage → CheckoutPage → OrderPage
                    ↓
        JSONPlaceholder API (Order Submit)
```

---

## State Machine

```
CART_READY
    ↓
CHECKOUT_VALIDATED
    ↓
ORDER_SUBMITTED
    ↓                      ↓
ORDER_SUCCESS          ORDER_FAILED → ROLLED_BACK
                   ORDER_INCONSISTENT → ROLLED_BACK
```

### Valid Transitions:
```javascript
CART_READY          → [CHECKOUT_VALIDATED]
CHECKOUT_VALIDATED  → [ORDER_SUBMITTED, CART_READY]
ORDER_SUBMITTED     → [ORDER_SUCCESS, ORDER_FAILED, ORDER_INCONSISTENT]
ORDER_SUCCESS       → [CART_READY]
ORDER_FAILED        → [ORDER_SUBMITTED, ROLLED_BACK, CART_READY]
ORDER_INCONSISTENT  → [ROLLED_BACK, CART_READY]
ROLLED_BACK         → [CART_READY]
```

Invalid transitions are blocked and logged to the audit log.

---

## Component Structure

```
App.jsx
├── NotificationSystem     (toast notifications)
├── FloatingBell           (notification center trigger)
└── Routes
    ├── / → HomePage
    │        ├── Search (debounced)
    │        ├── Category Filter
    │        ├── Sort
    │        └── Virtual Product Grid (1000 items)
    │
    ├── /cart → CartPage
    │        ├── Cart Items List
    │        ├── Qty Controls
    │        └── Order Summary
    │
    ├── /checkout → CheckoutPage
    │        ├── Order Summary
    │        ├── Delivery Form
    │        ├── Security Checks
    │        └── Place Order Button
    │
    └── /order → OrderPage
             ├── Order Timeline
             ├── Audit Log
             └── Retry / Rollback
```

---

## Zustand Store Structure

```
cartStore (persist to localStorage)
│
├── DATA
│   ├── cartItems[]          - cart products
│   ├── orderState           - current order state
│   ├── notifications[]      - active toast notifications
│   ├── notificationHistory[]- all notifications history
│   ├── checksum             - cart integrity hash
│   ├── idempotencyKey       - unique order key
│   ├── isLocked             - checkout lock flag
│   ├── auditLog[]           - event log entries
│   └── priceSnapshot{}      - original prices at add-time
│
├── CART FUNCTIONS
│   ├── addItem(product)
│   ├── removeItem(productId)
│   ├── updateQty(productId, qty)
│   ├── clearCart()
│   └── getTotal()
│
├── SECURITY
│   ├── validateCartIntegrity()
│   ├── verifyChecksum()
│   ├── generateIdempotencyKey()
│   ├── lockCheckout()
│   └── unlockCheckout()
│
├── STATE MACHINE
│   └── setOrderState(newState)  - validates transitions
│
└── NOTIFICATIONS
    ├── addNotification(message, type)
    ├── dismissNotification(id)
    ├── clearNotificationHistory()
    └── toggleNotificationCenter()
```

---

## Persistence Strategy

Using Zustand `persist` middleware with `partialize`:

```javascript
partialize: (state) => ({
  cartItems: state.cartItems,
  checksum: state.checksum,
  idempotencyKey: state.idempotencyKey,
  isLocked: state.isLocked,
  priceSnapshot: state.priceSnapshot,
  orderState: state.orderState,   // for refresh recovery
  auditLog: state.auditLog,       // for audit persistence
})
```

This ensures cart and order state survive page refreshes.

---

## PWA Architecture

```
Browser Request
      ↓
Service Worker (sw.js)
      ↓
Online?  → Fetch from network + cache response
Offline? → Serve from cache
         → If not in cache → Show offline page
```