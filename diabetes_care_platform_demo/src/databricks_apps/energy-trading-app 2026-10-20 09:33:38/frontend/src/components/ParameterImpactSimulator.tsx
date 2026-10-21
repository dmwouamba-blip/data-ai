import { useState, useEffect, useMemo } from 'react'
import { Order } from './OrderSimulator'

interface ParameterSet {
  id: string
  name: string
  leverage: number
  slippage: number
  hedgeRatio: number
  quantity: number
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
  color: string
}

interface SimulationResult {
  parameterId: string
  expectedReturn: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  avgWin: number
  avgLoss: number
  totalPnL: number
  riskScore: number
}

interface ParameterImpactSimulatorProps {
  currentOrder?: Partial<Order>
  marketPrice: number
  instrument: string
  onParameterChange?: (params: ParameterSet) => void
}

const DEFAULT_PARAMETERS: ParameterSet[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    leverage: 1.5,
    slippage: 0.02,
    hedgeRatio: 0.9,
    quantity: 1000,
    entryPrice: 85.50,
    stopLoss: 83.00,
    takeProfit: 88.00,
    color: '#21c07a'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    leverage: 2.5,
    slippage: 0.05,
    hedgeRatio: 0.7,
    quantity: 2500,
    entryPrice: 85.50,
    stopLoss: 82.00,
    takeProfit: 90.00,
    color: '#5b9cff'
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    leverage: 4.0,
    slippage: 0.08,
    hedgeRatio: 0.5,
    quantity: 5000,
    entryPrice: 85.50,
    stopLoss: 80.00,
    takeProfit: 95.00,
    color: '#f59e0b'
  }
]

export default function ParameterImpactSimulator({ 
  currentOrder, 
  marketPrice, 
  instrument,
  onParameterChange 
}: ParameterImpactSimulatorProps) {
  const [parameters, setParameters] = useState<ParameterSet[]>(DEFAULT_PARAMETERS)
  const [selectedParam, setSelectedParam] = useState<string>('balanced')
  const [customParams, setCustomParams] = useState<ParameterSet>({
    id: 'custom',
    name: 'Custom',
    leverage: 2.0,
    slippage: 0.05,
    hedgeRatio: 0.8,
    quantity: 2000,
    entryPrice: marketPrice,
    stopLoss: marketPrice * 0.95,
    takeProfit: marketPrice * 1.08,
    color: '#a78bfa'
  })

  // Simulate market scenarios
  const simulateScenarios = (params: ParameterSet): SimulationResult => {
    const scenarios = 1000
    let wins = 0
    let totalWin = 0
    let totalLoss = 0
    let maxDD = 0
    let returns: number[] = []

    for (let i = 0; i < scenarios; i++) {
      // Monte Carlo simulation
      const priceChange = (Math.random() - 0.5) * 0.2 // ±20% price movement
      const finalPrice = params.entryPrice * (1 + priceChange)
      
      // Account for slippage
      const slippageImpact = params.slippage / 100
      const effectivePrice = params.entryPrice * (1 + slippageImpact)
      
      // Calculate P&L
      let pnl = (finalPrice - effectivePrice) * params.quantity * params.leverage
      
      // Apply stop loss and take profit
      if (params.stopLoss && finalPrice <= params.stopLoss) {
        pnl = (params.stopLoss - effectivePrice) * params.quantity * params.leverage
      } else if (params.takeProfit && finalPrice >= params.takeProfit) {
        pnl = (params.takeProfit - effectivePrice) * params.quantity * params.leverage
      }
      
      const returnPct = (pnl / (params.entryPrice * params.quantity)) * 100
      returns.push(returnPct)
      
      if (pnl > 0) {
        wins++
        totalWin += pnl
      } else {
        totalLoss += Math.abs(pnl)
      }
      
      // Track drawdown
      if (returnPct < maxDD) maxDD = returnPct
    }

    const winRate = (wins / scenarios) * 100
    const avgWin = wins > 0 ? totalWin / wins : 0
    const avgLoss = (scenarios - wins) > 0 ? totalLoss / (scenarios - wins) : 0
    const expectedReturn = returns.reduce((sum, r) => sum + r, 0) / scenarios
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - expectedReturn, 2), 0) / scenarios)
    const sharpeRatio = volatility > 0 ? expectedReturn / volatility : 0
    const totalPnL = totalWin - totalLoss
    
    // Risk score (0-100, lower is better)
    const riskScore = Math.min(100, Math.max(0, 
      (Math.abs(maxDD) * 0.4) + 
      (volatility * 0.3) + 
      ((100 - winRate) * 0.2) + 
      (params.leverage * 5)
    ))

    return {
      parameterId: params.id,
      expectedReturn,
      maxDrawdown: maxDD,
      sharpeRatio,
      winRate,
      avgWin,
      avgLoss,
      totalPnL,
      riskScore
    }
  }

  const results = useMemo(() => {
    return [...parameters, customParams].map(param => ({
      param,
      result: simulateScenarios(param)
    }))
  }, [parameters, customParams, marketPrice])

  const selectedResult = results.find(r => r.param.id === selectedParam)

  const getRiskColor = (score: number) => {
    if (score < 30) return 'var(--success)'
    if (score < 60) return 'var(--col-risk)'
    return 'var(--danger)'
  }

  const getReturnColor = (value: number) => {
    if (value > 0) return 'var(--success)'
    if (value < 0) return 'var(--danger)'
    return 'var(--muted)'
  }

  return (
    <div className="parameter-impact-simulator">
      <div className="simulator-header">
        <h3>Parameter Impact Analysis</h3>
        <p className="muted">Test different parameter combinations to optimize your trading strategy for {instrument}</p>
      </div>

      {/* Parameter Selection */}
      <div className="parameter-selection">
        <div className="parameter-tabs">
          {[...parameters, customParams].map(param => (
            <button
              key={param.id}
              className={`parameter-tab ${selectedParam === param.id ? 'active' : ''}`}
              style={{ borderColor: param.color }}
              onClick={() => setSelectedParam(param.id)}
            >
              <div className="param-indicator" style={{ backgroundColor: param.color }}></div>
              <span>{param.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Configuration */}
      {selectedParam === 'custom' && (
        <div className="custom-parameters card">
          <h4>Custom Parameters</h4>
          <div className="param-grid">
            <div className="param-group">
              <label>Leverage (×)</label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={customParams.leverage}
                onChange={e => setCustomParams(prev => ({ ...prev, leverage: Number(e.target.value) }))}
              />
              <span className="param-value">{customParams.leverage}×</span>
            </div>
            <div className="param-group">
              <label>Slippage (%)</label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={customParams.slippage}
                onChange={e => setCustomParams(prev => ({ ...prev, slippage: Number(e.target.value) }))}
              />
              <span className="param-value">{(customParams.slippage * 100).toFixed(2)}%</span>
            </div>
            <div className="param-group">
              <label>Hedge Ratio (%)</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={customParams.hedgeRatio}
                onChange={e => setCustomParams(prev => ({ ...prev, hedgeRatio: Number(e.target.value) }))}
              />
              <span className="param-value">{(customParams.hedgeRatio * 100).toFixed(0)}%</span>
            </div>
            <div className="param-group">
              <label>Quantity</label>
              <input
                type="number"
                min="100"
                max="50000"
                step="100"
                value={customParams.quantity}
                onChange={e => setCustomParams(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Stop Loss ($)</label>
              <input
                type="number"
                min="50"
                max="200"
                step="0.1"
                value={customParams.stopLoss || 0}
                onChange={e => setCustomParams(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
              />
            </div>
            <div className="param-group">
              <label>Take Profit ($)</label>
              <input
                type="number"
                min="50"
                max="200"
                step="0.1"
                value={customParams.takeProfit || 0}
                onChange={e => setCustomParams(prev => ({ ...prev, takeProfit: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Comparison */}
      <div className="results-comparison">
        <h4>Performance Comparison</h4>
        <div className="results-grid">
          {results.map(({ param, result }) => (
            <div 
              key={param.id} 
              className={`result-card ${selectedParam === param.id ? 'selected' : ''}`}
              onClick={() => setSelectedParam(param.id)}
            >
              <div className="result-header">
                <div className="result-indicator" style={{ backgroundColor: param.color }}></div>
                <span className="result-name">{param.name}</span>
                <div className="risk-badge" style={{ color: getRiskColor(result.riskScore) }}>
                  Risk: {result.riskScore.toFixed(0)}
                </div>
              </div>
              
              <div className="result-metrics">
                <div className="metric">
                  <span className="metric-label">Expected Return</span>
                  <span className="metric-value" style={{ color: getReturnColor(result.expectedReturn) }}>
                    {result.expectedReturn >= 0 ? '+' : ''}{result.expectedReturn.toFixed(2)}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Win Rate</span>
                  <span className="metric-value">{result.winRate.toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Sharpe Ratio</span>
                  <span className="metric-value">{result.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Max Drawdown</span>
                  <span className="metric-value" style={{ color: 'var(--danger)' }}>
                    {result.maxDrawdown.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Analysis */}
      {selectedResult && (
        <div className="detailed-analysis card">
          <h4>Detailed Analysis - {selectedResult.param.name}</h4>
          <div className="analysis-grid">
            <div className="analysis-section">
              <h5>Risk Metrics</h5>
              <div className="metric-row">
                <span>Risk Score:</span>
                <span style={{ color: getRiskColor(selectedResult.result.riskScore) }}>
                  {selectedResult.result.riskScore.toFixed(0)}/100
                </span>
              </div>
              <div className="metric-row">
                <span>Max Drawdown:</span>
                <span style={{ color: 'var(--danger)' }}>
                  {selectedResult.result.maxDrawdown.toFixed(2)}%
                </span>
              </div>
              <div className="metric-row">
                <span>Leverage Impact:</span>
                <span>{selectedResult.param.leverage}× multiplier</span>
              </div>
            </div>
            
            <div className="analysis-section">
              <h5>Return Analysis</h5>
              <div className="metric-row">
                <span>Expected Return:</span>
                <span style={{ color: getReturnColor(selectedResult.result.expectedReturn) }}>
                  {selectedResult.result.expectedReturn >= 0 ? '+' : ''}{selectedResult.result.expectedReturn.toFixed(2)}%
                </span>
              </div>
              <div className="metric-row">
                <span>Average Win:</span>
                <span style={{ color: 'var(--success)' }}>
                  ${selectedResult.result.avgWin.toFixed(0)}
                </span>
              </div>
              <div className="metric-row">
                <span>Average Loss:</span>
                <span style={{ color: 'var(--danger)' }}>
                  -${selectedResult.result.avgLoss.toFixed(0)}
                </span>
              </div>
            </div>
            
            <div className="analysis-section">
              <h5>Strategy Efficiency</h5>
              <div className="metric-row">
                <span>Win Rate:</span>
                <span>{selectedResult.result.winRate.toFixed(1)}%</span>
              </div>
              <div className="metric-row">
                <span>Sharpe Ratio:</span>
                <span>{selectedResult.result.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="metric-row">
                <span>Total P&L:</span>
                <span style={{ color: getReturnColor(selectedResult.result.totalPnL) }}>
                  ${selectedResult.result.totalPnL.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="button primary"
              onClick={() => onParameterChange?.(selectedResult.param)}
            >
              Apply These Parameters
            </button>
            <button className="button">
              Save as Preset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

