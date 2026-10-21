import { KPIMetric, getKPIStatusColor, getChangeColor } from '../utils/staticKPIs'

interface StaticKPIProps {
  metric: KPIMetric
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'card' | 'minimal'
}

export default function StaticKPI({ 
  metric, 
  size = 'medium',
  variant = 'default' 
}: StaticKPIProps) {
  const statusColor = getKPIStatusColor(metric.status || 'normal')
  const changeColor = getChangeColor(metric.changeType || 'neutral')

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '16px',
          minHeight: '80px',
          valueSize: '20px',
          labelSize: '12px',
          iconSize: '20px'
        }
      case 'large':
        return {
          padding: '32px',
          minHeight: '140px',
          valueSize: '36px',
          labelSize: '16px',
          iconSize: '40px'
        }
      default:
        return {
          padding: '24px',
          minHeight: '120px',
          valueSize: '28px',
          labelSize: '14px',
          iconSize: '32px'
        }
    }
  }

  const styles = getSizeStyles()

  if (variant === 'minimal') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: `1px solid ${statusColor}30`
      }}>
        {metric.icon && (
          <span style={{ fontSize: '24px', opacity: 0.8 }}>
            {metric.icon}
          </span>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: statusColor,
            lineHeight: 1,
            marginBottom: '4px',
            fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace'
          }}>
            {metric.value}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            fontWeight: '500'
          }}>
            {metric.label}
          </div>
        </div>
        {metric.change && (
          <div style={{
            fontSize: '11px',
            color: changeColor,
            fontWeight: '600',
            textAlign: 'right'
          }}>
            {metric.change}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={variant === 'card' ? 'card' : 'kpi'} style={{
      borderLeft: `4px solid ${statusColor}`,
      padding: styles.padding,
      minHeight: styles.minHeight,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: variant === 'card' ? 'var(--bg-secondary)' : undefined
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '16px', 
        marginBottom: '12px' 
      }}>
        {metric.icon && (
          <div style={{
            color: statusColor,
            fontSize: styles.iconSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
            flexShrink: 0
          }}>
            {metric.icon}
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: styles.valueSize,
            fontWeight: '800',
            color: statusColor,
            lineHeight: 1,
            marginBottom: '8px',
            fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
            wordBreak: 'break-word'
          }}>
            {metric.value}
          </div>
          
          <div style={{
            fontSize: styles.labelSize,
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: '4px'
          }}>
            {metric.label}
          </div>
          
          {metric.change && (
            <div style={{
              fontSize: '12px',
              color: changeColor,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ fontSize: '14px' }}>
                {metric.changeType === 'positive' ? '↗' : 
                 metric.changeType === 'negative' ? '↘' : '→'}
              </span>
              {metric.change}
            </div>
          )}
        </div>

        {metric.status && metric.status !== 'normal' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            background: metric.status === 'critical' ? 'var(--danger)15' : 'var(--col-risk)15',
            color: metric.status === 'critical' ? 'var(--danger)' : 'var(--col-risk)',
            border: `1px solid ${metric.status === 'critical' ? 'var(--danger)' : 'var(--col-risk)'}30`,
            textTransform: 'uppercase',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '14px' }}>
              {metric.status === 'critical' ? '🔴' : '🟡'}
            </span>
            {metric.status}
          </div>
        )}
      </div>
    </div>
  )
}
