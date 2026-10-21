import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import SearchBar from '../components/SearchBar'
import { IconFinance, IconTrend, IconAlert, IconCheck, IconClock, IconUser, IconShield, IconReport } from '../components/Icons'
import Sparkline from '../components/Sparkline'
import StaticKPI from '../components/StaticKPI'
import { FINANCE_KPIS } from '../utils/staticKPIs'

interface PnL { 
  date: string
  product: string
  pnl: number 
}

interface FinanceMetrics {
  totalPnL: number
  availableCash: number
  marginUtilization: number
  hedgeEffectiveness: number
  portfolioValue: number
  creditUtilization: number
  liquidityRatio: number
  riskAdjustedReturn: number
}

interface CashFlow {
  id: string
  date: string
  type: 'inflow' | 'outflow' | 'margin_call' | 'settlement'
  amount: number
  currency: string
  counterparty: string
  description: string
  status: 'pending' | 'confirmed' | 'completed'
  dueDate: string
}

interface MarginRequirement {
  id: string
  counterparty: string
  initialMargin: number
  variationMargin: number
  totalRequired: number
  posted: number
  available: number
  utilizationRate: number
  lastUpdate: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface PnLAttribution {
  id: string
  book: string
  desk: string
  trader: string
  product: string
  pnl: number
  attribution: {
    priceMovement: number
    carryReturn: number
    newTrades: number
    fxImpact: number
    other: number
  }
  date: string
}

interface HedgePosition {
  id: string
  hedgeType: 'swap' | 'option' | 'future' | 'forward'
  underlyingAsset: string
  notional: number
  maturity: string
  effectiveness: number
  pnlImpact: number
  deltaHedged: number
  gammaExposure: number
  vegaExposure: number
  status: 'active' | 'expired' | 'closed'
}

interface PortfolioValuation {
  id: string
  portfolio: string
  currentValue: number
  previousValue: number
  change: number
  changePercent: number
  var95: number
  var99: number
  expectedShortfall: number
  sharpeRatio: number
  maxDrawdown: number
  lastUpdate: string
}

interface ScenarioAnalysis {
  id: string
  scenarioName: string
  description: string
  probability: number
  portfolioImpact: number
  impactPercent: number
  timeHorizon: string
  keyDrivers: string[]
  mitigationActions: string[]
}

function StatusChip({ text, tone }: { text: string; tone: string }) {
  const getColor = () => {
    switch (tone) {
      case 'high': case 'critical': case 'overdue': case 'expired': return 'var(--danger)'
      case 'medium': case 'warning': case 'pending': return 'var(--col-risk)'
      case 'low': case 'completed': case 'confirmed': case 'active': return 'var(--success)'
      case 'inflow': return 'var(--success)'
      case 'outflow': case 'margin_call': return 'var(--danger)'
      case 'settlement': return 'var(--brand)'
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

function FinanceKPI({ icon, title, value, subtitle, trend, color, sparklineData }: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle: string
  trend?: 'up' | 'down' | 'stable'
  color: string
  sparklineData?: number[]
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
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
          {sparklineData && (
            <div style={{ width: '80px', height: '30px' }}>
              <Sparkline data={sparklineData} color={color} />
            </div>
          )}
        </div>
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

function LiquidityCashManagementPanel({ cashFlows, margins }: { cashFlows: CashFlow[], margins: MarginRequirement[] }) {
  const totalInflows = cashFlows.filter(cf => cf.type === 'inflow').reduce((sum, cf) => sum + cf.amount, 0)
  const totalOutflows = cashFlows.filter(cf => cf.type === 'outflow' || cf.type === 'margin_call').reduce((sum, cf) => sum + Math.abs(cf.amount), 0)

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconFinance style={{ color: 'var(--col-finance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Liquidity & Cash Management</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Real-time monitoring of cash flows, margin requirements, and credit lines
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            <IconCheck style={{ width: '12px', height: '12px' }} />
            Net: ${(totalInflows - totalOutflows).toLocaleString()}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Cash Flows */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text)' }}>Cash Flows (Next 7 Days)</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {cashFlows.slice(0, 8).map(flow => (
              <div key={flow.id} style={{
                padding: '12px',
                borderBottom: '1px solid var(--border)',
                borderLeft: `4px solid ${
                  flow.type === 'inflow' ? 'var(--success)' : 
                  flow.type === 'margin_call' ? 'var(--danger)' : 'var(--col-risk)'
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {flow.counterparty}
                  </div>
                  <StatusChip text={flow.type} tone={flow.type} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 700,
                    color: flow.type === 'inflow' ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {flow.type === 'inflow' ? '+' : '-'}${Math.abs(flow.amount).toLocaleString()} {flow.currency}
                  </div>
                  <StatusChip text={flow.status} tone={flow.status} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {flow.description}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  Due: {new Date(flow.dueDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Margin Requirements */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text)' }}>Margin Requirements</h4>
          <div className="card-grid cols-1" style={{ gap: '12px' }}>
            {margins.map(margin => (
              <div key={margin.id} className="card" style={{
                borderLeft: `4px solid ${
                  margin.riskLevel === 'high' ? 'var(--danger)' : 
                  margin.riskLevel === 'medium' ? 'var(--col-risk)' : 'var(--success)'
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{margin.counterparty}</div>
                  <StatusChip text={margin.riskLevel} tone={margin.riskLevel} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Required: </span>
                    <span style={{ fontWeight: 600 }}>${margin.totalRequired.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Posted: </span>
                    <span style={{ fontWeight: 600 }}>${margin.posted.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Available: </span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>${margin.available.toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Utilization: </span>
                    <span style={{ 
                      fontWeight: 600,
                      color: margin.utilizationRate > 80 ? 'var(--danger)' : margin.utilizationRate > 60 ? 'var(--col-risk)' : 'var(--success)'
                    }}>
                      {margin.utilizationRate}%
                    </span>
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

function PnLAttributionPanel({ attributions }: { attributions: PnLAttribution[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconTrend style={{ color: 'var(--col-finance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Advanced Accounting & P&L Attribution</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Automated allocation of costs and revenues by books, desks, and trades
            </p>
          </div>
        </div>
      </div>
      
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Book/Desk</th>
              <th>Trader</th>
              <th>Product</th>
              <th>Total P&L</th>
              <th>Price Movement</th>
              <th>Carry Return</th>
              <th>New Trades</th>
              <th>FX Impact</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            {attributions.map(attr => (
              <tr key={attr.id} className="trade-row">
                <td data-label="Book/Desk">
                  <div>
                    <div className="instrument-name">{attr.book}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{attr.desk}</div>
                  </div>
                </td>
                <td data-label="Trader">
                  {attr.trader}
                </td>
                <td data-label="Product">
                  <span className="badge finance">{attr.product}</span>
                </td>
                <td data-label="Total P&L">
                  <div className="price-display" style={{
                    color: attr.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontWeight: 700
                  }}>
                    {attr.pnl >= 0 ? '+' : ''}${attr.pnl.toLocaleString()}
                  </div>
                </td>
                <td data-label="Price Movement">
                  <div style={{ 
                    color: attr.attribution.priceMovement >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {attr.attribution.priceMovement >= 0 ? '+' : ''}${attr.attribution.priceMovement.toLocaleString()}
                  </div>
                </td>
                <td data-label="Carry Return">
                  <div style={{ 
                    color: attr.attribution.carryReturn >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {attr.attribution.carryReturn >= 0 ? '+' : ''}${attr.attribution.carryReturn.toLocaleString()}
                  </div>
                </td>
                <td data-label="New Trades">
                  <div style={{ 
                    color: attr.attribution.newTrades >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {attr.attribution.newTrades >= 0 ? '+' : ''}${attr.attribution.newTrades.toLocaleString()}
                  </div>
                </td>
                <td data-label="FX Impact">
                  <div style={{ 
                    color: attr.attribution.fxImpact >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {attr.attribution.fxImpact >= 0 ? '+' : ''}${attr.attribution.fxImpact.toLocaleString()}
                  </div>
                </td>
                <td data-label="Other">
                  <div style={{ 
                    color: attr.attribution.other >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {attr.attribution.other >= 0 ? '+' : ''}${attr.attribution.other.toLocaleString()}
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

function HedgeEffectivenessPanel({ hedges }: { hedges: HedgePosition[] }) {
  const getHedgeIcon = (type: string) => {
    switch (type) {
      case 'swap': return '🔄'
      case 'option': return '📈'
      case 'future': return '⏳'
      case 'forward': return '➡️'
      default: return '🛡️'
    }
  }

  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconShield style={{ color: 'var(--col-finance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Hedge Effectiveness Measurement</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Periodic valuation and testing of hedge strategies for risk protection
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip success">
            {hedges.filter(h => h.effectiveness >= 80).length} Effective
          </span>
          <span className="chip">
            {hedges.filter(h => h.status === 'active').length} Active
          </span>
        </div>
      </div>
      
      <div className="card-grid cols-2">
        {hedges.map(hedge => (
          <div key={hedge.id} className="card" style={{
            borderLeft: `4px solid ${
              hedge.effectiveness >= 80 ? 'var(--success)' : 
              hedge.effectiveness >= 60 ? 'var(--col-risk)' : 'var(--danger)'
            }`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{getHedgeIcon(hedge.hedgeType)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>
                  {hedge.hedgeType} - {hedge.underlyingAsset}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Notional: ${hedge.notional.toLocaleString()}
                </div>
              </div>
              <StatusChip text={hedge.status} tone={hedge.status} />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Effectiveness</span>
                <span style={{ 
                  fontWeight: 600,
                  color: hedge.effectiveness >= 80 ? 'var(--success)' : hedge.effectiveness >= 60 ? 'var(--col-risk)' : 'var(--danger)'
                }}>
                  {hedge.effectiveness}%
                </span>
              </div>
              <div className="progress">
                <span style={{ 
                  width: `${hedge.effectiveness}%`,
                  background: hedge.effectiveness >= 80 ? 'var(--success)' : hedge.effectiveness >= 60 ? 'var(--col-risk)' : 'var(--danger)'
                }}></span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
              <div>
                <span style={{ color: 'var(--muted)' }}>P&L Impact: </span>
                <span style={{ 
                  fontWeight: 600,
                  color: hedge.pnlImpact >= 0 ? 'var(--success)' : 'var(--danger)'
                }}>
                  {hedge.pnlImpact >= 0 ? '+' : ''}${hedge.pnlImpact.toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Delta: </span>
                <span style={{ fontWeight: 600 }}>{hedge.deltaHedged.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Gamma: </span>
                <span style={{ fontWeight: 600 }}>{hedge.gammaExposure.toFixed(3)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Vega: </span>
                <span style={{ fontWeight: 600 }}>{hedge.vegaExposure.toFixed(2)}</span>
              </div>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Maturity: {new Date(hedge.maturity).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PortfolioValuationPanel({ portfolios, scenarios }: { portfolios: PortfolioValuation[], scenarios: ScenarioAnalysis[] }) {
  return (
    <div className="card">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconReport style={{ color: 'var(--col-finance)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Portfolio Valuation & Risk Forecasting</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
              Forward curves, pricing models, and scenario analyses for optimization
            </p>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Portfolio Valuations */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text)' }}>Portfolio Valuations</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Portfolio</th>
                  <th>Current Value</th>
                  <th>Change</th>
                  <th>VaR 95%</th>
                  <th>VaR 99%</th>
                  <th>Sharpe Ratio</th>
                  <th>Max Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {portfolios.map(portfolio => (
                  <tr key={portfolio.id} className="trade-row">
                    <td data-label="Portfolio">
                      <div className="instrument-name">{portfolio.portfolio}</div>
                    </td>
                    <td data-label="Current Value">
                      <div className="price-display">
                        ${portfolio.currentValue.toLocaleString()}
                      </div>
                    </td>
                    <td data-label="Change">
                      <div style={{
                        color: portfolio.change >= 0 ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600
                      }}>
                        {portfolio.change >= 0 ? '+' : ''}${portfolio.change.toLocaleString()}
                        <div style={{ fontSize: '11px' }}>
                          ({portfolio.changePercent >= 0 ? '+' : ''}{portfolio.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </td>
                    <td data-label="VaR 95%">
                      <div style={{ color: 'var(--col-risk)', fontWeight: 600, fontSize: '12px' }}>
                        ${portfolio.var95.toLocaleString()}
                      </div>
                    </td>
                    <td data-label="VaR 99%">
                      <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '12px' }}>
                        ${portfolio.var99.toLocaleString()}
                      </div>
                    </td>
                    <td data-label="Sharpe Ratio">
                      <div style={{
                        color: portfolio.sharpeRatio > 1 ? 'var(--success)' : portfolio.sharpeRatio > 0.5 ? 'var(--brand)' : 'var(--danger)',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}>
                        {portfolio.sharpeRatio.toFixed(2)}
                      </div>
                    </td>
                    <td data-label="Max Drawdown">
                      <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '12px' }}>
                        {portfolio.maxDrawdown.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scenario Analysis */}
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text)' }}>Scenario Analysis</h4>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {scenarios.map(scenario => (
              <div key={scenario.id} className="card" style={{
                marginBottom: '12px',
                borderLeft: `4px solid ${
                  scenario.impactPercent > 10 ? 'var(--danger)' : 
                  scenario.impactPercent > 5 ? 'var(--col-risk)' : 
                  scenario.impactPercent > -5 ? 'var(--brand)' : 'var(--success)'
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {scenario.scenarioName}
                  </div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'var(--brand)15',
                    color: 'var(--brand)'
                  }}>
                    {scenario.probability}%
                  </span>
                </div>
                
                <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--muted)' }}>
                  {scenario.description}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Portfolio Impact:</span>
                  <div style={{
                    fontWeight: 600,
                    color: scenario.portfolioImpact >= 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {scenario.portfolioImpact >= 0 ? '+' : ''}${scenario.portfolioImpact.toLocaleString()}
                    <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                      ({scenario.impactPercent >= 0 ? '+' : ''}{scenario.impactPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Horizon: {scenario.timeHorizon} • Drivers: {scenario.keyDrivers.slice(0, 2).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Move static mock data outside component to prevent recreation on every render
const STATIC_FINANCE_METRICS: FinanceMetrics = {
  totalPnL: 2450000,
  availableCash: 15750000,
  marginUtilization: 68.5,
  hedgeEffectiveness: 87.3,
  portfolioValue: 125000000,
  creditUtilization: 42.8,
  liquidityRatio: 1.85,
  riskAdjustedReturn: 12.4
}

export default function Finance() {
  const [pnl, setPnl] = useState<PnL[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'liquidity' | 'attribution' | 'hedging' | 'valuation'>('overview')

  // Use static reference to avoid recreating object
  const metrics = STATIC_FINANCE_METRICS

  const cashFlows: CashFlow[] = [
    { id: '1', date: '2024-02-16', type: 'inflow', amount: 2500000, currency: 'USD', counterparty: 'Shell Trading', description: 'WTI settlement payment', status: 'confirmed', dueDate: '2024-02-16' },
    { id: '2', date: '2024-02-17', type: 'margin_call', amount: -850000, currency: 'USD', counterparty: 'ICE Clear', description: 'Variation margin call', status: 'pending', dueDate: '2024-02-17' },
    { id: '3', date: '2024-02-18', type: 'outflow', amount: -1200000, currency: 'EUR', counterparty: 'BP Energy', description: 'Brent crude purchase', status: 'pending', dueDate: '2024-02-18' },
    { id: '4', date: '2024-02-19', type: 'settlement', amount: 3200000, currency: 'USD', counterparty: 'Vitol', description: 'Natural gas delivery', status: 'confirmed', dueDate: '2024-02-19' }
  ]

  const margins: MarginRequirement[] = [
    { id: '1', counterparty: 'ICE Clear', initialMargin: 5000000, variationMargin: 2500000, totalRequired: 7500000, posted: 6800000, available: 1200000, utilizationRate: 85, lastUpdate: '2024-02-15T14:30:00Z', riskLevel: 'high' },
    { id: '2', counterparty: 'CME Group', initialMargin: 3200000, variationMargin: 800000, totalRequired: 4000000, posted: 3500000, available: 2500000, utilizationRate: 58, lastUpdate: '2024-02-15T14:25:00Z', riskLevel: 'medium' },
    { id: '3', counterparty: 'LCH', initialMargin: 2800000, variationMargin: 450000, totalRequired: 3250000, posted: 3000000, available: 1800000, utilizationRate: 65, lastUpdate: '2024-02-15T14:20:00Z', riskLevel: 'medium' }
  ]

  const pnlAttributions: PnLAttribution[] = [
    { 
      id: '1', 
      book: 'Energy Trading', 
      desk: 'Crude Oil', 
      trader: 'John Smith', 
      product: 'WTI', 
      pnl: 450000, 
      attribution: { priceMovement: 380000, carryReturn: 45000, newTrades: 25000, fxImpact: -5000, other: 5000 },
      date: '2024-02-15'
    },
    { 
      id: '2', 
      book: 'Gas Trading', 
      desk: 'Natural Gas', 
      trader: 'Sarah Johnson', 
      product: 'NATGAS', 
      pnl: -125000, 
      attribution: { priceMovement: -180000, carryReturn: 15000, newTrades: 35000, fxImpact: 2000, other: 3000 },
      date: '2024-02-15'
    },
    { 
      id: '3', 
      book: 'Refined Products', 
      desk: 'Gasoline', 
      trader: 'Mike Chen', 
      product: 'RBOB', 
      pnl: 280000, 
      attribution: { priceMovement: 220000, carryReturn: 35000, newTrades: 18000, fxImpact: 4000, other: 3000 },
      date: '2024-02-15'
    }
  ]

  const hedgePositions: HedgePosition[] = [
    { id: '1', hedgeType: 'swap', underlyingAsset: 'WTI Crude', notional: 10000000, maturity: '2024-06-15', effectiveness: 92, pnlImpact: 125000, deltaHedged: 0.85, gammaExposure: 0.012, vegaExposure: 2.5, status: 'active' },
    { id: '2', hedgeType: 'option', underlyingAsset: 'Natural Gas', notional: 5000000, maturity: '2024-04-20', effectiveness: 78, pnlImpact: -45000, deltaHedged: 0.65, gammaExposure: 0.025, vegaExposure: 4.2, status: 'active' },
    { id: '3', hedgeType: 'future', underlyingAsset: 'Brent Crude', notional: 8000000, maturity: '2024-05-10', effectiveness: 88, pnlImpact: 85000, deltaHedged: 0.92, gammaExposure: 0.008, vegaExposure: 1.8, status: 'active' }
  ]

  const portfolioValuations: PortfolioValuation[] = [
    { id: '1', portfolio: 'Energy Trading Book', currentValue: 45000000, previousValue: 43500000, change: 1500000, changePercent: 3.45, var95: 2250000, var99: 3200000, expectedShortfall: 4100000, sharpeRatio: 1.25, maxDrawdown: -8.5, lastUpdate: '2024-02-15T14:30:00Z' },
    { id: '2', portfolio: 'Gas & Power Portfolio', currentValue: 32000000, previousValue: 33200000, change: -1200000, changePercent: -3.61, var95: 1800000, var99: 2500000, expectedShortfall: 3200000, sharpeRatio: 0.85, maxDrawdown: -12.2, lastUpdate: '2024-02-15T14:30:00Z' },
    { id: '3', portfolio: 'Refined Products', currentValue: 28500000, previousValue: 27800000, change: 700000, changePercent: 2.52, var95: 1650000, var99: 2200000, expectedShortfall: 2800000, sharpeRatio: 1.15, maxDrawdown: -6.8, lastUpdate: '2024-02-15T14:30:00Z' }
  ]

  const scenarioAnalyses: ScenarioAnalysis[] = [
    { id: '1', scenarioName: 'Oil Price Shock', description: 'Sudden 25% increase in crude oil prices', probability: 15, portfolioImpact: 8500000, impactPercent: 12.5, timeHorizon: '1 month', keyDrivers: ['Geopolitical tension', 'Supply disruption'], mitigationActions: ['Increase hedging', 'Reduce exposure'] },
    { id: '2', scenarioName: 'Recession Scenario', description: 'Economic downturn reducing energy demand', probability: 25, portfolioImpact: -12000000, impactPercent: -18.2, timeHorizon: '6 months', keyDrivers: ['GDP decline', 'Industrial slowdown'], mitigationActions: ['Portfolio rebalancing', 'Defensive positioning'] },
    { id: '3', scenarioName: 'Green Transition', description: 'Accelerated renewable energy adoption', probability: 35, portfolioImpact: -3500000, impactPercent: -5.1, timeHorizon: '2 years', keyDrivers: ['Policy changes', 'Technology advancement'], mitigationActions: ['ESG investments', 'Carbon trading'] }
  ]

  // Generate sparkline data for KPIs
  const pnlSparkline = [2100000, 2250000, 1950000, 2400000, 2650000, 2300000, 2450000]
  const cashSparkline = [14500000, 15200000, 14800000, 15600000, 15900000, 15400000, 15750000]
  const portfolioSparkline = [118000000, 122000000, 119000000, 126000000, 128000000, 123000000, 125000000]

  useEffect(() => {
    api.get<PnL[]>('/api/v1/finance/pnl')
      .then(r => setPnl(r.data))
      .catch(e => setError(e?.message ?? 'Failed to load finance data'))
      .finally(() => setLoading(false))
  }, [])

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
      case 'liquidity':
        return <LiquidityCashManagementPanel cashFlows={cashFlows} margins={margins} />
      case 'attribution':
        return <PnLAttributionPanel attributions={pnlAttributions} />
      case 'hedging':
        return <HedgeEffectivenessPanel hedges={hedgePositions} />
      case 'valuation':
        return <PortfolioValuationPanel portfolios={portfolioValuations} scenarios={scenarioAnalyses} />
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <LiquidityCashManagementPanel cashFlows={cashFlows.slice(0, 3)} margins={margins.slice(0, 2)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <PnLAttributionPanel attributions={pnlAttributions.slice(0, 2)} />
              <HedgeEffectivenessPanel hedges={hedgePositions.slice(0, 2)} />
            </div>
            <PortfolioValuationPanel portfolios={portfolioValuations} scenarios={scenarioAnalyses.slice(0, 2)} />
          </div>
        )
    }
  }

  return (
    <div style={{ animation: 'fadeInUp 0.6s ease' }}>
      {/* Hero Section */}
      <div className="hero" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px' }}>💰</div>
    <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Finance & Treasury Control Center</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', color: 'var(--muted)' }}>
              Advanced financial management, P&L attribution, hedge effectiveness, and portfolio optimization
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
          <StaticKPI metric={FINANCE_KPIS.totalPnL} />
          <StaticKPI metric={FINANCE_KPIS.availableCash} />
          <StaticKPI metric={FINANCE_KPIS.hedgeEffectiveness} />
          <StaticKPI metric={FINANCE_KPIS.portfolioValue} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="market-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`market-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <IconFinance />
          Overview
        </button>
        <button
          className={`market-tab ${activeTab === 'liquidity' ? 'active' : ''}`}
          onClick={() => setActiveTab('liquidity')}
        >
          <IconTrend />
          Liquidity & Cash
        </button>
        <button
          className={`market-tab ${activeTab === 'attribution' ? 'active' : ''}`}
          onClick={() => setActiveTab('attribution')}
        >
          <IconReport />
          P&L Attribution
        </button>
        <button
          className={`market-tab ${activeTab === 'hedging' ? 'active' : ''}`}
          onClick={() => setActiveTab('hedging')}
        >
          <IconShield />
          Hedge Effectiveness
        </button>
        <button
          className={`market-tab ${activeTab === 'valuation' ? 'active' : ''}`}
          onClick={() => setActiveTab('valuation')}
        >
          <IconAlert />
          Portfolio Valuation
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}
