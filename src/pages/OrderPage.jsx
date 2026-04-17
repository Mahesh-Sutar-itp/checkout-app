// src/pages/OrderPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useCartStore from "../store/cartStore";
import "./OrderPage.css";

function OrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orderState, setOrderState, auditLog, addNotification, clearCart } =
    useCartStore();

  const orderId = searchParams.get("id");
  const customerName = searchParams.get("name");

  const [savedOrderState, setSavedOrderState] = useState(null);
  const [savedAuditLog, setSavedAuditLog] = useState([]);

  // Page load pe snapshot lo
  useEffect(() => {
    if (!orderId) {
      addNotification("Order details not found!", "warning");
      setTimeout(() => navigate("/"), 1500);
      return;
    }
    setSavedOrderState(orderState);
    setSavedAuditLog([...auditLog]);
  }, [orderId]);

  // ✅ orderState change hone par bhi update karo
  useEffect(() => {
    if (
      orderState === "ORDER_FAILED" ||
      orderState === "ORDER_INCONSISTENT" ||
      orderState === "ORDER_SUCCESS" ||
      orderState === "ROLLED_BACK"
    ) {
      setSavedOrderState(orderState);
      setSavedAuditLog([...auditLog]);
    }
  }, [orderState]);

  const timelineSteps = [
    {
      state: "CART_READY",
      label: "Cart Ready",
      icon: "🛒",
      desc: "Items added to cart",
    },
    {
      state: "CHECKOUT_VALIDATED",
      label: "Checkout Validated",
      icon: "🔒",
      desc: "Security checks passed",
    },
    {
      state: "ORDER_SUBMITTED",
      label: "Order Submitted",
      icon: "📤",
      desc: "Order sent to server",
    },
    {
      state: "ORDER_SUCCESS",
      label: "Order Confirmed",
      icon: "✅",
      desc: "Order placed successfully!",
    },
  ];

  const getStepStatus = (stepState) => {
    const currentState = savedOrderState || orderState;
    if (currentState === "ORDER_SUCCESS") return "done";

    const order = [
      "CART_READY",
      "CHECKOUT_VALIDATED",
      "ORDER_SUBMITTED",
      "ORDER_SUCCESS",
    ];
    const currentIndex = order.indexOf(currentState);
    const stepIndex = order.indexOf(stepState);

    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const handleRetry = () => {
    addNotification("🔄 Retry scheduled - cart is ready!", "info");
    addAuditLog("RETRY: User chose to retry");
    setOrderState("CART_READY");
    navigate("/cart");
  };

  const handleRollback = () => {
    setOrderState("ROLLED_BACK");
    addNotification("Order has been rolled back!", "warning");
    setTimeout(() => {
      setOrderState("CART_READY");
      clearCart();
      navigate("/");
    }, 1500);
  };

  // Loading
  if (orderId && !savedOrderState) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontFamily: "sans-serif",
          fontSize: "20px",
        }}
      >
        Loading... ⏳
      </div>
    );
  }

  // FAILED or INCONSISTENT
  if (
    savedOrderState === "ORDER_FAILED" ||
    savedOrderState === "ORDER_INCONSISTENT"
  ) {
    return (
      <div className="failed-wrapper">
        <div className="failed-emoji">
          {savedOrderState === "ORDER_FAILED" ? "❌" : "⚠️"}
        </div>
        <h2>
          {savedOrderState === "ORDER_FAILED"
            ? "Order Failed!"
            : "Cart Inconsistent!"}
        </h2>
        <p>
          {savedOrderState === "ORDER_FAILED"
            ? "A technical issue occurred. Please try again."
            : "A change was detected in your cart."}
        </p>

        <div className="failed-audit">
          <strong>🔍 Audit Log:</strong>
          <div
            style={{ marginTop: "8px", maxHeight: "150px", overflowY: "auto" }}
          >
            {savedAuditLog.slice(-5).map((log, i) => (
              <div key={i} className="audit-entry">
                <span className="audit-time">{log.time.slice(11, 19)}</span>
                {log.event}
              </div>
            ))}
          </div>
        </div>

        <div className="failed-buttons">
          {/* Retry - only for ORDER_FAILED */}
          {savedOrderState === "ORDER_FAILED" && (
            <button className="retry-btn" onClick={handleRetry}>
              🔄 Retry
            </button>
          )}
          {/* Rollback - both states */}
          <button className="rollback-btn" onClick={handleRollback}>
            ↩️ Rollback
          </button>
          {/* Home */}
          <button className="home-btn" onClick={() => navigate("/")}>
            🏠 Home
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS
  return (
    <div className="order-wrapper">
      <div className="order-success-header">
        <div className="success-emoji">🎉</div>
        <h2>Order Confirmed!</h2>
        <p>Thank you {customerName || "there"}! Your order has been placed.</p>
        <div className="order-id-badge">Order ID: #{orderId}</div>
      </div>

      <div className="timeline-container">
        <h3>📊 Order Timeline</h3>

        {/* ✅ Wrapper add kiya */}
        <div className="timeline-steps-wrapper">
          {timelineSteps.map((step, index) => {
            const status = getStepStatus(step.state);
            return (
              <div key={step.state} className="timeline-step">
                <div className="timeline-left">
                  <div
                    className="timeline-circle"
                    style={{
                      background:
                        status === "done"
                          ? "#4ade80"
                          : status === "active"
                            ? "#60a5fa"
                            : "#f3f4f6",
                      border: `2px solid ${
                        status === "done"
                          ? "#16a34a"
                          : status === "active"
                            ? "#2563eb"
                            : "#d1d5db"
                      }`,
                    }}
                  >
                    {status === "done" ? "✓" : step.icon}
                  </div>
                  {index < timelineSteps.length - 1 && (
                    <div
                      className="timeline-line"
                      style={{
                        background: status === "done" ? "#4ade80" : "#e5e7eb",
                      }}
                    />
                  )}
                </div>
                <div className="timeline-right">
                  <p
                    className="step-label"
                    style={{ color: status === "pending" ? "#9ca3af" : "#111" }}
                  >
                    {step.label}
                  </p>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="audit-log">
        <h3>🔍 Audit Log</h3>
        <div className="audit-log-entries">
          {savedAuditLog.map((log, i) => (
            <div key={i} className="audit-entry">
              <span className="audit-time">{log.time.slice(11, 19)}</span>
              {log.event}
            </div>
          ))}
        </div>
      </div>

      <button className="continue-btn" onClick={() => navigate("/")}>
        🛍️ Continue Shopping
      </button>
    </div>
  );
}

export default OrderPage;