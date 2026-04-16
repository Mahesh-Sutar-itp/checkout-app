// src/pages/CartPage.jsx
import { useNavigate } from 'react-router-dom'
import useCartStore from '../store/cartStore'
import './CartPage.css'

function CartPage() {
  const navigate = useNavigate()
  const { cartItems, removeItem, updateQty, getTotal, addNotification } = useCartStore()

  const handleRemove = (item) => {
    removeItem(item.id)
    addNotification(`${item.title.slice(0, 20)}... remove hua`, 'warning')
  }

  const handleQtyChange = (item, newQty) => {
    if (newQty < 1) {
      handleRemove(item)
      return
    }
    updateQty(item.id, newQty)
  }

  if (cartItems.length === 0) return (
    <div className="empty-cart">
      <div>🛒</div>
      <h2>Cart Khali Hai!</h2>
      <button onClick={() => navigate('/')}>Shopping Karo</button>
    </div>
  )

  return (
    <div className="cart-wrapper">

      <div className="cart-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h2>My Cart ({cartItems.length} items)</h2>
      </div>

      <div className="cart-items">
        {cartItems.map(item => (
          <div key={item.uid || item.id} className="cart-item-card">

            <img src={item.image} alt={item.title} />

            <div className="cart-item-details">
              <p>{item.title.slice(0, 40)}...</p>
              <p className="cart-item-price">
                ₹{item.price} x {item.qty} = ₹{(item.price * item.qty).toFixed(2)}
              </p>
            </div>

            <div className="qty-controls">
              <button className="qty-btn" onClick={() => handleQtyChange(item, item.qty - 1)}>−</button>
              <span className="qty-value">{item.qty}</span>
              <button className="qty-btn" onClick={() => handleQtyChange(item, item.qty + 1)}>+</button>
            </div>

            <button className="remove-btn" onClick={() => handleRemove(item)}>🗑️</button>

          </div>
        ))}
      </div>

      <div className="order-summary">
        <h3>Order Summary</h3>
        <div className="summary-row">
          <span>Items ({cartItems.length})</span>
          <span>₹{getTotal().toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Delivery</span>
          <span className="free-delivery">FREE</span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span>₹{getTotal().toFixed(2)}</span>
        </div>
        <button className="checkout-btn" onClick={() => navigate('/checkout')}>
          Proceed to Checkout →
        </button>
      </div>

    </div>
  )
}

export default CartPage