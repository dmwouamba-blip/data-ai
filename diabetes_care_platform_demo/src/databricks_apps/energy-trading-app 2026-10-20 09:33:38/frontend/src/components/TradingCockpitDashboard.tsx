import { useState, useEffect, useMemo } from 'react'
import CountUp from './CountUp'
import Sparkline from './Sparkline'

interface MarketOverview {
  instrument: string
  last_price: number
  change_24h: number
  change_percent: number
  volume_24h: number
  volatility: number
  trend: 'UP' | 'DOWN' | 'SIDEWAYS'
  support_level: number
  resistance_level: number
  price_history: number[]
}

interface PositionSummary {
  instrument: string
  position_size: number
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  entry_price: number
  current_price: number
  risk_exposure: number
}

interface MarketSentiment {
  overall_sentiment: number
  fear_greed_index: number
  news_sentiment: number
  social_sentiment: number
  institutional_flow: number
  retail_flow: number
}

interface AlertNotification {
  alert_id: string
  type: 'price' | 'risk' | 'opportunity' | 'news'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  timestamp: string
  requires_action: boolean
}

// Mock data
const mockMarketData: MarketOverview[] = [
  {
    instrument: 'WTI Crude',
    last_price: 75.45,
    change_24h: 1.25,
    change_percent: 1.68,
    volume_24h: 125000,
    volatility: 18.5,
    trend: 'UP',
    support_level: 73.80,
    resistance_level: 76.90,
    price_history: [74.2, 74.8, 75.1, 74.9, 75.3, 75.6, 75.2, 75.45]
  },
  {
    instrument: 'Natural Gas',
    last_price: 2.85,
    change_24h: -0.08,
    change_percent: -2.73,
    volume_24h: 89000,
    volatility: 25.2,
    trend: 'DOWN',
    support_level: 2.75,
    resistance_level: 2.95,
    price_history: [2.93, 2.91, 2.88, 2.86, 2.84, 2.87, 2.86, 2.85]
  },
  {
    instrument: 'Brent Crude',
    last_price: 78.92,
    change_24h: 0.95,
    change_percent: 1.22,
    volume_24h: 98000,
    volatility: 16.8,
    trend: 'UP',
    support_level: 77.50,
    resistance_level: 80.20,
    price_history: [77.97, 78.2, 78.5, 78.3, 78.7, 78.9, 78.8, 78.92]
  },
  {
    instrument: 'RBOB Gasoline',
    last_price: 2.15,
    change_24h: 0.02,
    change_percent: 0.94,
    volume_24h: 45000,
    volatility: 22.1,
    trend: 'SIDEWAYS',
    support_level: 2.10,
    resistance_level: 2.20,
    price_history: [2.13, 2.14, 2.16, 2.15, 2.14, 2.15, 2.16, 2.15]
  }
]

const mockPositions: PositionSummary[] = [
  {
    instrument: 'WTI Crude',
    position_size: 500,
    market_value: 37725,
    unrealized_pnl: 625,
    unrealized_pnl_percent: 1.68,
    entry_price: 74.20,
    current_price: 75.45,
    risk_exposure: 15000
  },
  {
    instrument: 'Natural Gas',
    position_size: -1200,
    market_value: -3420,
    unrealized_pnl: 96,
    unrealized_pnl_percent: 2.73,
    entry_price: 2.93,
    current_price: 2.85,
    risk_exposure: 8500
  }
]

const mockSentiment: MarketSentiment = {
  overall_sentiment: 0.65,
  fear_greed_index: 72,
  news_sentiment: 0.58,
  social_sentiment: 0.71,
  institutional_flow: 0.82,
  retail_flow: 0.45
}

const mockAlerts: AlertNotification[] = [
  {
    alert_id: 'alert_001',
    type: 'opportunity',
    severity: 'HIGH',
    title: 'Arbitrage Opportunity',
    message: 'WTI-Brent spread widening beyond historical range',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    requires_action: true
  },
  {
    alert_id: 'alert_002',
    type: 'risk',
    severity: 'MEDIUM',
    title: 'Position Risk Alert',
    message: 'Natural Gas position approaching risk limit',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    requires_action: false
  }
]

export default function TradingCockpitDashboard() {
  const [marketData, setMarketData] = useState<MarketOverview[]>([])
  const [positions, setPositions] = useState<PositionSummary[]>([])
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMarketData(mockMarketData)
      setPositions(mockPositions)
      setSentiment(mockSentiment)
      setAlerts(mockAlerts)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        setMarketData(prev => prev.map(item => ({
          ...item,
          last_price: item.last_price + (Math.random() - 0.5) * 0.1,
          price_history: [...item.price_history.slice(-7), item.last_price + (Math.random() - 0.5) * 0.1]
        })))
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [loading])

  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.market_value), 0)
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0)
    const totalRisk = positions.reduce((sum, pos) => sum + pos.risk_exposure, 0)
    
    return {
      totalValue,
      totalPnL,
      totalRisk,
      pnlPercent: totalValue > 0 ? (totalPnL / totalValue) * 100 : 0
    }
  }, [positions])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return '📈'
      case 'DOWN': return '📉'
      case 'SIDEWAYS': return '➡️'
      default: return '📊'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price': return '💰'
      case 'risk': return '⚠️'
      case 'opportunity': return '🎯'
      case 'news': return '📰'
      default: return '🔔'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'var(--danger-soft)'
      case 'HIGH': return 'var(--warning)'
      case 'MEDIUM': return 'var(--info)'
      case 'LOW': return 'var(--success-soft)'
      default: return 'var(--text)'
    }
  }

  const getSentimentColor = (value: number) => {
    if (value > 0.6) return 'var(--success)'
    if (value > 0.4) return 'var(--warning)'
    return 'var(--danger)'
  }

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
        <div>Loading trading cockpit dashboard...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🚀 Trading Cockpit Dashboard</h3>
          <div className="live-indicator">Real-time Market Intelligence • Live Updates</div>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>Portfolio Value</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>
                ${(portfolioSummary.totalValue/1000).toFixed(0)}K
              </div>
            </div>
            <span style={{ fontSize: '24px' }}>💼</span>
          </div>
        </div>
        
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>Unrealized P&L</div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700',
                color: portfolioSummary.totalPnL >= 0 ? 'var(--success)' : 'var(--danger)' 
              }}>
                {portfolioSummary.totalPnL >= 0 ? '+' : ''}
                $${portfolioSummary.totalPnL.toFixed(0)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                ({portfolioSummary.pnlPercent >= 0 ? '+' : ''}{portfolioSummary.pnlPercent.toFixed(2)}%)
              </div>
            </div>
            <span style={{ fontSize: '24px' }}>
              {portfolioSummary.totalPnL >= 0 ? '📈' : '📉'}
            </span>
          </div>
        </div>
        
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>Risk Exposure</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>
                ${(portfolioSummary.totalRisk/1000).toFixed(0)}K
              </div>
            </div>
            <span style={{ fontSize: '24px' }}>🛡️</span>
          </div>
        </div>
        
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>Active Alerts</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>{alerts.length}</div>
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '2px' }}>
                {alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length} high priority
              </div>
            </div>
            <span style={{ fontSize: '24px' }}>🚨</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Market Overview */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            📊 Live Market Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {marketData.map((item) => (
              <div key={item.instrument} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      {item.instrument}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>
                      ${item.last_price.toFixed(2)}
                    </div>
                    <div style={{ 
                      fontSize: '11px',
                      color: item.change_24h >= 0 ? 'var(--success)' : 'var(--danger)',
                      fontWeight: '500'
                    }}>
                      {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(2)} ({item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%)
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '20px' }}>{getTrendIcon(item.trend)}</span>
                    <div style={{ width: '60px', height: '30px' }}>
                      <Sparkline 
                        data={item.price_history} 
                        width={60}
                        height={30}
                        color={item.change_24h >= 0 ? '#22c55e' : '#ef4444'}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', color: 'var(--muted)' }}>
                  <div>Volume: {(item.volume_24h / 1000).toFixed(0)}K</div>
                  <div>Vol: {item.volatility.toFixed(1)}%</div>
                  <div>Support: ${item.support_level.toFixed(2)}</div>
                  <div>Resistance: ${item.resistance_level.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Sentiment */}
        {sentiment && (
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
              🧠 Market Sentiment Analysis
            </h4>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: getSentimentColor(sentiment.overall_sentiment) }}>
                    {(sentiment.overall_sentiment * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Overall Sentiment</div>
                </div>
                
                <div style={{ fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Fear & Greed Index</span>
                    <span style={{ fontWeight: '600' }}>{sentiment.fear_greed_index}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>News Sentiment</span>
                    <span style={{ fontWeight: '600', color: getSentimentColor(sentiment.news_sentiment) }}>
                      {(sentiment.news_sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Social Media</span>
                    <span style={{ fontWeight: '600', color: getSentimentColor(sentiment.social_sentiment) }}>
                      {(sentiment.social_sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Institutional Flow</span>
                    <span style={{ fontWeight: '600', color: getSentimentColor(sentiment.institutional_flow) }}>
                      {(sentiment.institutional_flow * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Retail Flow</span>
                    <span style={{ fontWeight: '600', color: getSentimentColor(sentiment.retail_flow) }}>
                      {(sentiment.retail_flow * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Current Positions */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            📊 Active Positions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {positions.map((position, index) => (
              <div key={index} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      {position.instrument}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>
                      Size: {position.position_size > 0 ? '+' : ''}{position.position_size.toLocaleString()} units
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      Entry: ${position.entry_price.toFixed(2)} • Current: ${position.current_price.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: position.unrealized_pnl >= 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(0)}
                    </div>
                    <div style={{ 
                      fontSize: '10px',
                      color: position.unrealized_pnl >= 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                      ({position.unrealized_pnl_percent >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Alerts */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            🚨 Live Alerts & Notifications
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alert) => (
              <div 
                key={alert.alert_id} 
                className={`card ${alert.severity === 'CRITICAL' ? 'accent-risk' : alert.severity === 'HIGH' ? 'accent-compliance' : ''}`}
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{getAlertIcon(alert.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{alert.title}</span>
                      <span 
                        className="chip"
                        style={{ 
                          fontSize: '9px',
                          background: getSeverityColor(alert.severity),
                          color: 'white'
                        }}
                      >
                        {alert.severity}
                      </span>
                      {alert.requires_action && (
                        <span className="chip danger" style={{ fontSize: '8px' }}>ACTION</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)' }}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
