import { useState, useEffect, useMemo } from 'react'
import Sparkline from './Sparkline'
import InteractiveChart from './InteractiveChart'
import { useDisableRealTime, STATIC_FALLBACKS } from '../utils/disableRealTime'

interface OrderBookLevel {
  price: number
  volume: number
  orders: number
}

interface OrderBookData {
  timestamp: string
  instrument: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  last_price: number
  spread: number
  mid_price: number
}

interface LiquidityMetrics {
  bid_ask_spread: number
  market_depth: number
  price_impact: number
  liquidity_score: number
  volatility_index: number
  order_flow_imbalance: number
}

interface TradingOpportunity {
  opportunity_id: string
  type: 'arbitrage' | 'momentum' | 'mean_reversion' | 'liquidity'
  instrument: string
  confidence: number
  expected_return: number
  time_window: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  entry_price: number
  target_price: number
  stop_loss: number
}

// Mock order book data
const generateOrderBook = (): OrderBookData => {
  const basePrice = 75.45
  const spread = 0.02 + Math.random() * 0.03
  const midPrice = basePrice + (Math.random() - 0.5) * 0.1
  
  const bids: OrderBookLevel[] = []
  const asks: OrderBookLevel[] = []
  
  // Generate bid levels
  for (let i = 0; i < 10; i++) {
    bids.push({
      price: midPrice - spread/2 - i * 0.01,
      volume: Math.floor(Math.random() * 5000) + 500,
      orders: Math.floor(Math.random() * 10) + 1
    })
  }
  
  // Generate ask levels
  for (let i = 0; i < 10; i++) {
    asks.push({
      price: midPrice + spread/2 + i * 0.01,
      volume: Math.floor(Math.random() * 5000) + 500,
      orders: Math.floor(Math.random() * 10) + 1
    })
  }
  
  return {
    timestamp: new Date().toISOString(),
    instrument: 'WTI Crude',
    bids: bids.sort((a, b) => b.price - a.price), // Highest bid first
    asks: asks.sort((a, b) => a.price - b.price), // Lowest ask first
    last_price: midPrice + (Math.random() - 0.5) * 0.02,
    spread,
    mid_price: midPrice
  }
}

// Mock trading opportunities
const mockOpportunities: TradingOpportunity[] = [
  {
    opportunity_id: 'opp_001',
    type: 'arbitrage',
    instrument: 'WTI-Brent Spread',
    confidence: 0.92,
    expected_return: 0.15,
    time_window: '5-15 minutes',
    risk_level: 'LOW',
    description: 'Price discrepancy between WTI and Brent futures',
    entry_price: -2.15,
    target_price: -1.95,
    stop_loss: -2.25
  },
  {
    opportunity_id: 'opp_002',
    type: 'momentum',
    instrument: 'Natural Gas',
    confidence: 0.78,
    expected_return: 0.25,
    time_window: '30-60 minutes',
    risk_level: 'MEDIUM',
    description: 'Strong upward momentum with volume confirmation',
    entry_price: 2.85,
    target_price: 2.92,
    stop_loss: 2.82
  },
  {
    opportunity_id: 'opp_003',
    type: 'liquidity',
    instrument: 'RBOB Gasoline',
    confidence: 0.85,
    expected_return: 0.18,
    time_window: '10-20 minutes',
    risk_level: 'LOW',
    description: 'Temporary liquidity gap creating pricing inefficiency',
    entry_price: 2.15,
    target_price: 2.19,
    stop_loss: 2.13
  }
]

export default function MarketMicrostructurePanel() {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [liquidityMetrics, setLiquidityMetrics] = useState<LiquidityMetrics | null>(null)
  const [opportunities, setOpportunities] = useState<TradingOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstrument, setSelectedInstrument] = useState('WTI Crude')
  const [spreadHistory, setSpreadHistory] = useState<number[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      const newOrderBook = generateOrderBook()
      setOrderBook(newOrderBook)
      
      // Calculate liquidity metrics
      const totalBidVolume = newOrderBook.bids.slice(0, 5).reduce((sum, level) => sum + level.volume, 0)
      const totalAskVolume = newOrderBook.asks.slice(0, 5).reduce((sum, level) => sum + level.volume, 0)
      const marketDepth = (totalBidVolume + totalAskVolume) / 2
      
      setLiquidityMetrics({
        bid_ask_spread: newOrderBook.spread,
        market_depth: marketDepth,
        price_impact: (newOrderBook.spread / newOrderBook.mid_price) * 100,
        liquidity_score: Math.min(100, (marketDepth / 100)),
        volatility_index: 15 + Math.random() * 10,
        order_flow_imbalance: (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)
      })
      
      setOpportunities(mockOpportunities)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [selectedInstrument])

  // Update spread history for sparkline
  useEffect(() => {
    if (orderBook) {
      setSpreadHistory(prev => [...prev.slice(-49), orderBook.spread])
    }
  }, [orderBook])

  // Real-time updates COMPLETELY DISABLED to prevent resets
  const realTimeDisabled = useDisableRealTime()
  
  useEffect(() => {
    if (loading || realTimeDisabled) {
      console.log('Market microstructure real-time updates DISABLED')
      return
    }
    
    // All real-time updates are now DISABLED
    console.warn('Market microstructure updates disabled to prevent constant resets')
    return
    
    // Old code commented out to prevent resets:
    // let isMounted = true
    // const interval = setInterval(() => {
    //   if (isMounted) {
    //     const newOrderBook = generateOrderBook()
    //     setOrderBook(newOrderBook)
    //     setSpreadHistory(prev => [...prev.slice(-49), newOrderBook.spread])
    //   }
    // }, 10000)
    //
    // return () => {
    //   isMounted = false
    //   clearInterval(interval)
    // }
  }, [loading, realTimeDisabled])

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'arbitrage': return '⚖️'
      case 'momentum': return '🚀'
      case 'mean_reversion': return '🔄'
      case 'liquidity': return '💧'
      default: return '💡'
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'var(--danger)'
      case 'MEDIUM': return 'var(--warning)'
      case 'LOW': return 'var(--success)'
      default: return 'var(--text)'
    }
  }

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>📊</div>
        <div>Loading market microstructure data...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">📊 Market Microstructure Analytics</h3>
          <div className="live-indicator">Real-time Order Flow • Level 2 Data</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={selectedInstrument} 
            onChange={(e) => setSelectedInstrument(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="WTI Crude">WTI Crude Oil</option>
            <option value="Brent Crude">Brent Crude Oil</option>
            <option value="Natural Gas">Natural Gas</option>
            <option value="RBOB Gasoline">RBOB Gasoline</option>
          </select>
        </div>
      </div>

      {/* Liquidity Metrics Overview */}
      {liquidityMetrics && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          marginBottom: '20px' 
        }}>
          <div className="kpi accent-trading">
            <div>
              <div className="sub">Bid-Ask Spread</div>
              <div className="value">${liquidityMetrics.bid_ask_spread.toFixed(3)}</div>
            </div>
            <div style={{ width: '60px', height: '30px' }}>
              <Sparkline data={spreadHistory} />
            </div>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Market Depth</div>
              <div className="value">{(liquidityMetrics.market_depth / 1000).toFixed(1)}K</div>
            </div>
            <span style={{ fontSize: '20px' }}>🏊</span>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Liquidity Score</div>
              <div className="value" style={{ 
                color: liquidityMetrics.liquidity_score > 70 ? 'var(--success)' : 
                       liquidityMetrics.liquidity_score > 40 ? 'var(--warning)' : 'var(--danger)'
              }}>
                {liquidityMetrics.liquidity_score.toFixed(0)}
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>💧</span>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Order Flow</div>
              <div className="value" style={{ 
                color: liquidityMetrics.order_flow_imbalance > 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {liquidityMetrics.order_flow_imbalance > 0 ? 'BUY' : 'SELL'}
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>
              {liquidityMetrics.order_flow_imbalance > 0 ? '📈' : '📉'}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Order Book Visualization */}
        {orderBook && (
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
              📖 Order Book - {orderBook.instrument}
            </h4>
            
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Last Price</div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>${orderBook.last_price.toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Spread: ${orderBook.spread.toFixed(3)} • Mid: ${orderBook.mid_price.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              {/* Asks */}
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px', textAlign: 'center', color: 'var(--danger)' }}>
                  ASKS (SELL)
                </div>
                {orderBook.asks.slice(0, 8).reverse().map((level, index) => (
                  <div key={index} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '2px 4px',
                    background: index % 2 === 0 ? 'var(--border)' : 'transparent',
                    borderRadius: '2px'
                  }}>
                    <span style={{ color: 'var(--danger)' }}>${level.price.toFixed(2)}</span>
                    <span>{level.volume.toLocaleString()}</span>
                    <span style={{ color: 'var(--muted)' }}>({level.orders})</span>
                  </div>
                ))}
              </div>

              {/* Bids */}
              <div>
                <div style={{ fontWeight: '600', marginBottom: '8px', textAlign: 'center', color: 'var(--success)' }}>
                  BIDS (BUY)
                </div>
                {orderBook.bids.slice(0, 8).map((level, index) => (
                  <div key={index} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '2px 4px',
                    background: index % 2 === 0 ? 'var(--border)' : 'transparent',
                    borderRadius: '2px'
                  }}>
                    <span style={{ color: 'var(--success)' }}>${level.price.toFixed(2)}</span>
                    <span>{level.volume.toLocaleString()}</span>
                    <span style={{ color: 'var(--muted)' }}>({level.orders})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Metrics */}
        {liquidityMetrics && (
          <div className="card" style={{ padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
              🔬 Advanced Analytics
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px' }}>Price Impact (1K units):</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>
                  {liquidityMetrics.price_impact.toFixed(3)}%
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px' }}>Volatility Index:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--warning)' }}>
                  {liquidityMetrics.volatility_index.toFixed(1)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px' }}>Order Flow Imbalance:</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: liquidityMetrics.order_flow_imbalance > 0 ? 'var(--success)' : 'var(--danger)'
                }}>
                  {(liquidityMetrics.order_flow_imbalance * 100).toFixed(1)}%
                </span>
              </div>

              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--card-bg)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>
                  💡 Market Conditions
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: '1.4' }}>
                  {liquidityMetrics.liquidity_score > 70 ? 
                    'High liquidity environment, tight spreads, good for large orders' :
                    liquidityMetrics.liquidity_score > 40 ?
                    'Moderate liquidity, consider order splitting for large sizes' :
                    'Low liquidity, expect higher price impact and wider spreads'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Movement Chart */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
          📈 Real-time Price Movement
        </h4>
        <InteractiveChart
          data={Array.from({ length: 100 }, (_, i) => ({
            timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
            price: orderBook ? orderBook.mid_price + Math.sin(i * 0.1) * 0.05 + (Math.random() - 0.5) * 0.02 : 75.45,
            volume: Math.floor(Math.random() * 1000) + 500
          }))}
          width={800}
          height={300}
          title={`${selectedInstrument} - Intraday Price Action`}
          showControls={true}
        />
      </div>

      {/* Trading Opportunities */}
      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
          💡 Intraday Trading Opportunities
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {opportunities.map((opportunity) => (
            <div 
              key={opportunity.opportunity_id} 
              className={`card ${opportunity.risk_level === 'LOW' ? 'accent-finance' : ''}`}
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
                    <span style={{ fontSize: '24px' }}>{getOpportunityIcon(opportunity.type)}</span>
                    <span 
                      className="chip"
                      style={{ 
                        fontSize: '9px',
                        background: getRiskColor(opportunity.risk_level),
                        color: 'white'
                      }}
                    >
                      {opportunity.risk_level}
                    </span>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {opportunity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h5>
                      <span className="chip" style={{ fontSize: '10px' }}>{opportunity.instrument}</span>
                      <span className="chip success" style={{ fontSize: '9px' }}>
                        {(opportunity.confidence * 100).toFixed(0)}% Conf.
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', lineHeight: '1.4' }}>
                      {opportunity.description}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '11px' }}>
                      <div>
                        <strong>Entry:</strong> ${opportunity.entry_price.toFixed(2)}
                      </div>
                      <div>
                        <strong>Target:</strong> ${opportunity.target_price.toFixed(2)}
                      </div>
                      <div>
                        <strong>Stop:</strong> ${opportunity.stop_loss.toFixed(2)}
                      </div>
                      <div>
                        <strong>Window:</strong> {opportunity.time_window}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                    Expected Return
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: 'var(--success)'
                  }}>
                    +{(opportunity.expected_return * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
