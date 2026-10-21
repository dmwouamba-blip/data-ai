/**
 * Global flag to completely disable all real-time updates and KPI recalculations
 * This prevents any value resets or dynamic updates
 */

// Global flag - when true, all real-time updates are disabled
export const DISABLE_ALL_REALTIME_UPDATES = true

/**
 * Hook to check if real-time updates should be disabled
 */
export function useDisableRealTime(): boolean {
  return DISABLE_ALL_REALTIME_UPDATES
}

/**
 * Wrapper for setInterval that respects the global disable flag
 */
export function safeSetInterval(callback: () => void, delay: number): number | null {
  if (DISABLE_ALL_REALTIME_UPDATES) {
    console.log('Real-time updates disabled - skipping setInterval')
    return null
  }
  return window.setInterval(callback, delay)
}

/**
 * Wrapper for clearInterval that handles null values
 */
export function safeClearInterval(intervalId: number | null): void {
  if (intervalId) {
    clearInterval(intervalId)
  }
}

/**
 * No-op function for disabling updates
 */
export function noOpUpdate(): void {
  // Do nothing - prevents any updates
}

/**
 * Static fallback values for components that need some data
 */
export const STATIC_FALLBACKS = {
  chart: {
    data: [
      { timestamp: Date.now() - 60000, price: 75.45, volume: 1000 },
      { timestamp: Date.now() - 30000, price: 75.47, volume: 1200 },
      { timestamp: Date.now(), price: 75.46, volume: 1100 }
    ]
  },
  orderBook: {
    bids: [{ price: 75.45, volume: 1000, orders: 5 }],
    asks: [{ price: 75.47, volume: 1200, orders: 3 }],
    spread: 0.02,
    mid_price: 75.46
  }
}
