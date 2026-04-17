# Console Debugging, Breakpoint Debugging,
# Data Transmission Observability & Structured Logging

## Overview
The application provides multiple layers of observability through
structured audit logs, console logging, and browser DevTools integration.

---

## 1. Structured Audit Logging

### Implementation
```javascript
addAuditLog: (event) => set((state) => ({
  auditLog: [...state.auditLog, {
    event,    // descriptive event string
    time: new Date().toISOString()  // ISO timestamp
  }]
}))
```

### Audit Log Format
```
[HH:MM:SS] EVENT_TYPE: Description
```

### All Logged Events
```
STATE: CART_READY → CHECKOUT_VALIDATED
STATE: CHECKOUT_VALIDATED → ORDER_SUBMITTED
STATE: ORDER_SUBMITTED → ORDER_SUCCESS
STATE: ORDER_SUBMITTED → ORDER_FAILED
SECURITY: Checksum mismatch
SECURITY: Price tamper
TAMPER_DETECTED: Product {id} price changed from ₹{old} to ₹{new}
STALE_CART: {title} price changed ₹{old} → ₹{new}
STALE_CHECK: All prices are fresh ✅
IDEMPOTENCY: New key generated
IDEMPOTENCY: Retry blocked - duplicate order detected!
TAB_SYNC: Cart change detected in another tab
ORDER_FAILED: {error message}
ORDER_SUCCESS: Order ID {id}
INVALID_TRANSITION: {from} → {to} BLOCKED
RECOVERY: Page refreshed during ORDER_SUBMITTED
RECOVERY: Inconsistent state on refresh
RETRY: User chose to retry
```

### Where to View
- **OrderPage** → Audit Log section (dark panel)
- **Failed/Inconsistent screen** → Last 5 entries shown
- **Notification Center** → Copy Diagnostic button exports logs

---

## 2. Console Logging

### Service Worker Logs
```javascript
console.log('SW: Installing... 🔧')
console.log('SW: Caching static files')
console.log('SW: Activating... ✅')
console.log('SW: Deleting old cache:', key)
console.log('SW registered! ✅', reg.scope)
console.log('SW error:', err)
```

### State Machine Warnings
```javascript
console.warn(`Invalid transition: ${orderState} → ${newState}`)
```

### How to View
```
F12 → Console tab
Filter by: "SW" for service worker logs
Filter by: "Invalid" for state machine warnings
```

---

## 3. Breakpoint Debugging Guide

### Key Functions to Set Breakpoints

#### CheckoutPage.jsx

**`handlePlaceOrder()` - Line ~70**
```javascript
// Set breakpoint here to debug full order flow
const handlePlaceOrder = async () => {
  // Breakpoint 1: Check isSubmitting + isLocked state
  if (isSubmitting.current || isLocked) { ... }

  // Breakpoint 2: Check form validation result
  if (!validateForm()) { ... }

  // Breakpoint 3: Check security check result
  const securityPassed = runSecurityChecks()

  // Breakpoint 4: Check stale cart result
  const freshCart = await checkStaleCart()

  // Breakpoint 5: Check idempotency key
  const idempotencyKey = generateIdempotencyKey()
}
```

**`runSecurityChecks()` - Line ~50**
```javascript
// Set breakpoint to debug security failures
const runSecurityChecks = () => {
  const checksumOk = verifyChecksum()    // ← Breakpoint here
  const integrityOk = validateCartIntegrity()  // ← Or here
}
```

**`checkStaleCart()` - Line ~60**
```javascript
// Set breakpoint to debug stale price detection
cartItems.forEach(cartItem => {
  const freshProduct = freshProducts.find(...)
  // ← Breakpoint here to inspect prices
})
```

#### cartStore.js

**`generateChecksum()` - Line ~5**
```javascript
// Set breakpoint to see hash generation
const generateChecksum = (items) => {
  const str = items.map(...)  // ← Breakpoint here
  // Inspect: str variable to see formatted cart string
}
```

**`setOrderState()` - Line ~120**
```javascript
// Set breakpoint to debug state transitions
const allowed = validTransitions[orderState] || []
if (!allowed.includes(newState)) {  // ← Breakpoint here
  // Inspect: orderState, newState, allowed
}
```

### How to Set Breakpoints
```
F12 → Sources tab
→ Navigate to file (src/pages/CheckoutPage.jsx)
→ Click line number to set breakpoint
→ Blue dot appears
→ Trigger the action
→ Execution pauses at breakpoint
→ Inspect variables in Scope panel
```

---

## 4. Data Transmission Observability

### API Calls to Monitor

#### FakeStore API (Products)
```
F12 → Network tab → Filter: "fakestoreapi"

GET https://fakestoreapi.com/products
→ Status: 200
→ Response: Array of 20 products
→ Used to: Populate product list + stale cart check

GET https://fakestoreapi.com/products/categories
→ Status: 200
→ Response: Array of category strings
→ Used to: Populate category filter buttons
```

#### JSONPlaceholder API (Order Submit)
```
F12 → Network tab → Filter: "jsonplaceholder"

POST https://jsonplaceholder.typicode.com/posts
→ Request Body:
  {
    title: "Order by {name}",
    body: "{items, total, idempotencyKey}",
    userId: 1
  }
→ Response:
  {
    id: 101,  ← Used as order ID
    title: "Order by {name}",
    ...
  }
```

### localStorage Inspection
```
F12 → Application → Local Storage → localhost:5173
→ Key: "cart-storage"
→ Value: JSON with:
  {
    state: {
      cartItems: [...],
      orderState: "CART_READY",
      checksum: "847392810",
      idempotencyKey: "order-...",
      isLocked: false,
      priceSnapshot: {...},
      auditLog: [...]
    },
    version: 0
  }
```

### Service Worker Cache
```
F12 → Application → Cache Storage → shopfast-v1
→ Cached files list:
  - / (index.html)
  - /src/main.jsx
  - CSS files
  - JS bundles
  - Images
```

### Service Worker Status
```
F12 → Application → Service Workers
→ Source: sw.js
→ Status: activated and running ✅
→ Clients: http://localhost:5173/
```

---

## 5. Metrics & Observability

### Virtual Rendering Metric
```
UI shows: "Virtual rendering: only {n} in DOM"
→ Confirms virtualization is working
→ n should be ~5-10 regardless of total products
```

### Performance Profiling
```
F12 → Performance tab
→ Click Record
→ Scroll through 1000 products
→ Stop recording
→ Check for:
  - No long tasks (>50ms)
  - Smooth frame rate
  - Minimal layout thrashing
```

### Cache Storage Usage
```
F12 → Application → Storage
→ Shows: ~14.7MB cache storage used
→ Confirms PWA caching is working
```

---

## 6. Debug Scenarios

### Scenario 1: Order Not Submitting
```
1. F12 → Console → Check for errors
2. Set breakpoint in handlePlaceOrder()
3. Check: isSubmitting.current value
4. Check: isLocked value
5. Check: orderState value
6. F12 → Application → localStorage → cart-storage
   → Check isLocked field
```

### Scenario 2: Security Check Failing
```
1. Set breakpoint in runSecurityChecks()
2. Check: verifyChecksum() return value
3. Check: validateCartIntegrity() return value
4. F12 → Application → localStorage
   → Compare cartItems[0].price with priceSnapshot[id]
```

### Scenario 3: PWA Not Working
```
1. F12 → Application → Service Workers
   → Check status: "activated and running"
2. F12 → Application → Cache Storage
   → Check: shopfast-v1 exists
3. F12 → Console → Check: "SW registered! ✅"
4. F12 → Network → Go offline
   → Refresh page
   → Check: files served from (ServiceWorker)
```

### Scenario 4: State Machine Issue
```
1. F12 → Console → Filter: "Invalid"
2. Look for: "Invalid transition: X → Y"
3. Set breakpoint in setOrderState()
4. Check validTransitions object
5. Check current orderState vs attempted newState
```