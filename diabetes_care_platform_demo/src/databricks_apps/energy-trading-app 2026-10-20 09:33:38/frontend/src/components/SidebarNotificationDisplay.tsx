import { useState, useEffect } from 'react'
import { globalNotificationService, GlobalNotification } from '../services/globalNotificationService'

/**
 * Component to display notifications near the notification button in the sidebar
 * Beautiful, modern design with English text
 */
export default function SidebarNotificationDisplay() {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([])

  useEffect(() => {
    // Subscribe to notifications with performance optimization
    const unsubscribe = globalNotificationService.subscribe((newNotifications) => {
      // Use requestAnimationFrame to avoid blocking
      requestAnimationFrame(() => {
        setNotifications(newNotifications)
      })
    })

    // Load existing notifications in a non-blocking way
    requestAnimationFrame(() => {
      setNotifications(globalNotificationService.getNotifications())
    })

    return unsubscribe
  }, [])

  if (notifications.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      left: 16, // Start from the left edge of sidebar (with padding)
      bottom: 68, // Position above the notification button area (now at bottom)
      width: 'calc(max(240px, 15vw) - 32px)', // Same width as sidebar minus padding (matching CSS grid)
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      pointerEvents: 'none'
    }}>
      {notifications.map((notification, index) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => globalNotificationService.remove(notification.id)}
          delay={index * 100} // Staggered animation
        />
      ))}
    </div>
  )
}

interface NotificationCardProps {
  notification: GlobalNotification
  onClose: () => void
  delay?: number
}

function NotificationCard({ notification, onClose, delay = 0 }: NotificationCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in with delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: '#059669',
          glow: 'rgba(16, 185, 129, 0.4)'
        }
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          border: '#dc2626',
          glow: 'rgba(239, 68, 68, 0.4)'
        }
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: '#d97706',
          glow: 'rgba(245, 158, 11, 0.4)'
        }
      case 'info':
      default:
        return {
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: '#2563eb',
          glow: 'rgba(59, 130, 246, 0.4)'
        }
    }
  }

  const colors = getColors()

  return (
    <div
      style={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 12,
        color: 'white',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%', // Take full width of the container (sidebar width)
        pointerEvents: 'auto',
        cursor: notification.onClick ? 'pointer' : 'default',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: isVisible ? 1 : 0,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 8px 32px ${colors.glow}, 0 4px 16px rgba(0, 0, 0, 0.2)`,
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={notification.onClick || onClose}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
        e.currentTarget.style.boxShadow = `0 12px 40px ${colors.glow}, 0 6px 20px rgba(0, 0, 0, 0.3)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = `0 8px 32px ${colors.glow}, 0 4px 16px rgba(0, 0, 0, 0.2)`
      }}
    >
      {/* Animated background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
        animation: 'shimmer 3s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      {/* Icon */}
      <div style={{
        flexShrink: 0,
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '50%',
        marginTop: 1,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        {getIcon()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 13,
          marginBottom: 4,
          lineHeight: 1.3,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
        }}>
          {notification.title}
        </div>
        
        <div style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.95,
          wordWrap: 'break-word',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          {notification.message}
        </div>

        {/* Click indicator for interactive notifications */}
        {notification.onClick && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0L8 4H12L8.5 6.5L10 12L6 9L2 12L3.5 6.5L0 4H4L6 0Z" />
            </svg>
            Click to view
          </div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
          transition: 'all 0.2s ease',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7'
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.transform = 'scale(1)'
        }}
        title="Close notification"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>

      {/* Progress bar for timed notifications */}
      {notification.duration && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '0 0 16px 16px'
        }}>
          <div style={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '0 0 16px 16px',
            animation: `progressBar ${notification.duration}ms linear forwards`
          }} />
        </div>
      )}
    </div>
  )
}
