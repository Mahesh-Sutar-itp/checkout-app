// src/components/Notifications/NotificationSystem.jsx
import { useEffect, useState } from 'react'
import useCartStore from '../../store/cartStore'

function NotificationItem({ notification, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const styles = {
    success: { background: '#4ade80', color: '#14532d', icon: '✅' },
    error:   { background: '#f87171', color: '#7f1d1d', icon: '❌' },
    warning: { background: '#fbbf24', color: '#78350f', icon: '⚠️' },
    info:    { background: '#60a5fa', color: '#1e3a5f', icon: 'ℹ️' },
  }
  const style = styles[notification.type] || styles.info

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: style.background,
        color: style.color,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '200px',
        maxWidth: '300px',
        animation: 'slideIn 0.3s ease',
      }}
      role="alert"
      aria-live="polite"
    >
      <span style={{ fontSize: '18px' }}>{style.icon}</span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
        {notification.message}
      </span>
      <button
        onClick={() => onDismiss(notification.id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: style.color,
          fontWeight: 'bold',
        }}
      >✕</button>
    </div>
  )
}

function NotificationCenter({ onClose }) {
  const { notificationHistory, clearNotificationHistory } = useCartStore()
  const [filter, setFilter] = useState('all')

  const styles = {
    success: { background: '#f0fdf4', color: '#16a34a', icon: '✅' },
    error:   { background: '#fef2f2', color: '#dc2626', icon: '❌' },
    warning: { background: '#fffbeb', color: '#d97706', icon: '⚠️' },
    info:    { background: '#eff6ff', color: '#2563eb', icon: 'ℹ️' },
  }

  const filteredHistory = filter === 'all'
    ? notificationHistory
    : notificationHistory.filter(n => n.type === filter)

  const handleCopyDiagnostic = () => {
    const diagnostic = notificationHistory.map(n =>
      `[${n.time?.slice(11, 19) || ''}] ${n.type.toUpperCase()}: ${n.message}`
    ).join('\n')
    navigator.clipboard.writeText(diagnostic)
    alert('Diagnostic info copied! ✅')
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '320px',
      height: '100vh',
      background: 'white',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* HEADER */}
      <div style={{
        background: '#1a1a2e',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ color: 'white', margin: 0, fontSize: '16px' }}>
          🔔 Notification Center
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >✕</button>
      </div>

      {/* FILTERS */}
      <div style={{
        padding: '12px',
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid #eee',
        flexWrap: 'wrap',
      }}>
        {['all', 'success', 'error', 'warning', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              background: filter === f ? '#1a1a2e' : '#eee',
              color: filter === f ? 'white' : '#333',
            }}
          >
            {f === 'all'     ? '📋 All'     :
             f === 'success' ? '✅ Success' :
             f === 'error'   ? '❌ Error'   :
             f === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {/* HISTORY LIST */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            Koi notifications nahi! 🎉
          </div>
        ) : (
          [...filteredHistory].reverse().map(n => {
            const style = styles[n.type] || styles.info
            return (
              <div
                key={n.id}
                style={{
                  background: style.background,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  borderLeft: `3px solid ${style.color}`,
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span>{style.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#333' }}>
                      {n.message}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                      {n.time?.slice(11, 19) || ''}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={handleCopyDiagnostic}
          style={{
            flex: 1,
            padding: '8px',
            background: '#1a1a2e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >📋 Copy Diagnostic</button>
        <button
          onClick={clearNotificationHistory}
          style={{
            flex: 1,
            padding: '8px',
            background: '#ffe0e0',
            color: '#e94560',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >🗑️ Clear All</button>
      </div>
    </div>
  )
}

function NotificationSystem() {
  const {
    notifications,
    dismissNotification,
    notificationHistory,
    notificationCenterOpen,
    toggleNotificationCenter
  } = useCartStore()

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>

      {/* TOAST NOTIFICATIONS - top right */}
      <div
        style={{
          position: 'fixed',
          top: '70px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
        aria-label="Notifications"
      >
        {notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onDismiss={dismissNotification}
          />
        ))}
      </div>

      {/* NOTIFICATION CENTER PANEL */}
      {notificationCenterOpen && (
        <>
          <div
            onClick={toggleNotificationCenter}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 99997,
            }}
          />
          <NotificationCenter onClose={toggleNotificationCenter} />
        </>
      )}
    </>
  )
}

export default NotificationSystem