import { useState, useEffect } from 'react'

interface ExposureLimit {
  product: string
  portfolio: string
  limit_type: string
  current_exposure: number
  limit_value: number
  utilization_pct: number
  status: 'ok' | 'warning' | 'breach'
  last_updated: string
}

// Mock data for beautiful demonstration
const mockExposures: ExposureLimit[] = [
  {
    product: 'WTI Crude',
    portfolio: 'Energy Portfolio',
    limit_type: 'market',
    current_exposure: 15500000,
    limit_value: 20000000,
    utilization_pct: 77.5,
    status: 'warning',
    last_updated: new Date().toISOString()
  },
  {
    product: 'Natural Gas',
    portfolio: 'Gas Portfolio',
    limit_type: 'market',
    current_exposure: 8200000,
    limit_value: 12000000,
    utilization_pct: 68.3,
    status: 'ok',
    last_updated: new Date().toISOString()
  },
  {
    product: 'Brent Crude',
    portfolio: 'Oil Portfolio',
    limit_type: 'credit',
    current_exposure: 22800000,
    limit_value: 25000000,
    utilization_pct: 91.2,
    status: 'breach',
    last_updated: new Date().toISOString()
  },
  {
    product: 'Gold',
    portfolio: 'Metals Portfolio',
    limit_type: 'concentration',
    current_exposure: 5100000,
    limit_value: 8000000,
    utilization_pct: 63.8,
    status: 'ok',
    last_updated: new Date().toISOString()
  }
]

export default function ExposureLimitMonitor() {
  const [exposures, setExposures] = useState<ExposureLimit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading with mock data
    const timer = setTimeout(() => {
      setExposures(mockExposures)
      setLoading(false)
    }, 700)

    return () => clearTimeout(timer)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅'
      case 'warning': return '⚠️'
      case 'breach': return '🚨'
      default: return '📊'
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading exposure limits...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">📊 Real-Time Exposure & Limit Monitoring</h3>
          <div className="live-indicator">Live Updates</div>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric">
          <div className="label">Within Limits</div>
          <div className="value" style={{ color: 'var(--success)' }}>
            {exposures.filter(e => e.status === 'ok').length}
          </div>
        </div>
        <div className="metric">
          <div className="label">Warnings</div>
          <div className="value" style={{ color: 'var(--col-risk)' }}>
            {exposures.filter(e => e.status === 'warning').length}
          </div>
        </div>
        <div className="metric">
          <div className="label">Breaches</div>
          <div className="value" style={{ color: 'var(--danger)' }}>
            {exposures.filter(e => e.status === 'breach').length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {exposures.map((exposure, index) => (
          <div 
            key={index} 
            className={`card ${exposure.status === 'breach' ? 'accent-compliance' : exposure.status === 'warning' ? 'accent-risk' : 'accent-finance'}`}
            style={{ 
              padding: '16px',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)' }}>{exposure.product}</h4>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{exposure.portfolio}</div>
                <div className="chip" style={{ fontSize: '10px', marginTop: '4px' }}>
                  {exposure.limit_type.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{getStatusIcon(exposure.status)}</div>
                <div 
                  className={`chip ${exposure.status === 'ok' ? 'success' : exposure.status === 'breach' ? 'danger' : ''}`}
                  style={{ fontSize: '9px' }}
                >
                  {exposure.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Current</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>
                  {formatValue(exposure.current_exposure)}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Limit</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand)' }}>
                  {formatValue(exposure.limit_value)}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Available</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
                  {formatValue(exposure.limit_value - exposure.current_exposure)}
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Utilization</span>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  color: exposure.utilization_pct >= 90 ? 'var(--danger)' : exposure.utilization_pct >= 75 ? 'var(--col-risk)' : 'var(--success)'
                }}>
                  {exposure.utilization_pct.toFixed(1)}%
                </span>
              </div>
              <div className="progress">
                <span 
                  style={{ 
                    width: `${Math.min(exposure.utilization_pct, 100)}%`,
                    background: exposure.utilization_pct >= 90 ? 'var(--danger)' : exposure.utilization_pct >= 75 ? 'var(--col-risk)' : 'var(--success)'
                  }}
                ></span>
              </div>
            </div>

            <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', marginTop: '12px' }}>
              Updated: {new Date(exposure.last_updated).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
