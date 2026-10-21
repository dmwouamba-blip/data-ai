import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import SearchBar from '../components/SearchBar'
import { IconCompliance, IconShield, IconReport, IconAlert, IconCheck, IconClock, IconTrend, IconUser, IconLeaf, IconLock } from '../components/Icons'

interface ComplianceEvent {
  event_id: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
  category: string
  message: string
  status: 'open' | 'investigating' | 'closed'
}

interface ComplianceMetrics {
  totalEvents: number
  openIssues: number
  criticalAlerts: number
  complianceScore: number
  auditReadiness: number
  reportingStatus: 'on-time' | 'delayed' | 'overdue'
  lastAudit: string
  nextDeadline: string
}

interface RegulatoryReport {
  id: string
  name: string
  regulation: string
  status: 'pending' | 'in-progress' | 'submitted' | 'approved'
  deadline: string
  progress: number
  lastSubmission: string
}

interface AuditTrail {
  id: string
  timestamp: string
  user: string
  action: string
  entity: string
  details: string
  ipAddress: string
}

interface MarketAbuseAlert {
  id: string
  timestamp: string
  type: 'unusual_volume' | 'price_manipulation' | 'insider_trading' | 'spoofing'
  severity: 'low' | 'medium' | 'high'
  instrument: string
  description: string
  status: 'new' | 'investigating' | 'cleared' | 'escalated'
}

interface CounterpartyRisk {
  id: string
  name: string
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC'
  exposure: number
  limit: number
  kycStatus: 'valid' | 'expiring' | 'expired'
  lastReview: string
  riskScore: number
}

interface ESGCertificate {
  id: string
  type: 'REC' | 'RIN' | 'Carbon_Credit' | 'GO'
  quantity: number
  vintage: string
  status: 'active' | 'retired' | 'pending'
  expiryDate: string
  carbonFootprint: number
}

function StatusChip({ text, tone }: { text: string; tone: string }) {
  const getColor = () => {
    switch (tone) {
      case 'high': case 'open': case 'critical': case 'overdue': case 'expired': return 'var(--danger)'
      case 'medium': case 'investigating': case 'delayed': case 'expiring': return 'var(--col-risk)'
      case 'low': case 'closed': case 'on-time': case 'valid': case 'approved': return 'var(--success)'
      case 'pending': case 'in-progress': return 'var(--brand)'
      default: return 'var(--muted)'
    }
  }
  
  const color = getColor()
  return (
    <span style={{ 
      border: `1px solid ${color}`, 
      color, 
      padding: '4px 8px', 
      borderRadius: '12px', 
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase'
    }}>
      {text}
    </span>
  )
}

function ComplianceKPI({ icon, title, value, subtitle, trend, color }: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle: string
  trend?: 'up' | 'down' | 'stable'
  color: string
}) {
  return (
    <div className="kpi" style={{ 
      borderLeft: `4px solid ${color}`,
      padding: '24px',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
        <div style={{ 
          color, 
          fontSize: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${color}15`,
          border: `1px solid ${color}30`
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 800, 
            color,
            lineHeight: 1,
            marginBottom: '8px',
            fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace'
          }}>
            {value}
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--text)',
            marginBottom: '4px'
          }}>
            {title}
          </div>
        </div>
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            background: trend === 'up' ? 'var(--success)15' : trend === 'down' ? 'var(--danger)15' : 'var(--muted)15',
            color: trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted)',
            border: `1px solid ${trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted)'}30`
          }}>
            <span style={{ fontSize: '14px' }}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </span>
            {trend.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: 'var(--muted)',
        lineHeight: 1.4
      }}>
        {subtitle}
      </div>
    </div>
  )
}

function RegulatoryReportingPanel({ reports }: { reports: RegulatoryReport[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconReport style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Regulatory Reporting & Automation</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Automated generation of mandated reports (MiFID II, REMIT, Dodd-Frank, EMIR)
            </p>
          </div>
        </div>
      </div>
      
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Regulation</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Deadline</th>
              <th>Last Submission</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id} className="trade-row">
                <td data-label="Report">
                  <div className="instrument-name">{report.name}</div>
                </td>
                <td data-label="Regulation">
                  <span className="badge compliance">{report.regulation}</span>
                </td>
                <td data-label="Status">
                  <StatusChip text={report.status} tone={report.status} />
                </td>
                <td data-label="Progress">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="progress" style={{ width: '60px' }}>
                      <span style={{ width: `${report.progress}%` }}></span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{report.progress}%</span>
                  </div>
                </td>
                <td data-label="Deadline">
                  <div style={{ fontSize: '12px' }}>
                    {new Date(report.deadline).toLocaleDateString()}
                  </div>
                </td>
                <td data-label="Last Submission">
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {report.lastSubmission ? new Date(report.lastSubmission).toLocaleDateString() : 'Never'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuditTrailPanel({ trails }: { trails: AuditTrail[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconShield style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Audit Trails & Data Integrity</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Complete traceability of trading actions and user activities
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            <IconCheck style={{ width: '12px', height: '12px' }} />
            Tamper-Proof
          </span>
          <span className="chip">
            <IconClock style={{ width: '12px', height: '12px' }} />
            Real-time
          </span>
        </div>
      </div>
      
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {trails.map(trail => (
          <div key={trail.id} style={{
            padding: '12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <IconUser style={{ width: '14px', height: '14px', color: 'var(--brand)' }} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{trail.user}</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{trail.action}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                {trail.entity}: {trail.details}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                IP: {trail.ipAddress} • {new Date(trail.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarketAbuseDetectionPanel({ alerts }: { alerts: MarketAbuseAlert[] }) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'unusual_volume': return '📊'
      case 'price_manipulation': return '📈'
      case 'insider_trading': return '🔍'
      case 'spoofing': return '⚠️'
      default: return '🚨'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconAlert style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Market Abuse & Anti-Fraud Detection</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Real-time monitoring for suspicious trading patterns and market manipulation
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip danger">
            {alerts.filter(a => a.severity === 'high').length} Critical
          </span>
          <span className="chip">
            {alerts.filter(a => a.status === 'new').length} New
          </span>
        </div>
      </div>
      
      <div className="card-grid cols-2">
        {alerts.slice(0, 6).map(alert => (
          <div key={alert.id} className="card" style={{
            borderLeft: `4px solid ${alert.severity === 'high' ? 'var(--danger)' : alert.severity === 'medium' ? 'var(--col-risk)' : 'var(--success)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{getAlertIcon(alert.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>
                  {alert.type.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {alert.instrument}
                </div>
              </div>
              <StatusChip text={alert.severity} tone={alert.severity} />
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              {alert.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusChip text={alert.status} tone={alert.status} />
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CounterpartyCompliancePanel({ counterparties }: { counterparties: CounterpartyRisk[] }) {
  const getRatingColor = (rating: string) => {
    if (['AAA', 'AA'].includes(rating)) return 'var(--success)'
    if (['A', 'BBB'].includes(rating)) return 'var(--brand)'
    if (['BB', 'B'].includes(rating)) return 'var(--col-risk)'
    return 'var(--danger)'
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconUser style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Counterparty & Credit Compliance</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              KYC verification, credit limits, and documentation standards
            </p>
          </div>
        </div>
      </div>
      
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Counterparty</th>
              <th>Rating</th>
              <th>Exposure</th>
              <th>Limit Utilization</th>
              <th>KYC Status</th>
              <th>Risk Score</th>
              <th>Last Review</th>
            </tr>
          </thead>
          <tbody>
            {counterparties.map(cp => (
              <tr key={cp.id} className="trade-row">
                <td data-label="Counterparty">
                  <div className="instrument-name">{cp.name}</div>
                </td>
                <td data-label="Rating">
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: getRatingColor(cp.rating),
                    color: 'white'
                  }}>
                    {cp.rating}
                  </span>
                </td>
                <td data-label="Exposure">
                  <div className="price-display">
                    ${cp.exposure.toLocaleString()}M
                  </div>
                </td>
                <td data-label="Limit Utilization">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="progress" style={{ width: '60px' }}>
                      <span style={{ 
                        width: `${(cp.exposure / cp.limit) * 100}%`,
                        background: (cp.exposure / cp.limit) > 0.8 ? 'var(--danger)' : (cp.exposure / cp.limit) > 0.6 ? 'var(--col-risk)' : 'var(--success)'
                      }}></span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      {Math.round((cp.exposure / cp.limit) * 100)}%
                    </span>
                  </div>
                </td>
                <td data-label="KYC Status">
                  <StatusChip text={cp.kycStatus} tone={cp.kycStatus} />
                </td>
                <td data-label="Risk Score">
                  <div style={{
                    color: cp.riskScore > 70 ? 'var(--danger)' : cp.riskScore > 40 ? 'var(--col-risk)' : 'var(--success)',
                    fontWeight: 600
                  }}>
                    {cp.riskScore}/100
                  </div>
                </td>
                <td data-label="Last Review">
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {new Date(cp.lastReview).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ESGTrackingPanel({ certificates }: { certificates: ESGCertificate[] }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'REC': return 'var(--success)'
      case 'RIN': return 'var(--brand)'
      case 'Carbon_Credit': return 'var(--col-finance)'
      case 'GO': return 'var(--col-ops)'
      default: return 'var(--muted)'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconLeaf style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Renewable Certificates & ESG Tracking</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Management of RECs, RINs, carbon credits and ESG compliance reporting
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            <IconLeaf style={{ width: '12px', height: '12px' }} />
            Carbon Neutral
          </span>
          <span className="chip">
            {certificates.filter(c => c.status === 'active').length} Active
          </span>
        </div>
      </div>
      
      <div className="card-grid cols-3">
        {certificates.map(cert => (
          <div key={cert.id} className="card" style={{
            borderLeft: `4px solid ${getTypeColor(cert.type)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: getTypeColor(cert.type),
                color: 'white'
              }}>
                {cert.type}
              </span>
              <StatusChip text={cert.status} tone={cert.status} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {cert.quantity.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Vintage: {cert.vintage}
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--muted)' }}>Carbon Footprint: </span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                -{cert.carbonFootprint}t CO₂
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Expires: {new Date(cert.expiryDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DataSecurityPanel() {
  const securityMetrics = [
    { label: 'Access Control', status: 'Active', score: 98 },
    { label: 'Data Encryption', status: 'Active', score: 100 },
    { label: 'API Security', status: 'Active', score: 95 },
    { label: 'Privacy Compliance', status: 'Active', score: 97 }
  ]

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconLock style={{ color: 'var(--col-compliance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Data Security & Privacy</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Access controls, encryption, and privacy law compliance
            </p>
          </div>
        </div>
        <span className="chip success">
          <IconShield style={{ width: '12px', height: '12px' }} />
          SOC 2 Compliant
        </span>
      </div>
      
      <div className="metrics-grid">
        {securityMetrics.map((metric, index) => (
          <div key={index} className="metric">
            <div className="label">{metric.label}</div>
            <div className="value" style={{ color: 'var(--success)' }}>{metric.score}%</div>
            <div style={{ fontSize: '10px', color: 'var(--success)', marginTop: '2px' }}>
              {metric.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Compliance() {
  const [events, setEvents] = useState<ComplianceEvent[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'reporting' | 'audit' | 'market-abuse' | 'counterparty' | 'esg' | 'security'>('overview')

  // Mock data - in real app, these would come from API
  const metrics: ComplianceMetrics = {
    totalEvents: 1247,
    openIssues: 23,
    criticalAlerts: 3,
    complianceScore: 94,
    auditReadiness: 87,
    reportingStatus: 'on-time',
    lastAudit: '2024-01-15',
    nextDeadline: '2024-02-28'
  }

  const reports: RegulatoryReport[] = [
    { id: '1', name: 'MiFID II Transaction Reporting', regulation: 'MiFID II', status: 'submitted', deadline: '2024-02-15', progress: 100, lastSubmission: '2024-02-14' },
    { id: '2', name: 'REMIT Data Reporting', regulation: 'REMIT', status: 'in-progress', deadline: '2024-02-20', progress: 75, lastSubmission: '2024-01-20' },
    { id: '3', name: 'Dodd-Frank Swap Reporting', regulation: 'Dodd-Frank', status: 'pending', deadline: '2024-02-25', progress: 30, lastSubmission: '2024-01-25' },
    { id: '4', name: 'EMIR Trade Repository', regulation: 'EMIR', status: 'approved', deadline: '2024-02-10', progress: 100, lastSubmission: '2024-02-09' }
  ]

  const auditTrails: AuditTrail[] = [
    { id: '1', timestamp: '2024-02-15T14:30:00Z', user: 'john.trader', action: 'TRADE_EXECUTED', entity: 'WTI-MAR24', details: 'Executed buy order for 1000 barrels', ipAddress: '192.168.1.100' },
    { id: '2', timestamp: '2024-02-15T14:25:00Z', user: 'sarah.risk', action: 'LIMIT_MODIFIED', entity: 'POSITION_LIMIT', details: 'Increased position limit from $10M to $15M', ipAddress: '192.168.1.101' },
    { id: '3', timestamp: '2024-02-15T14:20:00Z', user: 'mike.compliance', action: 'REPORT_GENERATED', entity: 'MIFID_REPORT', details: 'Generated daily MiFID II transaction report', ipAddress: '192.168.1.102' }
  ]

  const marketAbuseAlerts: MarketAbuseAlert[] = [
    { id: '1', timestamp: '2024-02-15T14:35:00Z', type: 'unusual_volume', severity: 'high', instrument: 'BRENT-APR24', description: 'Volume spike 300% above 30-day average', status: 'investigating' },
    { id: '2', timestamp: '2024-02-15T13:45:00Z', type: 'price_manipulation', severity: 'medium', instrument: 'NATGAS-MAR24', description: 'Potential layering pattern detected', status: 'new' },
    { id: '3', timestamp: '2024-02-15T12:30:00Z', type: 'spoofing', severity: 'high', instrument: 'WTI-MAY24', description: 'Large orders placed and cancelled repeatedly', status: 'escalated' }
  ]

  const counterparties: CounterpartyRisk[] = [
    { id: '1', name: 'Shell Trading International', rating: 'AAA', exposure: 45.2, limit: 100, kycStatus: 'valid', lastReview: '2024-01-15', riskScore: 15 },
    { id: '2', name: 'BP Energy Trading', rating: 'AA', exposure: 32.8, limit: 50, kycStatus: 'valid', lastReview: '2024-01-20', riskScore: 22 },
    { id: '3', name: 'Vitol Energy', rating: 'A', exposure: 28.5, limit: 40, kycStatus: 'expiring', lastReview: '2023-12-10', riskScore: 35 }
  ]

  const esgCertificates: ESGCertificate[] = [
    { id: '1', type: 'REC', quantity: 50000, vintage: '2023', status: 'active', expiryDate: '2025-12-31', carbonFootprint: 25000 },
    { id: '2', type: 'Carbon_Credit', quantity: 10000, vintage: '2023', status: 'active', expiryDate: '2030-12-31', carbonFootprint: 10000 },
    { id: '3', type: 'RIN', quantity: 75000, vintage: '2024', status: 'pending', expiryDate: '2026-12-31', carbonFootprint: 37500 }
  ]

  useEffect(() => {
    api.get<ComplianceEvent[]>('/api/v1/compliance/events')
      .then(r => setEvents(r.data))
      .catch(e => setError(e?.message ?? 'Failed to load compliance events'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => events.filter(e => {
    const s = `${e.event_id} ${e.severity} ${e.category} ${e.message} ${e.status}`.toLowerCase()
    return s.includes(q.toLowerCase())
  }), [events, q])

  // Pas de blocage de navigation - charger les données en arrière-plan
  // if (loading) return (...) - SUPPRIMÉ pour permettre la navigation libre
  
  if (error) return (
    <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
      <div>Error: {error}</div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reporting':
        return <RegulatoryReportingPanel reports={reports} />
      case 'audit':
        return <AuditTrailPanel trails={auditTrails} />
      case 'market-abuse':
        return <MarketAbuseDetectionPanel alerts={marketAbuseAlerts} />
      case 'counterparty':
        return <CounterpartyCompliancePanel counterparties={counterparties} />
      case 'esg':
        return <ESGTrackingPanel certificates={esgCertificates} />
      case 'security':
        return <DataSecurityPanel />
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <RegulatoryReportingPanel reports={reports.slice(0, 2)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <AuditTrailPanel trails={auditTrails.slice(0, 3)} />
              <MarketAbuseDetectionPanel alerts={marketAbuseAlerts.slice(0, 2)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <CounterpartyCompliancePanel counterparties={counterparties.slice(0, 2)} />
              <DataSecurityPanel />
            </div>
          </div>
        )
    }
  }

  return (
    <div style={{ animation: 'fadeInUp 0.6s ease' }}>
      {/* Hero Section */}
      <div className="hero" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px' }}>⚖️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Compliance & Regulatory Control Center</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: 'var(--muted)' }}>
              Comprehensive regulatory compliance, audit trails, and risk monitoring for energy trading operations
            </p>
          </div>
        </div>
        
        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '24px',
          position: 'relative'
        }}>
          {/* Indicateur discret de chargement */}
          {loading && (
            <div style={{
              position: 'absolute',
              top: -10,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--muted)',
              background: 'var(--bg-elev)',
              padding: '4px 8px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              zIndex: 10
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '1px solid var(--border)',
                borderTop: '1px solid var(--brand)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Syncing data...
            </div>
          )}
          <ComplianceKPI
            icon={<IconTrend />}
            title="Compliance Score"
            value={`${metrics.complianceScore}%`}
            subtitle="Overall compliance rating across all regulatory frameworks"
            trend="up"
            color="var(--success)"
          />
          <ComplianceKPI
            icon={<IconAlert />}
            title="Open Issues"
            value={metrics.openIssues}
            subtitle={`${metrics.criticalAlerts} critical alerts requiring immediate attention`}
            trend="down"
            color="var(--col-risk)"
          />
          <ComplianceKPI
            icon={<IconShield />}
            title="Audit Readiness"
            value={`${metrics.auditReadiness}%`}
            subtitle="Documentation and evidence collection complete"
            trend="up"
            color="var(--brand)"
          />
          <ComplianceKPI
            icon={<IconReport />}
            title="Reporting Status"
            value={metrics.reportingStatus.replace('-', ' ').toUpperCase()}
            subtitle={`Next deadline: ${new Date(metrics.nextDeadline).toLocaleDateString()}`}
            trend="stable"
            color="var(--success)"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="market-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`market-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <IconCompliance />
          Overview
        </button>
        <button
          className={`market-tab ${activeTab === 'reporting' ? 'active' : ''}`}
          onClick={() => setActiveTab('reporting')}
        >
          <IconReport />
          Regulatory Reporting
        </button>
        <button
          className={`market-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <IconShield />
          Audit Trails
        </button>
        <button
          className={`market-tab ${activeTab === 'market-abuse' ? 'active' : ''}`}
          onClick={() => setActiveTab('market-abuse')}
        >
          <IconAlert />
          Market Abuse Detection
        </button>
        <button
          className={`market-tab ${activeTab === 'counterparty' ? 'active' : ''}`}
          onClick={() => setActiveTab('counterparty')}
        >
          <IconUser />
          Counterparty Compliance
        </button>
        <button
          className={`market-tab ${activeTab === 'esg' ? 'active' : ''}`}
          onClick={() => setActiveTab('esg')}
        >
          <IconLeaf />
          ESG & Certificates
        </button>
        <button
          className={`market-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <IconLock />
          Data Security
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Legacy Events Table (only show in overview) */}
      {activeTab === 'overview' && events.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="section-title">Recent Compliance Events</div>
            <SearchBar onChange={setQ} placeholder="Search events..." />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 10).map(ev => (
                  <tr key={ev.event_id} className="trade-row">
                    <td data-label="Time">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td data-label="ID">
                      <div className="trade-id">{ev.event_id}</div>
                    </td>
                    <td data-label="Severity">
                      <StatusChip text={ev.severity} tone={ev.severity} />
                    </td>
                    <td data-label="Category">
                      <span className="badge compliance">{ev.category}</span>
                    </td>
                    <td data-label="Status">
                      <StatusChip text={ev.status} tone={ev.status} />
                    </td>
                    <td data-label="Message">{ev.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
