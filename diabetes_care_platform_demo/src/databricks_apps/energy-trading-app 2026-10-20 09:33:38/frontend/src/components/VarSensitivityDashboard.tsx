import { useState, useEffect } from 'react'
import Sparkline from './Sparkline'

interface VarSensitivity {
  product: string
  portfolio: string
  var_95: number
  var_99: number
  expected_shortfall: number
  price_sensitivity: number
  volatility_sensitivity: number
  correlation_sensitivity: number
  duration_risk?: number
}

// Mock data for beautiful demonstration
const mockSensitivities: VarSensitivity[] = [
  {
    product: 'WTI Crude',
    portfolio: 'Energy Portfolio',
    var_95: 2850000,
    var_99: 4200000,
    expected_shortfall: 5100000,
    price_sensitivity: 1.35,
    volatility_sensitivity: 1.12,
    correlation_sensitivity: 0.89,
    duration_risk: 0.95
  },
  {
    product: 'Natural Gas',
    portfolio: 'Gas Portfolio',
    var_95: 1950000,
    var_99: 2800000,
    expected_shortfall: 3400000,
    price_sensitivity: 1.18,
    volatility_sensitivity: 1.45,
    correlation_sensitivity: 1.02,
    duration_risk: 1.15
  },
  {
    product: 'Brent Crude',
    portfolio: 'Oil Portfolio',
    var_95: 3200000,
    var_99: 4650000,
    expected_shortfall: 5800000,
    price_sensitivity: 1.52,
    volatility_sensitivity: 1.28,
    correlation_sensitivity: 0.95,
    duration_risk: 0.88
  },
  {
    product: 'Gold',
    portfolio: 'Metals Portfolio',
    var_95: 1450000,
    var_99: 2100000,
    expected_shortfall: 2650000,
    price_sensitivity: 0.95,
    volatility_sensitivity: 0.82,
    correlation_sensitivity: 0.75,
    duration_risk: 0.68
  }
]

export default function VarSensitivityDashboard() {
  const [sensitivities, setSensitivities] = useState<VarSensitivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string>('var_95')
  const [drillDownProduct, setDrillDownProduct] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading with mock data
    const timer = setTimeout(() => {
      setSensitivities(mockSensitivities)
      setLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }

  const getSensitivityColor = (value: number) => {
    if (value >= 1.5) return '#ff4757'
    if (value >= 1.2) return '#ff6b35'
    if (value >= 1.0) return '#ffa502'
    if (value >= 0.8) return '#26de81'
    return '#2ed573'
  }

  const getSensitivityLevel = (value: number) => {
    if (value >= 1.5) return 'Very High'
    if (value >= 1.2) return 'High'
    if (value >= 1.0) return 'Medium'
    if (value >= 0.8) return 'Low'
    return 'Very Low'
  }

  const getMetricValue = (sensitivity: VarSensitivity, metric: string) => {
    switch (metric) {
      case 'var_95': return sensitivity.var_95
      case 'var_99': return sensitivity.var_99
      case 'expected_shortfall': return sensitivity.expected_shortfall
      case 'price_sensitivity': return sensitivity.price_sensitivity
      case 'volatility_sensitivity': return sensitivity.volatility_sensitivity
      case 'correlation_sensitivity': return sensitivity.correlation_sensitivity
      case 'duration_risk': return sensitivity.duration_risk || 0
      default: return 0
    }
  }

  const metrics = [
    { key: 'var_95', label: 'VaR 95%', format: 'currency' },
    { key: 'var_99', label: 'VaR 99%', format: 'currency' },
    { key: 'expected_shortfall', label: 'Expected Shortfall', format: 'currency' },
    { key: 'price_sensitivity', label: 'Price Sensitivity', format: 'ratio' },
    { key: 'volatility_sensitivity', label: 'Volatility Sensitivity', format: 'ratio' },
    { key: 'correlation_sensitivity', label: 'Correlation Sensitivity', format: 'ratio' },
    { key: 'duration_risk', label: 'Duration Risk', format: 'ratio' }
  ]

  const totalVaR95 = sensitivities.reduce((sum, s) => sum + s.var_95, 0)
  const totalVaR99 = sensitivities.reduce((sum, s) => sum + s.var_99, 0)
  const avgPriceSensitivity = sensitivities.length > 0 ? sensitivities.reduce((sum, s) => sum + s.price_sensitivity, 0) / sensitivities.length : 0
  const avgVolatilitySensitivity = sensitivities.length > 0 ? sensitivities.reduce((sum, s) => sum + s.volatility_sensitivity, 0) / sensitivities.length : 0

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <div>Loading VaR sensitivity data...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">📈 Multi-Factor VaR & Sensitivity Dashboard</h3>
        </div>
        <div>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            {metrics.map(metric => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric">
          <div className="label">Total VaR 95%</div>
          <div className="value" style={{ color: 'var(--brand)' }}>
            {formatValue(totalVaR95)}
          </div>
        </div>
        <div className="metric">
          <div className="label">Total VaR 99%</div>
          <div className="value" style={{ color: 'var(--col-risk)' }}>
            {formatValue(totalVaR99)}
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg Price Sensitivity</div>
          <div className="value" style={{ color: 'var(--success)' }}>
            {avgPriceSensitivity.toFixed(2)}
          </div>
        </div>
        <div className="metric">
          <div className="label">Avg Volatility Sensitivity</div>
          <div className="value" style={{ color: 'var(--col-ops)' }}>
            {avgVolatilitySensitivity.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {sensitivities.map((sensitivity, index) => (
          <div 
            key={index} 
            className="card"
            style={{ 
              padding: '20px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              border: drillDownProduct === sensitivity.product ? '2px solid var(--brand)' : '1px solid var(--border)'
            }}
            onClick={() => setDrillDownProduct(
              drillDownProduct === sensitivity.product ? null : sensitivity.product
            )}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)', fontSize: '16px' }}>{sensitivity.product}</h4>
                <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{sensitivity.portfolio}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--brand)', marginBottom: '2px' }}>
                  {metrics.find(m => m.key === selectedMetric)?.format === 'currency' 
                    ? formatValue(getMetricValue(sensitivity, selectedMetric))
                    : getMetricValue(sensitivity, selectedMetric).toFixed(2)
                  }
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {metrics.find(m => m.key === selectedMetric)?.label}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elev)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>VaR 95%</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{formatValue(sensitivity.var_95)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elev)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>VaR 99%</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{formatValue(sensitivity.var_99)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elev)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Expected Shortfall</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{formatValue(sensitivity.expected_shortfall)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Price</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    textTransform: 'uppercase',
                    color: sensitivity.price_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.price_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}>
                    {getSensitivityLevel(sensitivity.price_sensitivity)}
                  </span>
                </div>
                <div className="progress" style={{ marginBottom: '4px' }}>
                  <span style={{ 
                    width: `${Math.min(sensitivity.price_sensitivity * 50, 100)}%`,
                    background: sensitivity.price_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.price_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}></span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  {sensitivity.price_sensitivity.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Volatility</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    textTransform: 'uppercase',
                    color: sensitivity.volatility_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.volatility_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}>
                    {getSensitivityLevel(sensitivity.volatility_sensitivity)}
                  </span>
                </div>
                <div className="progress" style={{ marginBottom: '4px' }}>
                  <span style={{ 
                    width: `${Math.min(sensitivity.volatility_sensitivity * 50, 100)}%`,
                    background: sensitivity.volatility_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.volatility_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}></span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  {sensitivity.volatility_sensitivity.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Correlation</span>
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    textTransform: 'uppercase',
                    color: sensitivity.correlation_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.correlation_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}>
                    {getSensitivityLevel(sensitivity.correlation_sensitivity)}
                  </span>
                </div>
                <div className="progress" style={{ marginBottom: '4px' }}>
                  <span style={{ 
                    width: `${Math.min(sensitivity.correlation_sensitivity * 50, 100)}%`,
                    background: sensitivity.correlation_sensitivity >= 1.5 ? 'var(--danger)' : sensitivity.correlation_sensitivity >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                  }}></span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  {sensitivity.correlation_sensitivity.toFixed(2)}
                </div>
              </div>

              {sensitivity.duration_risk && (
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Duration</span>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: '600', 
                      textTransform: 'uppercase',
                      color: sensitivity.duration_risk >= 1.5 ? 'var(--danger)' : sensitivity.duration_risk >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                    }}>
                      {getSensitivityLevel(sensitivity.duration_risk)}
                    </span>
                  </div>
                  <div className="progress" style={{ marginBottom: '4px' }}>
                    <span style={{ 
                      width: `${Math.min(sensitivity.duration_risk * 50, 100)}%`,
                      background: sensitivity.duration_risk >= 1.5 ? 'var(--danger)' : sensitivity.duration_risk >= 1.2 ? 'var(--col-risk)' : 'var(--success)'
                    }}></span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                    {sensitivity.duration_risk.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {drillDownProduct === sensitivity.product && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', color: 'var(--text)', fontSize: '14px' }}>Detailed Analysis</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-elev)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>VaR Trend (7 days)</div>
                    <Sparkline 
                      data={[
                        sensitivity.var_95 * 0.9,
                        sensitivity.var_95 * 0.95,
                        sensitivity.var_95 * 1.1,
                        sensitivity.var_95 * 0.85,
                        sensitivity.var_95 * 1.05,
                        sensitivity.var_95 * 0.92,
                        sensitivity.var_95
                      ]} 
                    />
                  </div>
                  <div style={{ background: 'var(--bg-elev)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>Systematic Risk:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{formatValue(sensitivity.var_95 * 0.7)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>Idiosyncratic Risk:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text)' }}>{formatValue(sensitivity.var_95 * 0.3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
