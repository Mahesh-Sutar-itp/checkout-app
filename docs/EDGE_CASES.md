# Edge Case Matrix

## Overview
All mandatory edge cases from the assessment have been implemented and tested.

---

## Edge Case Matrix

| # | Edge Case | Trigger | Detection Method | Handling | Result State |
|---|-----------|---------|-----------------|----------|--------------|
| 1 | Refresh during checkout | User refreshes page during ORDER_SUBMITTED | `orderState` persisted via Zustand partialize | Recovery useEffect detects ORDER_SUBMITTED on mount → redirects to failed screen | ORDER_FAILED |
| 2 | Double-click Place Order | User clicks Place Order multiple times | `isSubmitting` useRef + `isLocked` Zustand state | Button disabled + early return if already submitting | Blocked with notification |
| 3 | Two tabs - cart change | User modifies cart in another tab | Storage Event listener (useTabSync hook) | Warning notification shown in current tab | User warned to refresh |
| 4 | API delay/timeout | Network slow or unresponsive | `Promise.race()` with 5 second timeout | Timeout rejects → ORDER_FAILED flow | ORDER_FAILED |
| 5 | Invalid API response | API returns malformed data | `data.id` existence check | ORDER_INCONSISTENT + redirect | ORDER_INCONSISTENT |
| 6 | Price tamper via DevTools | User changes price in localStorage | `validateCartIntegrity()` compares priceSnapshot vs current | Checkout blocked, audit logged | ORDER_INCONSISTENT |
| 7 | Checksum mismatch | Cart data corrupted or tampered | `verifyChecksum()` generates fresh hash and compares | Checkout blocked, audit logged | ORDER_INCONSISTENT |
| 8 | Stale cart prices | Product prices changed since cart was created | `checkStaleCart()` fetches fresh prices from API | Checkout blocked if price difference > ₹0.01 | ORDER_INCONSISTENT |
| 9 | Empty cart on checkout | User navigates directly to /checkout | `useEffect` monitors `cartItems.length` | Automatic redirect to home | Redirected to / |
| 10 | Token reuse / duplicate order | Same cart submitted twice | `idempotencyKey` embeds cart checksum | Null returned → checkout blocked | Blocked with notification |
| 11 | Retry after failure | User retries failed order | `handleRetry()` in OrderPage | State reset to CART_READY → redirect to cart | CART_READY |
| 12 | Rollback decision | User chooses to rollback failed order | `handleRollback()` in OrderPage | ROLLED_BACK state → clearCart → redirect home | ROLLED_BACK → CART_READY |
| 13 | Invalid state transition | Code attempts invalid state jump | `validTransitions` map in `setOrderState()` | Transition blocked + audit logged + console.warn | State unchanged |
| 14 | Offline mode | No internet connection | Service Worker fetch handler | Cached assets served, API calls fail gracefully, offline page shown | Offline page |

---

## Edge Case Details

### 1. Refresh During Checkout
```
Flow:
User clicks Place Order
→ orderState = ORDER_SUBMITTED (persisted)
→ User refreshes page
→ CheckoutPage mounts
→ useEffect detects ORDER_SUBMITTED
→ Notification: "Page was refreshed! Check order status"
→ Redirect to /order?id=failed
→ Retry / Rollback options shown
```

### 2. Double Click Protection
```
Two-layer protection:
Layer 1: isSubmitting (useRef) - same tab, same session
Layer 2: isLocked (Zustand) - persisted, cross-tab protection

Flow:
First click → isSubmitting.current = true + lockCheckout()
Second click → isSubmitting.current || isLocked = true → BLOCKED
```

### 3. Two Tabs Cart Change
```
Flow:
Tab 1: Checkout page open
Tab 2: User removes item from cart
→ localStorage updated (Zustand persist)
→ Browser fires "storage" event to Tab 1
→ useTabSync detects cartItems change
→ Warning notification in Tab 1
→ Audit log: "TAB_SYNC: Cart change detected in another tab"
```

### 4. API Timeout
```
Flow:
Promise.race([
  fetch(api),           ← actual API call
  setTimeout(5000)      ← 5 second timeout
])
→ If timeout wins → Error("REQUEST_TIMEOUT")
→ catch block → ORDER_FAILED
→ Notification: "Request timed out! Please try again."
→ Audit: "ORDER_FAILED: Request timeout - no response in 5 seconds"
```

### 5. Invalid API Response
```
Flow:
API responds with 200 OK
→ data.id check fails (no id in response)
→ Audit: "INVALID_RESPONSE: API returned invalid data"
→ ORDER_INCONSISTENT
→ Redirect to inconsistent screen
```

### 6. Price Tamper Detection
```
Flow:
User adds item → priceSnapshot saved {id: originalPrice}
User modifies price via DevTools localStorage
→ validateCartIntegrity() runs on checkout
→ Math.abs(originalPrice - currentPrice) > 0.01
→ TAMPER_DETECTED audit log
→ Notification: "Price tamper detected!"
→ ORDER_INCONSISTENT
```

### 7. Checksum Verification
```
Flow:
Every cart change → generateChecksum(items) called
→ Hash of all id-qty-price combinations
→ Stored in Zustand

On checkout:
→ verifyChecksum() regenerates hash
→ Compares with stored checksum
→ Mismatch = checkout blocked
```

### 8. Stale Cart Detection
```
Flow:
On checkout → checkStaleCart() called
→ Fetch fresh prices from FakeStore API
→ Compare each cart item price with fresh price
→ Difference > ₹0.01 = STALE detected
→ Audit logged per item
→ ORDER_INCONSISTENT
```

### 9. Token Reuse
```
Idempotency key format:
"order-{timestamp}-{random}-{cartChecksum}"

On checkout:
→ If existing key found
→ Extract embedded checksum
→ Compare with current cart checksum
→ Match = same cart = duplicate = return null = BLOCKED
→ No match = new cart = generate new key
```

### 10. Invalid State Transitions
```javascript
// Blocked example:
setOrderState("CHECKOUT_VALIDATED")
// when orderState = "ORDER_FAILED"
// → Not in validTransitions[ORDER_FAILED]
// → Audit: "INVALID_TRANSITION: ORDER_FAILED → CHECKOUT_VALIDATED BLOCKED"
// → console.warn fired
// → State unchanged
```