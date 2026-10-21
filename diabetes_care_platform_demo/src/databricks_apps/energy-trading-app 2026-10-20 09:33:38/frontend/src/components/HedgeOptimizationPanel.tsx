import { useState, useEffect } from 'react'

interface HedgeEffectiveness {
  hedge_id: string
  product: string
  portfolio: string
  hedge_instrument: string
  hedge_ratio: number
  effectiveness_ratio: number
  residual_risk: number
  hedge_cost: number
  recommendation: string
  optimal_ratio?: number
}

interface StressTestResult {
  test_id: string
  test_name: string
  stress_factor: number
  product: string
  portfolio: string
  base_var: number
  stressed_var: number
  var_change_pct: number
  projected_loss: number
  confidence_level: number
}

// Mock data for beautiful demonstration
const mockHedges: HedgeEffectiveness[] = [
  {
    hedge_id: 'hedge_001',
    product: 'WTI Crude',
    portfolio: 'Energy Portfolio',
    hedge_instrument: 'WTI Futures',
    hedge_ratio: 0.75,
    effectiveness_ratio: 0.85,
    residual_risk: 2100000,
    hedge_cost: 125000,
    recommendation: 'Maintain current hedge ratio - effectiveness is good',
    optimal_ratio: 0.78
  },
  {
    hedge_id: 'hedge_002',
    product: 'Natural Gas',
    portfolio: 'Gas Portfolio',
    hedge_instrument: 'NG Futures',
    hedge_ratio: 0.60,
    effectiveness_ratio: 0.72,
    residual_risk: 1850000,
    hedge_cost: 95000,
    recommendation: 'Increase hedge ratio to improve effectiveness',
    optimal_ratio: 0.82
  },
  {
    hedge_id: 'hedge_003',
    product: 'Brent Crude',
    portfolio: 'Oil Portfolio',
    hedge_instrument: 'Brent Futures',
    hedge_ratio: 0.90,
    effectiveness_ratio: 0.92,
    residual_risk: 1200000,
    hedge_cost: 180000,
    recommendation: 'Excellent hedge effectiveness - maintain strategy',
    optimal_ratio: 0.88
  }
]

const mockStressTests: StressTestResult[] = [
  {
    test_id: 'stress_001',
    test_name: 'Oil Price Shock +30%',
    stress_factor: 1.3,
    product: 'WTI Crude',
    portfolio: 'Energy Portfolio',
    base_var: 2850000,
    stressed_var: 4200000,
    var_change_pct: 47.4,
    projected_loss: 8500000,
    confidence_level: 95
  },
  {
    test_id: 'stress_002',
    test_name: 'Volatility Spike 2x',
    stress_factor: 2.0,
    product: 'Natural Gas',
    portfolio: 'Gas Portfolio',
    base_var: 1950000,
    stressed_var: 3400000,
    var_change_pct: 74.4,
    projected_loss: 6200000,
    confidence_level: 99
  }
]

export default function HedgeOptimizationPanel() {
  const [hedges, setHedges] = useState<HedgeEffectiveness[]>([])
  const [stressTests, setStressTests] = useState<StressTestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [runningStressTest, setRunningStressTest] = useState(false)

  useEffect(() => {
    // Simulate loading with mock data
    const timer = setTimeout(() => {
      setHedges(mockHedges)
      setStressTests(mockStressTests)
      setLoading(false)
    }, 900)

    return () => clearTimeout(timer)
  }, [])

  const runStressTest = async (testName: string, stressFactor: number) => {
    setRunningStressTest(true)
    setTimeout(() => {
      const newStressTest: StressTestResult = {
        test_id: `stress_${Date.now()}`,
        test_name: testName,
        stress_factor: stressFactor,
        product: 'Custom Test',
        portfolio: 'All Portfolios',
        base_var: 2500000,
        stressed_var: 2500000 * stressFactor,
        var_change_pct: (stressFactor - 1) * 100,
        projected_loss: 2500000 * stressFactor * 1.5,
        confidence_level: 95
      }
      setStressTests(prev => [newStressTest, ...prev])
      setRunningStressTest(false)
    }, 2000)
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const getEffectivenessLevel = (ratio: number) => {
    if (ratio >= 0.9) return 'Excellent'
    if (ratio >= 0.8) return 'Good'
    if (ratio >= 0.7) return 'Fair'
    if (ratio >= 0.6) return 'Poor'
    return 'Very Poor'
  }

  const getRecommendationIcon = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('excellent')) return '🎯'
    if (recommendation.toLowerCase().includes('maintain')) return '✅'
    if (recommendation.toLowerCase().includes('increase')) return '📈'
    if (recommendation.toLowerCase().includes('decrease')) return '📉'
    if (recommendation.toLowerCase().includes('review')) return '🔍'
    return '💡'
  }

  const avgEffectiveness = hedges.length > 0 ? hedges.reduce((sum, h) => sum + h.effectiveness_ratio, 0) / hedges.length : 0
  const totalHedgeCost = hedges.reduce((sum, h) => sum + h.hedge_cost, 0)
  const totalResidualRisk = hedges.reduce((sum, h) => sum + h.residual_risk, 0)

  const predefinedStressTests = [
    { name: 'Market Volatility Spike', factor: 2.0 },
    { name: 'Extreme Price Movement', factor: 3.0 },
    { name: 'Correlation Breakdown', factor: 2.5 },
    { name: 'Liquidity Crisis', factor: 1.8 }
  ]

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading hedge optimization data...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">⚖️ Automated Hedge Effectiveness & Optimization</h3>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric">
          <div className="label">Active Hedges</div>
          <div className="value" style={{ color: 'var(--brand)' }}>
            {hedges.length}
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg Effectiveness</div>
          <div className="value" style={{ color: 'var(--success)' }}>
            {(avgEffectiveness * 100).toFixed(1)}%
          </div>
        </div>
        <div className="metric">
          <div className="label">Total Hedge Cost</div>
          <div className="value" style={{ color: 'var(--col-risk)' }}>
            {formatValue(totalHedgeCost)}
          </div>
        </div>
        <div className="metric">
          <div className="label">Total Residual Risk</div>
          <div className="value" style={{ color: 'var(--danger)' }}>
            {formatValue(totalResidualRisk)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Hedge Effectiveness</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hedges.map((hedge) => (
              <div 
                key={hedge.hedge_id} 
                className="card"
                style={{ 
                  padding: '16px',
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
                    <h5 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '14px' }}>{hedge.product}</h5>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{hedge.hedge_instrument}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '700',
                      color: hedge.effectiveness_ratio >= 0.8 ? 'var(--success)' : hedge.effectiveness_ratio >= 0.7 ? 'var(--col-risk)' : 'var(--danger)'
                    }}>
                      {(hedge.effectiveness_ratio * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      {getEffectivenessLevel(hedge.effectiveness_ratio)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Current Ratio</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                      {(hedge.hedge_ratio * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Optimal Ratio</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand)' }}>
                      {hedge.optimal_ratio ? (hedge.optimal_ratio * 100).toFixed(0) : '--'}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Residual Risk</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>
                      {formatValue(hedge.residual_risk)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Hedge Cost</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--col-risk)' }}>
                      {formatValue(hedge.hedge_cost)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{getRecommendationIcon(hedge.recommendation)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.3' }}>
                    {hedge.recommendation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Stress Testing</h4>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {predefinedStressTests.map((test, index) => (
                <button
                  key={index}
                  className="button"
                  onClick={() => runStressTest(test.name, test.factor)}
                  disabled={runningStressTest}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {test.name}
                </button>
              ))}
            </div>
            {runningStressTest && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                ⏳ Running stress test...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stressTests.map((test) => (
              <div 
                key={test.test_id} 
                className="card"
                style={{ 
                  padding: '16px',
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
                    <h5 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '14px' }}>{test.test_name}</h5>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{test.product} • {test.confidence_level}% Confidence</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '700',
                      color: test.var_change_pct > 50 ? 'var(--danger)' : test.var_change_pct > 25 ? 'var(--col-risk)' : 'var(--success)'
                    }}>
                      +{test.var_change_pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>VaR Change</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Base VaR</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                      {formatValue(test.base_var)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--bg-elev)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Stressed VaR</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--danger)' }}>
                      {formatValue(test.stressed_var)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', background: 'var(--surface-2)', borderRadius: '6px', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Projected Loss</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>
                      {formatValue(test.projected_loss)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}