import { useState, useEffect } from 'react'

interface TradingActivity {
  activity_id: string
  timestamp: string
  activity_type: string
  category: string
  trader_id: string
  instrument: string
  action: string
  quantity?: number
  price?: number
  value?: number
  status: 'pending' | 'executed' | 'cancelled' | 'failed'
  execution_time?: number
  strategy?: string
  risk_score?: number
  compliance_check: boolean
  notes?: string
  counterparty?: string
  venue?: string
  order_type?: string
  tags: string[]
}

// Mock data for trading activities
const mockActivities: TradingActivity[] = [
  {
    activity_id: 'trd_001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    activity_type: 'order_execution',
    category: 'trading',
    trader_id: 'trader.sarah',
    instrument: 'WTI Crude',
    action: 'BUY',
    quantity: 500,
    price: 75.45,
    value: 37725,
    status: 'executed',
    execution_time: 1.2,
    strategy: 'Momentum Trading',
    risk_score: 0.3,
    compliance_check: true,
    counterparty: 'Goldman Sachs',
    venue: 'NYMEX',
    order_type: 'Market Order',
    tags: ['energy', 'crude_oil', 'momentum']
  },
  {
    activity_id: 'trd_002',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    activity_type: 'risk_alert',
    category: 'risk_management',
    trader_id: 'risk.manager',
    instrument: 'Natural Gas',
    action: 'RISK_LIMIT_BREACH',
    status: 'pending',
    risk_score: 0.85,
    compliance_check: false,
    notes: 'Position size approaching maximum exposure limit',
    tags: ['risk', 'limit_breach', 'attention_required']
  },
  {
    activity_id: 'trd_003',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    activity_type: 'hedging_operation',
    category: 'risk_management',
    trader_id: 'hedge.specialist',
    instrument: 'Brent Crude',
    action: 'HEDGE_REBALANCE',
    quantity: -200,
    price: 78.92,
    value: -15784,
    status: 'executed',
    execution_time: 0.8,
    strategy: 'Delta Neutral Hedging',
    risk_score: 0.2,
    compliance_check: true,
    counterparty: 'JP Morgan',
    venue: 'ICE',
    order_type: 'Limit Order',
    tags: ['hedging', 'risk_reduction', 'delta_neutral']
  },
  {
    activity_id: 'trd_004',
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    activity_type: 'algorithmic_trade',
    category: 'automated_trading',
    trader_id: 'algo.system',
    instrument: 'RBOB Gasoline',
    action: 'SELL',
    quantity: 300,
    price: 2.15,
    value: 645,
    status: 'executed',
    execution_time: 0.3,
    strategy: 'Statistical Arbitrage',
    risk_score: 0.15,
    compliance_check: true,
    counterparty: 'Citibank',
    venue: 'NYMEX',
    order_type: 'IOC Order',
    tags: ['algorithmic', 'arbitrage', 'automated']
  },
  {
    activity_id: 'trd_005',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    activity_type: 'position_analysis',
    category: 'analytics',
    trader_id: 'analyst.john',
    instrument: 'WTI Crude',
    action: 'SCENARIO_ANALYSIS',
    status: 'executed',
    strategy: 'Stress Testing',
    risk_score: 0.45,
    compliance_check: true,
    notes: 'Completed stress test for oil price shock scenario',
    tags: ['analysis', 'stress_test', 'scenario']
  },
  {
    activity_id: 'trd_006',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    activity_type: 'order_modification',
    category: 'trading',
    trader_id: 'trader.mike',
    instrument: 'Natural Gas',
    action: 'MODIFY_ORDER',
    quantity: 800,
    price: 2.88,
    status: 'executed',
    execution_time: 0.5,
    strategy: 'Swing Trading',
    risk_score: 0.25,
    compliance_check: true,
    counterparty: 'Morgan Stanley',
    venue: 'NYMEX',
    order_type: 'Stop Limit',
    tags: ['modification', 'swing_trading', 'gas']
  },
  {
    activity_id: 'trd_007',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    activity_type: 'compliance_review',
    category: 'compliance',
    trader_id: 'compliance.officer',
    instrument: 'Brent Crude',
    action: 'COMPLIANCE_CHECK',
    status: 'executed',
    compliance_check: true,
    notes: 'Position limits verified, all trades within acceptable risk parameters',
    tags: ['compliance', 'review', 'verification']
  },
  {
    activity_id: 'trd_008',
    timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
    activity_type: 'market_making',
    category: 'liquidity_provision',
    trader_id: 'market.maker',
    instrument: 'RBOB Gasoline',
    action: 'PROVIDE_LIQUIDITY',
    quantity: 1000,
    price: 2.14,
    value: 2140,
    status: 'executed',
    execution_time: 0.1,
    strategy: 'Market Making',
    risk_score: 0.1,
    compliance_check: true,
    venue: 'NYMEX',
    order_type: 'Two-sided Quote',
    tags: ['market_making', 'liquidity', 'spread_capture']
  }
]

export default function TradingActivityTable() {
  const [activities, setActivities] = useState<TradingActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    activity_type: 'all',
    category: 'all',
    status: 'all',
    trader_id: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simulate loading with mock data
    const timer = setTimeout(() => {
      setActivities(mockActivities)
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'order_execution': return '💰'
      case 'risk_alert': return '⚠️'
      case 'hedging_operation': return '🛡️'
      case 'algorithmic_trade': return '🤖'
      case 'position_analysis': return '📊'
      case 'order_modification': return '✏️'
      case 'compliance_review': return '📋'
      case 'market_making': return '🏪'
      default: return '📈'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed': return '✅'
      case 'pending': return '⏳'
      case 'cancelled': return '❌'
      case 'failed': return '🚫'
      default: return '⚪'
    }
  }

  const getRiskColor = (riskScore?: number) => {
    if (!riskScore) return 'var(--muted)'
    if (riskScore > 0.7) return 'var(--danger)'
    if (riskScore > 0.4) return 'var(--warning)'
    return 'var(--success)'
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

  const formatValue = (value?: number) => {
    if (!value) return 'N/A'
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const filteredActivities = activities.filter(activity => {
    const matchesType = filter.activity_type === 'all' || activity.activity_type === filter.activity_type
    const matchesCategory = filter.category === 'all' || activity.category === filter.category
    const matchesStatus = filter.status === 'all' || activity.status === filter.status
    const matchesTrader = filter.trader_id === 'all' || activity.trader_id === filter.trader_id
    const matchesSearch = searchTerm === '' || 
      activity.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.trader_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.strategy && activity.strategy.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesType && matchesCategory && matchesStatus && matchesTrader && matchesSearch
  })

  const activityTypes = [...new Set(activities.map(a => a.activity_type))]
  const categories = [...new Set(activities.map(a => a.category))]
  const traders = [...new Set(activities.map(a => a.trader_id))]

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading trading activity log...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">📊 Trading Activity Monitor</h3>
          <div className="live-indicator">Real-time Activity Tracking</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px', padding: '8px 12px' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select 
          value={filter.activity_type} 
          onChange={(e) => setFilter(prev => ({ ...prev, activity_type: e.target.value }))}
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <option value="all">All Types</option>
          {activityTypes.map(type => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select 
          value={filter.category} 
          onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select 
          value={filter.status} 
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <option value="all">All Status</option>
          <option value="executed">Executed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>

        <select 
          value={filter.trader_id} 
          onChange={(e) => setFilter(prev => ({ ...prev, trader_id: e.target.value }))}
          style={{ padding: '6px 10px', fontSize: '12px' }}
        >
          <option value="all">All Traders</option>
          {traders.map(trader => (
            <option key={trader} value={trader}>
              {trader.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div className="chip">
          <span>{filteredActivities.length} Total</span>
        </div>
        <div className="chip success">
          <span>{filteredActivities.filter(a => a.status === 'executed').length} Executed</span>
        </div>
        <div className="chip warning">
          <span>{filteredActivities.filter(a => a.status === 'pending').length} Pending</span>
        </div>
        <div className="chip danger">
          <span>{filteredActivities.filter(a => !a.compliance_check).length} Compliance Issues</span>
        </div>
      </div>

      {/* Activity List */}
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
                className={`card ${!activity.compliance_check ? 'accent-risk' : activity.status === 'failed' ? 'accent-compliance' : ''}`}
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
                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '20px' }}>{getActivityIcon(activity.activity_type)}</span>
                      <span style={{ fontSize: '16px' }}>{getStatusIcon(activity.status)}</span>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                          {activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="chip" style={{ fontSize: '10px' }}>{activity.instrument}</span>
                        <span 
                          className={`chip ${activity.action.includes('BUY') ? 'success' : activity.action.includes('SELL') ? 'danger' : ''}`}
                          style={{ fontSize: '10px' }}
                        >
                          {activity.action}
                        </span>
                        {activity.strategy && (
                          <span className="chip" style={{ fontSize: '9px', background: 'var(--info)', color: 'white' }}>
                            {activity.strategy}
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '8px', fontSize: '11px' }}>
                        {activity.quantity && (
                          <div>
                            <strong>Quantity:</strong> {activity.quantity.toLocaleString()}
                          </div>
                        )}
                        {activity.price && (
                          <div>
                            <strong>Price:</strong> ${activity.price.toFixed(2)}
                          </div>
                        )}
                        {activity.value && (
                          <div>
                            <strong>Value:</strong> {formatValue(activity.value)}
                          </div>
                        )}
                        {activity.execution_time && (
                          <div>
                            <strong>Exec Time:</strong> {activity.execution_time.toFixed(1)}s
                          </div>
                        )}
                        {activity.counterparty && (
                          <div>
                            <strong>Counterparty:</strong> {activity.counterparty}
                          </div>
                        )}
                        {activity.venue && (
                          <div>
                            <strong>Venue:</strong> {activity.venue}
                          </div>
                        )}
                      </div>
                      
                      {activity.notes && (
                        <div style={{ 
                          background: 'var(--card-bg)', 
                          padding: '8px', 
                          borderRadius: '6px',
                          marginBottom: '8px',
                          fontSize: '11px',
                          color: 'var(--muted)'
                        }}>
                          📝 {activity.notes}
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
                                fontSize: '9px',
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
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '500' }}>
                      {formatTimestamp(activity.timestamp)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      👤 {activity.trader_id.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    {activity.risk_score !== undefined && (
                      <div style={{ 
                        fontSize: '10px',
                        color: getRiskColor(activity.risk_score),
                        fontWeight: '500'
                      }}>
                        Risk: {(activity.risk_score * 100).toFixed(0)}%
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {activity.compliance_check ? (
                        <span style={{ fontSize: '12px', color: 'var(--success)' }}>✓</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--danger)' }}>⚠️</span>
                      )}
                      <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
                        {activity.compliance_check ? 'Compliant' : 'Review Required'}
                      </span>
                    </div>
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
