import { useState, useEffect, useMemo } from 'react'
import TimeframeFilter, { Timeframe } from './TimeframeFilter'
import Sparkline from './Sparkline'
import LiveIndicator from './LiveIndicator'

interface ChartData {
  timestamp: string
  price: number
  volume?: number
  predicted?: number
  upper?: number
  lower?: number
}

interface AdvancedChartProps {
  data: ChartData[]
  title: string
  instrument: string
  className?: string
  showPrediction?: boolean
}

export default function AdvancedChart({ data, title, instrument, className = '', showPrediction = false }: AdvancedChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [livePrice, setLivePrice] = useState(data[data.length - 1]?.price || 0)

  // Simuler les prix en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice(prev => {
        const change = (Math.random() - 0.5) * 0.002
        return Math.max(0.001, prev + change)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Filtrer les données selon la période sélectionnée
  const filteredData = useMemo(() => {
    const now = new Date()
    let startDate = new Date()

    switch (timeframe) {
      case '1D':
        startDate.setDate(now.getDate() - 1)
        break
      case '1W':
        startDate.setDate(now.getDate() - 7)
        break
      case '1M':
        startDate.setMonth(now.getMonth() - 1)
        break
      case '3M':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6M':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case '5Y':
        startDate.setFullYear(now.getFullYear() - 5)
        break
    }

    return data.filter(d => new Date(d.timestamp) >= startDate)
  }, [data, timeframe])

  const chartStats = useMemo(() => {
    if (filteredData.length === 0) return { change: 0, changePercent: 0, high: 0, low: 0, volume: 0 }

    const prices = filteredData.map(d => d.price)
    const firstPrice = prices[0]
    const lastPrice = livePrice
    const change = lastPrice - firstPrice
    const changePercent = (change / firstPrice) * 100
    const high = Math.max(...prices, livePrice)
    const low = Math.min(...prices, livePrice)
    const volume = filteredData.reduce((sum, d) => sum + (d.volume || 0), 0)

    return { change, changePercent, high, low, volume }
  }, [filteredData, livePrice])

  const getChangeColor = (change: number) => {
    if (change > 0) return 'var(--success)'
    if (change < 0) return 'var(--danger)'
    return 'var(--muted)'
  }

  return (
    <div className={`advanced-chart card ${className}`}>
      <div className="chart-header">
        <div className="chart-title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 className="chart-title">{title}</h3>
            <LiveIndicator />
          </div>
          <div className="chart-subtitle">{instrument}</div>
        </div>
        <TimeframeFilter value={timeframe} onChange={setTimeframe} />
      </div>

      <div className="chart-price-section">
        <div className="live-price">
          <span className="price-value">{livePrice.toFixed(4)}</span>
          <div className="price-change" style={{ color: getChangeColor(chartStats.change) }}>
            {chartStats.change >= 0 ? '+' : ''}{chartStats.change.toFixed(4)} 
            ({chartStats.changePercent >= 0 ? '+' : ''}{chartStats.changePercent.toFixed(2)}%)
          </div>
        </div>
        
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">High</span>
            <span className="stat-value">{chartStats.high.toFixed(4)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Low</span>
            <span className="stat-value">{chartStats.low.toFixed(4)}</span>
          </div>
          {chartStats.volume > 0 && (
            <div className="stat-item">
              <span className="stat-label">Volume</span>
              <span className="stat-value">{chartStats.volume.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="chart-container">
        {showPrediction ? (
          <div style={{ position: 'relative', height: '200px' }}>
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              fontSize: '11px',
              background: 'var(--card-bg)',
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '2px', background: 'var(--primary)' }}></div>
                <span>Actual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '2px', background: 'var(--warning)', borderStyle: 'dashed' }}></div>
                <span>Predicted</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '2px', background: 'var(--muted)', opacity: 0.5 }}></div>
                <span>Confidence</span>
              </div>
            </div>
            <Sparkline 
              data={[...filteredData.map(d => d.price), livePrice]} 
              color={getChangeColor(chartStats.change)}
            />
          </div>
        ) : (
          <Sparkline 
            data={[...filteredData.map(d => d.price), livePrice]} 
            color={getChangeColor(chartStats.change)}
          />
        )}
      </div>

      <div className="chart-footer">
        <div className="timeframe-info">
          Period: {timeframe} • {filteredData.length} data points
        </div>
        <div className="last-update">
          Last update: {new Date().toLocaleTimeString('en-US')}
        </div>
      </div>
    </div>
  )
}
