import { useRef, useEffect, useState, useCallback } from 'react'
import { useDisableRealTime, STATIC_FALLBACKS } from '../utils/disableRealTime'

interface RealTimeDataPoint {
  timestamp: number
  price: number
  volume?: number
  bid?: number
  ask?: number
}

interface RealTimeChartProps {
  width?: number
  height?: number
  maxDataPoints?: number
  updateInterval?: number
  title?: string
  instrument?: string
  showOrderBook?: boolean
}

export default function RealTimeChart({
  width = 800,
  height = 400,
  maxDataPoints = 200,
  updateInterval = 1000,
  title = 'Real-time Price Feed',
  instrument = 'EUR/USD',
  showOrderBook = false
}: RealTimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [data, setData] = useState<RealTimeDataPoint[]>([])
  const [isLive, setIsLive] = useState(true)
  const [currentPrice, setCurrentPrice] = useState(1.0850)
  const [priceChange, setPriceChange] = useState(0)
  const [volume24h, setVolume24h] = useState(0)

  // Get theme-aware colors
  const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    return {
      backgroundGradient: {
        start: isDark ? '#1a1d29' : '#f8fafc',
        end: isDark ? '#0f1114' : '#e2e8f0'
      },
      chartBackground: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      labelColor: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
      titleColor: isDark ? 'white' : '#1e293b'
    }
  }

  const margins = { top: 60, right: 120, bottom: 60, left: 80 }
  const chartWidth = width - margins.left - margins.right
  const chartHeight = height - margins.top - margins.bottom

  // Generate realistic price data
  const generateDataPoint = useCallback((prevPrice: number): RealTimeDataPoint => {
    const volatility = 0.0002
    const trend = (Math.random() - 0.5) * 0.0001
    const noise = (Math.random() - 0.5) * volatility
    const newPrice = prevPrice + trend + noise
    
    const spread = 0.0001 + Math.random() * 0.0001
    const bid = newPrice - spread / 2
    const ask = newPrice + spread / 2
    const volume = 50 + Math.random() * 200

    return {
      timestamp: Date.now(),
      price: Math.max(0.8, Math.min(1.5, newPrice)), // Keep within reasonable bounds
      volume,
      bid,
      ask
    }
  }, [])

  // Initialize data
  useEffect(() => {
    const initialData: RealTimeDataPoint[] = []
    let price = 1.0850
    const now = Date.now()

    for (let i = maxDataPoints; i > 0; i--) {
      const point = generateDataPoint(price)
      point.timestamp = now - i * 1000
      initialData.push(point)
      price = point.price
    }

    setData(initialData)
    setCurrentPrice(price)
  }, [maxDataPoints, generateDataPoint])

  // Real-time data updates - DISABLED to prevent constant resets
  const realTimeDisabled = useDisableRealTime()
  
  useEffect(() => {
    if (!isLive || realTimeDisabled) {
      // Use static data when real-time is disabled
      if (realTimeDisabled && data.length === 0) {
        setData(STATIC_FALLBACKS.chart.data)
        setCurrentPrice(75.46)
        setPriceChange(0.01)
      }
      return
    }

    // This code is now DISABLED by default
    console.warn('Real-time updates are disabled to prevent KPI resets')
    return
    
    // Old code commented out:
    // const interval = setInterval(() => {
    //   setData(prevData => {
    //     const lastPrice = prevData.length > 0 ? prevData[prevData.length - 1].price : currentPrice
    //     const newPoint = generateDataPoint(lastPrice)
    //     
    //     setCurrentPrice(newPoint.price)
    //     setPriceChange(newPoint.price - lastPrice)
    //     setVolume24h(prev => prev + (newPoint.volume || 0))
    //
    //     const newData = [...prevData, newPoint]
    //     return newData.slice(-maxDataPoints)
    //   })
    // }, Math.max(updateInterval, 3000))
    //
    // return () => clearInterval(interval)
  }, [isLive, updateInterval, maxDataPoints, generateDataPoint, currentPrice, realTimeDisabled])

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const prices = data.map(d => d.price)
    const volumes = data.map(d => d.volume || 0)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 0.001
    const maxVolume = Math.max(...volumes)

    const getX = (index: number) => margins.left + (index / (data.length - 1)) * chartWidth
    const getY = (price: number) => margins.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    const draw = () => {
      const colors = getThemeColors()
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, colors.backgroundGradient.start)
      bgGradient.addColorStop(1, colors.backgroundGradient.end)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Chart area
      ctx.fillStyle = colors.chartBackground
      ctx.fillRect(margins.left, margins.top, chartWidth, chartHeight)

      // Grid
      ctx.strokeStyle = colors.gridColor
      ctx.lineWidth = 1

      // Horizontal grid
      for (let i = 0; i <= 5; i++) {
        const y = margins.top + (chartHeight / 5) * i
        ctx.beginPath()
        ctx.moveTo(margins.left, y)
        ctx.lineTo(margins.left + chartWidth, y)
        ctx.stroke()
      }

      // Vertical grid
      for (let i = 0; i <= 10; i++) {
        const x = margins.left + (chartWidth / 10) * i
        ctx.beginPath()
        ctx.moveTo(x, margins.top)
        ctx.lineTo(x, margins.top + chartHeight)
        ctx.stroke()
      }

      // Volume bars
      if (maxVolume > 0) {
        ctx.fillStyle = 'rgba(100, 149, 237, 0.3)'
        data.forEach((point, index) => {
          if (point.volume) {
            const x = getX(index)
            const barHeight = (point.volume / maxVolume) * chartHeight * 0.2
            const y = margins.top + chartHeight - barHeight
            ctx.fillRect(x - 1, y, 2, barHeight)
          }
        })
      }

      // Price line with gradient
      const gradient = ctx.createLinearGradient(0, margins.top, 0, margins.top + chartHeight)
      gradient.addColorStop(0, 'rgba(100, 149, 237, 0.8)')
      gradient.addColorStop(1, 'rgba(100, 149, 237, 0.1)')

      // Area fill
      ctx.fillStyle = gradient
      ctx.beginPath()
      data.forEach((point, index) => {
        const x = getX(index)
        const y = getY(point.price)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(getX(data.length - 1), margins.top + chartHeight)
      ctx.lineTo(getX(0), margins.top + chartHeight)
      ctx.closePath()
      ctx.fill()

      // Price line
      ctx.strokeStyle = '#6495ED'
      ctx.lineWidth = 2
      ctx.beginPath()
      data.forEach((point, index) => {
        const x = getX(index)
        const y = getY(point.price)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Moving average (simple 20-period)
      if (data.length >= 20) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        
        for (let i = 19; i < data.length; i++) {
          const ma = data.slice(i - 19, i + 1).reduce((sum, d) => sum + d.price, 0) / 20
          const x = getX(i)
          const y = getY(ma)
          if (i === 19) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Current price indicator
      if (data.length > 0) {
        const lastPoint = data[data.length - 1]
        const x = getX(data.length - 1)
        const y = getY(lastPoint.price)

        // Pulse effect
        const time = Date.now() / 1000
        const pulseRadius = 6 + Math.sin(time * 4) * 2

        ctx.fillStyle = 'rgba(100, 149, 237, 0.3)'
        ctx.beginPath()
        ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI)
        ctx.fill()

        ctx.fillStyle = '#6495ED'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()

        // Price label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(margins.left + chartWidth + 5, y - 12, 80, 24)
        
        ctx.fillStyle = 'white'
        ctx.font = '12px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(lastPoint.price.toFixed(5), margins.left + chartWidth + 10, y + 4)
      }

      // Y-axis labels
      ctx.fillStyle = colors.labelColor
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'right'
      
      for (let i = 0; i <= 5; i++) {
        const price = minPrice + (priceRange / 5) * i
        const y = margins.top + chartHeight - (chartHeight / 5) * i
        ctx.fillText(price.toFixed(5), margins.left - 10, y + 3)
      }

      // X-axis labels (time)
      ctx.textAlign = 'center'
      const timeSteps = 5
      for (let i = 0; i <= timeSteps; i++) {
        const dataIndex = Math.floor((data.length - 1) * (i / timeSteps))
        if (data[dataIndex]) {
          const time = new Date(data[dataIndex].timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
          const x = margins.left + (chartWidth / timeSteps) * i
          ctx.fillText(time, x, height - 15)
        }
      }

      // Title and stats
      ctx.fillStyle = colors.titleColor
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${title} - ${instrument}`, 20, 30)

      // Live indicator
      if (isLive) {
        ctx.fillStyle = '#059669'
        ctx.beginPath()
        ctx.arc(width - 30, 25, 6, 0, 2 * Math.PI)
        ctx.fill()
        
        ctx.fillStyle = colors.titleColor
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('LIVE', width - 45, 30)
      }

      // Current price and change
      ctx.font = 'bold 24px monospace'
      ctx.fillStyle = colors.titleColor
      ctx.textAlign = 'right'
      ctx.fillText(currentPrice.toFixed(5), width - 20, 65)
      
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillStyle = priceChange >= 0 ? '#059669' : '#b91c1c'
      const changeText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(5)} (${((priceChange / currentPrice) * 100).toFixed(3)}%)`
      ctx.fillText(changeText, width - 20, 85)

      if (isLive) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [data, width, height, title, instrument, isLive, currentPrice, priceChange])

  const toggleLive = () => {
    setIsLive(!isLive)
  }

  const resetData = () => {
    setData([])
    setCurrentPrice(1.0850)
    setPriceChange(0)
    setVolume24h(0)
  }

  return (
    <div style={{ 
      position: 'relative', 
      background: 'linear-gradient(145deg, #1a1d29 0%, #0f1114 100%)',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={toggleLive}
          style={{
            padding: '6px 12px',
            background: isLive ? '#b91c1c' : '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {isLive ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={resetData}
          style={{
            padding: '6px 12px',
            background: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Reset
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          background: 'transparent',
          borderRadius: '8px'
        }}
      />

      {/* Order Book (if enabled) */}
      {showOrderBook && data.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '150px',
          fontSize: '11px',
          color: 'white'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Order Book</div>
          {data.slice(-5).reverse().map((point, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#b91c1c' }}>
                {point.bid?.toFixed(5) || point.price.toFixed(5)}
              </span>
              <span style={{ color: '#059669' }}>
                {point.ask?.toFixed(5) || (point.price + 0.0001).toFixed(5)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '12px'
      }}>
        <div>Data Points: {data.length}</div>
        <div>24h Volume: {volume24h.toFixed(0)}</div>
        <div>Update Rate: {updateInterval}ms</div>
      </div>
    </div>
  )
}
