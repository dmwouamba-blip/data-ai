import { useMemo } from 'react'

type Props = { 
  data: number[]
  width?: number
  height?: number
  color?: string
  simple?: boolean
}

export default function Sparkline({ 
  data, 
  width = 100, 
  height = 24, 
  color = '#3B82F6',
  simple = true
}: Props) {
  
  const chartData = useMemo(() => {
    if (!data.length) return null
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min
    const dx = width / (data.length - 1)
    
    const scaleY = (v: number) => {
      if (range === 0) return height / 2
      return height - ((v - min) / range) * height
    }
    
    const points = data.map((v, i) => `${i * dx},${scaleY(v)}`).join(' ')
    
    // Area path for gradient fill
    const areaPath = data.length > 1 ? 
      `M0,${scaleY(data[0])} ${data.map((v, i) => `L${i * dx},${scaleY(v)}`).join(' ')} L${width},${height} L0,${height} Z` :
      ''
    
    return { points, areaPath, isPositive: data[data.length - 1] >= data[0] }
  }, [data, width, height])

  if (!chartData) return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '60%', height: '1px', background: 'var(--border)' }} />
    </div>
  )

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`
  const finalColor = color || (chartData.isPositive ? '#22c55e' : '#ef4444')

  return (
    <div style={{ display: 'inline-block', width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={finalColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={finalColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        {!simple && chartData.areaPath && (
          <path 
            d={chartData.areaPath}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        )}
        
        {/* Main line */}
        <polyline
          fill="none"
          stroke={finalColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={chartData.points}
          style={{
            transition: 'stroke 0.3s ease'
          }}
        />
        
        {/* End point */}
        {data.length > 0 && (
          <circle
            cx={width - width / (data.length - 1) * 0}
            cy={height - ((data[data.length - 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data))) * height}
            r="2"
            fill={finalColor}
            stroke="var(--bg)"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  )
}

