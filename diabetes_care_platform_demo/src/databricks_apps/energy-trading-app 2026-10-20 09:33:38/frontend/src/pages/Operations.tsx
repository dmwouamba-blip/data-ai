import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import SearchBar from '../components/SearchBar'
import { IconOps, IconTrade, IconTrend, IconAlert, IconCheck, IconClock, IconUser, IconShield, IconReport } from '../components/Icons'
import StaticKPI from '../components/StaticKPI'
import { OPERATIONS_KPIS } from '../utils/staticKPIs'

interface PnL { 
  date: string
  product: string
  pnl: number 
}

interface Position { 
  date: string
  product: string
  quantity: number 
}

interface OperationsMetrics {
  totalTrades: number
  activeDeliveries: number
  settlementAccuracy: number
  operationalEfficiency: number
  riskEvents: number
  workflowStatus: 'optimal' | 'delayed' | 'critical'
  lastUpdate: string
  nextSchedule: string
}

interface TradeCapture {
  id: string
  timestamp: string
  source: string
  product: string
  quantity: number
  price: number
  counterparty: string
  status: 'captured' | 'normalized' | 'validated' | 'failed'
  processingTime: number
}

interface DeliverySchedule {
  id: string
  product: string
  deliveryDate: string
  quantity: number
  location: string
  counterparty: string
  status: 'scheduled' | 'in-transit' | 'delivered' | 'delayed'
  transportMode: 'pipeline' | 'truck' | 'rail' | 'ship'
  progress: number
}

interface Settlement {
  id: string
  tradeId: string
  amount: number
  currency: string
  dueDate: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  counterparty: string
  invoiceNumber: string
  paymentMethod: string
}

interface InventoryPosition {
  id: string
  product: string
  location: string
  physicalQuantity: number
  contractualQuantity: number
  variance: number
  lastUpdated: string
  storageType: 'tank' | 'pipeline' | 'warehouse' | 'virtual'
}

interface OperationalRisk {
  id: string
  timestamp: string
  type: 'delivery_failure' | 'counterparty_default' | 'system_outage' | 'force_majeure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  status: 'open' | 'mitigating' | 'resolved'
  assignedTo: string
}

interface WorkflowTask {
  id: string
  title: string
  department: 'trading' | 'operations' | 'settlements' | 'risk' | 'compliance'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  assignee: string
  dueDate: string
  dependencies: string[]
}

function StatusChip({ text, tone }: { text: string; tone: string }) {
  const getColor = () => {
    switch (tone) {
      case 'high': case 'critical': case 'failed': case 'delayed': case 'urgent': return 'var(--danger)'
      case 'medium': case 'processing': case 'in-progress': case 'in-transit': return 'var(--col-risk)'
      case 'low': case 'completed': case 'delivered': case 'resolved': case 'validated': return 'var(--success)'
      case 'pending': case 'scheduled': case 'captured': return 'var(--brand)'
      case 'blocked': case 'normalized': return 'var(--muted)'
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

function OperationsKPI({ icon, title, value, subtitle, trend, color }: {
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

function TradeCapturePanel({ trades }: { trades: TradeCapture[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconTrade style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Trade Capture & Normalization</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Automatic capture and standardization from multiple markets and counterparties
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            <IconCheck style={{ width: '12px', height: '12px' }} />
            {trades.filter(t => t.status === 'validated').length} Validated
          </span>
        </div>
      </div>
      
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Counterparty</th>
              <th>Status</th>
              <th>Processing Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.id} className="trade-row">
                <td data-label="Time">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </td>
                <td data-label="Source">
                  <span className="badge ops">{trade.source}</span>
                </td>
                <td data-label="Product">
                  <div className="instrument-name">{trade.product}</div>
                </td>
                <td data-label="Quantity">
                  <div className="price-display">
                    {trade.quantity.toLocaleString()}
                  </div>
                </td>
                <td data-label="Price">
                  <div className="price-display">
                    ${trade.price.toFixed(2)}
                  </div>
                </td>
                <td data-label="Counterparty">
                  {trade.counterparty}
                </td>
                <td data-label="Status">
                  <StatusChip text={trade.status} tone={trade.status} />
                </td>
                <td data-label="Processing Time">
                  <div style={{ 
                    color: trade.processingTime < 5 ? 'var(--success)' : trade.processingTime < 15 ? 'var(--col-risk)' : 'var(--danger)',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}>
                    {trade.processingTime}s
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

function SchedulingLogisticsPanel({ deliveries }: { deliveries: DeliverySchedule[] }) {
  const getTransportIcon = (mode: string) => {
    switch (mode) {
      case 'pipeline': return '🚰'
      case 'truck': return '🚛'
      case 'rail': return '🚂'
      case 'ship': return '🚢'
      default: return '📦'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconTrend style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Scheduling & Logistics Coordination</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Physical deliveries, nominations, and transportation management
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip">
            {deliveries.filter(d => d.status === 'in-transit').length} In Transit
          </span>
          <span className="chip success">
            {deliveries.filter(d => d.status === 'delivered').length} Delivered
          </span>
        </div>
      </div>
      
      <div className="card-grid cols-2">
        {deliveries.map(delivery => (
          <div key={delivery.id} className="card" style={{
            borderLeft: `4px solid ${
              delivery.status === 'delivered' ? 'var(--success)' : 
              delivery.status === 'delayed' ? 'var(--danger)' : 
              delivery.status === 'in-transit' ? 'var(--brand)' : 'var(--muted)'
            }`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{getTransportIcon(delivery.transportMode)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {delivery.product}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {delivery.location} • {delivery.quantity.toLocaleString()} units
                </div>
              </div>
              <StatusChip text={delivery.status} tone={delivery.status} />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Progress</span>
                <span style={{ fontWeight: 600 }}>{delivery.progress}%</span>
              </div>
              <div className="progress">
                <span style={{ 
                  width: `${delivery.progress}%`,
                  background: delivery.status === 'delayed' ? 'var(--danger)' : 'var(--brand)'
                }}></span>
              </div>
            </div>
            
            <div style={{ fontSize: '12px' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Counterparty: </span>
                <span style={{ fontWeight: 600 }}>{delivery.counterparty}</span>
              </div>
              <div style={{ color: 'var(--muted)' }}>
                Delivery: {new Date(delivery.deliveryDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettlementInvoicingPanel({ settlements }: { settlements: Settlement[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconReport style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Settlement & Invoicing Automation</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Streamlined payments, charges, and netting operations
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            ${settlements.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
          </span>
          <span className="chip">
            {settlements.filter(s => s.status === 'pending').length} Pending
          </span>
        </div>
      </div>
      
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Counterparty</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Due Date</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map(settlement => (
              <tr key={settlement.id} className="trade-row">
                <td data-label="Invoice #">
                  <div className="trade-id">{settlement.invoiceNumber}</div>
                </td>
                <td data-label="Counterparty">
                  <div className="instrument-name">{settlement.counterparty}</div>
                </td>
                <td data-label="Amount">
                  <div className="price-display" style={{
                    color: settlement.amount >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {settlement.amount >= 0 ? '+' : ''}{settlement.amount.toLocaleString()}
                  </div>
                </td>
                <td data-label="Currency">
                  <span className="badge">{settlement.currency}</span>
                </td>
                <td data-label="Due Date">
                  <div style={{ fontSize: '12px' }}>
                    {new Date(settlement.dueDate).toLocaleDateString()}
                  </div>
                </td>
                <td data-label="Payment Method">
                  {settlement.paymentMethod}
                </td>
                <td data-label="Status">
                  <StatusChip text={settlement.status} tone={settlement.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PositionInventoryPanel({ positions }: { positions: InventoryPosition[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconShield style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Position & Inventory Management</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Real-time tracking of physical and financial exposures
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-grid cols-3">
        {positions.map(position => (
          <div key={position.id} className="card" style={{
            borderLeft: `4px solid ${
              Math.abs(position.variance) < 100 ? 'var(--success)' : 
              Math.abs(position.variance) < 500 ? 'var(--col-risk)' : 'var(--danger)'
            }`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{position.product}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{position.location}</div>
              </div>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600,
                background: 'var(--brand)15',
                color: 'var(--brand)',
                textTransform: 'uppercase'
              }}>
                {position.storageType}
              </span>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--muted)' }}>Physical</span>
                <span style={{ fontWeight: 600 }}>{position.physicalQuantity.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--muted)' }}>Contractual</span>
                <span style={{ fontWeight: 600 }}>{position.contractualQuantity.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--muted)' }}>Variance</span>
                <span style={{ 
                  fontWeight: 600,
                  color: Math.abs(position.variance) < 100 ? 'var(--success)' : 
                        Math.abs(position.variance) < 500 ? 'var(--col-risk)' : 'var(--danger)'
                }}>
                  {position.variance >= 0 ? '+' : ''}{position.variance.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Updated: {new Date(position.lastUpdated).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OperationalRiskPanel({ risks }: { risks: OperationalRisk[] }) {
  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'delivery_failure': return '🚫'
      case 'counterparty_default': return '⚠️'
      case 'system_outage': return '💻'
      case 'force_majeure': return '🌪️'
      default: return '❗'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconAlert style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Operational Risk Tracking</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Real-time integration of operational events into risk measurements
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip danger">
            {risks.filter(r => r.severity === 'critical').length} Critical
          </span>
          <span className="chip">
            {risks.filter(r => r.status === 'open').length} Open
          </span>
        </div>
      </div>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {risks.map(risk => (
          <div key={risk.id} style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            borderLeft: `4px solid ${
              risk.severity === 'critical' ? 'var(--danger)' : 
              risk.severity === 'high' ? 'var(--col-risk)' : 
              risk.severity === 'medium' ? 'var(--brand)' : 'var(--success)'
            }`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{getRiskIcon(risk.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>
                  {risk.type.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Assigned to: {risk.assignedTo}
                </div>
              </div>
              <StatusChip text={risk.severity} tone={risk.severity} />
              <StatusChip text={risk.status} tone={risk.status} />
            </div>
            
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <div style={{ marginBottom: '4px' }}><strong>Description:</strong> {risk.description}</div>
              <div><strong>Impact:</strong> {risk.impact}</div>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {new Date(risk.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowManagementPanel({ tasks }: { tasks: WorkflowTask[] }) {
  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'trading': return 'var(--col-trading)'
      case 'operations': return 'var(--col-ops)'
      case 'settlements': return 'var(--col-finance)'
      case 'risk': return 'var(--col-risk)'
      case 'compliance': return 'var(--col-compliance)'
      default: return 'var(--muted)'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconUser style={{ color: 'var(--col-ops)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Interdepartmental Workflow Management</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Seamless workflows between trading, operations, settlements, and risk teams
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip">
            {tasks.filter(t => t.status === 'in-progress').length} Active
          </span>
          <span className="chip danger">
            {tasks.filter(t => t.priority === 'urgent').length} Urgent
          </span>
        </div>
      </div>
      
      <div className="card-grid cols-2">
        {tasks.map(task => (
          <div key={task.id} className="card" style={{
            borderLeft: `4px solid ${getDepartmentColor(task.department)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Assigned to: {task.assignee}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', alignItems: 'flex-end' }}>
                <StatusChip text={task.priority} tone={task.priority} />
                <StatusChip text={task.status} tone={task.status} />
              </div>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                background: `${getDepartmentColor(task.department)}15`,
                color: getDepartmentColor(task.department),
                textTransform: 'uppercase'
              }}>
                {task.department}
              </span>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Due: {new Date(task.dueDate).toLocaleDateString()}
              {task.dependencies.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  Dependencies: {task.dependencies.length}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Move static mock data outside component to prevent recreation on every render
const STATIC_OPERATIONS_METRICS: OperationsMetrics = {
  totalTrades: 1847,
  activeDeliveries: 156,
  settlementAccuracy: 99.7,
  operationalEfficiency: 94.2,
  riskEvents: 7,
  workflowStatus: 'optimal',
  lastUpdate: '2024-02-15T14:30:00Z',
  nextSchedule: '2024-02-16T08:00:00Z'
}

export default function Operations() {
  const [pnl, setPnl] = useState<PnL[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'capture' | 'logistics' | 'settlement' | 'inventory' | 'risk' | 'workflow'>('overview')

  // Use static reference to avoid recreating object
  const metrics = STATIC_OPERATIONS_METRICS

  const tradeCaptures: TradeCapture[] = [
    { id: '1', timestamp: '2024-02-15T14:30:00Z', source: 'ICE', product: 'WTI-MAR24', quantity: 1000, price: 78.45, counterparty: 'Shell Trading', status: 'validated', processingTime: 3.2 },
    { id: '2', timestamp: '2024-02-15T14:28:00Z', source: 'NYMEX', product: 'BRENT-APR24', quantity: 500, price: 82.15, counterparty: 'BP Energy', status: 'normalized', processingTime: 5.8 },
    { id: '3', timestamp: '2024-02-15T14:25:00Z', source: 'TTF', product: 'NATGAS-MAR24', quantity: 2000, price: 28.90, counterparty: 'Vitol', status: 'captured', processingTime: 2.1 }
  ]

  const deliverySchedules: DeliverySchedule[] = [
    { id: '1', product: 'Crude Oil', deliveryDate: '2024-02-20', quantity: 50000, location: 'Cushing, OK', counterparty: 'ExxonMobil', status: 'in-transit', transportMode: 'pipeline', progress: 65 },
    { id: '2', product: 'Natural Gas', deliveryDate: '2024-02-18', quantity: 100000, location: 'Henry Hub', counterparty: 'Chevron', status: 'scheduled', transportMode: 'pipeline', progress: 15 },
    { id: '3', product: 'Gasoline', deliveryDate: '2024-02-16', quantity: 25000, location: 'New York Harbor', counterparty: 'Valero', status: 'delivered', transportMode: 'truck', progress: 100 }
  ]

  const settlements: Settlement[] = [
    { id: '1', tradeId: 'TRD-001', amount: 2450000, currency: 'USD', dueDate: '2024-02-20', status: 'pending', counterparty: 'Shell Trading', invoiceNumber: 'INV-2024-001', paymentMethod: 'Wire Transfer' },
    { id: '2', tradeId: 'TRD-002', amount: -1850000, currency: 'USD', dueDate: '2024-02-18', status: 'processing', counterparty: 'BP Energy', invoiceNumber: 'INV-2024-002', paymentMethod: 'ACH' },
    { id: '3', tradeId: 'TRD-003', amount: 3200000, currency: 'EUR', dueDate: '2024-02-22', status: 'completed', counterparty: 'Total Energies', invoiceNumber: 'INV-2024-003', paymentMethod: 'SEPA' }
  ]

  const inventoryPositions: InventoryPosition[] = [
    { id: '1', product: 'WTI Crude', location: 'Cushing Tank Farm A', physicalQuantity: 485000, contractualQuantity: 500000, variance: -15000, lastUpdated: '2024-02-15T14:00:00Z', storageType: 'tank' },
    { id: '2', product: 'Natural Gas', location: 'Henry Hub Storage', physicalQuantity: 2150000, contractualQuantity: 2100000, variance: 50000, lastUpdated: '2024-02-15T13:45:00Z', storageType: 'pipeline' },
    { id: '3', product: 'Gasoline', location: 'NY Harbor Terminal', physicalQuantity: 125000, contractualQuantity: 130000, variance: -5000, lastUpdated: '2024-02-15T14:15:00Z', storageType: 'tank' }
  ]

  const operationalRisks: OperationalRisk[] = [
    { id: '1', timestamp: '2024-02-15T12:30:00Z', type: 'delivery_failure', severity: 'high', description: 'Pipeline maintenance causing delivery delays', impact: 'Potential contract breach, $500K exposure', status: 'mitigating', assignedTo: 'Operations Team' },
    { id: '2', timestamp: '2024-02-15T10:15:00Z', type: 'system_outage', severity: 'medium', description: 'Trading system intermittent connectivity', impact: 'Delayed trade confirmations', status: 'resolved', assignedTo: 'IT Support' },
    { id: '3', timestamp: '2024-02-15T08:45:00Z', type: 'counterparty_default', severity: 'critical', description: 'Payment default risk identified', impact: 'Credit exposure $2.5M', status: 'open', assignedTo: 'Risk Manager' }
  ]

  const workflowTasks: WorkflowTask[] = [
    { id: '1', title: 'Validate WTI delivery documentation', department: 'operations', priority: 'high', status: 'in-progress', assignee: 'John Smith', dueDate: '2024-02-16', dependencies: ['TRD-001'] },
    { id: '2', title: 'Process settlement for BP Energy trades', department: 'settlements', priority: 'medium', status: 'pending', assignee: 'Sarah Johnson', dueDate: '2024-02-18', dependencies: [] },
    { id: '3', title: 'Update VaR model with new positions', department: 'risk', priority: 'urgent', status: 'blocked', assignee: 'Mike Chen', dueDate: '2024-02-15', dependencies: ['POS-001', 'POS-002'] },
    { id: '4', title: 'Generate MiFID II transaction report', department: 'compliance', priority: 'high', status: 'completed', assignee: 'Lisa Wong', dueDate: '2024-02-14', dependencies: [] }
  ]

  useEffect(() => {
    Promise.all([
      api.get<PnL[]>('/api/v1/finance/pnl'),
      api.get<Position[]>('/api/v1/risk/positions')
    ])
      .then(([p, pos]) => {
        setPnl(p.data)
        setPositions(pos.data)
      })
      .catch(e => setError(e?.message ?? 'Failed to load operations'))
      .finally(() => setLoading(false))
  }, [])

  // Removed blocking loading screen - show content immediately with discrete loading indicator
  
  if (error) return (
    <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
      <div>Error: {error}</div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'capture':
        return <TradeCapturePanel trades={tradeCaptures} />
      case 'logistics':
        return <SchedulingLogisticsPanel deliveries={deliverySchedules} />
      case 'settlement':
        return <SettlementInvoicingPanel settlements={settlements} />
      case 'inventory':
        return <PositionInventoryPanel positions={inventoryPositions} />
      case 'risk':
        return <OperationalRiskPanel risks={operationalRisks} />
      case 'workflow':
        return <WorkflowManagementPanel tasks={workflowTasks} />
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TradeCapturePanel trades={tradeCaptures.slice(0, 2)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <SchedulingLogisticsPanel deliveries={deliverySchedules.slice(0, 2)} />
              <SettlementInvoicingPanel settlements={settlements.slice(0, 2)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <PositionInventoryPanel positions={inventoryPositions} />
              <OperationalRiskPanel risks={operationalRisks.slice(0, 2)} />
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
          <div style={{ fontSize: '48px' }}>⚙️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Operations Control Center</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: 'var(--muted)' }}>
              Comprehensive trade processing, logistics coordination, and operational workflow management
            </p>
          </div>
        </div>
        
        {/* Static KPI Grid - Clear and Stable */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '24px',
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
              gap: '4px'
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
          <StaticKPI metric={OPERATIONS_KPIS.totalTrades} />
          <StaticKPI metric={OPERATIONS_KPIS.activeDeliveries} />
          <StaticKPI metric={OPERATIONS_KPIS.settlementAccuracy} />
          <StaticKPI metric={OPERATIONS_KPIS.operationalEfficiency} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="market-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`market-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <IconOps />
          Overview
        </button>
        <button
          className={`market-tab ${activeTab === 'capture' ? 'active' : ''}`}
          onClick={() => setActiveTab('capture')}
        >
          <IconTrade />
          Trade Capture
        </button>
        <button
          className={`market-tab ${activeTab === 'logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('logistics')}
        >
          <IconTrend />
          Logistics
        </button>
        <button
          className={`market-tab ${activeTab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlement')}
        >
          <IconReport />
          Settlement
        </button>
        <button
          className={`market-tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <IconShield />
          Inventory
        </button>
        <button
          className={`market-tab ${activeTab === 'risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('risk')}
        >
          <IconAlert />
          Operational Risk
        </button>
        <button
          className={`market-tab ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          <IconUser />
          Workflows
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}
