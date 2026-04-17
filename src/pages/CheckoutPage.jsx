// src/pages/CheckoutPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useCartStore from "../store/cartStore";
import "./CheckoutPage.css";

function CheckoutPage() {
  const navigate = useNavigate();
  const isSubmitting = useRef(false);

  const {
    cartItems,
    getTotal,
    orderState,
    setOrderState,
    validateCartIntegrity,
    verifyChecksum,
    generateIdempotencyKey,
    lockCheckout,
    unlockCheckout,
    isLocked,
    addNotification,
    addAuditLog,
    clearCart,
  } = useCartStore();

  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (cartItems.length === 0) navigate("/");
  }, [cartItems]);

  useEffect(() => {
    if (orderState === "ORDER_SUBMITTED") {
      addNotification(
        "⚠️ Page was refreshed! Please check your order status.",
        "warning",
      );
      addAuditLog("RECOVERY: Page refreshed during ORDER_SUBMITTED");
      unlockCheckout();
      isSubmitting.current = false;
      setOrderState("ORDER_FAILED");
      setTimeout(() => {
        navigate(`/order?id=failed&name=Customer`);
      }, 1500);
    }

    if (orderState === "ORDER_INCONSISTENT") {
      addNotification("⚠️ Cart inconsistent state detected!", "warning");
      addAuditLog("RECOVERY: Inconsistent state on refresh");
      setTimeout(() => {
        navigate(`/order?id=inconsistent&name=Customer`);
      }, 1500);
    }
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.phone.trim()) errors.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone))
      errors.phone = "Please enter a valid 10 digit phone number";

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const runSecurityChecks = () => {
    const checksumOk = verifyChecksum();
    if (!checksumOk) {
      addNotification("Cart integrity check failed!", "error");
      addAuditLog("SECURITY: Checksum mismatch");
      setOrderState("ORDER_INCONSISTENT");
      return false;
    }
    const integrityOk = validateCartIntegrity();
    if (!integrityOk) {
      addNotification("Price tamper detected!", "error");
      addAuditLog("SECURITY: Price tamper");
      setOrderState("ORDER_INCONSISTENT");
      return false;
    }
    return true;
  };

  // ✅ STALE CART CHECK
  const checkStaleCart = async () => {
    try {
      addNotification("Verifying cart prices...", "info");

      // Fresh prices API se fetch karo
      const response = await fetch("https://fakestoreapi.com/products");
      const freshProducts = await response.json();

      // Har cart item ka price check karo
      let staleFound = false;
      const staleItems = [];

      cartItems.forEach((cartItem) => {
        const freshProduct = freshProducts.find((p) => p.id === cartItem.id);
        if (
          freshProduct &&
          Math.abs(freshProduct.price - cartItem.price) > 0.01
        ) {
          staleFound = true;
          staleItems.push({
            title: cartItem.title.slice(0, 20),
            oldPrice: cartItem.price,
            newPrice: freshProduct.price,
          });
        }
      });

      if (staleFound) {
        // Stale items audit log mein record karo
        staleItems.forEach((item) => {
          addAuditLog(
            `STALE_CART: ${item.title} price changed ₹${item.oldPrice} → ₹${item.newPrice}`,
          );
        });
        addNotification(
          `⚠️ ${staleItems.length} item(s) have updated prices! Checkout blocked.`,
          "warning",
        );
        setOrderState("ORDER_INCONSISTENT");
        return false;
      }

      addAuditLog("STALE_CHECK: All prices are fresh ✅");
      return true;
    } catch (err) {
      // API fail hua toh warn karo but block mat karo
      addAuditLog("STALE_CHECK: Could not verify prices (API error)");
      addNotification(
        "⚠️ Could not verify prices - proceeding with checkout",
        "warning",
      );
      return true;
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting.current || isLocked) {
      addNotification("Order is already being processed!", "warning");
      return;
    }
    if (!validateForm()) {
      addNotification("Please fill the form correctly!", "warning");
      return;
    }
    const securityPassed = runSecurityChecks();
    if (!securityPassed) return;

    const freshCart = await checkStaleCart();
    if (!freshCart) {
      // Stale cart - ORDER_INCONSISTENT navigate karo
      setTimeout(() => {
        navigate(`/order?id=inconsistent&name=${form.name}`);
      }, 1500);
      return;
    }

    isSubmitting.current = true;
    lockCheckout();
    setOrderState("CHECKOUT_VALIDATED");
    addNotification("Validation passed!", "info");

    const idempotencyKey = generateIdempotencyKey();

    // ✅ Retry blocked check
    if (!idempotencyKey) {
      addNotification(
        "🚫 Retry blocked! This cart has already been submitted.",
        "error",
      );
      addAuditLog("IDEMPOTENCY: Retry blocked - duplicate order attempt");
      isSubmitting.current = false;
      unlockCheckout();
      return;
    }

    addNotification("📤 Submitting your order...", "info");
    addAuditLog(`ORDER: key=${idempotencyKey}`);
    setOrderState("ORDER_SUBMITTED");

    try {
      await new Promise((r) => setTimeout(r, 1500));

      // ✅ TIMEOUT + FETCH race
      const response = await Promise.race([
        fetch("https://jsonplaceholder.typicode.com/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Order by ${form.name}`,
            body: JSON.stringify({
              items: cartItems,
              total: getTotal(),
              idempotencyKey,
            }),
            userId: 1,
          }),
        }),
        // 5 sec mein response nahi aaya toh timeout!
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), 5000),
        ),
      ]);

      // ✅ Response ok nahi hai?
      if (!response.ok) {
        throw new Error(`API_ERROR: ${response.status}`);
      }

      const data = await response.json();

      // ✅ Invalid response - id nahi hai?
      if (!data || !data.id) {
        addAuditLog("INVALID_RESPONSE: API returned invalid data");
        setOrderState("ORDER_INCONSISTENT");
        addNotification("⚠️ Received invalid response from server!", "error");
        isSubmitting.current = false;
        unlockCheckout();
        setTimeout(() => {
          navigate(`/order?id=inconsistent&name=${form.name}`);
        }, 1000);
        return;
      }

      // ✅ SUCCESS
      setOrderState("ORDER_SUCCESS");
      addNotification("🎉 Order placed successfully!", "success");
      addAuditLog(`ORDER_SUCCESS: Order ID ${data.id}`);

      setTimeout(() => {
        navigate(`/order?id=${data.id}&name=${form.name}`);
        setTimeout(() => clearCart(), 500);
      }, 1000);
    } catch (err) {
      // ✅ Timeout aur normal error alag handle
      if (err.message === "REQUEST_TIMEOUT") {
        addAuditLog(
          "ORDER_FAILED: Request timeout - no response received in 5 seconds",
        );
        addNotification("⏱️ Request timed out! Please try again.", "error");
      } else {
        addAuditLog(`ORDER_FAILED: ${err.message}`);
        addNotification("❌ Order failed! Please try again.", "error");
      }

      setOrderState("ORDER_FAILED");
      isSubmitting.current = false;
      unlockCheckout();

      setTimeout(() => {
        navigate(`/order?id=failed&name=${form.name}`);
      }, 1000);
    }
  };

  const getButtonText = () => {
    if (orderState === "ORDER_SUBMITTED") return "⏳ Processing...";
    if (orderState === "CHECKOUT_VALIDATED") return "✅ Validated!";
    if (isLocked) return "🔒 Locked...";
    return "🛍️ Place Order";
  };

  return (
    <div className="checkout-wrapper">
      <div className="checkout-header">
        <button className="back-btn" onClick={() => navigate("/cart")}>
          ← Back
        </button>
        <h2>Checkout</h2>
      </div>

      <div className="checkout-summary">
        <h3>Order Summary</h3>
        {cartItems.map((item) => (
          <div key={item.uid || item.id} className="summary-item">
            <span>
              {item.title.slice(0, 30)}... x{item.qty}
            </span>
            <span>₹{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="summary-total-row">
          <span>Total</span>
          <span>₹{getTotal().toFixed(2)}</span>
        </div>
      </div>

      <div className="checkout-form">
        <h3>Delivery Details</h3>

        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            className={formErrors.name ? "error" : ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {formErrors.name && <p className="error-text">{formErrors.name}</p>}
        </div>

        <div className="form-group">
          <label>Address *</label>
          <textarea
            placeholder="Enter your delivery address"
            value={form.address}
            rows={3}
            className={formErrors.address ? "error" : ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          {formErrors.address && (
            <p className="error-text">{formErrors.address}</p>
          )}
        </div>

        <div className="form-group">
          <label>Phone Number *</label>
          <input
            type="tel"
            placeholder="Enter 10 digit phone number"
            value={form.phone}
            className={formErrors.phone ? "error" : ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
        </div>
      </div>

      {orderState !== "CART_READY" && (
        <div className="order-state-badge">
          <strong>Order Status:</strong> {orderState}
        </div>
      )}

      <button
        onClick={handlePlaceOrder}
        disabled={isLocked}
        className="place-order-btn"
        style={{ background: isLocked ? "#aaa" : "#e94560" }}
      >
        {getButtonText()}
      </button>
    </div>
  );
}

export default CheckoutPage;