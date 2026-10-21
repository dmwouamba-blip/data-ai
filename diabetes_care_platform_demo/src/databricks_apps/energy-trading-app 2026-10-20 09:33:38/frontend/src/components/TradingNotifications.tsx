import { useState, useEffect } from 'react'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  timestamp: Date
}

interface TradingNotificationsProps {
  orders: any[]
}

export default function TradingNotifications({ orders }: TradingNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Surveiller les changements significatifs de P&L
    orders.forEach(order => {
      const pnlPercent = (order.unrealizedPnL / (order.entryPrice * order.quantity)) * 100
      
      if (Math.abs(pnlPercent) > 5) { // Plus de 5% de gain/perte
        const existingNotif = notifications.find(n => n.id === `pnl-${order.id}`)
        
        if (!existingNotif) {
          const newNotification: Notification = {
            id: `pnl-${order.id}`,
            type: pnlPercent > 0 ? 'success' : 'warning',
            title: pnlPercent > 0 ? 'Significant Profit!' : 'Warning: Significant Loss',
            message: `${order.instrument}: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(1)}% (${order.unrealizedPnL.toFixed(2)} USD)`,
            timestamp: new Date()
          }
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)]) // Keep max 5 notifications
          
          // Auto-remove after 10 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id))
          }, 10000)
        }
      }
    })
  }, [orders, notifications])

  if (notifications.length === 0) return null

  return (
    <div className="trading-notifications">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <div className="notification-header">
            <span className="notification-title">{notification.title}</span>
            <button 
              className="notification-close"
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
              ×
            </button>
          </div>
          <div className="notification-message">{notification.message}</div>
          <div className="notification-time">
            {notification.timestamp.toLocaleTimeString('fr-FR')}
          </div>
        </div>
      ))}
    </div>
  )
}
