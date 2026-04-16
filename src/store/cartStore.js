// src/store/cartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Checksum banane ka function - cart items ka unique hash
const generateChecksum = (items) => {
  const str = items.map((i) => `${i.id}-${i.qty}-${i.price}`).join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
};

const useCartStore = create(
  persist(
    (set, get) => ({
      // ===== DATA =====
      cartItems: [],
      orderState: "CART_READY",
      notifications: [],
      checksum: null, // cart ka hash
      idempotencyKey: null, // unique order key
      isLocked: false, // checkout lock
      auditLog: [], // events ka log
      priceSnapshot: {}, // original prices store karo

      // ===== CART FUNCTIONS =====
      addItem: (product) =>
        set((state) => {
          const exists = state.cartItems.find((i) => i.id === product.id);

          // Price snapshot mein save karo (original price)
          const newSnapshot = {
            ...state.priceSnapshot,
            [product.id]: product.price,
          };

          if (exists) {
            const newItems = state.cartItems.map((i) =>
              i.id === product.id ? { ...i, qty: i.qty + 1 } : i,
            );
            return {
              cartItems: newItems,
              priceSnapshot: newSnapshot,
              checksum: generateChecksum(newItems),
            };
          }

          const newItems = [...state.cartItems, { ...product, qty: 1 }];
          return {
            cartItems: newItems,
            priceSnapshot: newSnapshot,
            checksum: generateChecksum(newItems),
          };
        }),

      removeItem: (productId) =>
        set((state) => {
          const newItems = state.cartItems.filter((i) => i.id !== productId);
          return {
            cartItems: newItems,
            checksum: generateChecksum(newItems),
          };
        }),

      updateQty: (productId, qty) =>
        set((state) => {
          const newItems = state.cartItems.map((i) =>
            i.id === productId ? { ...i, qty } : i,
          );
          return {
            cartItems: newItems,
            checksum: generateChecksum(newItems),
          };
        }),

      clearCart: () =>
        set({
          cartItems: [],
          checksum: null,
          priceSnapshot: {},
          idempotencyKey: null,
          isLocked: false,
          orderState: "CART_READY",
        }),

      // ===== TOTAL =====
      getTotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      },

      // ===== SECURITY FUNCTIONS =====

      // Tamper check - kya price change hua?
      validateCartIntegrity: () => {
        const { cartItems, priceSnapshot, addAuditLog } = get();
        let tampered = false;

        cartItems.forEach((item) => {
          const originalPrice = priceSnapshot[item.id];
          if (originalPrice && Math.abs(originalPrice - item.price) > 0.01) {
            tampered = true;
            addAuditLog(
              `TAMPER_DETECTED: Product ${item.id} price changed from ${originalPrice} to ${item.price}`,
            );
          }
        });

        return !tampered;
      },

      // Checksum verify karo
      verifyChecksum: () => {
        const { cartItems, checksum } = get();
        const currentChecksum = generateChecksum(cartItems);
        return currentChecksum === checksum;
      },

      // Idempotency key generate karo
      generateIdempotencyKey: () => {
        const { idempotencyKey, checksum } = get();

        // ✅ Token reuse check
        if (idempotencyKey) {
          const parts = idempotencyKey.split("-");
          const embeddedChecksum = parts[parts.length - 1];

          if (embeddedChecksum === checksum) {
            get().addAuditLog("IDEMPOTENCY: Retry blocked - duplicate order!");
            return null; // ← null = reuse detected!
          }
        }

        // Naya key - checksum embed karo
        const key = `order-${Date.now()}-${Math.random().toString(36).slice(2)}-${checksum}`;
        set({ idempotencyKey: key });
        get().addAuditLog("IDEMPOTENCY: New key generated");
        return key;
      },

      // Lock/Unlock checkout
      lockCheckout: () => set({ isLocked: true }),
      unlockCheckout: () => set({ isLocked: false }),

      // Audit log
      addAuditLog: (event) =>
        set((state) => ({
          auditLog: [
            ...state.auditLog,
            {
              event,
              time: new Date().toISOString(),
            },
          ],
        })),

      // ===== ORDER STATE =====
      setOrderState: (newState) => {
        const { orderState, addAuditLog } = get();

        // ✅ Invalid transitions block karo!
        const validTransitions = {
          CART_READY: ["CHECKOUT_VALIDATED"],
          CHECKOUT_VALIDATED: ["ORDER_SUBMITTED", "CART_READY"],
          ORDER_SUBMITTED: [
            "ORDER_SUCCESS",
            "ORDER_FAILED",
            "ORDER_INCONSISTENT",
          ],
          ORDER_SUCCESS: ["CART_READY"],
          ORDER_FAILED: ["ORDER_SUBMITTED", "ROLLED_BACK", "CART_READY"],
          ORDER_INCONSISTENT: ["ROLLED_BACK", "CART_READY"],
          ROLLED_BACK: ["CART_READY"],
        };

        const allowed = validTransitions[orderState] || [];

        if (!allowed.includes(newState)) {
          addAuditLog(
            `INVALID_TRANSITION: ${orderState} → ${newState} BLOCKED`,
          );
          console.warn(`Invalid transition: ${orderState} → ${newState}`);
          return; // ← transition block!
        }

        addAuditLog(`STATE: ${orderState} → ${newState}`);
        set({ orderState: newState });
      },

      // ===== NOTIFICATIONS =====
      // DATA mein add karo:
      notificationHistory: [], // ← sari notifications yaad rakhega

      addNotification: (message, type = "info") =>
        set((state) => {
          const alreadyExists = state.notifications.find(
            (n) => n.message === message && !n.dismissed,
          );
          if (alreadyExists) return state;

          const newNotification = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            message,
            type,
            dismissed: false,
            time: new Date().toISOString(), // ✅ time add karo
          };

          return {
            notifications: [...state.notifications, newNotification],
            // ✅ History mein bhi save karo
            notificationHistory: [
              ...state.notificationHistory,
              newNotification,
            ],
          };
        }),

      // ✅ History clear karne ka function
      clearNotificationHistory: () => set({ notificationHistory: [] }),

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      // ===== NOTIFICATION CENTER =====
      notificationCenterOpen: false,

      toggleNotificationCenter: () =>
        set((state) => ({
          notificationCenterOpen: !state.notificationCenterOpen,
        })),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        cartItems: state.cartItems,
        checksum: state.checksum,
        idempotencyKey: state.idempotencyKey,
        isLocked: state.isLocked,
        priceSnapshot: state.priceSnapshot,
        orderState: state.orderState, // ← refresh recovery ke liye!
        auditLog: state.auditLog, // ← audit log persist ke liye!
      }),
    },
  ),
);

export default useCartStore;
