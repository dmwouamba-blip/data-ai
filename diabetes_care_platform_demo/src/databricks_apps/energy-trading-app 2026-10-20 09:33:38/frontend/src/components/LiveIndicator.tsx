import { useState, useEffect } from 'react'
import { useDisableRealTime } from '../utils/disableRealTime'

interface LiveIndicatorProps {
  label?: string
  status?: 'live' | 'paused' | 'error'
  showPulse?: boolean
}

export default function LiveIndicator({ 
  label = 'Live Updates', 
  status = 'live',
  showPulse = true 
}: LiveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Real-time updates DISABLED to prevent constant resets
  const realTimeDisabled = useDisableRealTime()
  
  useEffect(() => {
    if (status === 'live' && showPulse && !realTimeDisabled) {
      // Only animate if real-time is explicitly enabled
      const interval = setInterval(() => {
        setIsVisible(prev => !prev)
      }, 2000)
      return () => clearInterval(interval)
    } else {
      // Keep indicator visible but static when real-time is disabled
      setIsVisible(true)
    }
  }, [status, showPulse, realTimeDisabled])

  const getStatusColor = () => {
    switch (status) {
      case 'live': return 'var(--success-soft)'
      case 'paused': return 'var(--warning)'
      case 'error': return 'var(--danger-soft)'
      default: return 'var(--muted)'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'live': return '🟢'
      case 'paused': return '🟡'
      case 'error': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div 
      className="live-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '6px',
        background: 'transparent',
        border: `1px solid ${getStatusColor()}40`,
        fontSize: '11px',
        fontWeight: '500',
        color: getStatusColor(),
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div 
        className="status-indicator"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: getStatusColor(),
          opacity: isVisible ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
          boxShadow: status === 'live' ? `0 0 4px ${getStatusColor()}` : 'none'
        }}
      />
      <span style={{ letterSpacing: '0.5px' }}>{label}</span>

      <style>{`
        .live-indicator:hover {
          background: ${getStatusColor()}08;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}