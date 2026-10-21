import { useState } from 'react'

interface LiveMarketControlsProps {
  onSpeedChange: (speed: number) => void
  onVolatilityChange: (volatility: number) => void
  marketName: string
}

export default function LiveMarketControls({ 
  onSpeedChange, 
  onVolatilityChange, 
  marketName 
}: LiveMarketControlsProps) {
  const [speed, setSpeed] = useState(800)
  const [volatility, setVolatility] = useState(0.8)
  const [isLive, setIsLive] = useState(true)

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    onSpeedChange(newSpeed)
  }

  const handleVolatilityChange = (newVol: number) => {
    setVolatility(newVol)
    onVolatilityChange(newVol)
  }

  const speedLabels = {
    200: 'Ultra Fast',
    400: 'Fast',
    800: 'Normal',
    1600: 'Slow',
    3200: 'Very Slow'
  }

  const volatilityLabels = {
    0.2: 'Low',
    0.5: 'Medium',
    0.8: 'Normal',
    1.2: 'High',
    2.0: 'Extreme'
  }

  return (
    <div className="live-market-controls">
      <div className="controls-header">
        <div className="market-status">
          <div className={`status-indicator ${isLive ? 'live' : 'paused'}`}>
            <div className="status-dot"></div>
            <span>{isLive ? 'LIVE' : 'PAUSED'}</span>
          </div>
          <div className="market-name">{marketName} Market</div>
        </div>
        <button 
          className={`button ${isLive ? 'danger-soft' : 'success-soft'}`}
          onClick={() => setIsLive(!isLive)}
        >
          {isLive ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div className="controls-grid">
        <div className="control-group">
          <label>Market Speed</label>
          <div className="control-slider">
            <input
              type="range"
              min="200"
              max="3200"
              step="200"
              value={speed}
              onChange={e => handleSpeedChange(Number(e.target.value))}
              className="slider speed-slider"
            />
            <div className="slider-labels">
              <span className="current-value">
                {speedLabels[speed as keyof typeof speedLabels]}
              </span>
              <span className="slider-unit">Update Rate</span>
            </div>
          </div>
        </div>

        <div className="control-group">
          <label>Market Volatility</label>
          <div className="control-slider">
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={volatility}
              onChange={e => handleVolatilityChange(Number(e.target.value))}
              className="slider volatility-slider"
            />
            <div className="slider-labels">
              <span className="current-value">
                {volatilityLabels[volatility as keyof typeof volatilityLabels] || `${(volatility * 100).toFixed(0)}%`}
              </span>
              <span className="slider-unit">Price Movement</span>
            </div>
          </div>
        </div>

        <div className="control-group">
          <label>Market Sentiment</label>
          <div className="sentiment-buttons">
            <button className="sentiment-btn bullish">Bullish</button>
            <button className="sentiment-btn neutral active">Neutral</button>
            <button className="sentiment-btn bearish">Bearish</button>
          </div>
        </div>
      </div>

      <div className="market-stats">
        <div className="stat">
          <span className="stat-label">Tick Rate</span>
          <span className="stat-value">{(1000/speed).toFixed(1)}/sec</span>
        </div>
        <div className="stat">
          <span className="stat-label">Volatility</span>
          <span className="stat-value">{(volatility * 100).toFixed(0)}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Spread</span>
          <span className="stat-value">0.02%</span>
        </div>
      </div>
    </div>
  )
}

