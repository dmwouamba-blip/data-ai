/**
 * Static KPI values for clear, readable metrics display
 * These values remain stable and don't recalculate constantly
 */

export interface KPIMetric {
  value: string | number
  label: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  status?: 'normal' | 'warning' | 'critical'
  icon?: string
}

// Risk Dashboard KPIs
export const RISK_KPIS: Record<string, KPIMetric> = {
  totalExposure: {
    value: '23,245,047',
    label: 'Total Exposure',
    icon: '💰',
    status: 'normal'
  },
  totalVar95: {
    value: '1,991,874',
    label: 'Total VaR 95%',
    icon: '📊',
    status: 'normal'
  },
  activeAlerts: {
    value: '1',
    label: 'Active Alerts',
    change: '(2 critical)',
    changeType: 'negative',
    icon: '🚨',
    status: 'critical'
  },
  hedgeEffectiveness: {
    value: '19%',
    label: 'Hedge Effectiveness',
    icon: '⚖️',
    status: 'warning'
  }
}

// Trading Dashboard KPIs  
export const TRADING_KPIS: Record<string, KPIMetric> = {
  portfolioValue: {
    value: '37,975',
    label: 'Portfolio Value',
    icon: '📈',
    status: 'normal'
  },
  unrealizedPnL: {
    value: '+565',
    label: 'Unrealized P&L',
    change: '(+1.75%)',
    changeType: 'positive',
    icon: '📊',
    status: 'normal'
  },
  riskExposure: {
    value: '21,690',
    label: 'Risk Exposure',
    icon: '🛡️',
    status: 'normal'
  },
  activeAlerts: {
    value: '2',
    label: 'Active Alerts',
    change: '1 high priority',
    changeType: 'negative',
    icon: '🚨',
    status: 'warning'
  }
}

// Finance Dashboard KPIs
export const FINANCE_KPIS: Record<string, KPIMetric> = {
  totalPnL: {
    value: '$2.4M',
    label: 'Total P&L',
    change: '+12.5%',
    changeType: 'positive',
    icon: '💰',
    status: 'normal'
  },
  availableCash: {
    value: '$15.8M',
    label: 'Available Cash',
    change: '+2.1%',
    changeType: 'positive',
    icon: '💵',
    status: 'normal'
  },
  hedgeEffectiveness: {
    value: '87.3%',
    label: 'Hedge Effectiveness',
    change: '+3.2%',
    changeType: 'positive',
    icon: '⚖️',
    status: 'normal'
  },
  portfolioValue: {
    value: '$125M',
    label: 'Portfolio Value',
    change: '+5.8%',
    changeType: 'positive',
    icon: '📊',
    status: 'normal'
  }
}

// Operations Dashboard KPIs
export const OPERATIONS_KPIS: Record<string, KPIMetric> = {
  totalTrades: {
    value: '1,847',
    label: 'Total Trades',
    change: '+156 today',
    changeType: 'positive',
    icon: '📋',
    status: 'normal'
  },
  activeDeliveries: {
    value: '156',
    label: 'Active Deliveries',
    change: '12 in transit',
    changeType: 'neutral',
    icon: '🚛',
    status: 'normal'
  },
  settlementAccuracy: {
    value: '99.7%',
    label: 'Settlement Accuracy',
    change: '+0.2%',
    changeType: 'positive',
    icon: '✅',
    status: 'normal'
  },
  operationalEfficiency: {
    value: '94.2%',
    label: 'Operational Efficiency',
    change: '+1.1%',
    changeType: 'positive',
    icon: '⚡',
    status: 'normal'
  }
}

// Compliance Dashboard KPIs
export const COMPLIANCE_KPIS: Record<string, KPIMetric> = {
  complianceScore: {
    value: '96.8%',
    label: 'Compliance Score',
    change: '+1.2%',
    changeType: 'positive',
    icon: '🛡️',
    status: 'normal'
  },
  openViolations: {
    value: '3',
    label: 'Open Violations',
    change: '1 high severity',
    changeType: 'negative',
    icon: '⚠️',
    status: 'warning'
  },
  reportingStatus: {
    value: '100%',
    label: 'Reporting Status',
    change: 'All current',
    changeType: 'positive',
    icon: '📊',
    status: 'normal'
  },
  riskCoverage: {
    value: '98.5%',
    label: 'Risk Coverage',
    change: '+0.8%',
    changeType: 'positive',
    icon: '🎯',
    status: 'normal'
  }
}

/**
 * Get color for KPI status
 */
export function getKPIStatusColor(status: string): string {
  switch (status) {
    case 'critical': return 'var(--danger)'
    case 'warning': return 'var(--col-risk)'
    case 'normal': return 'var(--success)'
    default: return 'var(--text)'
  }
}

/**
 * Get color for change type
 */
export function getChangeColor(changeType: string): string {
  switch (changeType) {
    case 'positive': return 'var(--success)'
    case 'negative': return 'var(--danger)'
    case 'neutral': return 'var(--muted)'
    default: return 'var(--text)'
  }
}
