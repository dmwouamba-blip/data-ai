import { useState, useEffect } from 'react'
import { asyncChatService, AsyncNotification } from '../services/asyncChatService'
import { globalNotificationService } from '../services/globalNotificationService'

interface Props {
  onNotificationClick: (notification: AsyncNotification) => void
}

export default function GlobalNotifications({ onNotificationClick }: Props) {
  const [notifications, setNotifications] = useState<AsyncNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // S'abonner aux notifications avec optimisation de performance
    const unsubscribe = asyncChatService.subscribe((newNotifications) => {
      // Utiliser requestAnimationFrame pour éviter les blocages
      requestAnimationFrame(() => {
        const previousCount = notifications.filter(n => !n.isRead).length
        const newCount = newNotifications.filter(n => !n.isRead).length
        
        setNotifications(newNotifications)
        
        // Afficher l'animation de nouveau message si le nombre a augmenté
        if (newCount > previousCount && newCount > 0) {
          setShowNewBadge(true)
          setIsAnimating(true)
          
          // Déclencher une notification globale élégante
          globalNotificationService.success(
            '🎉 Nouvelle réponse disponible !',
            'Votre agent a terminé le traitement de votre demande',
            5000
          )
          
          // Utiliser setTimeout non-bloquant
          const newBadgeTimer = setTimeout(() => {
            setShowNewBadge(false)
          }, 3000)
          
          const animationTimer = setTimeout(() => {
            setIsAnimating(false)
          }, 4000)
          
          return () => {
            clearTimeout(newBadgeTimer)
            clearTimeout(animationTimer)
          }
        }
      })
    })

    // Charger les notifications existantes de manière non-bloquante
    requestAnimationFrame(() => {
      setNotifications(asyncChatService.getNotifications())
    })

    return unsubscribe
  }, []) // Retirer notifications de la dépendance pour éviter les boucles

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleNotificationClick = (notification: AsyncNotification) => {
    asyncChatService.markAsRead(notification.id)
    onNotificationClick(notification)
    setIsOpen(false)
  }

  const handleMarkAllRead = () => {
    asyncChatService.markAllAsRead()
  }

  const handleClearAll = () => {
    notifications.forEach(n => asyncChatService.removeNotification(n.id))
  }

  return (
    <>
      {/* Bouton de notification fixe - Version compacte et discrète */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        padding: '4px' // Padding réduit
      }}>
        <button
          className="notification-button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative',
            background: 'var(--bg-elev)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            width: 40,
            height: 40,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Icône de cloche avec meilleur contraste */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          
          {/* Point rouge bien visible pour les notifications */}
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid var(--bg)',
              zIndex: 1001,
              animation: showNewBadge 
                ? 'notificationDot 0.6s ease-out' 
                : undefined
            }} />
          )}
        </button>

        {/* Panel de notifications */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: 44,
            right: 0,
            width: 400,
            maxHeight: 500,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            animation: 'slideInRight 0.3s ease'
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
              <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>
                Notifications ({unreadCount})
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 4
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 4
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 14
                }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: 16,
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: notification.isRead ? 'var(--bg)' : 'rgba(79, 70, 229, 0.05)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = notification.isRead ? 'var(--bg-elev)' : 'rgba(79, 70, 229, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notification.isRead ? 'var(--bg)' : 'rgba(79, 70, 229, 0.05)'
                    }}
                  >
                    {/* Indicateur non lu */}
                    {!notification.isRead && (
                      <div style={{
                        position: 'absolute',
                        left: 8,
                        top: 20,
                        width: 8,
                        height: 8,
                        background: '#4f46e5',
                        borderRadius: '50%'
                      }} />
                    )}

                    <div style={{ paddingLeft: notification.isRead ? 0 : 16 }}>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontSize: 14,
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <div style={{
                          width: 20,
                          height: 20,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                        Nouvelle réponse reçue !
                      </div>
                      
                      <div style={{
                        color: 'var(--muted)',
                        fontSize: 12,
                        marginBottom: 8,
                        lineHeight: 1.4
                      }}>
                        Question: "{notification.question.length > 50 
                          ? notification.question.substring(0, 50) + '...' 
                          : notification.question}"
                      </div>
                      
                      <div style={{
                        color: 'var(--brand)',
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M6 0L8 4H12L8.5 6.5L10 12L6 9L2 12L3.5 6.5L0 4H4L6 0Z" />
                        </svg>
                        Cliquez pour voir la réponse
                      </div>
                      
                      <div style={{
                        color: 'var(--muted)',
                        fontSize: 11,
                        marginTop: 8
                      }}>
                        {new Date(notification.timestamp).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
