import { useMemo } from 'react'

interface ChartDataPoint {
  timestamp: string
  price: number
  volume?: number
  predicted?: number
  upper?: number
  lower?: number
}

interface SimpleChartProps {
  data: ChartDataPoint[]
  height?: number
  title?: string
  showPrediction?: boolean
  className?: string
}

export default function SimpleChart({
  data,
  height = 300,
  title,
  showPrediction = false,
  className = ''
}: SimpleChartProps) {
  
  const processedData = useMemo(() => {
    if (!data.length) return null

    const prices = data.map(d => d.price)
    const predicted = data.map(d => d.predicted || 0).filter(p => p > 0)
    
    const allPrices = [...prices, ...predicted]
    const minPrice = Math.min(...allPrices) * 0.999
    const maxPrice = Math.max(...allPrices) * 1.001
    const priceRange = maxPrice - minPrice

    return {
      minPrice,
      maxPrice,
      priceRange,
      currentPrice: prices[prices.length - 1],
      change: prices[prices.length - 1] - prices[0],
      changePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    }
  }, [data])

  if (!processedData || !data.length) {
    return (
      <div className={`card ${className}`} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div>No data available</div>
        </div>
      </div>
    )
  }

  const width = 100 // percentage
  const svgHeight = height - 80 // Reserve space for title and labels

  const getX = (index: number) => (index / (data.length - 1)) * 100
  const getY = (price: number) => ((processedData.maxPrice - price) / processedData.priceRange) * 100

  // Create path for main price line
  const pricePath = data.map((point, index) => {
    const x = getX(index)
    const y = getY(point.price)
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Create path for predicted line
  const predictedPath = showPrediction ? data
    .filter(point => point.predicted)
    .map((point, index, filteredData) => {
      const originalIndex = data.indexOf(point)
      const x = getX(originalIndex)
      const y = getY(point.predicted!)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ') : ''

  // Create confidence band area
  const confidencePath = showPrediction && data.some(d => d.upper && d.lower) ? 
    (() => {
      const upperPath = data.filter(d => d.upper).map((point, index, filteredData) => {
        const originalIndex = data.indexOf(point)
        const x = getX(originalIndex)
        const y = getY(point.upper!)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      }).join(' ')
      
      const lowerPath = data.filter(d => d.lower).reverse().map((point, index, filteredData) => {
        const originalIndex = data.indexOf(point)
        const x = getX(originalIndex)
        const y = getY(point.lower!)
        return `L ${x} ${y}`
      }).join(' ')
      
      return `${upperPath} ${lowerPath} Z`
    })() : ''

  const isPositive = processedData.change >= 0
  const primaryColor = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div className={`card ${className}`} style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 20px 0 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start' 
      }}>
        <div>
          {title && (
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: 'var(--text)'
            }}>
              {title}
            </h3>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: 'var(--text)'
            }}>
              {processedData.currentPrice.toFixed(4)}
            </span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              color: primaryColor
            }}>
              {isPositive ? '+' : ''}{processedData.change.toFixed(4)} ({isPositive ? '+' : ''}{processedData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted)' }}>
          {data.length > 0 && (
            <div>
              {new Date(data[data.length - 1].timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, padding: '10px 20px 20px 20px', position: 'relative' }}>
        <svg 
          width="100%" 
          height={svgHeight} 
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g stroke="var(--border)" strokeWidth="0.1" opacity="0.5">
            {[25, 50, 75].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} />
            ))}
          </g>

          {/* Confidence band */}
          {showPrediction && confidencePath && (
            <path
              d={confidencePath}
              fill="url(#confidenceGradient)"
              stroke="none"
            />
          )}

          {/* Area under main line */}
          {pricePath && (
            <path
              d={`${pricePath} L 100 100 L 0 100 Z`}
              fill="url(#priceGradient)"
              stroke="none"
            />
          )}

          {/* Predicted line */}
          {showPrediction && predictedPath && (
            <path
              d={predictedPath}
              fill="none"
              stroke="#6366F1"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Main price line */}
          {pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke={primaryColor}
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* End point */}
          {data.length > 0 && (
            <circle
              cx={getX(data.length - 1)}
              cy={getY(processedData.currentPrice)}
              r="1"
              fill={primaryColor}
              stroke="var(--bg)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Y-axis labels */}
        <div style={{ 
          position: 'absolute', 
          right: '0', 
          top: '10px', 
          height: `${svgHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--muted)'
        }}>
          <div>{processedData.maxPrice.toFixed(4)}</div>
          <div>{((processedData.maxPrice + processedData.minPrice) / 2).toFixed(4)}</div>
          <div>{processedData.minPrice.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )
}
