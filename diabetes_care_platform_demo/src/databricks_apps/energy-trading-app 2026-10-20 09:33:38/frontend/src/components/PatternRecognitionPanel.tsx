import { useState, useEffect, useMemo } from 'react'
import Sparkline from './Sparkline'

interface PatternAlert {
  alert_id: string
  pattern_type: string
  instrument: string
  confidence_score: number
  detected_at: string
  expected_direction: 'UP' | 'DOWN' | 'SIDEWAYS'
  time_horizon: string
  description: string
  historical_accuracy: number
  suggested_action: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  market_data: number[]
}

interface AnomalyDetection {
  anomaly_id: string
  anomaly_type: string
  instrument: string
  deviation_score: number
  detected_at: string
  description: string
  impact_assessment: string
  auto_flagged: boolean
  requires_attention: boolean
}

// Mock pattern alerts
const mockPatternAlerts: PatternAlert[] = [
  {
    alert_id: 'pat_001',
    pattern_type: 'Head and Shoulders',
    instrument: 'WTI Crude',
    confidence_score: 0.89,
    detected_at: new Date(Date.now() - 15 * 60000).toISOString(),
    expected_direction: 'DOWN',
    time_horizon: '2-4 hours',
    description: 'Classic reversal pattern detected with high volume confirmation',
    historical_accuracy: 0.78,
    suggested_action: 'Consider short positions or hedge existing long exposure',
    risk_level: 'HIGH',
    market_data: [75.2, 75.8, 76.1, 75.9, 75.3, 74.8, 74.2, 73.9, 74.1, 74.5]
  },
  {
    alert_id: 'pat_002',
    pattern_type: 'Ascending Triangle',
    instrument: 'Natural Gas',
    confidence_score: 0.76,
    detected_at: new Date(Date.now() - 30 * 60000).toISOString(),
    expected_direction: 'UP',
    time_horizon: '4-8 hours',
    description: 'Bullish continuation pattern with increasing volume',
    historical_accuracy: 0.82,
    suggested_action: 'Potential buying opportunity on breakout confirmation',
    risk_level: 'MEDIUM',
    market_data: [2.85, 2.88, 2.91, 2.89, 2.92, 2.94, 2.93, 2.95, 2.96, 2.98]
  },
  {
    alert_id: 'pat_003',
    pattern_type: 'Double Bottom',
    instrument: 'Brent Crude',
    confidence_score: 0.84,
    detected_at: new Date(Date.now() - 45 * 60000).toISOString(),
    expected_direction: 'UP',
    time_horizon: '6-12 hours',
    description: 'Strong reversal pattern after retesting support level',
    historical_accuracy: 0.85,
    suggested_action: 'Strong buy signal - consider increasing long positions',
    risk_level: 'LOW',
    market_data: [78.1, 77.8, 77.5, 77.8, 78.2, 78.5, 78.8, 79.1, 79.3, 79.6]
  }
]

// Mock anomaly detections
const mockAnomalies: AnomalyDetection[] = [
  {
    anomaly_id: 'ano_001',
    anomaly_type: 'Volume Spike',
    instrument: 'RBOB Gasoline',
    deviation_score: 4.2,
    detected_at: new Date(Date.now() - 5 * 60000).toISOString(),
    description: 'Trading volume 420% above 30-day average',
    impact_assessment: 'Potential news event or large institutional trade',
    auto_flagged: true,
    requires_attention: true
  },
  {
    anomaly_id: 'ano_002',
    anomaly_type: 'Price Arbitrage',
    instrument: 'WTI vs Brent Spread',
    deviation_score: 3.8,
    detected_at: new Date(Date.now() - 12 * 60000).toISOString(),
    description: 'Unusual spread widening beyond historical norms',
    impact_assessment: 'Arbitrage opportunity detected',
    auto_flagged: true,
    requires_attention: true
  },
  {
    anomaly_id: 'ano_003',
    anomaly_type: 'Correlation Break',
    instrument: 'Oil-Gas Correlation',
    deviation_score: 2.9,
    detected_at: new Date(Date.now() - 20 * 60000).toISOString(),
    description: 'Oil and gas prices moving in opposite directions',
    impact_assessment: 'Monitor for potential sector-specific events',
    auto_flagged: false,
    requires_attention: false
  }
]

export default function PatternRecognitionPanel() {
  const [patterns, setPatterns] = useState<PatternAlert[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'patterns' | 'anomalies'>('patterns')
  const [filterRisk, setFilterRisk] = useState('ALL')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPatterns(mockPatternAlerts)
      setAnomalies(mockAnomalies)
      setLoading(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  const filteredPatterns = useMemo(() => {
    if (filterRisk === 'ALL') return patterns
    return patterns.filter(p => p.risk_level === filterRisk)
  }, [patterns, filterRisk])

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => a.requires_attention || !filterRisk)
  }, [anomalies, filterRisk])

  const getPatternIcon = (patternType: string) => {
    switch (patternType.toLowerCase()) {
      case 'head and shoulders': return '👤'
      case 'ascending triangle': return '📈'
      case 'double bottom': return '⚡'
      case 'cup and handle': return '☕'
      default: return '📊'
    }
  }

  const getAnomalyIcon = (anomalyType: string) => {
    switch (anomalyType.toLowerCase()) {
      case 'volume spike': return '📢'
      case 'price arbitrage': return '⚖️'
      case 'correlation break': return '🔗'
      default: return '🔍'
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'var(--danger)'
      case 'MEDIUM': return 'var(--warning)'
      case 'LOW': return 'var(--success)'
      default: return 'var(--text)'
    }
  }

  if (loading) return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🧠</div>
        <div>Loading AI pattern recognition models...</div>
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <h3 className="section-title">🧠 Pattern Recognition & Anomaly Detection</h3>
          <div className="live-indicator">AI-Powered • Real-time Analysis</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={filterRisk} 
            onChange={(e) => setFilterRisk(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="segmented" style={{ marginBottom: '20px' }}>
        <button
          className={activeTab === 'patterns' ? 'active' : ''}
          onClick={() => setActiveTab('patterns')}
        >
          📊 Pattern Detection ({filteredPatterns.length})
        </button>
        <button
          className={activeTab === 'anomalies' ? 'active' : ''}
          onClick={() => setActiveTab('anomalies')}
        >
          🔍 Anomaly Detection ({filteredAnomalies.length})
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px', 
        marginBottom: '20px' 
      }}>
        <div className="kpi accent-trading">
          <div>
            <div className="sub">Active Patterns</div>
            <div className="value">{patterns.length}</div>
          </div>
          <span style={{ fontSize: '20px' }}>📊</span>
        </div>
        <div className="kpi accent-risk">
          <div>
            <div className="sub">High Confidence</div>
            <div className="value">{patterns.filter(p => p.confidence_score > 0.8).length}</div>
          </div>
          <span style={{ fontSize: '20px' }}>🎯</span>
        </div>
        <div className="kpi accent-compliance">
          <div>
            <div className="sub">Anomalies</div>
            <div className="value">{anomalies.filter(a => a.requires_attention).length}</div>
          </div>
          <span style={{ fontSize: '20px' }}>🚨</span>
        </div>
        <div className="kpi accent-finance">
          <div>
            <div className="sub">Avg Accuracy</div>
            <div className="value">
              {patterns.length > 0 ? 
                (patterns.reduce((sum, p) => sum + p.historical_accuracy, 0) / patterns.length * 100).toFixed(0) + '%' 
                : '0%'
              }
            </div>
          </div>
          <span style={{ fontSize: '20px' }}>✅</span>
        </div>
      </div>

      {/* Content Based on Active Tab */}
      {activeTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPatterns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              📊 No patterns match your current filters
            </div>
          ) : (
            filteredPatterns.map((pattern) => (
              <div 
                key={pattern.alert_id} 
                className={`card ${pattern.risk_level === 'HIGH' ? 'accent-risk' : ''}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '32px' }}>{getPatternIcon(pattern.pattern_type)}</span>
                      <span 
                        className={`chip ${pattern.expected_direction === 'UP' ? 'success' : pattern.expected_direction === 'DOWN' ? 'danger' : ''}`}
                        style={{ fontSize: '10px' }}
                      >
                        {pattern.expected_direction}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          {pattern.pattern_type}
                        </h4>
                        <span className="chip" style={{ fontSize: '11px' }}>{pattern.instrument}</span>
                        <span 
                          className="chip"
                          style={{ 
                            fontSize: '10px',
                            background: getRiskColor(pattern.risk_level),
                            color: 'white'
                          }}
                        >
                          {pattern.risk_level} RISK
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {pattern.description}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
                        <div>
                          <strong>Confidence:</strong> {(pattern.confidence_score * 100).toFixed(0)}%
                        </div>
                        <div>
                          <strong>Time Horizon:</strong> {pattern.time_horizon}
                        </div>
                        <div>
                          <strong>Historical Accuracy:</strong> {(pattern.historical_accuracy * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <div style={{ 
                        background: 'var(--card-bg)', 
                        padding: '12px', 
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                          📝 Suggested Action:
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {pattern.suggested_action}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '120px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right' }}>
                      Detected {new Date(pattern.detected_at).toLocaleTimeString()}
                    </div>
                    <div style={{ width: '120px', height: '50px' }}>
                      <Sparkline 
                        data={pattern.market_data} 
                        width={120}
                        height={50}
                        color={pattern.expected_direction === 'UP' ? '#22c55e' : pattern.expected_direction === 'DOWN' ? '#ef4444' : '#f59e0b'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAnomalies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              🔍 No anomalies requiring attention
            </div>
          ) : (
            filteredAnomalies.map((anomaly) => (
              <div 
                key={anomaly.anomaly_id} 
                className={`card ${anomaly.requires_attention ? 'accent-compliance' : ''}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '32px' }}>{getAnomalyIcon(anomaly.anomaly_type)}</span>
                      {anomaly.auto_flagged && (
                        <span className="chip" style={{ fontSize: '9px', background: 'var(--warning)', color: 'white' }}>
                          AUTO
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          {anomaly.anomaly_type}
                        </h4>
                        <span className="chip" style={{ fontSize: '11px' }}>{anomaly.instrument}</span>
                        {anomaly.requires_attention && (
                          <span className="chip danger" style={{ fontSize: '10px' }}>ATTENTION</span>
                        )}
                      </div>
                      
                      <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {anomaly.description}
                      </div>
                      
                      <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                        <strong>Deviation Score:</strong> {anomaly.deviation_score.toFixed(1)}σ
                      </div>
                      
                      <div style={{ 
                        background: 'var(--card-bg)', 
                        padding: '12px', 
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                          🔍 Impact Assessment:
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {anomaly.impact_assessment}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right' }}>
                      Detected {new Date(anomaly.detected_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
