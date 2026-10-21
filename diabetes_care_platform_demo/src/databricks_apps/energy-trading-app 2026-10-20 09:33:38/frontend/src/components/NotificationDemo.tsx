import { globalNotificationService } from '../services/globalNotificationService'
import { createChatNotificationHandler } from '../utils/chatUtils'

/**
 * Composant de démonstration pour tester les nouvelles fonctionnalités de notification
 * À supprimer après validation des fonctionnalités
 */
export default function NotificationDemo() {
  const handleTestChatNotification = () => {
    globalNotificationService.chatNotification(
      '🎉 Demo Response Ready!',
      'This is a test notification for chat. Click to open!',
      createChatNotificationHandler(),
      true
    )
  }

  const handleTestSystemNotification = () => {
    globalNotificationService.info(
      '🔧 System Update',
      'Demo system notification with persistent history',
      5000,
      'system'
    )
  }

  const handleTestTradingAlert = () => {
    globalNotificationService.warning(
      '⚠️ Trading Alert',
      'Risk position detected - Verification recommended',
      6000,
      'trading'
    )
  }

  const handleTestSuccessNotification = () => {
    globalNotificationService.success(
      '✅ Operation Successful',
      'Your transaction has been executed successfully',
      4000,
      undefined,
      'trading'
    )
  }

  const handleTestErrorNotification = () => {
    globalNotificationService.error(
      '🚨 Critical Error',
      'An error occurred while processing your request',
      8000,
      'alert'
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 250,
      zIndex: 999,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--text)',
        marginBottom: 8,
        textAlign: 'center',
        background: 'linear-gradient(135deg, var(--brand), var(--success))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        🧪 Demo Notifications
      </div>
      
      <button
        onClick={handleTestChatNotification}
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        💬 Chat Ready
      </button>
      
      <button
        onClick={handleTestSystemNotification}
        style={{
          background: 'linear-gradient(135deg, var(--brand), #3b82f6)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(91, 156, 255, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        🔧 Système
      </button>
      
      <button
        onClick={handleTestTradingAlert}
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        ⚠️ Trading Alert
      </button>
      
      <button
        onClick={handleTestSuccessNotification}
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        ✅ Succès
      </button>
      
      <button
        onClick={handleTestErrorNotification}
        style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        🚨 Erreur
      </button>
      
      <div style={{
        fontSize: 10,
        color: 'var(--muted)',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic'
      }}>
        Test notifications
      </div>
    </div>
  )
}
