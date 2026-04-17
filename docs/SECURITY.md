# Security & Tampering Strategy

## Overview
All security measures are implemented entirely on the frontend.
No backend validation exists - all checks simulate real-world
security patterns using browser-available APIs.

---

## Security Mechanisms

### 1. Checksum / Hash Verification

#### Implementation
```javascript
const generateChecksum = (items) => {
  const str = items.map(i => `${i.id}-${i.qty}-${i.price}`).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString()
}
```

#### How It Works
```
Cart item added → Checksum generated from (id + qty + price)
→ Stored in Zustand + localStorage

On checkout:
→ verifyChecksum() regenerates hash from current cart
→ Compares with stored checksum
→ Match = cart untampered ✅
→ Mismatch = cart modified = BLOCKED 🚫
```

#### What It Detects
- Any modification to cart items (id, qty, price)
- localStorage manipulation
- Cart state corruption

---

### 2. Price Tamper Detection

#### Implementation
```javascript
validateCartIntegrity: () => {
  cartItems.forEach(item => {
    const originalPrice = priceSnapshot[item.id]
    if (originalPrice && Math.abs(originalPrice - item.price) > 0.01) {
      tampered = true
      addAuditLog(`TAMPER_DETECTED: Product ${item.id}
        price changed from ₹${originalPrice} to ₹${item.price}`)
    }
  })
  return !tampered
}
```

#### How It Works
```
When item added to cart:
→ priceSnapshot[product.id] = product.price (original price saved)

On checkout:
→ Each cart item's current price compared with priceSnapshot
→ Difference > ₹0.01 = TAMPER DETECTED
→ Checkout blocked
→ ORDER_INCONSISTENT state
```

#### Test Scenario
```javascript
// DevTools Console:
const store = JSON.parse(localStorage.getItem('cart-storage'))
store.state.cartItems[0].price = 1  // Change price to ₹1
localStorage.setItem('cart-storage', JSON.stringify(store))
location.reload()
// → Checkout will detect tamper and block!
```

---

### 3. Idempotency Key

#### Implementation
```javascript
generateIdempotencyKey: () => {
  const { idempotencyKey, checksum } = get()

  // Token reuse check
  if (idempotencyKey) {
    const embeddedChecksum = idempotencyKey.split('-').pop()
    if (embeddedChecksum === checksum) {
      addAuditLog('IDEMPOTENCY: Retry blocked - duplicate order detected!')
      return null  // Blocked!
    }
  }

  // Generate new key with embedded checksum
  const key = `order-${Date.now()}-${Math.random().toString(36).slice(2)}-${checksum}`
  set({ idempotencyKey: key })
  return key
}
```

#### Key Format
```
order-{timestamp}-{random}-{cartChecksum}
Example: order-1713456789000-x7k2p9-847392810
```

#### How It Works
```
First checkout attempt:
→ No existing key → Generate new key with cart checksum
→ Key stored in localStorage

Second attempt (same cart):
→ Key exists → Extract embedded checksum
→ Matches current cart checksum
→ DUPLICATE DETECTED → return null → BLOCKED 🚫

New cart after clearCart():
→ idempotencyKey = null → Fresh key generated ✅
```

---

### 4. Double Click / Multiple Submission Protection

#### Implementation
```javascript
// Layer 1: useRef (same tab, same session)
const isSubmitting = useRef(false)

// Layer 2: Zustand isLocked (persisted, cross-tab)
const { isLocked, lockCheckout, unlockCheckout } = useCartStore()

const handlePlaceOrder = async () => {
  if (isSubmitting.current || isLocked) {
    addNotification('Order is already being processed!', 'warning')
    return
  }
  isSubmitting.current = true
  lockCheckout()
  // ...order flow
}
```

#### Two Layers Explained
```
Layer 1 - isSubmitting (useRef):
→ Lives in component memory
→ Blocks double-clicks in same tab
→ Not persisted (resets on refresh)
→ No re-render triggered

Layer 2 - isLocked (Zustand):
→ Persisted to localStorage
→ Blocks attempts from other tabs
→ Button visually disabled
→ Text changes to "🔒 Locked..."
```

---

### 5. Tab Synchronization

#### Implementation
```javascript
// useTabSync.js
window.addEventListener('storage', (event) => {
  if (event.key !== 'cart-storage') return

  const newCart = JSON.stringify(newData?.state?.cartItems || [])
  const oldCart = JSON.stringify(oldData?.state?.cartItems || [])

  if (newCart !== oldCart && newCart !== myLastCart) {
    addNotification('⚠️ Cart was modified in another tab! Please refresh.', 'warning')
    addAuditLog('TAB_SYNC: Cart change detected in another tab')
  }
})
```

#### How It Works
```
Browser rule:
"storage" event fires ONLY in OTHER tabs (not the one that changed)

Tab 2 modifies cart:
→ localStorage updated
→ Tab 1 receives "storage" event
→ cartItems compared: old vs new
→ Change detected → Warning notification ⚠️
```

---

### 6. Stale Cart Detection

#### Implementation
```javascript
const checkStaleCart = async () => {
  const response = await fetch('https://fakestoreapi.com/products')
  const freshProducts = await response.json()

  cartItems.forEach(cartItem => {
    const freshProduct = freshProducts.find(p => p.id === cartItem.id)
    if (freshProduct && Math.abs(freshProduct.price - cartItem.price) > 0.01) {
      staleFound = true
      addAuditLog(`STALE_CART: ${item.title} price changed ₹${item.oldPrice} → ₹${item.newPrice}`)
    }
  })
}
```

#### How It Works
```
Before order submission:
→ Fresh prices fetched from FakeStore API
→ Each cart item price compared with fresh price
→ Difference > ₹0.01 = STALE
→ Checkout blocked
→ ORDER_INCONSISTENT
```

---

### 7. Audit Log

#### Implementation
```javascript
addAuditLog: (event) => set((state) => ({
  auditLog: [...state.auditLog, {
    event,
    time: new Date().toISOString()
  }]
}))
```

#### Logged Events
```
STATE: CART_READY → CHECKOUT_VALIDATED
SECURITY: Checksum mismatch
SECURITY: Price tamper
TAMPER_DETECTED: Product {id} price changed
STALE_CART: {title} price changed ₹{old} → ₹{new}
STALE_CHECK: All prices are fresh ✅
IDEMPOTENCY: New key generated
IDEMPOTENCY: Retry blocked - duplicate order detected!
TAB_SYNC: Cart change detected in another tab
ORDER_FAILED: {error message}
ORDER_SUCCESS: Order ID {id}
INVALID_TRANSITION: {from} → {to} BLOCKED
RECOVERY: Page refreshed during ORDER_SUBMITTED
```

---

## Security Flow on Checkout

```
User clicks "Place Order"
        ↓
1. Double click check (isSubmitting + isLocked)
        ↓
2. Form validation (name, address, phone)
        ↓
3. verifyChecksum() → Cart integrity check
        ↓
4. validateCartIntegrity() → Price tamper check
        ↓
5. checkStaleCart() → Fresh API price comparison
        ↓
6. generateIdempotencyKey() → Duplicate order check
        ↓
7. lockCheckout() → UI + logical lock
        ↓
8. Promise.race() → API call with 5s timeout
        ↓
9. Response validation → data.id check
        ↓
10. ORDER_SUCCESS → clearCart → navigate
```

---

## Limitations (Frontend-Only)

```
Since there is no real backend:
- Prices can be re-fetched and re-tampered
- Checksums can be recalculated after tampering
- These simulate real security patterns for demonstration
- In production, all validation would happen server-side
```