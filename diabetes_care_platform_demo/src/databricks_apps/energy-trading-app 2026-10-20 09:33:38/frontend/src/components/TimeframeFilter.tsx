import { useState } from 'react'

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

interface TimeframeFilterProps {
  value: Timeframe
  onChange: (timeframe: Timeframe) => void
  className?: string
}

const timeframes: { label: string; value: Timeframe }[] = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
]

export default function TimeframeFilter({ value, onChange, className = '' }: TimeframeFilterProps) {
  return (
    <div className={`timeframe-filter ${className}`}>
      {timeframes.map(tf => (
        <button
          key={tf.value}
          className={`timeframe-btn ${value === tf.value ? 'active' : ''}`}
          onClick={() => onChange(tf.value)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
