// src/components/Notifications/NotificationSystem.jsx
import { useEffect, useState } from 'react'
import useCartStore from '../../store/cartStore'
import './NotificationSystem.css'

function NotificationItem({ notification, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }

  return (
    <div
      className={`toast-item toast-${notification.type}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">{icons[notification.type]}</span>
      <span className="toast-message">{notification.message}</span>
      <button
        className="toast-dismiss"
        onClick={() => onDismiss(notification.id)}
        style={{ color: 'inherit' }}
      >✕</button>
    </div>
  )
}

function NotificationCenter({ onClose }) {
  const { notificationHistory, clearNotificationHistory } = useCartStore()
  const [filter, setFilter] = useState('all')

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
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
    <div className="nc-panel">

      {/* HEADER */}
      <div className="nc-header">
        <h3>🔔 Notification Center</h3>
        <button className="nc-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* FILTERS */}
      <div className="nc-filters">
        {['all', 'success', 'error', 'warning', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`nc-filter-btn ${filter === f ? 'active' : ''}`}
          >
            {f === 'all'     ? '📋 All'     :
             f === 'success' ? '✅ Success' :
             f === 'error'   ? '❌ Error'   :
             f === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {/* HISTORY */}
      <div className="nc-history">
        {filteredHistory.length === 0 ? (
          <div className="nc-empty">No notifications yet! 🎉</div>
        ) : (
          [...filteredHistory].reverse().map(n => (
            <div key={n.id} className={`nc-item nc-item-${n.type}`}>
              <div className="nc-item-content">
                <span>{icons[n.type]}</span>
                <div style={{ flex: 1 }}>
                  <p className="nc-item-message">{n.message}</p>
                  <p className="nc-item-time">{n.time?.slice(11, 19) || ''}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="nc-footer">
        <button className="nc-copy-btn" onClick={handleCopyDiagnostic}>
          📋 Copy Diagnostic
        </button>
        <button className="nc-clear-btn" onClick={clearNotificationHistory}>
          🗑️ Clear All
        </button>
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
      {/* TOAST NOTIFICATIONS */}
      <div className="toast-container" aria-label="Notifications">
        {notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onDismiss={dismissNotification}
          />
        ))}
      </div>

      {/* NOTIFICATION CENTER */}
      {notificationCenterOpen && (
        <>
          <div
            className="nc-backdrop"
            onClick={toggleNotificationCenter}
          />
          <NotificationCenter onClose={toggleNotificationCenter} />
        </>
      )}
    </>
  )
}

export default NotificationSystem