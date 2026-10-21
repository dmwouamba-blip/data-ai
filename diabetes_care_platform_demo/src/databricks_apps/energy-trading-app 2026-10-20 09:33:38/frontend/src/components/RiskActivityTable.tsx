import { useState, useEffect } from 'react'

interface RiskActivity {
  activity_id: string
  timestamp: string
  activity_type: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  product?: string
  portfolio?: string
  description: string
  metric_name?: string
  metric_value?: number
  threshold_value?: number
  status: 'active' | 'acknowledged' | 'resolved'
  user_id?: string
  tags: string[]
}

// Mock data for beautiful demonstration
const mockActivities: RiskActivity[] = [
  {
    activity_id: 'act_001',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    activity_type: 'limit_breach',
    category: 'alert',
    severity: 'critical',
    product: 'WTI Crude',
    portfolio: 'Energy Portfolio',
    description: 'Credit exposure limit breached for major counterparty',
    metric_name: 'credit_exposure',
    metric_value: 25800000,
    threshold_value: 25000000,
    status: 'active',
    user_id: 'risk.manager',
    tags: ['credit_risk', 'urgent', 'counterparty']
  },
  {
    activity_id: 'act_002',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    activity_type: 'scenario_analysis',
    category: 'analysis',
    severity: 'medium',
    product: 'Natural Gas',
    portfolio: 'Gas Portfolio',
    description: 'Completed stress test: Oil price shock +30% scenario',
    status: 'resolved',
    user_id: 'analyst.john',
    tags: ['stress_test', 'scenario', 'completed']
  },
  {
    activity_id: 'act_003',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    activity_type: 'hedge_optimization',
    category: 'optimization',
    severity: 'high',
    product: 'Brent Crude',
    portfolio: 'Oil Portfolio',
    description: 'Hedge effectiveness below threshold, rebalancing recommended',
    metric_name: 'hedge_effectiveness',
    metric_value: 0.68,
    threshold_value: 0.80,
    status: 'acknowledged',
    user_id: 'trader.sarah',
    tags: ['hedge', 'optimization', 'rebalancing']
  },
  {
    activity_id: 'act_004',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    activity_type: 'var_calculation',
    category: 'monitoring',
    severity: 'low',
    product: 'Gold',
    portfolio: 'Metals Portfolio',
    description: 'Daily VaR calculation completed successfully',
    metric_name: 'var_95',
    metric_value: 1850000,
    status: 'resolved',
    user_id: 'system',
    tags: ['var', 'daily_calc', 'automated']
  },
  {
    activity_id: 'act_005',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    activity_type: 'exposure_monitoring',
    category: 'monitoring',
    severity: 'medium',
    product: 'Silver',
    portfolio: 'Metals Portfolio',
    description: 'Market exposure approaching warning threshold',
    metric_name: 'market_exposure',
    metric_value: 8200000,
    threshold_value: 10000000,
    status: 'active',
    user_id: 'risk.monitor',
    tags: ['exposure', 'warning', 'metals']
  },
  {
    activity_id: 'act_006',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    activity_type: 'stress_test',
    category: 'analysis',
    severity: 'high',
    product: 'Copper',
    portfolio: 'Industrial Metals',
    description: 'Extreme volatility stress test executed',
    status: 'resolved',
    user_id: 'quant.alex',
    tags: ['stress_test', 'volatility', 'copper']
  }
]

export default function RiskActivityTable() {
  const [activities, setActivities] = useState<RiskActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    activity_type: 'all',
    severity: 'all',
    status: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simulate loading and use mock data
    const timer = setTimeout(() => {
      setActivities(mockActivities)
      setLoading(false)
    }, 800)

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

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'limit_breach': return '🚫'
      case 'scenario_analysis': return '🎯'
      case 'hedge_optimization': return '⚖️'
      case 'var_calculation': return '📊'
      case 'stress_test': return '🧪'
      case 'exposure_monitoring': return '👁️'
      default: return '📋'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const filteredActivities = activities.filter(activity => {
    const matchesType = filter.activity_type === 'all' || activity.activity_type === filter.activity_type
    const matchesSeverity = filter.severity === 'all' || activity.severity === filter.severity
    const matchesStatus = filter.status === 'all' || activity.status === filter.status
    const matchesSearch = searchTerm === '' || 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.portfolio?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesType && matchesSeverity && matchesStatus && matchesSearch
  })

  const activityTypes = [...new Set(activities.map(a => a.activity_type))]

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading activity log...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">📋 Risk Activity Log</h3>
          <div className="live-indicator">Live Updates</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select 
          value={filter.activity_type} 
          onChange={(e) => setFilter(prev => ({ ...prev, activity_type: e.target.value }))}
        >
          <option value="all">All Types</option>
          {activityTypes.map(type => (
            <option key={type} value={type}>
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select 
          value={filter.severity} 
          onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select 
          value={filter.status} 
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div className="chip">
          <span>{filteredActivities.length} Total</span>
        </div>
        <div className="chip danger">
          <span>{filteredActivities.filter(a => a.severity === 'critical').length} Critical</span>
        </div>
        <div className="chip success">
          <span>{filteredActivities.filter(a => a.status === 'active').length} Active</span>
        </div>
      </div>

      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            📊 No activities match your current filters
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredActivities.map((activity) => (
              <div 
                key={activity.activity_id} 
                className={`card ${activity.severity === 'critical' ? 'accent-compliance' : activity.severity === 'high' ? 'accent-risk' : ''}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '20px' }}>{getActivityTypeIcon(activity.activity_type)}</span>
                      <span style={{ fontSize: '16px' }}>{getSeverityIcon(activity.severity)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                          {activity.activity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {activity.product && (
                          <span className="chip" style={{ fontSize: '10px' }}>{activity.product}</span>
                        )}
                        {activity.portfolio && (
                          <span className="chip" style={{ fontSize: '10px', background: 'var(--success)', color: 'white' }}>
                            {activity.portfolio}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '8px', lineHeight: '1.4' }}>
                        {activity.description}
                      </div>
                      {(activity.metric_value !== undefined && activity.threshold_value !== undefined) && (
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '12px' }}>
                          <span>
                            <strong>{activity.metric_name}:</strong> {formatValue(activity.metric_value)}
                          </span>
                          <span>
                            <strong>Threshold:</strong> {formatValue(activity.threshold_value)}
                          </span>
                        </div>
                      )}
                      {activity.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {activity.tags.map((tag, index) => (
                            <span 
                              key={index} 
                              style={{ 
                                background: 'var(--border)', 
                                padding: '2px 6px', 
                                borderRadius: '8px', 
                                fontSize: '10px',
                                color: 'var(--muted)'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '500' }}>
                      {formatTimestamp(activity.timestamp)}
                    </div>
                    <div 
                      className={`chip ${activity.status === 'active' ? 'danger' : activity.status === 'resolved' ? 'success' : ''}`}
                      style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      {activity.status}
                    </div>
                    {activity.user_id && (
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        👤 {activity.user_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
