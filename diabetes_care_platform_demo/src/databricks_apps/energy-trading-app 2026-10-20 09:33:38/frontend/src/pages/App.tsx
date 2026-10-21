import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { IconDashboard, IconTrade, IconRisk, IconFinance, IconOps, IconCompliance } from '../components/Icons'
import AskAI from '../components/AskAI'
import NotificationControl from '../components/NotificationControl'
import ThemeControl from '../components/ThemeControl'
import NotificationDemo from '../components/NotificationDemo'
import AsyncResponseModal from '../components/AsyncResponseModal'
import SidebarNotificationDisplay from '../components/SidebarNotificationDisplay'
import PerformantPageWrapper from '../components/PerformantPageWrapper'
import { AsyncNotification } from '../services/asyncChatService'

function agentConfig(pathname: string) {
  if (pathname.startsWith('/trading')) return {
    label: 'Ask Trading Agent',
    description: 'Discover next trades, optimize entries/exits, and simulate positions using market snapshots and risk budget.',
    examples: [
      'What are the top 3 instruments by momentum and liquidity today?',
      'Suggest a hedged long/short pair for Gas and Power.',
      'Simulate scaling into Brent with 3 tranches and tight stops.'
    ],
    actions: [
      'Generate position plan with target/stop and size by risk.',
      'Backtest last 30 days vs chosen rule and report P/L.',
      'Create a watchlist and alert thresholds.'
    ]
  }
  if (pathname.startsWith('/risk')) return {
    label: 'Ask Risk Agent',
    description: 'Assess VaR/stress, identify hotspots, propose hedges, and rebalance risk across products and time buckets.',
    examples: [
      'Where is VaR rising fastest week-over-week?',
      'What hedge reduces 95% VaR by 20% with minimal cost?',
      'Propose new limits for top 3 volatile products.'
    ],
    actions: [
      'Generate hedge plan and expected VaR change.',
      'Stress test portfolio for 2014-style shock and summarize.',
      'Draft limit adjustments for approval.'
    ]
  }
  if (pathname.startsWith('/finance')) return {
    label: 'Ask Finance Agent',
    description: 'Explain PnL drivers, forecast cash flows, and recommend profit-taking or loss-cutting strategies.',
    examples: [
      'Break down yesterday’s PnL by product and factor.',
      'Forecast next month PnL given current exposures.',
      'Should we realize profits on WTI now?' 
    ],
    actions: [
      'Generate PnL attribution table and commentary.',
      'Create a profit-taking schedule with thresholds.',
      'Produce CFO-ready summary.'
    ]
  }
  if (pathname.startsWith('/operations')) return {
    label: 'Ask Operations Agent',
    description: 'Optimize logistics, schedules, and nominations; surface bottlenecks and reduce operational risk.',
    examples: [
      'Where are delivery bottlenecks this week?',
      'Recommend a revised schedule to reduce gross exposure.',
      'What is the impact of delaying shipment X by 2 days?'
    ],
    actions: [
      'Propose new schedule and exposure delta.',
      'Alert list for high-risk logistics points.',
      'Generate operations handoff checklist.'
    ]
  }
  if (pathname.startsWith('/compliance')) return {
    label: 'Ask Compliance Agent',
    description: 'Summarize open issues, estimate financial exposure, and outline remediation steps with priorities.',
    examples: [
      'Which high-severity issues risk trading blocks?',
      'Estimate penalty exposure if items stay open 30 days.',
      'What’s the fastest remediation path for KYC gaps?'
    ],
    actions: [
      'Prioritized remediation plan with owners and SLAs.',
      'Auto-generate audit-ready evidence checklist.',
      'Draft notifications to stakeholders.'
    ]
  }
  return {
    label: 'Ask Databricks Agent',
    description: 'Search across all domains, summarize KPIs, and generate cross-functional recommendations.',
    examples: [
      'Give me an exec brief for today in 5 bullets.',
      'Where are the largest risks and the quickest wins?',
      'What should be our focus for the next week?'
    ],
    actions: [
      'Generate executive summary PDF.',
      'Create cross-domain action plan with owners.',
      'Prepare talking points for leadership meeting.'
    ]
  }
}

export default function App() {
  const { pathname } = useLocation()
  const cfg = agentConfig(pathname)
  const [selectedNotification, setSelectedNotification] = useState<AsyncNotification | null>(null)
  const [showAsyncModal, setShowAsyncModal] = useState(false)

  const handleNotificationClick = (notification: AsyncNotification) => {
    setSelectedNotification(notification)
    setShowAsyncModal(true)
  }

  const handleCloseAsyncModal = () => {
    setShowAsyncModal(false)
    setSelectedNotification(null)
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="app-title">
          <div className="logo" />
          <div>
            <div style={{ fontWeight: 800 }}>Energy Trading Data Intelligence Platform</div>
            <div className="muted" style={{ fontSize: 12 }}>Powered by Databricks</div>
          </div>
        </div>
        <div className="menu">
          <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} className={pathname === '/' ? 'active' : ''}><IconDashboard /> Home</Link>
          <Link to="/trading" aria-current={pathname === '/trading' ? 'page' : undefined} className={pathname === '/trading' ? 'active' : ''}><IconTrade /> Trading</Link>
          <Link to="/risk" aria-current={pathname === '/risk' ? 'page' : undefined} className={pathname === '/risk' ? 'active' : ''}><IconRisk /> Risk</Link>
          <Link to="/finance" aria-current={pathname === '/finance' ? 'page' : undefined} className={pathname === '/finance' ? 'active' : ''}><IconFinance /> Finance</Link>
          <Link to="/operations" aria-current={pathname === '/operations' ? 'page' : undefined} className={pathname === '/operations' ? 'active' : ''}><IconOps /> Operations</Link>
          <Link to="/compliance" aria-current={pathname === '/compliance' ? 'page' : undefined} className={pathname === '/compliance' ? 'active' : ''}><IconCompliance /> Compliance</Link>
        </div>

        {/* Integrated Controls */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <ThemeControl />
          <NotificationControl />
        </div>
      </aside>
      <div className="content">
        {/* Wrapper de performance pour une navigation fluide */}
        <PerformantPageWrapper 
          pageName={pathname.split('/')[1] || 'home'}
          enableOptimizations={true}
        >
          <Outlet />
        </PerformantPageWrapper>
      </div>
      
      {/* Chat Agent */}
      <AskAI label={cfg.label} description={cfg.description} examples={cfg.examples} context={pathname.split('/')[1] || 'general'} />
      
      
      {/* Beautiful notification display near sidebar */}
      <SidebarNotificationDisplay />
      
      {/* Demo component pour tester les notifications - À supprimer en production */}
      {process.env.NODE_ENV === 'development' && <NotificationDemo />}
      
      {/* Async Response Modal */}
      <AsyncResponseModal 
        notification={selectedNotification}
        isOpen={showAsyncModal}
        onClose={handleCloseAsyncModal}
      />
    </div>
  )
}
