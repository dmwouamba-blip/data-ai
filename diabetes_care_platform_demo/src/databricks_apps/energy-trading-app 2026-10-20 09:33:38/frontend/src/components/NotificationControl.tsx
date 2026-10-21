import { useState, useEffect } from 'react'
import { globalNotificationService, GlobalNotification } from '../services/globalNotificationService'

/**
 * Composant de contrôle des notifications pour la sidebar
 */
export default function NotificationControl() {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<GlobalNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const unsubscribe = globalNotificationService.subscribeToHistory((newHistory) => {
      setHistory(newHistory)
      setUnreadCount(globalNotificationService.getUnreadCount())
    })

    setHistory(globalNotificationService.getHistory())
    setUnreadCount(globalNotificationService.getUnreadCount())

    return unsubscribe
  }, [])

  const handleNotificationClick = (notification: GlobalNotification) => {
    globalNotificationService.markAsRead(notification.id)
    
    if (notification.onClick) {
      notification.onClick()
      setIsOpen(false)
    }
  }

  const handleMarkAllRead = () => {
    globalNotificationService.markAllAsRead()
  }

  const handleClearAll = () => {
    history.forEach(notification => {
      globalNotificationService.removeNotification(notification.id)
    })
    setIsOpen(false)
  }

  const handleDeleteNotification = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    globalNotificationService.removeNotification(notificationId)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chat': return '💬'
      case 'trading': return '📈'
      case 'alert': return '⚠️'
      case 'system':
      default: return '🔔'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 10,
          color: 'var(--text)',
          textDecoration: 'none',
          border: '1px solid var(--border)',
          background: isOpen ? 'var(--card)' : 'var(--bg-elev)',
          cursor: 'pointer',
          width: '100%',
          fontSize: 14,
          fontWeight: 500,
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'var(--card)'
            e.currentTarget.style.transform = 'translateX(2px)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'var(--bg-elev)'
            e.currentTarget.style.transform = 'translateX(0)'
          }
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 16,
              height: 16,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              border: '1px solid var(--bg)',
              animation: 'notificationPop 0.6s ease-out'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
        
        <span>Notifications</span>
        
        <svg 
          width="14" 
          height="14" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          style={{ 
            marginLeft: 'auto',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          maxHeight: 400,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          animation: 'slideInDown 0.3s ease',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elev)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ 
                margin: 0, 
                fontSize: 14, 
                fontWeight: 700,
                color: 'var(--text)'
              }}>
                Notifications
              </h4>
              <p style={{ 
                margin: '2px 0 0 0', 
                fontSize: 11, 
                color: 'var(--muted)'
              }}>
                {unreadCount} unread • {history.length} total
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'var(--brand)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Mark all as read"
                >
                  ✓
                </button>
              )}
              <button
                onClick={handleClearAll}
                style={{
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Clear all notifications"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div style={{ 
            maxHeight: 300, 
            overflow: 'auto'
          }}>
            {history.length === 0 ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 12
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📭</div>
                <div>No notifications</div>
              </div>
            ) : (
              history.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid var(--border)',
                    cursor: notification.clickable ? 'pointer' : 'default',
                    background: notification.isRead ? 'var(--bg)' : 'rgba(91, 156, 255, 0.05)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    if (notification.clickable) {
                      e.currentTarget.style.background = notification.isRead 
                        ? 'var(--bg-elev)' 
                        : 'rgba(91, 156, 255, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.isRead 
                      ? 'var(--bg)' 
                      : 'rgba(91, 156, 255, 0.05)'
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: notification.isRead ? 'transparent' : 'var(--brand)',
                    marginTop: 4,
                    flexShrink: 0
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 4
                    }}>
                      <span style={{ fontSize: 12 }}>
                        {getCategoryIcon(notification.category || 'system')}
                      </span>
                      <span style={{
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {notification.title}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: 'var(--muted)',
                        marginLeft: 'auto'
                      }}>
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    
                    <div style={{
                      color: 'var(--muted)',
                      fontSize: 11,
                      lineHeight: 1.3,
                      marginBottom: notification.clickable ? 4 : 0
                    }}>
                      {notification.message.length > 80 
                        ? notification.message.substring(0, 80) + '...' 
                        : notification.message}
                    </div>
                    
                    {notification.clickable && (
                      <div style={{
                        color: 'var(--brand)',
                        fontSize: 10,
                        fontWeight: 600
                      }}>
                        Click to view
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDeleteNotification(notification.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      fontSize: 14,
                      cursor: 'pointer',
                      padding: 2,
                      borderRadius: 4,
                      opacity: 0.6,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.color = 'var(--danger)'
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6'
                      e.currentTarget.style.color = 'var(--muted)'
                      e.currentTarget.style.background = 'none'
                    }}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
