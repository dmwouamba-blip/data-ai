import { useState, useEffect } from 'react'

interface RiskAlert {
  alert_id: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  alert_type: string
  product: string
  description: string
  current_value: number
  threshold_value: number
  status: 'active' | 'acknowledged' | 'resolved'
}

// Mock data for beautiful demonstration
const mockAlerts: RiskAlert[] = [
  {
    alert_id: 'alert_001',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    severity: 'critical',
    alert_type: 'limit_breach',
    product: 'Brent Crude',
    description: 'Credit exposure limit breached for Oil Portfolio',
    current_value: 22800000,
    threshold_value: 25000000,
    status: 'active'
  },
  {
    alert_id: 'alert_002',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    severity: 'high',
    alert_type: 'var_threshold',
    product: 'WTI Crude',
    description: 'VaR 95% approaching threshold',
    current_value: 4750000,
    threshold_value: 5000000,
    status: 'acknowledged'
  },
  {
    alert_id: 'alert_003',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    severity: 'medium',
    alert_type: 'hedge_effectiveness',
    product: 'Natural Gas',
    description: 'Hedge effectiveness below target',
    current_value: 0.72,
    threshold_value: 0.80,
    status: 'active'
  }
]

export default function RiskAlertPanel() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    // Simulate loading with mock data
    const timer = setTimeout(() => {
      setAlerts(mockAlerts)
      setLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      case 'low': return 'ℹ️'
      default: return '📊'
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter)

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading alerts...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🚨 Real-Time Risk Alerts</h3>
          <div className="live-indicator">Live Updates</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'critical', 'high', 'medium', 'low'].map(severity => (
            <button
              key={severity}
              className={`chip ${filter === severity ? 'active' : ''} ${severity === 'critical' ? 'danger' : severity === 'high' ? 'danger' : severity === 'low' ? 'success' : ''}`}
              onClick={() => setFilter(severity)}
              style={{ fontSize: '11px' }}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
              {severity !== 'all' && (
                <span style={{ marginLeft: '4px' }}>
                  {alerts.filter(a => a.severity === severity).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            ✅ No alerts for selected filter
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map(alert => (
              <div 
                key={alert.alert_id} 
                className={`card ${alert.severity === 'critical' ? 'accent-compliance' : alert.severity === 'high' ? 'accent-risk' : ''}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getSeverityIcon(alert.severity)}</span>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>{alert.product}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        {alert.severity} • {alert.alert_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {formatTimestamp(alert.timestamp)}
                    </div>
                    <div 
                      className={`chip ${alert.status === 'active' ? 'danger' : alert.status === 'resolved' ? 'success' : ''}`}
                      style={{ fontSize: '9px', marginTop: '4px' }}
                    >
                      {alert.status}
                    </div>
                  </div>
                </div>
                
                <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '12px', lineHeight: '1.4' }}>
                  {alert.description}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Current</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>
                      {formatValue(alert.current_value)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Threshold</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand)' }}>
                      {formatValue(alert.threshold_value)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Breach</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>
                      {((alert.current_value / alert.threshold_value - 1) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button 
                    className={`button ${alert.status === 'acknowledged' ? 'primary' : ''}`}
                    disabled={alert.status !== 'active'}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {alert.status === 'active' ? 'Acknowledge' : 'Acknowledged'}
                  </button>
                  <button className="button" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
