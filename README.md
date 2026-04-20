# ShopFast - Secure High Performance Checkout App

## 🔗 Repository
https://github.com/Mahesh-Sutar-itp/checkout-app

## 🛠️ Tech Stack
- **React 18** + Vite
- **Zustand** (State Management)
- **@tanstack/react-virtual** (Virtualization)
- **React Router DOM** (Navigation)

## 🚀 How to Run
```bash
npm install
npm run dev
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Data flow, state machine, component structure |
| [Edge Cases](docs/EDGE_CASES.md) | All edge cases with handling strategy |
| [Performance](docs/PERFORMANCE.md) | Techniques + evidence |
| [Security](docs/SECURITY.md) | Tampering strategy + all security mechanisms |
| [Notifications](docs/NOTIFICATIONS.md) | Design, rules, ARIA, triggers |
| [Debugging](docs/DEBUGGING.md) | Console, breakpoints, data transmission |
| [Originality](docs/ORIGINALITY.md) | Declaration + libraries used |

---

## ✅ Features Implemented

### A) High Volume Cart
- 1000 products (50x client-side replication)
- Search (debounced 400ms)
- Filter by category
- Sort (price low/high, name A-Z)
- Virtualization (@tanstack/react-virtual)
- useMemo + useCallback optimization

### B) Checkout Security
- Checksum/hash verification
- Price tamper detection
- Double click protection
- Stale cart detection
- Tab sync (Storage Event)
- Idempotency key + token reuse detection
- Checkout locking mechanism
- Full audit log

### C) Order Lifecycle
- 7 states: CART_READY → CHECKOUT_VALIDATED → ORDER_SUBMITTED → ORDER_SUCCESS/FAILED/INCONSISTENT → ROLLED_BACK
- Invalid transitions blocked
- Refresh recovery
- Retry + Rollback options

### D) Notifications
- 4 types: success, warning, error, info
- Queue + dedup + auto dismiss + manual dismiss
- ARIA live region
- Notification center with history + filters
- Copy diagnostic info

### E) Mobile First
- Responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Timeline: vertical mobile, horizontal desktop
- Touch-friendly targets

### F) PWA
- Installable manifest
- Service Worker
- Offline page
- Cache storage (~14.7MB)

---

## 🗂️ Project Structure

```
checkout-app/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── EDGE_CASES.md
│   ├── PERFORMANCE.md
│   ├── SECURITY.md
│   ├── NOTIFICATIONS.md
│   ├── DEBUGGING.md
│   └── ORIGINALITY.md
├── public/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── components/
│   │   └── Notifications/
│   │       ├── NotificationSystem.jsx
│   │       ├── NotificationSystem.css
│   │       └── FloatingBell.jsx
│   ├── hooks/
│   │   └── useTabSync.js
│   ├── pages/
│   │   ├── HomePage.jsx + HomePage.css
│   │   ├── CartPage.jsx + CartPage.css
│   │   ├── CheckoutPage.jsx + CheckoutPage.css
│   │   └── OrderPage.jsx + OrderPage.css
│   ├── store/
│   │   └── cartStore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json
```
## 🎥 Screen Recording

[Watch Demo Video](https://youtu.be/S2Il0MQCvF0)