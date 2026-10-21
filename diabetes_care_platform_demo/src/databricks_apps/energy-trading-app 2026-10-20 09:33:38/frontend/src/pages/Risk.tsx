import { useEffect, useState, useMemo } from 'react'
import RiskAlertPanel from '../components/RiskAlertPanel'
import ExposureLimitMonitor from '../components/ExposureLimitMonitor'
import ScenarioAnalysisPanel from '../components/ScenarioAnalysisPanel'
import VarSensitivityDashboard from '../components/VarSensitivityDashboard'
import HedgeOptimizationPanel from '../components/HedgeOptimizationPanel'
import RiskActivityTable from '../components/RiskActivityTable'
import StaticKPI from '../components/StaticKPI'
import { RISK_KPIS } from '../utils/staticKPIs'

interface RiskDashboardSummary {
  total_exposure: number
  total_var_95: number
  total_var_99: number
  active_alerts: number
  critical_alerts: number
  portfolio_count: number
  hedge_effectiveness_avg: number
  last_updated: string
}

// Mock data for beautiful demonstration
const mockSummary: RiskDashboardSummary = {
  total_exposure: 125500000,
  total_var_95: 8750000,
  total_var_99: 12200000,
  active_alerts: 7,
  critical_alerts: 2,
  portfolio_count: 12,
  hedge_effectiveness_avg: 0.847,
  last_updated: new Date().toISOString()
}

export default function Risk() {
  const [summary, setSummary] = useState<RiskDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('overview')

  useEffect(() => {
    // Use requestAnimationFrame for non-blocking data loading
    requestAnimationFrame(() => {
      // Simulate loading with mock data - reduced delay for better UX
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setSummary(mockSummary)
          setLoading(false)
        })
      }, 300) // Reduced from 1000ms to 300ms

      return () => clearTimeout(timer)
    })
  }, [])

  // Memoize formatValue to avoid recreating on each render
  const formatValue = useMemo(() => (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(2)}`
  }, [])

  // Memoize tabs to avoid recreating on each render
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'monitoring', label: 'Real-Time Monitoring', icon: '👁️' },
    { id: 'scenarios', label: 'Scenario Analysis', icon: '🎯' },
    { id: 'var-sensitivity', label: 'VaR & Sensitivity', icon: '📈' },
    { id: 'hedge-optimization', label: 'Hedge Optimization', icon: '⚖️' },
    { id: 'activity-log', label: 'Activity Log', icon: '📋' }
  ], [])

  // Removed blocking loading screen - show content immediately with discrete loading indicator

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            🛡️ Advanced Risk Management Dashboard
          </h1>
          <div className="live-indicator" style={{ marginTop: '8px' }}>
            Real-time Data • Last updated: {summary ? new Date(summary.last_updated).toLocaleTimeString() : '--:--'}
          </div>
        </div>
      </div>

      {/* Static KPI Grid - Clear and Stable Values */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '16px', 
        marginBottom: '20px',
        position: 'relative'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            background: 'var(--surface-2)',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 10
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--brand)',
              animation: 'pulse 1.5s infinite'
            }} />
            Syncing data...
          </div>
        )}
        <StaticKPI metric={RISK_KPIS.totalExposure} />
        <StaticKPI metric={RISK_KPIS.totalVar95} />
        <StaticKPI metric={RISK_KPIS.activeAlerts} />
        <StaticKPI metric={RISK_KPIS.hedgeEffectiveness} />
      </div>

      <div className="segmented" style={{ 
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 1 auto',
              minWidth: 'fit-content',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span style={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="card-grid cols-2">
            <RiskAlertPanel />
            <ExposureLimitMonitor />
          </div>
        )}

        {activeTab === 'monitoring' && <ExposureLimitMonitor />}
        {activeTab === 'scenarios' && <ScenarioAnalysisPanel />}
        {activeTab === 'var-sensitivity' && <VarSensitivityDashboard />}
        {activeTab === 'hedge-optimization' && <HedgeOptimizationPanel />}
        {activeTab === 'activity-log' && <RiskActivityTable />}
      </div>

    </div>
  )
}
