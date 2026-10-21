import { useState, useEffect, useMemo } from 'react'
import AdvancedChart from './AdvancedChart'

interface ScenarioParameter {
  parameter_id: string
  name: string
  description: string
  current_value: number
  min_value: number
  max_value: number
  unit: string
  impact_weight: number
}

interface ScenarioResult {
  scenario_id: string
  name: string
  parameters: { [key: string]: number }
  estimated_pnl_impact: number
  price_impact: number
  volume_impact: number
  risk_metrics: {
    var_change: number
    exposure_change: number
    concentration_risk: number
  }
  probability: number
  time_horizon: string
  confidence_level: number
}

interface PredefinedScenario {
  id: string
  name: string
  description: string
  icon: string
  category: 'market' | 'operational' | 'geopolitical' | 'environmental'
  parameters: { [key: string]: number }
}

// Mock scenario parameters
const mockParameters: ScenarioParameter[] = [
  {
    parameter_id: 'oil_price',
    name: 'Oil Price Change',
    description: 'WTI Crude oil price percentage change',
    current_value: 0,
    min_value: -50,
    max_value: 100,
    unit: '%',
    impact_weight: 0.8
  },
  {
    parameter_id: 'gas_price',
    name: 'Natural Gas Price',
    description: 'Natural gas price percentage change',
    current_value: 0,
    min_value: -40,
    max_value: 150,
    unit: '%',
    impact_weight: 0.6
  },
  {
    parameter_id: 'usd_strength',
    name: 'USD Strength',
    description: 'US Dollar index change',
    current_value: 0,
    min_value: -20,
    max_value: 25,
    unit: '%',
    impact_weight: 0.4
  },
  {
    parameter_id: 'volatility',
    name: 'Market Volatility',
    description: 'Overall market volatility multiplier',
    current_value: 1,
    min_value: 0.5,
    max_value: 3,
    unit: 'x',
    impact_weight: 0.5
  },
  {
    parameter_id: 'demand_shock',
    name: 'Demand Shock',
    description: 'Sudden demand change percentage',
    current_value: 0,
    min_value: -30,
    max_value: 40,
    unit: '%',
    impact_weight: 0.7
  }
]

// Predefined scenarios
const predefinedScenarios: PredefinedScenario[] = [
  {
    id: 'geopolitical_crisis',
    name: 'Geopolitical Crisis',
    description: 'Major oil-producing region conflict leading to supply disruption',
    icon: '🌍',
    category: 'geopolitical',
    parameters: { oil_price: 25, gas_price: 15, volatility: 2.2, demand_shock: -5, usd_strength: 5 }
  },
  {
    id: 'recession_scenario',
    name: 'Economic Recession',
    description: 'Global economic downturn reducing energy demand',
    icon: '📉',
    category: 'market',
    parameters: { oil_price: -30, gas_price: -25, volatility: 1.8, demand_shock: -20, usd_strength: 8 }
  },
  {
    id: 'extreme_weather',
    name: 'Extreme Weather Event',
    description: 'Hurricane affecting major refining capacity',
    icon: '🌪️',
    category: 'environmental',
    parameters: { oil_price: 15, gas_price: 40, volatility: 2.5, demand_shock: 10, usd_strength: -2 }
  },
  {
    id: 'tech_disruption',
    name: 'Technology Disruption',
    description: 'Major breakthrough in renewable energy adoption',
    icon: '⚡',
    category: 'market',
    parameters: { oil_price: -20, gas_price: -35, volatility: 1.6, demand_shock: -15, usd_strength: -3 }
  },
  {
    id: 'supply_glut',
    name: 'Supply Glut',
    description: 'Massive increase in production capacity',
    icon: '🛢️',
    category: 'operational',
    parameters: { oil_price: -40, gas_price: -30, volatility: 1.3, demand_shock: 5, usd_strength: -5 }
  },
  {
    id: 'energy_transition',
    name: 'Accelerated Energy Transition',
    description: 'Rapid shift to renewable energy sources',
    icon: '🔋',
    category: 'environmental',
    parameters: { oil_price: -25, gas_price: -20, volatility: 1.8, demand_shock: -25, usd_strength: 2 }
  }
]

export default function WhatIfAnalysisPanel() {
  const [parameters, setParameters] = useState<ScenarioParameter[]>([])
  const [currentParameters, setCurrentParameters] = useState<{ [key: string]: number }>({})
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioResult[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setParameters(mockParameters)
      const initialParams: { [key: string]: number } = {}
      mockParameters.forEach(p => {
        initialParams[p.parameter_id] = p.current_value
      })
      setCurrentParameters(initialParams)
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  // Calculate scenario impact
  const calculateScenarioImpact = useMemo(() => {
    if (Object.keys(currentParameters).length === 0) return null

    const totalWeightedImpact = parameters.reduce((sum, param) => {
      const value = currentParameters[param.parameter_id] || 0
      const normalizedValue = value / 100 // Normalize to percentage
      return sum + (normalizedValue * param.impact_weight)
    }, 0)

    const pnl_impact = totalWeightedImpact * 2500000 // Base PnL impact
    const price_impact = currentParameters.oil_price || 0
    const volume_impact = (currentParameters.demand_shock || 0) * 0.8
    const var_change = Math.abs(totalWeightedImpact) * 1200000
    const exposure_change = pnl_impact * 0.6
    const concentration_risk = Math.abs(totalWeightedImpact) * 0.3

    return {
      scenario_id: `scenario_${Date.now()}`,
      name: selectedScenario ? predefinedScenarios.find(s => s.id === selectedScenario)?.name || 'Custom Scenario' : 'Custom Scenario',
      parameters: { ...currentParameters },
      estimated_pnl_impact: pnl_impact,
      price_impact,
      volume_impact,
      risk_metrics: {
        var_change,
        exposure_change,
        concentration_risk
      },
      probability: Math.max(0.1, Math.min(0.9, 0.5 - Math.abs(totalWeightedImpact) * 0.3)),
      time_horizon: '1-6 months',
      confidence_level: Math.max(0.6, Math.min(0.95, 0.8 - Math.abs(totalWeightedImpact) * 0.2))
    }
  }, [currentParameters, parameters, selectedScenario])

  useEffect(() => {
    if (calculateScenarioImpact) {
      setResult(calculateScenarioImpact)
    }
  }, [calculateScenarioImpact])

  const handleParameterChange = (paramId: string, value: number) => {
    setCurrentParameters(prev => ({
      ...prev,
      [paramId]: value
    }))
    setSelectedScenario(null) // Clear predefined scenario when manually adjusting
  }

  const applyPredefinedScenario = (scenarioId: string) => {
    const scenario = predefinedScenarios.find(s => s.id === scenarioId)
    if (scenario) {
      setCurrentParameters(scenario.parameters)
      setSelectedScenario(scenarioId)
    }
  }

  const saveScenario = () => {
    if (result) {
      setScenarioHistory(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 scenarios
    }
  }

  const resetScenario = () => {
    const resetParams: { [key: string]: number } = {}
    parameters.forEach(p => {
      resetParams[p.parameter_id] = p.current_value
    })
    setCurrentParameters(resetParams)
    setSelectedScenario(null)
  }

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'market': return '📊'
      case 'operational': return '⚙️'
      case 'geopolitical': return '🌍'
      case 'environmental': return '🌱'
      default: return '📋'
    }
  }

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🎯</div>
        <div>Loading scenario analysis models...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🎯 What-If Scenario Analysis</h3>
          <div className="live-indicator">Interactive Modeling • Real-time Impact</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={saveScenario} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            💾 Save Scenario
          </button>
          <button onClick={resetScenario} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Predefined Scenarios */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          🚀 Quick Scenarios
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px' 
        }}>
          {predefinedScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`card ${selectedScenario === scenario.id ? 'accent-trading' : ''}`}
              style={{ 
                padding: '12px', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => applyPredefinedScenario(scenario.id)}
              onMouseEnter={(e) => {
                if (selectedScenario !== scenario.id) {
                  e.currentTarget.style.background = 'var(--hover-bg)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedScenario !== scenario.id) {
                  e.currentTarget.style.background = 'var(--card-bg)'
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>{scenario.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{scenario.name}</span>
                <span style={{ fontSize: '10px' }}>{getCategoryIcon(scenario.category)}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.3' }}>
                {scenario.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Parameter Controls */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            ⚙️ Scenario Parameters
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {parameters.map((param) => (
              <div key={param.parameter_id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{param.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{param.description}</div>
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: currentParameters[param.parameter_id] > 0 ? 'var(--success)' : 
                           currentParameters[param.parameter_id] < 0 ? 'var(--danger)' : 'var(--text)'
                  }}>
                    {currentParameters[param.parameter_id]?.toFixed(1) || 0}{param.unit}
                  </div>
                </div>
                <input
                  type="range"
                  min={param.min_value}
                  max={param.max_value}
                  step={param.unit === '%' ? 1 : 0.1}
                  value={currentParameters[param.parameter_id] || param.current_value}
                  onChange={(e) => handleParameterChange(param.parameter_id, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  <span>{param.min_value}{param.unit}</span>
                  <span>Impact Weight: {(param.impact_weight * 100).toFixed(0)}%</span>
                  <span>{param.max_value}{param.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Display */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            📊 Impact Analysis
          </h4>
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Overall Impact */}
              <div className={`card ${result.estimated_pnl_impact >= 0 ? 'accent-finance' : 'accent-risk'}`} 
                   style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="sub" style={{ marginBottom: '8px' }}>Estimated P&L Impact</div>
                  <div className="value" style={{ 
                    fontSize: '28px', 
                    color: result.estimated_pnl_impact >= 0 ? 'var(--success)' : 'var(--danger)' 
                  }}>
                    {result.estimated_pnl_impact >= 0 ? '+' : ''}{formatCurrency(result.estimated_pnl_impact)}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                    Confidence: {(result.confidence_level * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="kpi">
                  <div>
                    <div className="sub">Price Impact</div>
                    <div className="value" style={{ 
                      color: result.price_impact >= 0 ? 'var(--success)' : 'var(--danger)' 
                    }}>
                      {result.price_impact >= 0 ? '+' : ''}{result.price_impact.toFixed(1)}%
                    </div>
                  </div>
                  <span style={{ fontSize: '20px' }}>💰</span>
                </div>
                <div className="kpi">
                  <div>
                    <div className="sub">Volume Impact</div>
                    <div className="value" style={{ 
                      color: result.volume_impact >= 0 ? 'var(--success)' : 'var(--danger)' 
                    }}>
                      {result.volume_impact >= 0 ? '+' : ''}{result.volume_impact.toFixed(1)}%
                    </div>
                  </div>
                  <span style={{ fontSize: '20px' }}>📊</span>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="card" style={{ padding: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600' }}>
                  🛡️ Risk Impact Analysis
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>VaR Change:</span>
                    <span style={{ fontWeight: '500' }}>{formatCurrency(result.risk_metrics.var_change)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exposure Change:</span>
                    <span style={{ fontWeight: '500' }}>{formatCurrency(result.risk_metrics.exposure_change)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Concentration Risk:</span>
                    <span style={{ fontWeight: '500' }}>{(result.risk_metrics.concentration_risk * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Probability & Timeline */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Scenario Probability</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>
                      {(result.probability * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Time Horizon</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{result.time_horizon}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario History */}
      {scenarioHistory.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
            📚 Scenario History
          </h4>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {scenarioHistory.map((scenario, index) => (
              <div key={scenario.scenario_id} className="card" style={{ 
                minWidth: '200px', 
                padding: '12px',
                cursor: 'pointer'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                  {scenario.name}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px',
                  color: scenario.estimated_pnl_impact >= 0 ? 'var(--success)' : 'var(--danger)' 
                }}>
                  {scenario.estimated_pnl_impact >= 0 ? '+' : ''}{formatCurrency(scenario.estimated_pnl_impact)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  Confidence: {(scenario.confidence_level * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
