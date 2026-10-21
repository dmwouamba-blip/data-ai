import { useState, useEffect, useMemo } from 'react'
import SimpleChart from './SimpleChart'
import CountUp from './CountUp'

interface ForecastData {
  timestamp: string
  actual_price: number
  predicted_price: number
  confidence_upper: number
  confidence_lower: number
  demand_forecast: number
  market_sentiment: number
}

interface ModelMetrics {
  accuracy: number
  mape: number  // Mean Absolute Percentage Error
  last_trained: string
  data_sources: string[]
  prediction_horizon: string
}

// Mock data for AI-powered price forecasting
const generateForecastData = (): ForecastData[] => {
  const data: ForecastData[] = []
  const basePrice = 75.50
  const now = new Date()
  
  for (let i = -24; i <= 48; i++) {
    const timestamp = new Date(now.getTime() + i * 3600000).toISOString()
    const noise = (Math.random() - 0.5) * 2
    const trend = i > 0 ? i * 0.1 : 0 // Future trend
    const actual_price = i <= 0 ? basePrice + noise + Math.sin(i * 0.2) * 3 : null
    const predicted_price = basePrice + trend + Math.sin(i * 0.15) * 2.5 + noise * 0.5
    const confidence_range = Math.abs(i) * 0.2 + 1.5
    
    data.push({
      timestamp,
      actual_price: actual_price || predicted_price,
      predicted_price,
      confidence_upper: predicted_price + confidence_range,
      confidence_lower: predicted_price - confidence_range,
      demand_forecast: 80 + Math.sin(i * 0.3) * 15 + noise,
      market_sentiment: 0.3 + Math.random() * 0.4 + (i > 0 ? 0.1 : 0)
    })
  }
  
  return data
}

const mockMetrics: ModelMetrics = {
  accuracy: 87.3,
  mape: 3.2,
  last_trained: new Date(Date.now() - 2 * 3600000).toISOString(),
  data_sources: ['Price History', 'Weather Data', 'Economic Indicators', 'Social Sentiment', 'Trading Volumes'],
  prediction_horizon: '48 hours'
}

export default function PriceForecastingPanel() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [selectedInstrument, setSelectedInstrument] = useState('WTI Crude')
  const [timeHorizon, setTimeHorizon] = useState('48h')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setForecastData(generateForecastData())
      setMetrics(mockMetrics)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [selectedInstrument, timeHorizon])

  const chartData = useMemo(() => {
    return forecastData.map(d => ({
      timestamp: d.timestamp,
      price: d.actual_price,
      predicted: d.predicted_price,
      upper: d.confidence_upper,
      lower: d.confidence_lower
    }))
  }, [forecastData])

  const currentForecast = useMemo(() => {
    const future = forecastData.filter(d => new Date(d.timestamp) > new Date())
    if (future.length === 0) return null
    
    const next4h = future.slice(0, 4)
    const next24h = future.slice(0, 24)
    
    return {
      next4h_avg: next4h.reduce((sum, d) => sum + d.predicted_price, 0) / next4h.length,
      next24h_avg: next24h.reduce((sum, d) => sum + d.predicted_price, 0) / next24h.length,
      sentiment_avg: future.slice(0, 12).reduce((sum, d) => sum + d.market_sentiment, 0) / 12,
      demand_peak: Math.max(...future.slice(0, 24).map(d => d.demand_forecast))
    }
  }, [forecastData])

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🤖</div>
        <div>Loading AI price forecasting model...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🤖 Predictive Price & Demand Forecasting</h3>
          <div className="live-indicator">AI-Powered • Real-time Learning</div>
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
          <select 
            value={timeHorizon} 
            onChange={(e) => setTimeHorizon(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="24h">24 Hours</option>
            <option value="48h">48 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>
      </div>

      {/* Model Performance Metrics */}
      {metrics && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px', 
          marginBottom: '20px' 
        }}>
          <div className="kpi accent-trading">
            <div>
              <div className="sub">Model Accuracy</div>
              <div className="value">
                {metrics.accuracy}%
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>🎯</span>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Prediction Error (MAPE)</div>
              <div className="value" style={{ color: 'var(--success)' }}>
                {metrics.mape}%
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>📊</span>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Data Sources</div>
              <div className="value">{metrics.data_sources.length}</div>
            </div>
            <span style={{ fontSize: '20px' }}>📡</span>
          </div>
          <div className="kpi">
            <div>
              <div className="sub">Last Training</div>
              <div className="value" style={{ fontSize: '14px' }}>
                {new Date(metrics.last_trained).toLocaleTimeString()}
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>🔄</span>
          </div>
        </div>
      )}

      {/* Price Forecast Chart */}
      <div style={{ marginBottom: '20px' }}>
        <SimpleChart 
          data={chartData}
          height={400}
          title={`${selectedInstrument} - AI Price Forecast`}
          showPrediction={true}
        />
      </div>

      {/* Forecast Summary */}
      {currentForecast && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div className="card accent-finance" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sub">Next 4H Avg Price</div>
                <div className="value" style={{ fontSize: '20px' }}>
                  ${currentForecast.next4h_avg.toFixed(2)}
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>⏰</span>
            </div>
          </div>
          <div className="card accent-risk" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sub">24H Avg Price</div>
                <div className="value" style={{ fontSize: '20px' }}>
                  ${currentForecast.next24h_avg.toFixed(2)}
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>📅</span>
            </div>
          </div>
          <div className="card accent-compliance" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sub">Market Sentiment</div>
                <div className="value" style={{ 
                  fontSize: '20px',
                  color: currentForecast.sentiment_avg > 0.5 ? 'var(--success)' : 'var(--danger)'
                }}>
                  {currentForecast.sentiment_avg > 0.5 ? 'Bullish' : 'Bearish'}
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>
                {currentForecast.sentiment_avg > 0.5 ? '📈' : '📉'}
              </span>
            </div>
          </div>
          <div className="card accent-trading" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sub">Peak Demand (24H)</div>
                <div className="value" style={{ fontSize: '20px' }}>
                  {currentForecast.demand_peak.toFixed(0)}%
                </div>
              </div>
              <span style={{ fontSize: '24px' }}>⚡</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Sources & Model Info */}
      {metrics && (
        <div className="card" style={{ padding: '16px', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>🔬 Model Information</h4>
            <span className="chip success">Active Learning</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>Data Sources:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {metrics.data_sources.map((source, index) => (
                  <span key={index} className="chip" style={{ fontSize: '10px' }}>
                    {source}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>Prediction Features:</div>
              <div style={{ color: 'var(--muted)', lineHeight: '1.4' }}>
                Historical patterns, weather correlations, macroeconomic indicators, 
                social sentiment analysis, supply chain disruptions, geopolitical events
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
