import { useRef, useEffect, useState, useMemo } from 'react'

interface ChartDataPoint {
  timestamp: string
  price: number
  predicted?: number
  upper?: number
  lower?: number
  volume?: number
}

interface EnhancedChartProps {
  data: ChartDataPoint[]
  width?: number
  height?: number
  showPrediction?: boolean
  showVolume?: boolean
  interactive?: boolean
  title?: string
  yAxisLabel?: string
}

export default function EnhancedChart({
  data,
  width = 800,
  height = 400,
  showPrediction = false,
  showVolume = false,
  interactive = true,
  title = '',
  yAxisLabel = 'Price'
}: EnhancedChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: ChartDataPoint } | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)

  // Get theme-aware colors
  const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    return {
      gridColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(156, 163, 175, 0.2)',
      labelColor: isDark ? 'rgba(255,255,255,0.8)' : '#6B7280',
      titleColor: isDark ? '#e9edf1' : '#1F2937'
    }
  }

  const margins = { top: 40, right: 60, bottom: 60, left: 80 }
  const chartWidth = width - margins.left - margins.right
  const chartHeight = height - margins.top - margins.bottom

  const processedData = useMemo(() => {
    if (!data.length) return null

    const prices = data.map(d => d.price).filter(p => !isNaN(p))
    const predicted = data.map(d => d.predicted || 0).filter(p => p > 0)
    const volumes = data.map(d => d.volume || 0)

    const allValues = [...prices]
    if (showPrediction && predicted.length) {
      allValues.push(...predicted)
      if (data.some(d => d.upper)) allValues.push(...data.map(d => d.upper || 0))
      if (data.some(d => d.lower)) allValues.push(...data.map(d => d.lower || 0))
    }

    const minPrice = Math.min(...allValues) * 0.995
    const maxPrice = Math.max(...allValues) * 1.005
    const maxVolume = Math.max(...volumes)

    return {
      minPrice,
      maxPrice,
      maxVolume,
      priceRange: maxPrice - minPrice
    }
  }, [data, showPrediction])

  const getX = (index: number) => (index / (data.length - 1)) * chartWidth
  const getY = (value: number) => {
    if (!processedData) return 0
    return chartHeight - ((value - processedData.minPrice) / processedData.priceRange) * chartHeight
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !processedData || !data.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up high-DPI canvas
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const draw = (progress: number = 1) => {
      const colors = getThemeColors()
      
      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(margins.left, margins.top)

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, chartHeight)
      bgGradient.addColorStop(0, 'rgba(59, 130, 246, 0.02)')
      bgGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, chartWidth, chartHeight)

      // Grid lines
      ctx.strokeStyle = colors.gridColor
      ctx.lineWidth = 1
      
      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(chartWidth, y)
        ctx.stroke()
      }

      // Vertical grid lines
      for (let i = 0; i <= 6; i++) {
        const x = (chartWidth / 6) * i
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, chartHeight)
        ctx.stroke()
      }

      // Draw confidence bands first (if prediction is shown)
      if (showPrediction && data.some(d => d.upper && d.lower)) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.15)'
        ctx.beginPath()
        
        // Upper confidence line
        data.forEach((point, index) => {
          if (point.upper) {
            const x = getX(index) * progress
            const y = getY(point.upper)
            if (index === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
        })
        
        // Lower confidence line (reverse order)
        for (let i = data.length - 1; i >= 0; i--) {
          const point = data[i]
          if (point.lower) {
            const x = getX(i) * progress
            const y = getY(point.lower)
            ctx.lineTo(x, y)
          }
        }
        
        ctx.closePath()
        ctx.fill()
      }

      // Draw volume bars (if enabled)
      if (showVolume && processedData.maxVolume > 0) {
        const volumeHeight = chartHeight * 0.2
        ctx.fillStyle = 'rgba(156, 163, 175, 0.3)'
        
        data.forEach((point, index) => {
          if (point.volume && index < data.length * progress) {
            const x = getX(index)
            const barHeight = (point.volume / processedData.maxVolume) * volumeHeight
            const y = chartHeight - barHeight
            ctx.fillRect(x - 1, y, 2, barHeight)
          }
        })
      }

      // Draw predicted price line
      if (showPrediction) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        
        let hasStarted = false
        data.forEach((point, index) => {
          if (point.predicted && index < data.length * progress) {
            const x = getX(index)
            const y = getY(point.predicted)
            if (!hasStarted) {
              ctx.moveTo(x, y)
              hasStarted = true
            } else {
              ctx.lineTo(x, y)
            }
          }
        })
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw main price line with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight)
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)')

      // Area fill
      ctx.fillStyle = gradient
      ctx.beginPath()
      data.forEach((point, index) => {
        if (index < data.length * progress) {
          const x = getX(index)
          const y = getY(point.price)
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      })
      const lastPointIndex = Math.floor((data.length - 1) * progress)
      if (lastPointIndex >= 0) {
        ctx.lineTo(getX(lastPointIndex), chartHeight)
        ctx.lineTo(0, chartHeight)
      }
      ctx.closePath()
      ctx.fill()

      // Main price line
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      
      data.forEach((point, index) => {
        if (index < data.length * progress) {
          const x = getX(index)
          const y = getY(point.price)
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw data points
      data.forEach((point, index) => {
        if (index < data.length * progress) {
          const x = getX(index)
          const y = getY(point.price)
          
          // Point shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
          ctx.beginPath()
          ctx.arc(x + 1, y + 1, 4, 0, 2 * Math.PI)
          ctx.fill()
          
          // Main point
          ctx.fillStyle = '#3B82F6'
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, 2 * Math.PI)
          ctx.fill()
          
          // White border
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      })

      // Last point highlight
      if (data.length > 0 && progress >= 1) {
        const lastPoint = data[data.length - 1]
        const x = getX(data.length - 1)
        const y = getY(lastPoint.price)
        
        ctx.fillStyle = '#3B82F6'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()
        
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      ctx.restore()

      // Draw axes labels and values
      ctx.fillStyle = colors.labelColor
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'center'

      // Y-axis labels
      for (let i = 0; i <= 4; i++) {
        const value = processedData.minPrice + (processedData.priceRange / 4) * i
        const y = margins.top + chartHeight - (chartHeight / 4) * i
        ctx.textAlign = 'right'
        ctx.fillText(value.toFixed(2), margins.left - 10, y + 4)
      }

      // X-axis labels (time)
      const timeSteps = 6
      for (let i = 0; i <= timeSteps; i++) {
        if (data.length > 0) {
          const dataIndex = Math.floor((data.length - 1) * (i / timeSteps))
          if (data[dataIndex]) {
            const time = new Date(data[dataIndex].timestamp).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
            const x = margins.left + (chartWidth / timeSteps) * i
            ctx.textAlign = 'center'
            ctx.fillText(time, x, height - 20)
          }
        }
      }

      // Title
      if (title) {
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.fillStyle = colors.titleColor
        ctx.textAlign = 'center'
        ctx.fillText(title, width / 2, 25)
      }

      // Y-axis label
      if (yAxisLabel) {
        ctx.save()
        ctx.translate(20, height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.fillStyle = colors.labelColor
        ctx.textAlign = 'center'
        ctx.fillText(yAxisLabel, 0, 0)
        ctx.restore()
      }
    }

    if (isAnimating) {
      let progress = 0
      const animate = () => {
        progress += 0.02
        if (progress >= 1) {
          progress = 1
          setIsAnimating(false)
        }
        draw(progress)
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      animate()
    } else {
      draw(1)
    }
  }, [data, processedData, width, height, showPrediction, showVolume, title, yAxisLabel, isAnimating])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !processedData) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left - margins.left
    const y = event.clientY - rect.top - margins.top

    if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
      const dataIndex = Math.round((x / chartWidth) * (data.length - 1))
      if (dataIndex >= 0 && dataIndex < data.length) {
        setHoveredPoint({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          data: data[dataIndex]
        })
      }
    } else {
      setHoveredPoint(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: interactive ? 'crosshair' : 'default',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: hoveredPoint.x + 10,
            top: hoveredPoint.y - 10,
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: '120px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            {new Date(hoveredPoint.data.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div style={{ color: '#3B82F6' }}>
            Price: ${hoveredPoint.data.price.toFixed(4)}
          </div>
          {hoveredPoint.data.predicted && (
            <div style={{ color: '#F59E0B' }}>
              Predicted: ${hoveredPoint.data.predicted.toFixed(4)}
            </div>
          )}
          {hoveredPoint.data.volume && (
            <div style={{ color: '#6B7280' }}>
              Volume: {hoveredPoint.data.volume.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
