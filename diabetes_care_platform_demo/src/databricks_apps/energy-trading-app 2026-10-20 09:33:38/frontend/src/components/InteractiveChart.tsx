import { useRef, useEffect, useState, useCallback } from 'react'

interface DataPoint {
  timestamp: string
  price: number
  volume?: number
  predicted?: number
  upper?: number
  lower?: number
}

interface InteractiveChartProps {
  data: DataPoint[]
  width?: number
  height?: number
  title?: string
  showControls?: boolean
}

export default function InteractiveChart({
  data,
  width = 900,
  height = 500,
  title = 'Interactive Chart',
  showControls = true
}: InteractiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D')

  // Get theme-aware colors
  const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    return {
      background: isDark ? '#1a1d24' : '#FAFAFA',
      chartBackground: isDark ? '#0b0c10' : 'white',
      gridColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
      labelColor: isDark ? 'rgba(255,255,255,0.8)' : '#374151',
      titleColor: isDark ? '#e9edf1' : '#111827'
    }
  }

  const margins = { top: 50, right: 80, bottom: 70, left: 90 }
  const chartWidth = width - margins.left - margins.right
  const chartHeight = height - margins.top - margins.bottom

  const resetView = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 10))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.1))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices) * 0.995
    const maxPrice = Math.max(...prices) * 1.005
    const priceRange = maxPrice - minPrice

    const getX = (index: number) => {
      const baseX = (index / (data.length - 1)) * chartWidth
      return margins.left + (baseX + panX) * zoom
    }

    const getY = (value: number) => {
      const baseY = chartHeight - ((value - minPrice) / priceRange) * chartHeight
      return margins.top + (baseY + panY) * zoom
    }

    const colors = getThemeColors()

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, width, height)

    // Chart area background
    ctx.fillStyle = colors.chartBackground
    ctx.fillRect(margins.left, margins.top, chartWidth, chartHeight)

    // Clip chart area
    ctx.save()
    ctx.beginPath()
    ctx.rect(margins.left, margins.top, chartWidth, chartHeight)
    ctx.clip()

    // Grid lines
    ctx.strokeStyle = colors.gridColor
    ctx.lineWidth = 1

    // Horizontal grid
    for (let i = 0; i <= 10; i++) {
      const y = margins.top + (chartHeight / 10) * i
      if (y >= margins.top && y <= margins.top + chartHeight) {
        ctx.beginPath()
        ctx.moveTo(margins.left, y)
        ctx.lineTo(margins.left + chartWidth, y)
        ctx.stroke()
      }
    }

    // Vertical grid
    for (let i = 0; i <= 20; i++) {
      const x = margins.left + (chartWidth / 20) * i
      if (x >= margins.left && x <= margins.left + chartWidth) {
        ctx.beginPath()
        ctx.moveTo(x, margins.top)
        ctx.lineTo(x, margins.top + chartHeight)
        ctx.stroke()
      }
    }

    // Volume bars (background)
    if (data.some(d => d.volume)) {
      const maxVolume = Math.max(...data.map(d => d.volume || 0))
      ctx.fillStyle = 'rgba(156, 163, 175, 0.2)'
      
      data.forEach((point, index) => {
        if (point.volume) {
          const x = getX(index)
          const barHeight = (point.volume / maxVolume) * chartHeight * 0.3
          const y = margins.top + chartHeight - barHeight
          
          if (x >= margins.left - 5 && x <= margins.left + chartWidth + 5) {
            ctx.fillRect(x - 1, y, 2, barHeight)
          }
        }
      })
    }

    // Confidence bands
    if (data.some(d => d.upper && d.lower)) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.beginPath()
      
      // Upper line
      data.forEach((point, index) => {
        if (point.upper) {
          const x = getX(index)
          const y = getY(point.upper)
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      })
      
      // Lower line (reverse)
      for (let i = data.length - 1; i >= 0; i--) {
        const point = data[i]
        if (point.lower) {
          const x = getX(i)
          const y = getY(point.lower)
          ctx.lineTo(x, y)
        }
      }
      
      ctx.closePath()
      ctx.fill()
    }

    // Predicted line
    if (data.some(d => d.predicted)) {
      ctx.strokeStyle = '#F59E0B'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      
      let started = false
      data.forEach((point, index) => {
        if (point.predicted) {
          const x = getX(index)
          const y = getY(point.predicted)
          
          if (x >= margins.left - 10 && x <= margins.left + chartWidth + 10) {
            if (!started) {
              ctx.moveTo(x, y)
              started = true
            } else {
              ctx.lineTo(x, y)
            }
          }
        }
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Main price line with gradient
    const gradient = ctx.createLinearGradient(0, margins.top, 0, margins.top + chartHeight)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)')

    // Area fill
    ctx.fillStyle = gradient
    ctx.beginPath()
    let firstPoint = true
    data.forEach((point, index) => {
      const x = getX(index)
      const y = getY(point.price)
      
      if (x >= margins.left - 10 && x <= margins.left + chartWidth + 10) {
        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      }
    })
    
    // Close area
    const lastVisibleIndex = data.length - 1
    if (lastVisibleIndex >= 0) {
      ctx.lineTo(getX(lastVisibleIndex), margins.top + chartHeight)
      ctx.lineTo(getX(0), margins.top + chartHeight)
    }
    ctx.closePath()
    ctx.fill()

    // Main price line
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    
    firstPoint = true
    data.forEach((point, index) => {
      const x = getX(index)
      const y = getY(point.price)
      
      if (x >= margins.left - 10 && x <= margins.left + chartWidth + 10) {
        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      }
    })
    ctx.stroke()

    // Data points
    ctx.fillStyle = '#3B82F6'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    
    data.forEach((point, index) => {
      const x = getX(index)
      const y = getY(point.price)
      
      if (x >= margins.left - 5 && x <= margins.left + chartWidth + 5) {
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      }
    })

    ctx.restore()

    // Axes and labels
    ctx.fillStyle = colors.labelColor
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minPrice + (priceRange / 5) * i
      const y = margins.top + chartHeight - (chartHeight / 5) * i
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(2), margins.left - 10, y + 4)
    }

    // X-axis labels
    const timeSteps = 8
    for (let i = 0; i <= timeSteps; i++) {
      const dataIndex = Math.floor((data.length - 1) * (i / timeSteps))
      if (data[dataIndex]) {
        const time = new Date(data[dataIndex].timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const x = margins.left + (chartWidth / timeSteps) * i
        ctx.textAlign = 'center'
        ctx.fillText(time, x, height - 20)
      }
    }

    // Title
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle = colors.titleColor
    ctx.textAlign = 'center'
    ctx.fillText(title, width / 2, 25)

    // Zoom indicator
    if (zoom !== 1) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillStyle = '#6B7280'
      ctx.textAlign = 'left'
      ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 20, height - 20)
    }

  }, [data, zoom, panX, panY, width, height, title])

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true)
    setLastMousePos({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = event.clientX - lastMousePos.x
      const deltaY = event.clientY - lastMousePos.y
      
      setPanX(prev => prev + deltaX / zoom)
      setPanY(prev => prev + deltaY / zoom)
      setLastMousePos({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)))
  }

  return (
    <div style={{ position: 'relative', background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      {/* Controls */}
      {showControls && (
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          display: 'flex', 
          gap: '8px',
          zIndex: 10
        }}>
          <button
            onClick={zoomIn}
            style={{
              padding: '6px 12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Zoom In
          </button>
          <button
            onClick={zoomOut}
            style={{
              padding: '6px 12px',
              background: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Zoom Out
          </button>
          <button
            onClick={resetView}
            style={{
              padding: '6px 12px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Timeframe selector */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px',
        display: 'flex',
        gap: '4px',
        zIndex: 10
      }}>
        {['1H', '4H', '1D', '1W', '1M'].map(tf => (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            style={{
              padding: '4px 8px',
              background: selectedTimeframe === tf ? '#3B82F6' : '#F3F4F6',
              color: selectedTimeframe === tf ? 'white' : '#374151',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'block'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '20px',
        fontSize: '11px',
        color: '#6B7280'
      }}>
        Drag to pan • Scroll to zoom • Click timeframe to filter
      </div>
    </div>
  )
}
