// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderPage from './pages/OrderPage'
import NotificationSystem from './components/Notifications/NotificationSystem'
import FloatingBell from './components/Notifications/FloatingBell'
import useTabSync from './hooks/useTabSync'

// ✅ Separate component banaya - hooks yahan call honge
function AppContent() {
  useTabSync()  // ← Hook yahan call kar rahe
  
  return (
    <>
      <NotificationSystem />
      <FloatingBell />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order" element={<OrderPage />} />
      </Routes>
    </>
  )
}

// ✅ App mein sirf BrowserRouter hai
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App