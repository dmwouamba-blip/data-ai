import { useState, useEffect } from 'react'

interface WelcomeToastProps {
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

export default function WelcomeToast({ 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: WelcomeToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsAnimating(true), 100)

    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div 
      className="welcome-toast"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        background: 'linear-gradient(135deg, var(--card) 0%, var(--surface-2) 100%)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        maxWidth: '400px',
        transform: isAnimating ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.9)',
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div 
          style={{
            fontSize: '24px',
            animation: 'bounce 2s infinite'
          }}
        >
          👋
        </div>
        
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px', 
            fontWeight: '700',
            color: 'var(--text)'
          }}>
            Bienvenue sur ETRM Data 360!
          </h4>
          <p style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            color: 'var(--muted)',
            lineHeight: '1.4'
          }}>
            Votre plateforme de gestion des risques énergétiques est maintenant optimisée avec une interface moderne et des couleurs parfaitement lisibles.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span 
              className="toast-feature"
              style={{
                background: 'var(--col-trading)15',
                color: 'var(--col-trading)',
                padding: '4px 8px',
                borderRadius: '8px',
                fontWeight: '600'
              }}
            >
              📊 Graphiques en temps réel
            </span>
            <span 
              className="toast-feature"
              style={{
                background: 'var(--success-soft)15',
                color: 'var(--success-soft)',
                padding: '4px 8px',
                borderRadius: '8px',
                fontWeight: '600'
              }}
            >
              ✨ Interface optimisée
            </span>
          </div>
        </div>

        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-2)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--muted)'
          }}
        >
          ×
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
