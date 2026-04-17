# Notification Design & Rules

## Overview
The notification system informs users of key events without blocking the UI.
All notifications are non-intrusive, accessible, and follow strict queue/dedup rules.

---

## Notification Types

| Type | Color | Hex | Icon | Use Case |
|------|-------|-----|------|----------|
| success | Green | #4ade80 | ✅ | Positive outcomes |
| warning | Amber | #fbbf24 | ⚠️ | Caution required |
| error | Red | #f87171 | ❌ | Something went wrong |
| info | Blue | #60a5fa | ℹ️ | Informational updates |

---

## Notification Triggers

| Event | Type | Message |
|-------|------|---------|
| Item added to cart | success | `{title}... added to cart!` |
| Item removed from cart | warning | `{title}... removed from cart` |
| Cart modified in another tab | warning | `Cart was modified in another tab! Please refresh.` |
| Price tamper detected | error | `Price tamper detected!` |
| Cart integrity check failed | error | `Cart integrity check failed!` |
| Prices being verified | info | `Verifying cart prices...` |
| Stale prices detected | warning | `{n} item(s) have updated prices! Checkout blocked.` |
| Could not verify prices | warning | `Could not verify prices - proceeding with checkout` |
| Already processing | warning | `Order is already being processed!` |
| Form validation failed | warning | `Please fill the form correctly!` |
| Validation passed | info | `Validation passed!` |
| Retry blocked | error | `Retry blocked! This cart has already been submitted.` |
| Order submitting | info | `Submitting your order...` |
| Order success | success | `Order placed successfully!` |
| Order failed | error | `Order failed! Please try again.` |
| Request timeout | error | `Request timed out! Please try again.` |
| Invalid API response | error | `Received invalid response from server!` |
| Page refreshed during order | warning | `Page was refreshed! Please check your order status.` |
| Inconsistent state detected | warning | `Cart inconsistent state detected!` |
| Order details not found | warning | `Order details not found!` |
| Retry scheduled | info | `Retry scheduled - cart is ready!` |
| Order rolled back | warning | `Order has been rolled back!` |

---

## Hard Requirements

### 1. Queue (Not Overwritten)
```javascript
// New notifications ADDED to array, not replacing
return {
  notifications: [...state.notifications, newNotification],
}
// Multiple notifications stack visually
// Each has unique id: `${Date.now()}-${Math.random()...}`
```

### 2. Dedup Logic
```javascript
const alreadyExists = state.notifications.find(
  n => n.message === message && !n.dismissed
)
if (alreadyExists) return state  // Skip duplicate
```
Same message firing rapidly → Only shown once until dismissed.

### 3. Auto Dismiss
```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    onDismiss(notification.id)
  }, 3000)  // 3 seconds
  return () => clearTimeout(timer)
}, [])
```
Every toast auto-dismisses after 3 seconds.

### 4. Manual Dismiss
```javascript
<button onClick={() => onDismiss(notification.id)}>✕</button>
```
User can dismiss any notification immediately via ✕ button.

### 5. ARIA Accessibility
```javascript
<div
  role="alert"
  aria-live="polite"
>
  {notification.message}
</div>
```
- `role="alert"` → Screen readers announce immediately
- `aria-live="polite"` → Announced after current task completes
- `aria-label="Notifications"` → Container identified for screen readers

---

## Notification Center (Bonus)

### Features
- **Panel**: Slides in from right side
- **History**: All notifications stored in `notificationHistory[]`
- **Filters**: All / Success / Error / Warning / Info
- **Copy Diagnostic**: Copies non-sensitive log to clipboard
- **Clear All**: Clears notification history

### Copy Diagnostic Format
```
[15:24:42] SUCCESS: Order placed successfully!
[15:24:40] INFO: Submitting your order...
[15:24:38] INFO: Validation passed!
[15:24:36] INFO: Verifying cart prices...
```
No sensitive data (no prices, no personal info, no order details).

### Bell Icon
- Fixed bottom-right position
- Badge shows unread count
- Opens/closes notification center panel
- Backdrop click closes panel

---

## Notification Architecture

```
addNotification(message, type)
        ↓
Dedup check → already exists? → SKIP
        ↓
Create notification object:
{
  id: `${Date.now()}-${random}`,
  message,
  type,
  dismissed: false,
  time: new Date().toISOString()
}
        ↓
Add to notifications[] (toast)
Add to notificationHistory[] (center)
        ↓
NotificationItem renders
        ↓
Auto dismiss after 3s OR manual ✕
        ↓
dismissNotification(id) → filter from array
```

---

## Component Structure

```
NotificationSystem.jsx
├── NotificationItem       (individual toast)
│   ├── Auto dismiss (useEffect, 3s)
│   ├── Manual dismiss (✕ button)
│   └── ARIA attributes
│
└── NotificationCenter     (history panel)
    ├── Filter buttons
    ├── History list (reversed - newest first)
    ├── Copy Diagnostic button
    └── Clear All button

FloatingBell.jsx           (trigger button)
├── Fixed bottom-right
├── Unread count badge
└── toggleNotificationCenter()
```