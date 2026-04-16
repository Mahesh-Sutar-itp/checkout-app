// src/components/Notifications/FloatingBell.jsx
import useCartStore from '../../store/cartStore'

function FloatingBell() {
  const { notificationHistory, toggleNotificationCenter } = useCartStore()

  return (
    <button
      onClick={toggleNotificationCenter}
      style={{
        position: 'fixed',  // ← sirf fixed rakho
        bottom: '20px',
        right: '20px',
        zIndex: 99998,
        background: '#1a1a2e',
        border: 'none',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        cursor: 'pointer',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        // ← position: 'relative' HATAO
      }}
      aria-label="Notification Center"
    >
      🔔
      {notificationHistory.length > 0 && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          background: '#e94560',
          color: 'white',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
        }}>
          {notificationHistory.length > 99 ? '99+' : notificationHistory.length}
        </span>
      )}
    </button>
  )
}

export default FloatingBell