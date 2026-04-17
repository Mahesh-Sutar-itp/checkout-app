// src/hooks/useTabSync.js
import { useEffect, useRef } from 'react'
import useCartStore from '../store/cartStore'

function useTabSync() {
  const addNotification = useCartStore(s => s.addNotification)
  const addAuditLog = useCartStore(s => s.addAuditLog)
  const warningShownRef = useRef(false)

  useEffect(() => {
    let myLastCart = null

    // Starting cart value lo
    const initCart = () => {
      const raw = localStorage.getItem('cart-storage')
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        myLastCart = JSON.stringify(parsed?.state?.cartItems || [])
      } catch {
        myLastCart = '[]'
      }
    }

    initCart()

    const handleStorageChange = (event) => {
      // Sirf cart-storage key
      if (event.key !== 'cart-storage') return
      if (!event.newValue || !event.oldValue) return

      let newCartItems, oldCartItems

      try {
        newCartItems = JSON.stringify(
          JSON.parse(event.newValue)?.state?.cartItems || []
        )
        oldCartItems = JSON.stringify(
          JSON.parse(event.oldValue)?.state?.cartItems || []
        )
      } catch {
        return
      }

      // ✅ Check 1: CartItems actually change hue?
      if (newCartItems === oldCartItems) return

      // ✅ Check 2: Ye change MERA hai?
      // Storage event sirf DUSRE tabs ko milta hai
      // Toh ye hamesha dusre tab ka change hai!
      // Lekin double check ke liye:
      if (newCartItems === myLastCart) return

      // ✅ Dusre tab ne cart change kiya!
      if (!warningShownRef.current) {
        warningShownRef.current = true
        addNotification(
          '⚠️ Cart was modified in another tab! Please refresh.',
          'warning'
        )
        addAuditLog('TAB_SYNC: Cart change detected in another tab')

        setTimeout(() => {
          warningShownRef.current = false
        }, 10000)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
}

export default useTabSync