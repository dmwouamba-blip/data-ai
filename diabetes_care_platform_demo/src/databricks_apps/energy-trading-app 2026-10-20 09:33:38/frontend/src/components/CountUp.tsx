import { useState, useEffect } from 'react'

interface CountUpProps {
  start?: number
  end: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  separator?: string
  preserveValue?: boolean
}

export default function CountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  suffix = '',
  prefix = '',
  separator = ',',
  preserveValue = false
}: CountUpProps) {
  const [count, setCount] = useState(preserveValue ? end : start)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isAnimating || preserveValue) return
    
    setIsAnimating(true)
    const startTime = Date.now()
    const difference = end - start

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = start + (difference * easeOut)
      
      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [start, end, duration, isAnimating, preserveValue])

  const formatNumber = (num: number) => {
    const value = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString()
    
    // Add separator for thousands
    if (separator && Math.abs(num) >= 1000) {
      return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    }
    
    return value
  }

  return (
    <span 
      className="count-up"
      style={{
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.3s ease'
      }}
    >
      {prefix}{formatNumber(count)}{suffix}
    </span>
  )
}