import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'
import StaticKPI from '../components/StaticKPI'
import { TRADING_KPIS } from '../utils/staticKPIs'
import SearchBar from '../components/SearchBar'
import Sparkline from '../components/Sparkline'
import SimpleChart from '../components/SimpleChart'
import OrderSimulator, { Order } from '../components/OrderSimulator'
import TradingNotifications from '../components/TradingNotifications'
import PriceForecastingPanel from '../components/PriceForecastingPanel'
import PatternRecognitionPanel from '../components/PatternRecognitionPanel'
import WhatIfAnalysisPanel from '../components/WhatIfAnalysisPanel'
import MarketMicrostructurePanel from '../components/MarketMicrostructurePanel'
import TradingCockpitDashboard from '../components/TradingCockpitDashboard'
import TradingActivityTable from '../components/TradingActivityTable'
import PerformantPageWrapper from '../components/PerformantPageWrapper'
import { debounce } from '../services/performanceOptimizer'
import { IconOil, IconGas, IconPower, IconShipping, IconRefining, IconStorage } from '../components/Icons'
import AdvancedChart from '../components/AdvancedChart'
import ParameterImpactSimulator from '../components/ParameterImpactSimulator'
import LiveMarketControls from '../components/LiveMarketControls'
import TimeframeFilter, { Timeframe } from '../components/TimeframeFilter'

type Market = 'Oil' | 'Gas' | 'Power' | 'Shipping' | 'Refining' | 'Storage'
type Mode = 'analysis' | 'import' | 'expert'
type TimeZoom = 'Y'|'H1'|'H2'|'Q1'|'Q2'|'Q3'|'Q4'|'M'|'W'|'D'|'INTRADAY'

interface Trade {
  trade_id: string
  instrument: string
  counterparty: string
  side: string
  quantity: number
  price: number
  currency: string
  trade_date: string
  settle_date?: string
}

interface Position {
  id: string
  instrument: string
  market: Market
  side: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  parameters: MarketParameters
  openTime: number
  status: 'OPEN' | 'CLOSED'
}

interface MarketParameters {
  // Common parameters
  leverage: number
  slippage: number
  hedgeRatio: number
  
  // Oil & Gas specific
  supplyDemandIndex?: number
  geopoliticalRisk?: number
  benchmarkSpread?: number
  inventoryLevel?: number
  
  // Gas specific
  weatherForecast?: number
  storageInjectionRate?: number
  lngExportVolume?: number
  
  // Power specific
  demandForecast?: number
  renewableShare?: number
  gridReliability?: number
  carbonPrice?: number
  
  // Shipping specific
  fleetUtilization?: number
  bunkerCost?: number
  portCongestion?: number
  freightRates?: number
  
  // Refining specific
  crackSpread?: number
  utilizationRate?: number
  feedstockFlexibility?: number
  productSlate?: string
  
  // Storage specific
  storageUtilization?: number
  arbitrageSpread?: number
  capacityConstraints?: number
  seasonalTrends?: number
}

interface ChartData {
  timestamp: string
  price: number
  volume?: number
}

type Series = { name: string; color: string; values: { t: number; v: number }[] }

const MARKET_INSTRUMENTS: Record<Market, string[]> = {
  Oil: ['Brent ICE', 'WTI NYMEX', 'Dubai', 'Urals', 'Maya', 'ANS'],
  Gas: ['Henry Hub', 'TTF Dutch', 'NBP UK', 'JKM LNG', 'Algerian Pipeline'],
  Power: ['German Baseload', 'UK N2EX', 'PJM RT', 'ERCOT', 'Nordic Systempris'],
  Shipping: ['Baltic Dry Index', 'Capesize TC4', 'Panamax TC14', 'VLCC TD3C', 'Suezmax TD6'],
  Refining: ['3-2-1 Crack WTI', 'Gasoline RBOB', 'Diesel ULSD', 'Jet Fuel', 'Naphtha'],
  Storage: ['Cushing WTI', 'ARA Gasoil', 'Singapore Fuel Oil', 'US Gas Storage', 'EU Gas Storage']
}

const MARKET_ICONS: Record<Market, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Oil: IconOil,
  Gas: IconGas,
  Power: IconPower,
  Shipping: IconShipping,
  Refining: IconRefining,
  Storage: IconStorage
}

const COLORS = ['#5b9cff', '#21c07a', '#f59e0b', '#a78bfa', '#ff6b6b', '#38bdf8']

function useRealtimeMock(instrument: string, start: number, timeframe?: Timeframe) {
  const [series, setSeries] = useState<Series>({ name: instrument, color: COLORS[Math.floor(Math.random()*COLORS.length)], values: [] })
  const speedRef = useRef(2000) // Reduced frequency from 800ms to 2000ms for better performance
  const volRef = useRef(0.8)
  const running = useRef(true)
  
  useEffect(() => {
    // Reset series when instrument or timeframe changes
    setSeries({ name: instrument, color: COLORS[Math.floor(Math.random()*COLORS.length)], values: [] })
    running.current = true
    
    // Market-specific base prices
    const basePrices: Record<string, number> = {
      'Brent ICE': 85, 'WTI NYMEX': 82, 'Dubai': 83, 'Urals': 75, 'Maya': 70, 'ANS': 88,
      'Henry Hub': 3.2, 'TTF Dutch': 28, 'NBP UK': 95, 'JKM LNG': 12, 'Algerian Pipeline': 25,
      'German Baseload': 120, 'UK N2EX': 180, 'PJM RT': 45, 'ERCOT': 40, 'Nordic Systempris': 65,
      'Baltic Dry Index': 1850, 'Capesize TC4': 15000, 'Panamax TC14': 12000, 'VLCC TD3C': 45000, 'Suezmax TD6': 35000,
      '3-2-1 Crack WTI': 18, 'Gasoline RBOB': 2.45, 'Diesel ULSD': 2.85, 'Jet Fuel': 2.65, 'Naphtha': 720,
      'Cushing WTI': 420000, 'ARA Gasoil': 3200000, 'Singapore Fuel Oil': 8500000, 'US Gas Storage': 3200, 'EU Gas Storage': 875
    }
    const base = basePrices[instrument] || 100
    
    // Generate historical data based on timeframe
    const generateHistoricalData = () => {
      const now = Date.now()
      const data: { t: number; v: number }[] = []
      let startTime = now
      let interval = 10 * 1000 // 10 seconds default
      let dataPoints = 200
      
      // Adjust based on timeframe
      switch (timeframe) {
        case '1D':
          startTime = now - 24 * 60 * 60 * 1000
          interval = 5 * 60 * 1000 // 5 minutes
          dataPoints = 288 // 24h / 5min
          break
        case '1W':
          startTime = now - 7 * 24 * 60 * 60 * 1000
          interval = 30 * 60 * 1000 // 30 minutes
          dataPoints = 336 // 7d / 30min
          break
        case '1M':
          startTime = now - 30 * 24 * 60 * 60 * 1000
          interval = 4 * 60 * 60 * 1000 // 4 hours
          dataPoints = 180 // 30d / 4h
          break
        case '3M':
          startTime = now - 90 * 24 * 60 * 60 * 1000
          interval = 12 * 60 * 60 * 1000 // 12 hours
          dataPoints = 180 // 90d / 12h
          break
        case '6M':
          startTime = now - 180 * 24 * 60 * 60 * 1000
          interval = 24 * 60 * 60 * 1000 // 1 day
          dataPoints = 180 // 180d / 1d
          break
        case '1Y':
          startTime = now - 365 * 24 * 60 * 60 * 1000
          interval = 2 * 24 * 60 * 60 * 1000 // 2 days
          dataPoints = 182 // 365d / 2d
          break
        case '5Y':
          startTime = now - 5 * 365 * 24 * 60 * 60 * 1000
          interval = 7 * 24 * 60 * 60 * 1000 // 1 week
          dataPoints = 260 // 5y / 1w
          break
        default:
          startTime = now - 24 * 60 * 60 * 1000
          interval = 5 * 60 * 1000
          dataPoints = 288
      }
      
      // Generate realistic market evolution
      let price = base * (0.7 + Math.random() * 0.6) // Start with some variation from base
      const timeStep = (now - startTime) / dataPoints
      
      for (let i = 0; i < dataPoints; i++) {
        const t = startTime + i * timeStep
        const timeProgress = i / dataPoints
        
        // Add trends, seasonality, and volatility based on timeframe
        const seasonality = Math.sin((t / (1000*60*60*24*365)) * 2 * Math.PI) * 0.1
        const longTermTrend = timeframe === '5Y' ? (timeProgress - 0.5) * 0.3 : (timeProgress - 0.5) * 0.1
        const volatility = timeframe === '1D' ? 0.005 : timeframe === '5Y' ? 0.02 : 0.01
        
        // Market-specific behavior
        let marketFactor = 0
        if (instrument.includes('Oil') || instrument.includes('Brent') || instrument.includes('WTI')) {
          marketFactor = Math.sin(timeProgress * Math.PI * 3) * 0.15 // Oil volatility cycles
        } else if (instrument.includes('Gas') || instrument.includes('LNG')) {
          marketFactor = Math.sin((t / (1000*60*60*24*90)) * 2 * Math.PI) * 0.2 // Seasonal gas patterns
        }
        
        const change = (Math.random() - 0.5) * volatility + seasonality * 0.02 + longTermTrend * 0.001 + marketFactor * 0.005
        price = Math.max(price * 0.1, price * (1 + change)) // Prevent negative prices
        
        data.push({ t, v: price })
      }
      
      return data
    }
    
    // Set initial historical data
    const historicalData = generateHistoricalData()
    setSeries(s => ({ ...s, values: historicalData }))
    
    // Continue with real-time updates
    let currentPrice = historicalData[historicalData.length - 1]?.v || base
    let currentTime = Date.now()
    
    const seasonality = (t: number) => Math.sin((t / (1000*60*60*24*365)) * 2 * Math.PI) * 0.15
    const id = setInterval(() => {
      if (!running.current) return
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        currentTime += 30 * 1000 // Reduced frequency: 30s instead of 10s
        const seasonal = seasonality(currentTime)
        const drift = (Math.random()-0.5) * 0.01 + seasonal * 0.005
        const shock = (Math.random()-0.5) * volRef.current * 0.02
        currentPrice = Math.max(0.01, currentPrice * (1 + drift) + shock)
        
        setSeries(s => ({ 
          ...s, 
          values: [...s.values.slice(-1000), { t: currentTime, v: currentPrice }] // Reduced from 2000 to 1000 points
        }))
      })
    }, speedRef.current)
    
    return () => { running.current = false; clearInterval(id) }
  }, [instrument, timeframe]) // Add timeframe to dependencies
  
  return { series, setSpeed: (ms: number) => { speedRef.current = ms }, setVol: (v: number) => { volRef.current = v } }
}

function RealtimeChart({ series, range, overlays, timeframe }: { series: Series[]; range: TimeZoom; overlays: Series[]; timeframe?: Timeframe }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selection, setSelection] = useState<{x1: number; y1: number; x2: number; y2: number} | null>(null)
  const [zoomBounds, setZoomBounds] = useState<{minT: number; maxT: number; minV: number; maxV: number} | null>(null)
  const mouseDown = useRef(false)
  const dims = { w: 1200, h: 450, pad: 60 }
  
  // Get theme-aware colors
  const getThemeColors = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    return {
      axisColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      labelColor: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
      tickColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
      background: isDark ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.8)'
    }
  }
  const all = [...series, ...overlays]
  
  // Filter data based on timeframe
  const filteredSeries = useMemo(() => {
    if (!timeframe) return all
    
    const now = Date.now()
    let startTime = now
    
    switch (timeframe) {
      case '1D':
        startTime = now - 24 * 60 * 60 * 1000
        break
      case '1W':
        startTime = now - 7 * 24 * 60 * 60 * 1000
        break
      case '1M':
        startTime = now - 30 * 24 * 60 * 60 * 1000
        break
      case '3M':
        startTime = now - 90 * 24 * 60 * 60 * 1000
        break
      case '6M':
        startTime = now - 180 * 24 * 60 * 60 * 1000
        break
      case '1Y':
        startTime = now - 365 * 24 * 60 * 60 * 1000
        break
      case '5Y':
        startTime = now - 5 * 365 * 24 * 60 * 60 * 1000
        break
      default:
        return all
    }
    
    return all.map(s => ({
      ...s,
      values: s.values.filter(v => v.t >= startTime)
    }))
  }, [all, timeframe])
  
  const values = filteredSeries.flatMap(s => s.values)
  
  const globalMinT = useMemo(() => values.length > 0 ? Math.min(...values.map(p => p.t)) : Date.now() - 3600000, [values])
  const globalMaxT = useMemo(() => values.length > 0 ? Math.max(...values.map(p => p.t)) : Date.now(), [values])
  const globalMinV = useMemo(() => values.length > 0 ? Math.min(...values.map(p => p.v)) : 0, [values])
  const globalMaxV = useMemo(() => values.length > 0 ? Math.max(...values.map(p => p.v)) : 100, [values])
  
  const minT = zoomBounds?.minT || globalMinT
  const maxT = zoomBounds?.maxT || globalMaxT
  const minV = zoomBounds?.minV || (globalMinV - (globalMaxV - globalMinV) * 0.1)
  const maxV = zoomBounds?.maxV || (globalMaxV + (globalMaxV - globalMinV) * 0.1)

  const xScale = (t: number) => dims.pad + ((t - minT) / Math.max(1, (maxT - minT))) * (dims.w - 2*dims.pad)
  const yScale = (v: number) => dims.h - dims.pad - ((v - minV) / Math.max(1e-6, (maxV - minV))) * (dims.h - 2*dims.pad)
  const xInverse = (x: number) => minT + ((x - dims.pad) / (dims.w - 2*dims.pad)) * (maxT - minT)
  const yInverse = (y: number) => minV + ((dims.h - dims.pad - y) / (dims.h - 2*dims.pad)) * (maxV - minV)

  const formatTime = (t: number) => {
    const date = new Date(t)
    if (timeframe === '1D') {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    } else if (timeframe === '1W') {
      return date.toLocaleDateString([], {weekday: 'short', day: 'numeric'})
    } else if (timeframe === '1M' || timeframe === '3M') {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'})
    } else if (timeframe === '6M' || timeframe === '1Y') {
      return date.toLocaleDateString([], {year: '2-digit', month: 'short'})
    } else if (timeframe === '5Y') {
      return date.toLocaleDateString([], {year: 'numeric'})
    } else {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'})
    }
  }
  
  const formatPrice = (v: number) => {
    if (v < 1) return v.toFixed(4)
    if (v < 10) return v.toFixed(3)
    if (v < 1000) return v.toFixed(2)
    return Math.round(v).toLocaleString()
  }

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = dims.w * dpr; c.height = dims.h * dpr; c.style.width = dims.w+'px'; c.style.height = dims.h+'px'
    const ctx = c.getContext('2d')!; ctx.scale(dpr, dpr)
    ctx.clearRect(0,0,dims.w,dims.h)
    
    const colors = getThemeColors()
    
    // Background
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, dims.w, dims.h)
    
    // Grid
    ctx.strokeStyle = colors.gridColor; ctx.lineWidth = 0.5
    const gridLines = 8
    for (let i = 1; i < gridLines; i++) {
      const x = dims.pad + (i/gridLines) * (dims.w - 2*dims.pad)
      const y = dims.pad + (i/gridLines) * (dims.h - 2*dims.pad)
      ctx.beginPath(); ctx.moveTo(x, dims.pad); ctx.lineTo(x, dims.h - dims.pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(dims.pad, y); ctx.lineTo(dims.w - dims.pad, y); ctx.stroke()
    }
    
    // Main axes
    ctx.strokeStyle = colors.axisColor; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(dims.pad, dims.h - dims.pad); ctx.lineTo(dims.w - dims.pad, dims.h - dims.pad); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(dims.pad, dims.pad); ctx.lineTo(dims.pad, dims.h - dims.pad); ctx.stroke()
    
    // Enhanced axis labels
    ctx.fillStyle = colors.labelColor; ctx.font = '12px ui-sans-serif, system-ui'
    ctx.textAlign = 'center'
    
    // X-axis (time) labels - more intelligent spacing
    const timeLabels = 6
    for (let i = 0; i <= timeLabels; i++) {
      const t = minT + (i/timeLabels) * (maxT - minT)
      const x = xScale(t)
      const label = formatTime(t)
      ctx.fillText(label, x, dims.h - 20)
      
      // Tick marks
      ctx.strokeStyle = colors.tickColor; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, dims.h - dims.pad); ctx.lineTo(x, dims.h - dims.pad + 8); ctx.stroke()
    }
    
    // Y-axis (price) labels
    ctx.textAlign = 'right'
    const priceLabels = 8
    for (let i = 0; i <= priceLabels; i++) {
      const v = minV + (i/priceLabels) * (maxV - minV)
      const y = yScale(v)
      const label = formatPrice(v)
      ctx.fillText(label, dims.pad - 10, y + 4)
      
      // Tick marks
      ctx.strokeStyle = colors.tickColor; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(dims.pad - 8, y); ctx.lineTo(dims.pad, y); ctx.stroke()
    }
    
    // Axis titles with better positioning
    ctx.fillStyle = colors.labelColor; ctx.font = 'bold 14px ui-sans-serif, system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Time', dims.w/2, dims.h - 5)
    
    ctx.save()
    ctx.translate(20, dims.h/2)
    ctx.rotate(-Math.PI/2)
    ctx.fillText('Price (USD)', 0, 0)
    ctx.restore()
    
    // Current price indicator line
    if (filteredSeries.length > 0 && filteredSeries[0].values.length > 0) {
      const currentPrice = filteredSeries[0].values[filteredSeries[0].values.length - 1].v
      const y = yScale(currentPrice)
      
      ctx.strokeStyle = 'rgba(91,156,255,0.8)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(dims.pad, y)
      ctx.lineTo(dims.w - dims.pad, y)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Current price label
      ctx.fillStyle = 'rgba(91,156,255,1)'
      ctx.font = 'bold 12px ui-sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`Current: ${formatPrice(currentPrice)}`, dims.w - dims.pad + 10, y + 4)
    }
    
    // Draw series with improved styling
    const draw = (s: Series, dashed = false) => {
      if (s.values.length < 2) return
      ctx.strokeStyle = s.color
      ctx.lineWidth = dashed ? 2 : 3
      ctx.setLineDash(dashed ? [8,4] : [])
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      let firstPoint = true
      s.values.forEach((p) => { 
        if (p.t >= minT && p.t <= maxT) {
          const x = xScale(p.t)
          const y = yScale(p.v)
          if (firstPoint) {
            ctx.moveTo(x, y)
            firstPoint = false
          } else {
            ctx.lineTo(x, y)
          }
        }
      })
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    filteredSeries.forEach(s => draw(s, false))
    overlays.forEach(s => draw(s, true))
    
    // Selection rectangle
    if (selection) {
      ctx.fillStyle = 'rgba(91,156,255,0.15)'
      ctx.strokeStyle = 'rgba(91,156,255,0.6)'
      ctx.lineWidth = 1
      const w = selection.x2 - selection.x1
      const h = selection.y2 - selection.y1
      ctx.fillRect(selection.x1, selection.y1, w, h)
      ctx.strokeRect(selection.x1, selection.y1, w, h)
    }
  }, [filteredSeries, overlays, minT, maxT, minV, maxV, selection, timeframe])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseDown.current = true
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setSelection({ x1: x, y1: y, x2: x, y2: y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseDown.current || !selection) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setSelection(s => s ? { ...s, x2: x, y2: y } : null)
  }

  const handleMouseUp = () => {
    mouseDown.current = false
    if (selection && Math.abs(selection.x2 - selection.x1) > 20 && Math.abs(selection.y2 - selection.y1) > 20) {
      const newMinT = xInverse(Math.min(selection.x1, selection.x2))
      const newMaxT = xInverse(Math.max(selection.x1, selection.x2))
      const newMinV = yInverse(Math.max(selection.y1, selection.y2))
      const newMaxV = yInverse(Math.min(selection.y1, selection.y2))
      setZoomBounds({ minT: newMinT, maxT: newMaxT, minV: newMinV, maxV: newMaxV })
    }
    setSelection(null)
  }

  return (
    <div className="enhanced-chart-container">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3>Market Analysis Chart</h3>
          <div className="chart-subtitle">
            {timeframe ? `${timeframe} timeframe` : 'Real-time data'} · Drag to zoom · Double-click to reset
          </div>
        </div>
        <div className="chart-controls">
          <button className="button secondary" onClick={() => setZoomBounds(null)}>
            Reset Zoom
          </button>
        </div>
      </div>
      
      <div className="chart-canvas-container">
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={() => setZoomBounds(null)}
          style={{ cursor: mouseDown.current ? 'crosshair' : 'default' }}
        />
      </div>
      
      <div className="chart-footer">
        <div className="chart-info">
          Data points: {values.length} • Last update: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

function CSVUploadModal({ isOpen, onClose, onUpload }: { isOpen: boolean; onClose: () => void; onUpload: (file: File) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file => file.name.endsWith('.csv'))
    if (csvFile) {
      setSelectedFile(csvFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      setSelectedFile(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import CSV Data</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <p className="muted">Upload your CSV file to join with existing Databricks tables for advanced analysis.</p>
          
          <div 
            className={`csv-dropzone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div className="file-selected">
                <div className="file-icon">📄</div>
                <div>
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="upload-icon">📁</div>
                <div>
                  <strong>Drop your CSV file here</strong>
                  <div className="muted">or click to browse</div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="button" onClick={onClose}>Cancel</button>
            <button 
              className="button primary" 
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              Start Databricks Job
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DatabricksJobModal({ isOpen, onClose, fileName }: { isOpen: boolean; onClose: () => void; fileName: string }) {
  const [jobStatus, setJobStatus] = useState<'starting' | 'running' | 'completed'>('starting')
  const [progress, setProgress] = useState(0)
  const jobUrl = `https://adb-000000000000.0.azuredatabricks.net/?o=123456789#job/csv-import-${Date.now()}`

  useEffect(() => {
    if (!isOpen) return
    
    setJobStatus('starting')
    setProgress(0)
    
    const timer1 = setTimeout(() => {
      setJobStatus('running')
      
      const progressInterval = setInterval(() => {
        setProgress(p => {
          const newProgress = p + Math.random() * 15
          if (newProgress >= 100) {
            setJobStatus('completed')
            clearInterval(progressInterval)
            return 100
          }
          return newProgress
        })
      }, 500)
      
      return () => clearInterval(progressInterval)
    }, 2000)
    
    return () => clearTimeout(timer1)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Databricks Job Status</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <div className="job-info">
            <div className="job-file">
              <strong>File:</strong> {fileName}
            </div>
            <div className="job-url">
              <strong>Job URL:</strong> 
              <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="job-link">
                {jobUrl}
              </a>
            </div>
          </div>

          <div className="job-status">
            <div className={`status-indicator ${jobStatus}`}>
              {jobStatus === 'starting' && '🔄 Starting job...'}
              {jobStatus === 'running' && '⚡ Processing data...'}
              {jobStatus === 'completed' && '✅ Job completed successfully'}
            </div>
            
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-text">{Math.round(progress)}%</div>
            </div>
          </div>

          <div className="job-steps">
            <div className={`step ${progress > 10 ? 'completed' : progress > 0 ? 'active' : ''}`}>
              1. Uploading CSV to DBFS
            </div>
            <div className={`step ${progress > 40 ? 'completed' : progress > 10 ? 'active' : ''}`}>
              2. Schema validation and mapping
            </div>
            <div className={`step ${progress > 70 ? 'completed' : progress > 40 ? 'active' : ''}`}>
              3. Joining with existing tables
            </div>
            <div className={`step ${progress > 90 ? 'completed' : progress > 70 ? 'active' : ''}`}>
              4. Creating enriched dataset
            </div>
          </div>

          {jobStatus === 'completed' && (
            <div className="completion-message">
              <p>✨ Your data has been successfully processed and is now available for analysis!</p>
              <div className="modal-actions">
                <button className="button primary" onClick={onClose}>
                  Continue to Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TradingParametersPanel({ 
  market, 
  instrument, 
  currentPrice, 
  onOpenPosition 
}: { 
  market: Market
  instrument: string
  currentPrice: number
  onOpenPosition: (position: Omit<Position, 'id' | 'currentPrice' | 'unrealizedPnL' | 'openTime' | 'status'>) => void
}) {
  const [parameters, setParameters] = useState<MarketParameters>({
    leverage: 2,
    slippage: 0.05,
    hedgeRatio: 0.8
  })
  const [quantity, setQuantity] = useState<number>(1000)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')

  // Initialize market-specific parameters
  useEffect(() => {
    const defaultParams: Partial<MarketParameters> = {}
    
    switch (market) {
      case 'Oil':
        Object.assign(defaultParams, {
          supplyDemandIndex: 0.7,
          geopoliticalRisk: 0.2,
          benchmarkSpread: 1.5,
          inventoryLevel: 65
        })
        break
      case 'Gas':
        Object.assign(defaultParams, {
          weatherForecast: 0.6,
          storageInjectionRate: 0.8,
          lngExportVolume: 0.75,
          inventoryLevel: 70
        })
        break
      case 'Power':
        Object.assign(defaultParams, {
          demandForecast: 85,
          renewableShare: 35,
          gridReliability: 0.9,
          carbonPrice: 25
        })
        break
      case 'Shipping':
        Object.assign(defaultParams, {
          fleetUtilization: 0.85,
          bunkerCost: 650,
          portCongestion: 0.3,
          freightRates: 15000
        })
        break
      case 'Refining':
        Object.assign(defaultParams, {
          crackSpread: 18.5,
          utilizationRate: 88,
          feedstockFlexibility: 0.7,
          productSlate: 'Gasoline 45%, Diesel 35%, Jet 20%'
        })
        break
      case 'Storage':
        Object.assign(defaultParams, {
          storageUtilization: 75,
          arbitrageSpread: 2.5,
          capacityConstraints: 0.8,
          seasonalTrends: 0.6
        })
        break
    }
    
    setParameters(prev => ({ ...prev, ...defaultParams }))
  }, [market])

  const handleOpenPosition = () => {
    onOpenPosition({
      instrument,
      market,
      side,
      quantity,
      entryPrice: currentPrice,
      parameters
    })
  }

  const renderMarketSpecificParams = () => {
    switch (market) {
      case 'Oil':
        return (
          <>
            <div className="param-group">
              <label>Supply & Demand Index</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.supplyDemandIndex || 0.7}
                onChange={e => setParameters(p => ({ ...p, supplyDemandIndex: Number(e.target.value) }))}
              />
              <span>{((parameters.supplyDemandIndex || 0.7) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Geopolitical Risk</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.geopoliticalRisk || 0.2}
                onChange={e => setParameters(p => ({ ...p, geopoliticalRisk: Number(e.target.value) }))}
              />
              <span>{((parameters.geopoliticalRisk || 0.2) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Benchmark Spread ($/bbl)</label>
              <input 
                type="number" 
                min={0} 
                max={10} 
                step={0.1} 
                value={parameters.benchmarkSpread || 1.5}
                onChange={e => setParameters(p => ({ ...p, benchmarkSpread: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Inventory Level (%)</label>
              <input 
                type="number" 
                min={0} 
                max={100} 
                step={1} 
                value={parameters.inventoryLevel || 65}
                onChange={e => setParameters(p => ({ ...p, inventoryLevel: Number(e.target.value) }))}
              />
            </div>
          </>
        )
      
      case 'Gas':
        return (
          <>
            <div className="param-group">
              <label>Weather Forecast Impact</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.weatherForecast || 0.6}
                onChange={e => setParameters(p => ({ ...p, weatherForecast: Number(e.target.value) }))}
              />
              <span>{((parameters.weatherForecast || 0.6) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Storage Injection Rate</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.storageInjectionRate || 0.8}
                onChange={e => setParameters(p => ({ ...p, storageInjectionRate: Number(e.target.value) }))}
              />
              <span>{((parameters.storageInjectionRate || 0.8) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>LNG Export Volume</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.lngExportVolume || 0.75}
                onChange={e => setParameters(p => ({ ...p, lngExportVolume: Number(e.target.value) }))}
              />
              <span>{((parameters.lngExportVolume || 0.75) * 100).toFixed(0)}%</span>
            </div>
          </>
        )
      
      case 'Power':
        return (
          <>
            <div className="param-group">
              <label>Demand Forecast (%)</label>
              <input 
                type="number" 
                min={0} 
                max={150} 
                step={1} 
                value={parameters.demandForecast || 85}
                onChange={e => setParameters(p => ({ ...p, demandForecast: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Renewable Share (%)</label>
              <input 
                type="number" 
                min={0} 
                max={100} 
                step={1} 
                value={parameters.renewableShare || 35}
                onChange={e => setParameters(p => ({ ...p, renewableShare: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Grid Reliability</label>
              <input 
                type="range" 
                min={0.5} 
                max={1} 
                step={0.05} 
                value={parameters.gridReliability || 0.9}
                onChange={e => setParameters(p => ({ ...p, gridReliability: Number(e.target.value) }))}
              />
              <span>{((parameters.gridReliability || 0.9) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Carbon Price (€/tonne)</label>
              <input 
                type="number" 
                min={0} 
                max={100} 
                step={1} 
                value={parameters.carbonPrice || 25}
                onChange={e => setParameters(p => ({ ...p, carbonPrice: Number(e.target.value) }))}
              />
            </div>
          </>
        )
      
      case 'Shipping':
        return (
          <>
            <div className="param-group">
              <label>Fleet Utilization</label>
              <input 
                type="range" 
                min={0.5} 
                max={1} 
                step={0.05} 
                value={parameters.fleetUtilization || 0.85}
                onChange={e => setParameters(p => ({ ...p, fleetUtilization: Number(e.target.value) }))}
              />
              <span>{((parameters.fleetUtilization || 0.85) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Bunker Cost ($/MT)</label>
              <input 
                type="number" 
                min={400} 
                max={1000} 
                step={10} 
                value={parameters.bunkerCost || 650}
                onChange={e => setParameters(p => ({ ...p, bunkerCost: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Port Congestion</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.portCongestion || 0.3}
                onChange={e => setParameters(p => ({ ...p, portCongestion: Number(e.target.value) }))}
              />
              <span>{((parameters.portCongestion || 0.3) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Freight Rates ($/day)</label>
              <input 
                type="number" 
                min={5000} 
                max={50000} 
                step={500} 
                value={parameters.freightRates || 15000}
                onChange={e => setParameters(p => ({ ...p, freightRates: Number(e.target.value) }))}
              />
            </div>
          </>
        )
      
      case 'Refining':
        return (
          <>
            <div className="param-group">
              <label>Crack Spread ($/bbl)</label>
              <input 
                type="number" 
                min={5} 
                max={50} 
                step={0.5} 
                value={parameters.crackSpread || 18.5}
                onChange={e => setParameters(p => ({ ...p, crackSpread: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Utilization Rate (%)</label>
              <input 
                type="number" 
                min={50} 
                max={100} 
                step={1} 
                value={parameters.utilizationRate || 88}
                onChange={e => setParameters(p => ({ ...p, utilizationRate: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Feedstock Flexibility</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.feedstockFlexibility || 0.7}
                onChange={e => setParameters(p => ({ ...p, feedstockFlexibility: Number(e.target.value) }))}
              />
              <span>{((parameters.feedstockFlexibility || 0.7) * 100).toFixed(0)}%</span>
            </div>
          </>
        )
      
      case 'Storage':
        return (
          <>
            <div className="param-group">
              <label>Storage Utilization (%)</label>
              <input 
                type="number" 
                min={0} 
                max={100} 
                step={1} 
                value={parameters.storageUtilization || 75}
                onChange={e => setParameters(p => ({ ...p, storageUtilization: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Arbitrage Spread ($/bbl)</label>
              <input 
                type="number" 
                min={0} 
                max={10} 
                step={0.1} 
                value={parameters.arbitrageSpread || 2.5}
                onChange={e => setParameters(p => ({ ...p, arbitrageSpread: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Capacity Constraints</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.capacityConstraints || 0.8}
                onChange={e => setParameters(p => ({ ...p, capacityConstraints: Number(e.target.value) }))}
              />
              <span>{((parameters.capacityConstraints || 0.8) * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Seasonal Trends</label>
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.1} 
                value={parameters.seasonalTrends || 0.6}
                onChange={e => setParameters(p => ({ ...p, seasonalTrends: Number(e.target.value) }))}
              />
              <span>{((parameters.seasonalTrends || 0.6) * 100).toFixed(0)}%</span>
            </div>
          </>
        )
      
      default:
        return null
    }
  }

  const calculateRiskMetrics = () => {
    const var95 = -(parameters.leverage * 8 * (1 + parameters.slippage/100))
    const expectedReturn = parameters.leverage * 5.2
    const sharpeRatio = 1.2 + Math.random() * 0.8
    const maxDrawdown = -(parameters.leverage * 12)
    
    return { var95, expectedReturn, sharpeRatio, maxDrawdown }
  }

  const riskMetrics = calculateRiskMetrics()

  return (
    <div className="trading-parameters-panel">
      <div className="panel-header">
        <h3>{market} Market Parameters & Strategy Testing</h3>
        <p className="muted">Configure parameters and test different strategies for {instrument}</p>
      </div>

      <div className="parameters-grid">
        {/* Common Trading Parameters */}
        <div className="parameter-section">
          <h4>Trading Parameters</h4>
          <div className="param-group">
            <label>Position Side</label>
            <div className="side-selector">
              <button 
                className={`side-btn ${side === 'BUY' ? 'active buy' : ''}`}
                onClick={() => setSide('BUY')}
              >
                BUY
              </button>
              <button 
                className={`side-btn ${side === 'SELL' ? 'active sell' : ''}`}
                onClick={() => setSide('SELL')}
              >
                SELL
              </button>
            </div>
          </div>
          <div className="param-group">
            <label>Quantity</label>
            <input 
              type="number" 
              min={100} 
              max={100000} 
              step={100} 
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="param-group">
            <label>Leverage (×)</label>
            <input 
              type="range" 
              min={1} 
              max={10} 
              step={0.5} 
              value={parameters.leverage}
              onChange={e => setParameters(p => ({ ...p, leverage: Number(e.target.value) }))}
            />
            <span>{parameters.leverage}×</span>
          </div>
          <div className="param-group">
            <label>Slippage (%)</label>
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.01} 
              value={parameters.slippage}
              onChange={e => setParameters(p => ({ ...p, slippage: Number(e.target.value) }))}
            />
            <span>{(parameters.slippage * 100).toFixed(2)}%</span>
          </div>
          <div className="param-group">
            <label>Hedge Ratio (%)</label>
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.1} 
              value={parameters.hedgeRatio}
              onChange={e => setParameters(p => ({ ...p, hedgeRatio: Number(e.target.value) }))}
            />
            <span>{(parameters.hedgeRatio * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Market-Specific Parameters */}
        <div className="parameter-section">
          <h4>{market} Specific Parameters</h4>
          {renderMarketSpecificParams()}
        </div>

        {/* Risk Metrics & Actions */}
        <div className="parameter-section">
          <h4>Risk Analysis</h4>
          <div className="risk-metrics">
            <div className="risk-metric">
              <span className="label">VaR 95%</span>
              <span className="value danger">{riskMetrics.var95.toFixed(1)}%</span>
            </div>
            <div className="risk-metric">
              <span className="label">Expected Return</span>
              <span className="value success">+{riskMetrics.expectedReturn.toFixed(1)}%</span>
            </div>
            <div className="risk-metric">
              <span className="label">Sharpe Ratio</span>
              <span className="value">{riskMetrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="risk-metric">
              <span className="label">Max Drawdown</span>
              <span className="value danger">{riskMetrics.maxDrawdown.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="position-info">
            <div className="current-price">
              <span>Current Price: </span>
              <span className="price">${currentPrice.toFixed(4)}</span>
            </div>
            <div className="position-value">
              <span>Position Value: </span>
              <span className="value">${(quantity * currentPrice).toLocaleString()}</span>
            </div>
          </div>

          <button 
            className="open-position-btn"
            onClick={handleOpenPosition}
          >
            Open {side} Position
          </button>
        </div>
      </div>
    </div>
  )
}

function OpenPositionsList({ 
  positions, 
  onClosePosition 
}: { 
  positions: Position[]
  onClosePosition: (positionId: string) => void 
}) {
  if (positions.length === 0) {
    return (
      <div className="open-positions-empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No Open Positions</h4>
          <p className="muted">Configure parameters and open your first position to start trading</p>
        </div>
      </div>
    )
  }

  return (
    <div className="open-positions-list">
      <div className="positions-header">
        <h3>Open Positions ({positions.length})</h3>
        <div className="total-pnl">
          <span>Total Unrealized P&L: </span>
          <span className={`pnl-value ${positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) >= 0 ? 'success' : 'danger'}`}>
            ${positions.reduce((sum, p) => sum + p.unrealizedPnL, 0).toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="positions-grid">
        {positions.map(position => (
          <div key={position.id} className="position-card">
            <div className="position-header">
              <div className="position-title">
                <span className="instrument">{position.instrument}</span>
                <span className={`side ${position.side.toLowerCase()}`}>{position.side}</span>
                <span className="market-badge">{position.market}</span>
              </div>
              <button 
                className="close-btn"
                onClick={() => onClosePosition(position.id)}
                title="Close Position"
              >
                ×
              </button>
            </div>
            
            <div className="position-details">
              <div className="detail-row">
                <span>Quantity:</span>
                <span>{position.quantity.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span>Entry Price:</span>
                <span>${position.entryPrice.toFixed(4)}</span>
              </div>
              <div className="detail-row">
                <span>Current Price:</span>
                <span>${position.currentPrice.toFixed(4)}</span>
              </div>
              <div className="detail-row">
                <span>Unrealized P&L:</span>
                <span className={`pnl ${position.unrealizedPnL >= 0 ? 'success' : 'danger'}`}>
                  ${position.unrealizedPnL.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="position-parameters">
              <div className="param-summary">
                <span>Leverage: {position.parameters.leverage}×</span>
                <span>Slippage: {(position.parameters.slippage * 100).toFixed(2)}%</span>
                <span>Hedge: {(position.parameters.hedgeRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="position-footer">
              <span className="open-time">
                Opened: {new Date(position.openTime).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Trading() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [activeTab, setActiveTab] = useState<string>('overview')
  
  // Simulation states
  const [market, setMarket] = useState<Market>('Oil')
  const [instrument, setInstrument] = useState<string>(MARKET_INSTRUMENTS['Oil'][0])
  const [zoom, setZoom] = useState<TimeZoom>('Y')
  const [overlays, setOverlays] = useState<string[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [positions, setPositions] = useState<Position[]>([])
  const [realizedPnL, setRealizedPnL] = useState<number>(0)
  const [instrumentPrices, setInstrumentPrices] = useState<Record<string, number>>({})
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [mode, setMode] = useState<Mode>('analysis')
  const [notebookUrl] = useState<string>('https://adb-000000000000.0.azuredatabricks.net/?o=123456789#notebook/energy-simulations')

  // Realtime simulation data
  const now = Date.now()
  const { series, setSpeed, setVol } = useRealtimeMock(instrument, now - 6 * 60 * 60 * 1000, timeframe)
  const overlaySeries = overlays.map((name, i) => ({ name, color: COLORS[(i+3)%COLORS.length], values: series.values.map(p => ({ t: p.t - (365*24*3600*1000)*(i+1), v: p.v * (1 + (i+1)*0.02) })) }))

  useEffect(() => {
    setInstrument(MARKET_INSTRUMENTS[market][0])
    setOverlays([])
  }, [market])

  // Update current instrument price
  useEffect(() => {
    if (series.values.length > 0) {
      const currentPrice = series.values[series.values.length - 1].v
      setInstrumentPrices(prev => ({
        ...prev,
        [instrument]: currentPrice
      }))
    }
  }, [series.values, instrument])

  // Create price simulation for all instruments to keep positions updated
  useEffect(() => {
    const allInstruments = Object.values(MARKET_INSTRUMENTS).flat()
    const basePrices: Record<string, number> = {
      'Brent ICE': 85, 'WTI NYMEX': 82, 'Dubai': 83, 'Urals': 75, 'Maya': 70, 'ANS': 88,
      'Henry Hub': 3.2, 'TTF Dutch': 28, 'NBP UK': 95, 'JKM LNG': 12, 'Algerian Pipeline': 25,
      'German Baseload': 120, 'UK N2EX': 180, 'PJM RT': 45, 'ERCOT': 40, 'Nordic Systempris': 65,
      'Baltic Dry Index': 1850, 'Capesize TC4': 15000, 'Panamax TC14': 12000, 'VLCC TD3C': 45000, 'Suezmax TD6': 35000,
      '3-2-1 Crack WTI': 18, 'Gasoline RBOB': 2.45, 'Diesel ULSD': 2.85, 'Jet Fuel': 2.65, 'Naphtha': 720,
      'Cushing WTI': 420000, 'ARA Gasoil': 3200000, 'Singapore Fuel Oil': 8500000, 'US Gas Storage': 3200, 'EU Gas Storage': 875
    }

    // Initialize prices for all instruments
    const initialPrices: Record<string, number> = {}
    allInstruments.forEach(inst => {
      initialPrices[inst] = basePrices[inst] || 100
    })
    setInstrumentPrices(prev => ({ ...initialPrices, ...prev }))

    // Simulate price movements for all instruments - optimized with throttling
    const interval = setInterval(() => {
      // Use requestIdleCallback if available, fallback to requestAnimationFrame
      const scheduleUpdate = window.requestIdleCallback || requestAnimationFrame
      
      scheduleUpdate(() => {
        setInstrumentPrices(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(inst => {
            if (inst !== instrument) { // Don't override the current instrument's real-time price
              const currentPrice = updated[inst]
              const volatility = 0.005
              const change = (Math.random() - 0.5) * volatility
              updated[inst] = Math.max(currentPrice * 0.1, currentPrice * (1 + change))
            }
          })
          return updated
        })
      })
    }, 5000) // Reduced frequency: Update every 5 seconds instead of 2

    return () => clearInterval(interval)
  }, [instrument])

  // Update positions with current prices from all instruments - throttled for performance
  useEffect(() => {
    // Throttle position updates to reduce re-renders
    const timeoutId = setTimeout(() => {
      setPositions(prevPositions => 
        prevPositions.map(position => {
          const currentPrice = instrumentPrices[position.instrument]
          if (currentPrice !== undefined) {
            const priceDiff = currentPrice - position.entryPrice
            const unrealizedPnL = position.side === 'BUY' 
              ? priceDiff * position.quantity * position.parameters.leverage
              : -priceDiff * position.quantity * position.parameters.leverage
            
            return {
              ...position,
              currentPrice,
              unrealizedPnL
            }
          }
          return position
        })
      )
    }, 100) // 100ms throttle to prevent excessive updates

    return () => clearTimeout(timeoutId)
  }, [instrumentPrices])

  // Load trading data when in analysis mode - optimized loading
  useEffect(() => {
    if (mode === 'analysis') {
      // Use requestAnimationFrame for non-blocking data loading
      requestAnimationFrame(() => {
        api.get<Trade[]>('/api/v1/trading/trades')
          .then(r => {
            requestAnimationFrame(() => {
              setTrades(r.data)
              // Generate chart data based on trades - reduced complexity
              const mockChartData: ChartData[] = []
              const basePrice = series.values[series.values.length - 1]?.v || 85.50
              for (let i = 0; i < 50; i++) { // Reduced from 100 to 50 data points
                const timestamp = new Date(Date.now() - (50 - i) * 60000).toISOString()
                const price = basePrice + (Math.random() - 0.5) * 0.01 * basePrice
                const volume = Math.floor(Math.random() * 5000) + 500 // Reduced volume range
                mockChartData.push({ timestamp, price, volume })
              }
              setChartData(mockChartData)
              setLoading(false)
            })
          })
          .catch(e => {
            setError(e?.message ?? 'Failed to load trades')
            setLoading(false)
          })
      })
    }
  }, [mode]) // Removed series.values dependency to prevent excessive reloads

  const filtered = useMemo(() => trades.filter(t => {
    const s = `${t.trade_id} ${t.instrument} ${t.counterparty} ${t.side}`.toLowerCase()
    return s.includes(q.toLowerCase())
  }), [trades, q])

  // NO MORE DYNAMIC KPI CALCULATIONS - Use only static values
  // Removed all real-time recalculations to prevent constant resets

  const handleOrderUpdate = (newOrders: Order[]) => {
    setOrders(newOrders)
  }

  const handleOpenPosition = (positionData: Omit<Position, 'id' | 'currentPrice' | 'unrealizedPnL' | 'openTime' | 'status'>) => {
    const currentPrice = series.values[series.values.length - 1]?.v || positionData.entryPrice
    const newPosition: Position = {
      ...positionData,
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentPrice,
      unrealizedPnL: 0,
      openTime: Date.now(),
      status: 'OPEN'
    }
    setPositions(prev => [...prev, newPosition])
  }

  const handleClosePosition = (positionId: string) => {
    setPositions(prev => {
      const position = prev.find(p => p.id === positionId)
      if (position) {
        // Add to realized P&L
        setRealizedPnL(prevRealized => prevRealized + position.unrealizedPnL)
        // Remove from positions
        return prev.filter(p => p.id !== positionId)
      }
      return prev
    })
  }

  const handleCSVUpload = (file: File) => {
    setUploadedFileName(file.name)
    setShowJobModal(true)
  }

  const totalUnrealizedPnL = orders.reduce((sum, order) => sum + order.unrealizedPnL, 0)

  // Tabs configuration
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'charts', label: 'Charts', icon: '📈' },
    { id: 'forecasting', label: 'AI Predictions', icon: '🤖' },
    { id: 'patterns', label: 'Patterns', icon: '🔍' },
    { id: 'simulator', label: 'Simulator', icon: '⚡' },
    { id: 'trades', label: 'Trade History', icon: '📋' }
  ], [])

  // Removed blocking loading screen - show content immediately with discrete loading indicator
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>

  return (
    <PerformantPageWrapper pageName="Trading">
      <div className="trading-dashboard">
        <TradingNotifications orders={orders} />
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: 'var(--text)' }}>
              Trading Dashboard
            </h1>
            <div style={{ 
              marginTop: '4px', 
              fontSize: '14px', 
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: loading ? 'var(--brand)' : '#22c55e',
                animation: loading ? 'pulse 1.5s infinite' : 'pulse 2s infinite'
              }} />
              {loading ? 'Syncing market data...' : 'Real-time Market Data'}
            </div>
          </div>
          {activeTab === 'historical' && (
            <SearchBar onChange={setQ} placeholder="Search trades, instruments, counterparties..." />
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        gap: '2px',
        background: 'var(--surface-2)',
        padding: '4px',
        borderRadius: '12px',
        overflow: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1',
              minWidth: '120px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: activeTab === tab.id ? 'var(--brand)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--muted)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {activeTab === 'overview' && <TradingCockpitDashboard />}
        
        {activeTab === 'charts' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <SimpleChart 
              data={chartData.map(d => ({
                timestamp: d.timestamp,
                price: d.price,
                volume: d.volume
              }))}
              height={350}
              title="EUR/USD Real-time Price"
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <SimpleChart 
                data={chartData.slice(-50).map(d => ({
                  timestamp: d.timestamp,
                  price: d.price + Math.random() * 0.002 - 0.001, // Mock WTI data
                }))}
                height={250}
                title="WTI Crude Oil"
              />
              <SimpleChart 
                data={chartData.slice(-50).map(d => ({
                  timestamp: d.timestamp,
                  price: 2.85 + Math.random() * 0.1 - 0.05, // Mock Natural Gas data
                }))}
                height={250}
                title="Natural Gas"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'forecasting' && <PriceForecastingPanel />}
        
        {activeTab === 'patterns' && <PatternRecognitionPanel />}
        
        {activeTab === 'simulator' && (
          <div>
            {/* Live Trading Simulations Header */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Live Trading Simulations</h2>
                <p className="muted" style={{ margin: '4px 0 0 0' }}>Real-time trading platform with advanced strategy testing across all energy markets</p>
              </div>
              <div className="segmented" role="tablist">
                <button className={mode==='analysis'?'active':''} onClick={() => setMode('analysis')}>Live Trading</button>
                <button className={mode==='import'?'active':''} onClick={() => setMode('import')}>Data Import</button>
                <button className={mode==='expert'?'active':''} onClick={() => setMode('expert')}>Advanced</button>
              </div>
            </div>

            {/* Market Selection Tabs */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="market-tabs" style={{ 
                display: 'flex', 
                gap: '8px', 
                padding: '16px',
                background: 'var(--surface)',
                borderRadius: '12px',
                overflowX: 'auto'
              }}>
                {(Object.keys(MARKET_INSTRUMENTS) as Market[]).map(m => {
                  const Icon = MARKET_ICONS[m]
                  return (
                    <button
                      key={m}
                      className={`market-tab ${market === m ? 'active' : ''}`}
                      onClick={() => setMarket(m)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: market === m ? 'var(--brand)' : 'var(--surface-2)',
                        color: market === m ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon style={{ width: '20px', height: '20px' }} />
                      <span>{m}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Complete Simulation Content */}
            {mode === 'analysis' && (
              <div className="trading-dashboard">
                {loading ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div>Loading trading data...</div>
                  </div>
                ) : error ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)' }}>
                    Error: {error}
                  </div>
                ) : (
                  <>
                    {/* Enhanced Trading Metrics Dashboard */}
                    <div className="trading-metrics-dashboard" style={{ marginBottom: '24px' }}>
                      <div className="metrics-header" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '16px'
                      }}>
                        <h3 style={{ margin: 0 }}>Trading Performance Overview</h3>
                        <div className="market-info" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '8px 16px',
                          background: 'var(--surface-2)',
                          borderRadius: '8px'
                        }}>
                          {React.createElement(MARKET_ICONS[market], { style: { width: '20px', height: '20px' } })}
                          <span>{market} Market</span>
                        </div>
                      </div>
                      
                      <div className="metrics-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px'
                      }}>
                        <div className="metric-card" style={{ 
                          padding: '20px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="metric-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="metric-icon">📊</span>
                            <span className="metric-label" style={{ fontSize: '14px', color: 'var(--muted)' }}>Total Trades</span>
                          </div>
                          <div className="metric-value" style={{ fontSize: '24px', fontWeight: '700' }}>{positions.length.toLocaleString()}</div>
                          <div className="metric-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>Active positions</div>
                        </div>
                        
                        <div className="metric-card" style={{ 
                          padding: '20px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="metric-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="metric-icon">📈</span>
                            <span className="metric-label" style={{ fontSize: '14px', color: 'var(--muted)' }}>Long Positions</span>
                          </div>
                          <div className="metric-value success" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{positions.filter(p => p.side === 'BUY').length.toLocaleString()}</div>
                          <div className="metric-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>BUY orders</div>
                        </div>
                        
                        <div className="metric-card" style={{ 
                          padding: '20px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="metric-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="metric-icon">📉</span>
                            <span className="metric-label" style={{ fontSize: '14px', color: 'var(--muted)' }}>Short Positions</span>
                          </div>
                          <div className="metric-value danger" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>{positions.filter(p => p.side === 'SELL').length.toLocaleString()}</div>
                          <div className="metric-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>SELL orders</div>
                        </div>
                        
                        <div className="metric-card" style={{ 
                          padding: '20px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="metric-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="metric-icon">💰</span>
                            <span className="metric-label" style={{ fontSize: '14px', color: 'var(--muted)' }}>Unrealized P&L</span>
                          </div>
                          <div className={`metric-value ${positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) >= 0 ? 'success' : 'danger'}`} style={{ 
                            fontSize: '24px', 
                            fontWeight: '700',
                            color: positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) >= 0 ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) >= 0 ? '+' : ''}${positions.reduce((sum, p) => sum + p.unrealizedPnL, 0).toLocaleString()}
                          </div>
                          <div className="metric-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>USD</div>
                        </div>
                        
                        <div className="metric-card" style={{ 
                          padding: '20px',
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)'
                        }}>
                          <div className="metric-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="metric-icon">✅</span>
                            <span className="metric-label" style={{ fontSize: '14px', color: 'var(--muted)' }}>Realized P&L</span>
                          </div>
                          <div className={`metric-value ${realizedPnL >= 0 ? 'success' : 'danger'}`} style={{ 
                            fontSize: '24px', 
                            fontWeight: '700',
                            color: realizedPnL >= 0 ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toLocaleString()}
                          </div>
                          <div className="metric-subtitle" style={{ fontSize: '12px', color: 'var(--muted)' }}>USD</div>
                        </div>
                      </div>
                    </div>

                    {/* Instrument Selection */}
                    <div className="instrument-selection-card" style={{ marginBottom: '24px' }}>
                      <div className="card">
                        <div className="selection-header" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '20px'
                        }}>
                          <h3 style={{ margin: 0 }}>Market Analysis - {instrument}</h3>
                          <div className="selection-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div className="control-group">
                              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Instrument</label>
                              <select 
                                value={instrument} 
                                onChange={e => setInstrument(e.target.value)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  color: 'var(--text)',
                                  fontSize: '14px'
                                }}
                              >
                                {MARKET_INSTRUMENTS[market].map(i => <option key={i} value={i}>{i}</option>)}
                              </select>
                            </div>
                            <div className="control-group">
                              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Timeframe</label>
                              <TimeframeFilter value={timeframe} onChange={setTimeframe} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Real-time Chart */}
                    <RealtimeChart series={[series]} range={zoom} overlays={overlaySeries} timeframe={timeframe} />

                    {/* Trading Parameters Panel */}
                    <TradingParametersPanel 
                      market={market}
                      instrument={instrument}
                      currentPrice={series.values[series.values.length - 1]?.v || 85.50}
                      onOpenPosition={handleOpenPosition}
                    />

                    {/* Open Positions List */}
                    <OpenPositionsList 
                      positions={positions}
                      onClosePosition={handleClosePosition}
                    />
                  </>
                )}
              </div>
            )}

            {mode === 'import' && (
              <div className="card">
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: 16 }}>📊</div>
                  <h3>Import Your Data</h3>
                  <p className="muted" style={{ marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
                    Upload CSV files to join with existing Databricks tables and create enriched datasets for advanced analysis.
                  </p>
                  <button 
                    className="button primary large"
                    onClick={() => setShowCSVModal(true)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--brand)',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Upload CSV File
                  </button>
                  
                  <div style={{ marginTop: 32, padding: 20, backgroundColor: 'var(--surface-2)', borderRadius: 8 }}>
                    <h4>Supported Data Types</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
                      <div>
                        <strong>Trading Data</strong>
                        <div className="muted">Positions, trades, P&L</div>
                      </div>
                      <div>
                        <strong>Market Data</strong>
                        <div className="muted">Prices, volumes, curves</div>
                      </div>
                      <div>
                        <strong>Risk Data</strong>
                        <div className="muted">VaR, exposures, limits</div>
                      </div>
                      <div>
                        <strong>Operations Data</strong>
                        <div className="muted">Logistics, schedules, inventory</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'expert' && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Expert Trading Workflow</div>
                  <p className="muted">Access advanced simulations, historical backtests, Monte Carlo analysis, and risk scenario exports in Databricks.</p>
                  <ul className="muted" style={{ marginLeft: 16, marginTop: 8 }}>
                    <li>Advanced volatility surface modeling for energy curves</li>
                    <li>Cross-commodity correlation matrices and spread strategies</li>
                    <li>Storage optimization algorithms with seasonal patterns</li>
                    <li>Transport route disruption impact analysis</li>
                    <li>Real-time portfolio optimization and rebalancing</li>
                  </ul>
                </div>
                <a 
                  className="button primary strong" 
                  href={notebookUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--brand)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Open Databricks Notebook
                </a>
              </div>
            )}

            {/* Modals */}
            <CSVUploadModal 
              isOpen={showCSVModal} 
              onClose={() => setShowCSVModal(false)}
              onUpload={handleCSVUpload}
            />

            <DatabricksJobModal
              isOpen={showJobModal}
              onClose={() => setShowJobModal(false)}
              fileName={uploadedFileName}
            />
          </div>
        )}
        
        {activeTab === 'trades' && (
          <div className="card">
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Trade History</h3>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
                  {filtered.length} trades found
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <div style={{ 
                  padding: '6px 12px', 
                  background: 'var(--brand)', 
                  color: 'white', 
                  borderRadius: '6px' 
                }}>
                  Volume: {filtered.reduce((sum, t) => sum + t.quantity, 0).toLocaleString()}
                </div>
                <div style={{ 
                  padding: '6px 12px', 
                  background: 'var(--success)', 
                  color: 'white', 
                  borderRadius: '6px' 
                }}>
                  Value: ${filtered.reduce((sum, t) => sum + (t.quantity * t.price), 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Trade ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Instrument</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Counterparty</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Side</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Quantity</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Value</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map(t => (
                    <tr key={t.trade_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace' }}>{t.trade_id}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{t.instrument}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{t.counterparty}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: t.side === 'BUY' ? 'var(--success)' : 'var(--danger)',
                          color: 'white'
                        }}>
                          {t.side}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                        {t.quantity.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontFamily: 'monospace' }}>
                        {t.price.toFixed(4)} {t.currency}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                        ${(t.quantity * t.price).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: 'var(--muted)' }}>
                        {new Date(t.trade_date).toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filtered.length > 50 && (
              <div style={{ 
                padding: '16px 20px', 
                borderTop: '1px solid var(--border)',
                textAlign: 'center',
                fontSize: '14px',
                color: 'var(--muted)'
              }}>
                Showing 50 of {filtered.length} trades
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </PerformantPageWrapper>
  )
}
