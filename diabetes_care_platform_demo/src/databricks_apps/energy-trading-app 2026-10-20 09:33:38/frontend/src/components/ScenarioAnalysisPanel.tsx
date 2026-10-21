import { useState, useEffect } from 'react'

interface ScenarioAnalysis {
  scenario_id: string
  scenario_name: string
  description: string
  parameters: Record<string, any>
  base_portfolio_value: number
  stressed_portfolio_value: number
  impact_amount: number
  impact_percentage: number
  created_at: string
}

// Mock data for beautiful demonstration
const mockScenarios: ScenarioAnalysis[] = [
  {
    scenario_id: 'scen_001',
    scenario_name: 'Oil Price Shock +25%',
    description: 'Simulated 25% increase in oil prices with elevated volatility',
    parameters: {
      price_change_pct: 25,
      volatility_multiplier: 1.5,
      correlation_shock: 0.2
    },
    base_portfolio_value: 125000000,
    stressed_portfolio_value: 108500000,
    impact_amount: -16500000,
    impact_percentage: -13.2,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    scenario_id: 'scen_002',
    scenario_name: 'Market Crash -30%',
    description: 'Severe market downturn with correlation breakdown',
    parameters: {
      price_change_pct: -30,
      volatility_multiplier: 2.0,
      correlation_shock: 0.8
    },
    base_portfolio_value: 125000000,
    stressed_portfolio_value: 95750000,
    impact_amount: -29250000,
    impact_percentage: -23.4,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  }
]

export default function ScenarioAnalysisPanel() {
  const [scenarios, setScenarios] = useState<ScenarioAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    scenario_name: '',
    price_change_pct: 0,
    volatility_multiplier: 1.0,
    correlation_shock: 0
  })

  useEffect(() => {
    // Load mock scenarios
    setScenarios(mockScenarios)
  }, [])

  const predefinedScenarios = [
    { name: 'Oil Price Shock +25%', price_change_pct: 25, volatility_multiplier: 1.5, correlation_shock: 0.2 },
    { name: 'Market Crash -30%', price_change_pct: -30, volatility_multiplier: 2.0, correlation_shock: 0.8 },
    { name: 'Volatility Spike', price_change_pct: 0, volatility_multiplier: 3.0, correlation_shock: 0.5 },
    { name: 'Correlation Breakdown', price_change_pct: -10, volatility_multiplier: 1.2, correlation_shock: 1.0 },
    { name: 'Supply Disruption', price_change_pct: 40, volatility_multiplier: 1.8, correlation_shock: 0.3 }
  ]

  const runScenario = async (scenarioParams?: any) => {
    setLoading(true)
    try {
      const params = scenarioParams || formData
      // Simulate API call with mock data
      const newScenario: ScenarioAnalysis = {
        scenario_id: `scen_${Date.now()}`,
        scenario_name: params.scenario_name || params.name,
        description: `Custom scenario with ${params.price_change_pct}% price change`,
        parameters: {
          price_change_pct: params.price_change_pct,
          volatility_multiplier: params.volatility_multiplier,
          correlation_shock: params.correlation_shock
        },
        base_portfolio_value: 125000000,
        stressed_portfolio_value: 125000000 * (1 + params.price_change_pct / 100) * 0.85,
        impact_amount: 125000000 * (params.price_change_pct / 100) * 0.85,
        impact_percentage: params.price_change_pct * 0.85,
        created_at: new Date().toISOString()
      }
      
      setTimeout(() => {
        setScenarios(prev => [newScenario, ...prev])
        setLoading(false)
      }, 1500)
    } catch (error) {
      console.error('Failed to run scenario:', error)
      setLoading(false)
    }
  }

  const runPredefinedScenario = (scenario: any) => {
    runScenario(scenario)
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const getImpactIcon = (percentage: number) => {
    if (Math.abs(percentage) > 20) return '🔴'
    if (Math.abs(percentage) > 10) return '🟠'
    if (Math.abs(percentage) > 5) return '🟡'
    return '🟢'
  }

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🎯 Advanced Scenario Analysis & Stress Testing</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Quick Scenarios</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predefinedScenarios.map((scenario, index) => (
              <button
                key={index}
                className="button"
                onClick={() => runPredefinedScenario(scenario)}
                disabled={loading}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Custom Scenario</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="muted">Scenario Name</label>
              <input
                type="text"
                value={formData.scenario_name}
                onChange={(e) => setFormData(prev => ({ ...prev, scenario_name: e.target.value }))}
                placeholder="Enter scenario name"
              />
            </div>
            <div>
              <label className="muted">Price Change (%)</label>
              <input
                type="number"
                value={formData.price_change_pct}
                onChange={(e) => setFormData(prev => ({ ...prev, price_change_pct: parseFloat(e.target.value) || 0 }))}
                step="0.1"
              />
            </div>
            <div>
              <label className="muted">Volatility Multiplier</label>
              <input
                type="number"
                value={formData.volatility_multiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, volatility_multiplier: parseFloat(e.target.value) || 1 }))}
                step="0.1"
                min="0.1"
              />
            </div>
            <div>
              <label className="muted">Correlation Shock</label>
              <input
                type="number"
                value={formData.correlation_shock}
                onChange={(e) => setFormData(prev => ({ ...prev, correlation_shock: parseFloat(e.target.value) || 0 }))}
                step="0.1"
                min="0"
                max="1"
              />
            </div>
          </div>
          <button
            className="button primary"
            onClick={() => runScenario()}
            disabled={loading || !formData.scenario_name}
            style={{ width: '100%' }}
          >
            {loading ? 'Running...' : 'Run Custom Scenario'}
          </button>
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Scenario Results</h4>
        {scenarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            📊 Run a scenario to see results
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {scenarios.map((scenario) => (
              <div 
                key={scenario.scenario_id} 
                className="card"
                style={{ 
                  padding: '20px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '16px' }}>{scenario.scenario_name}</h5>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {new Date(scenario.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{getImpactIcon(scenario.impact_percentage)}</div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '700',
                      color: scenario.impact_percentage < 0 ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {scenario.impact_percentage > 0 ? '+' : ''}{scenario.impact_percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.4' }}>
                  {scenario.description}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px 12px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Base Portfolio Value:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{formatValue(scenario.base_portfolio_value)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '8px 12px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Stressed Portfolio Value:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)' }}>{formatValue(scenario.stressed_portfolio_value)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '6px', fontWeight: '600' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Impact Amount:</span>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: scenario.impact_amount < 0 ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {formatValue(scenario.impact_amount)}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h6 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '14px' }}>Parameters</h6>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {Object.entries(scenario.parameters).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-elev)', borderRadius: '4px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{key.replace('_', ' ')}:</span>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                          {typeof value === 'number' ? 
                            (key.includes('pct') ? `${value}%` : value) : 
                            String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="button" style={{ fontSize: '12px', padding: '6px 12px' }}>Export</button>
                  <button className="button" style={{ fontSize: '12px', padding: '6px 12px' }}>Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
