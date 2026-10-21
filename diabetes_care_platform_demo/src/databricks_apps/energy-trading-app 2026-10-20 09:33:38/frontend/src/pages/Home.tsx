import { useState, useEffect } from 'react'

// Fixed, stable data for demo purposes
const DASHBOARD_DATA = {
  globalScore: 87,
  lastUpdate: '2025-01-22 14:30:00',
  
  summary: {
    status: 'healthy',
    priority: 'Focus on Risk Management optimization',
    keyWin: 'Trading performance exceeding targets by 15%',
    keyRisk: 'VaR utilization approaching 85% threshold'
  },

  domains: {
    trading: {
      score: 92,
      status: 'excellent',
      color: 'var(--col-trading)',
      icon: '📈',
      title: 'Trading Performance',
      summary: 'Exceptional performance with strong momentum and excellent execution rates.',
      keyMetrics: [
        { label: 'Volume Today', value: '$2.4M', status: 'good' },
        { label: 'Success Rate', value: '89%', status: 'excellent' },
        { label: 'Avg Trade Size', value: '$152K', status: 'good' },
        { label: 'Active Positions', value: '34', status: 'normal' }
      ],
      nextSteps: [
        'Continue momentum with current strategy',
        'Monitor position sizing on volatile instruments',
        'Prepare for end-of-month position reviews'
      ],
      recommendation: 'Maintain current trading pace and risk discipline.'
    },

    risk: {
      score: 74,
      status: 'needs_attention',
      color: 'var(--col-risk)',
      icon: '🛡️',
      title: 'Risk Management',
      summary: 'VaR utilization increasing. Immediate action needed to optimize exposure limits.',
      keyMetrics: [
        { label: 'VaR Current', value: '$1.85M', status: 'warning' },
        { label: 'Limit Utilization', value: '84%', status: 'warning' },
        { label: 'Scenarios Run', value: '12', status: 'good' },
        { label: 'Risk Score', value: '74/100', status: 'needs_attention' }
      ],
      nextSteps: [
        'Review and reduce high-volatility exposures',
        'Implement additional hedging strategies',
        'Update stress testing scenarios',
        'Consider raising VaR limits if justified'
      ],
      recommendation: 'Priority: Reduce VaR utilization below 80% within 48 hours.'
    },

    finance: {
      score: 91,
      status: 'excellent',
      color: 'var(--col-finance)',
      icon: '💰',
      title: 'Financial Control',
      summary: 'Strong financial position with healthy P&L and excellent liquidity management.',
      keyMetrics: [
        { label: 'P&L (7-day)', value: '+$847K', status: 'excellent' },
        { label: 'Margin Available', value: '$15.6M', status: 'excellent' },
        { label: 'Liquidity Score', value: '98%', status: 'excellent' },
        { label: 'Credit Usage', value: '67%', status: 'good' }
      ],
      nextSteps: [
        'Lock in profits on overperforming positions',
        'Diversify revenue streams across commodities',
        'Optimize margin efficiency',
        'Plan Q1 budget allocation'
      ],
      recommendation: 'Excellent performance. Focus on profit optimization and diversification.'
    },

    operations: {
      score: 88,
      status: 'good',
      color: 'var(--col-ops)',
      icon: '⚙️',
      title: 'Operations Efficiency',
      summary: 'High operational efficiency with smooth settlement processes and position management.',
      keyMetrics: [
        { label: 'Efficiency Rate', value: '94%', status: 'excellent' },
        { label: 'Open Positions', value: '156', status: 'normal' },
        { label: 'Settlements Today', value: '23', status: 'good' },
        { label: 'STP Rate', value: '96%', status: 'excellent' }
      ],
      nextSteps: [
        'Automate remaining manual processes',
        'Optimize position reconciliation timing',
        'Enhance settlement tracking dashboard',
        'Plan system maintenance windows'
      ],
      recommendation: 'Strong performance. Continue automation initiatives.'
    },

    compliance: {
      score: 95,
      status: 'excellent',
      color: 'var(--col-compliance)',
      icon: '📋',
      title: 'Compliance Monitor',
      summary: 'All regulatory requirements met. Clean audit trail and no outstanding issues.',
      keyMetrics: [
        { label: 'Open Issues', value: '0', status: 'excellent' },
        { label: 'Audit Score', value: '95%', status: 'excellent' },
        { label: 'Reports Filed', value: '100%', status: 'excellent' },
        { label: 'Last Review', value: '2 days ago', status: 'good' }
      ],
      nextSteps: [
        'Prepare for quarterly regulatory review',
        'Update compliance training materials',
        'Review new regulatory guidelines',
        'Schedule next audit preparation'
      ],
      recommendation: 'Excellent compliance status. Maintain current processes.'
    }
  }
}

export default function Home() {
  const [selectedDomain, setSelectedDomain] = useState<string>('trading')
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--success-soft)'
      case 'good': return 'var(--col-trading)'
      case 'needs_attention': return 'var(--warning)'
      case 'critical': return 'var(--danger-soft)'
      default: return 'var(--muted)'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return '🌟'
      case 'good': return '✅'
      case 'needs_attention': return '⚠️'
      case 'critical': return '🚨'
      default: return '⚪'
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--success-soft)'
      case 'good': return 'var(--col-trading)'
      case 'normal': return 'var(--text)'
      case 'warning': return 'var(--warning)'
      case 'critical': return 'var(--danger-soft)'
      default: return 'var(--muted)'
    }
  }

  const currentDomain = DASHBOARD_DATA.domains[selectedDomain as keyof typeof DASHBOARD_DATA.domains]

  return (
    <div className="executive-dashboard">
      {/* Hero Header */}
      <div 
        className="hero-header"
        style={{
          background: 'linear-gradient(135deg, var(--card) 0%, var(--surface-2) 100%)',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '32px',
          border: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          opacity: animateIn ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="hero-background" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, var(--col-trading)08 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, var(--col-finance)08 0%, transparent 50%)
          `,
          opacity: 0.6
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                margin: '0 0 8px 0',
                background: 'linear-gradient(135deg, var(--text) 0%, var(--muted) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Executive Dashboard
              </h1>
              <p style={{ fontSize: '1.1rem', color: 'var(--muted)', margin: 0 }}>
                360° View of Energy Trading Performance
              </p>
            </div>

            <div className="global-score" style={{
              background: 'linear-gradient(135deg, var(--brand)20 0%, var(--brand)10 100%)',
              border: '2px solid var(--brand)40',
              borderRadius: '24px',
              padding: '24px 32px',
              textAlign: 'center',
              minWidth: '180px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600', marginBottom: '8px' }}>
                GLOBAL HEALTH SCORE
              </div>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: '800', 
                color: 'var(--brand)',
                margin: '0',
                lineHeight: '1'
              }}>
                {DASHBOARD_DATA.globalScore}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--success-soft)', fontWeight: '600', marginTop: '8px' }}>
                🌟 HEALTHY
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="exec-summary" style={{
            background: 'var(--bg-elev)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Executive Summary
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600' }}>PRIORITY FOCUS:</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--warning)', marginTop: '4px' }}>
                    {DASHBOARD_DATA.summary.priority}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600' }}>KEY WIN:</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--success-soft)', marginTop: '4px' }}>
                    {DASHBOARD_DATA.summary.keyWin}
                  </div>
                </div>
              </div>
              <div>
                <div>
                  <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600' }}>KEY RISK:</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--danger-soft)', marginTop: '4px' }}>
                    {DASHBOARD_DATA.summary.keyRisk}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Navigation */}
      <div className="domain-nav" style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          {Object.entries(DASHBOARD_DATA.domains).map(([key, domain]) => (
            <button
              key={key}
              className={`domain-card ${selectedDomain === key ? 'active' : ''}`}
              onClick={() => setSelectedDomain(key)}
              style={{
                background: selectedDomain === key 
                  ? `linear-gradient(135deg, ${domain.color}20 0%, ${domain.color}10 100%)`
                  : 'var(--card)',
                border: selectedDomain === key 
                  ? `2px solid ${domain.color}60`
                  : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: selectedDomain === key ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: selectedDomain === key ? `0 8px 32px ${domain.color}20` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{domain.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                    {domain.title}
                  </h3>
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  color: domain.color
                }}>
                  {domain.score}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{getStatusIcon(domain.status)}</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: getStatusColor(domain.status),
                  textTransform: 'uppercase'
                }}>
                  {domain.status.replace('_', ' ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed View */}
      <div 
        className="detail-view"
        style={{
          background: 'var(--card)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${currentDomain.color}`,
          transition: 'all 0.5s ease',
          transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
          opacity: animateIn ? 1 : 0
        }}
      >
        {/* Domain Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '32px' }}>{currentDomain.icon}</span>
            <div>
              <h2 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '800',
                color: 'var(--text)'
              }}>
                {currentDomain.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '18px', fontWeight: '700', color: currentDomain.color }}>
                  Score: {currentDomain.score}/100
                </span>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: `${getStatusColor(currentDomain.status)}20`,
                  color: getStatusColor(currentDomain.status),
                  border: `1px solid ${getStatusColor(currentDomain.status)}40`
                }}>
                  {getStatusIcon(currentDomain.status)}
                  {currentDomain.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <p style={{ 
            fontSize: '16px', 
            color: 'var(--muted)', 
            margin: 0,
            lineHeight: '1.5'
          }}>
            {currentDomain.summary}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Key Metrics */}
          <div>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Key Metrics
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentDomain.keyMetrics.map((metric, index) => (
                <div 
                  key={index}
                  className="metric-item"
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '500' }}>
                      {metric.label}
                    </span>
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: getMetricStatusColor(metric.status)
                    }}>
                      {metric.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps & Recommendation */}
          <div>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎯 Action Plan
            </h3>

            {/* Recommendation */}
            <div style={{
              background: `${currentDomain.color}10`,
              border: `1px solid ${currentDomain.color}30`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600', marginBottom: '8px' }}>
                RECOMMENDATION
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: currentDomain.color }}>
                {currentDomain.recommendation}
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '600', marginBottom: '12px' }}>
                NEXT STEPS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentDomain.nextSteps.map((step, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--surface-2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--text)'
                    }}
                  >
                    <span style={{ 
                      fontSize: '16px', 
                      color: currentDomain.color,
                      marginTop: '2px'
                    }}>
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .executive-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          min-height: 100vh;
        }

        .domain-card {
          position: relative;
        }

        .domain-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: var(--shadow-lg) !important;
        }

        .metric-item:hover {
          background: var(--bg-elev);
          transform: translateX(4px);
        }

        .detail-view {
          animation: slideInUp 0.6s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .hero-header {
            padding: 24px;
          }
          
          .hero-header > div:first-child {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          
          .global-score {
            align-self: stretch;
            text-align: center;
          }
          
          .detail-view > div:last-child {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}