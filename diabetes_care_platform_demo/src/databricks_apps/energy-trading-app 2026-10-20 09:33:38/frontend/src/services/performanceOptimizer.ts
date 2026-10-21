/**
 * Service d'optimisation de performance pour éviter les blocages de navigation
 * Version améliorée avec gestion des processus asynchrones et navigation fluide
 */

// Cache pour éviter les recalculs inutiles
const memoCache = new Map<string, { data: any, timestamp: number }>()

// Debounce function optimisée avec requestAnimationFrame
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    
    timeout = window.setTimeout(() => {
      // Utiliser requestAnimationFrame pour une meilleure performance
      requestAnimationFrame(() => func(...args))
      timeout = null
    }, wait)
  }
}

// Throttle function pour limiter les exécutions avec optimisation
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      // Optimiser avec requestAnimationFrame
      requestAnimationFrame(() => func(...args))
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Smart throttle qui s'adapte à la charge système
export function smartThrottle<T extends (...args: any[]) => any>(
  func: T,
  baseLimit: number = 100
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastExecution = 0
  
  return (...args: Parameters<T>) => {
    const now = performance.now()
    const timeSinceLastExecution = now - lastExecution
    
    // Adapter le délai selon la charge système
    const adaptiveLimit = document.hidden ? baseLimit * 2 : baseLimit
    
    if (!inThrottle && timeSinceLastExecution >= adaptiveLimit) {
      requestAnimationFrame(() => func(...args))
      lastExecution = now
      inThrottle = true
      setTimeout(() => inThrottle = false, adaptiveLimit)
    }
  }
}

// Fonction de mémoisation avec TTL
export function memoizeWithTTL<T>(
  key: string,
  factory: () => T,
  ttl = 5000
): T {
  const cached = memoCache.get(key)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data
  }
  
  const data = factory()
  memoCache.set(key, { data, timestamp: now })
  
  return data
}

// Nettoyage du cache expiré
export function cleanupMemoCache() {
  const now = Date.now()
  for (const [key, { timestamp }] of memoCache.entries()) {
    if (now - timestamp > 10000) { // 10 secondes
      memoCache.delete(key)
    }
  }
}

// Gestionnaire d'intervalles optimisé
class IntervalManager {
  private intervals = new Map<string, number>()
  
  set(key: string, callback: () => void, delay: number): void {
    this.clear(key) // Clear existing interval
    
    const intervalId = window.setInterval(callback, delay)
    this.intervals.set(key, intervalId)
  }
  
  clear(key: string): void {
    const intervalId = this.intervals.get(key)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(key)
    }
  }
  
  clearAll(): void {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId)
    }
    this.intervals.clear()
  }
}

export const intervalManager = new IntervalManager()

// Hook personnalisé pour les useEffect non-bloquants
export function useNonBlockingEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList,
  delay = 0
) {
  const React = require('react')
  
  React.useEffect(() => {
    if (delay === 0) {
      // Utiliser requestIdleCallback ou requestAnimationFrame
      const callback = () => {
        const cleanup = effect()
        return cleanup
      }
      
      if (typeof requestIdleCallback !== 'undefined') {
        const id = requestIdleCallback(callback, { timeout: 100 })
        return () => cancelIdleCallback(id)
      } else {
        const id = requestAnimationFrame(callback)
        return () => cancelAnimationFrame(id)
      }
    } else {
      // Utiliser setTimeout pour différer l'exécution
      const timeoutId = setTimeout(() => {
        const cleanup = effect()
        return cleanup
      }, delay)
      
      return () => clearTimeout(timeoutId)
    }
  }, deps)
}

// Performance monitor
class PerformanceMonitor {
  private marks = new Map<string, number>()
  
  start(label: string): void {
    this.marks.set(label, performance.now())
  }
  
  end(label: string): number {
    const startTime = this.marks.get(label)
    if (!startTime) {
      console.warn(`Performance mark '${label}' not found`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.marks.delete(label)
    
    if (duration > 100) {
      console.warn(`⚠️ Slow operation '${label}': ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Nouvelles fonctions utilitaires pour l'optimisation asynchrone
export function nonBlockingExecution<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        resolve(fn())
      }, { timeout: 100 })
    } else {
      setTimeout(() => {
        resolve(fn())
      }, 10)
    }
  })
}

// Fonction pour optimiser les callbacks
export function optimizeCallback(callback: () => void): void {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(callback)
  } else {
    setTimeout(callback, 0)
  }
}

// Fonction pour différer l'exécution
export function deferExecution(callback: () => void, timeout: number = 1000): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, Math.min(timeout, 16))
  }
}

// Débounce pour opérations lourdes
export function heavyOperationDebounce(fn: Function, delay: number = 300) {
  let timeoutId: number
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => fn.apply(null, args), delay)
  }
}

// Nettoyage automatique avec optimisations
setInterval(() => {
  cleanupMemoCache()
  
  // Optimiser le garbage collection si disponible
  if (typeof window !== 'undefined' && 'gc' in window) {
    deferExecution(() => {
      // @ts-ignore - gc peut ne pas être disponible
      if (window.gc) window.gc()
    }, 1000)
  }
}, 30000) // Toutes les 30 secondes

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    intervalManager.clearAll()
    memoCache.clear()
  })
}

// Debug helpers
if (typeof window !== 'undefined') {
  (window as any).performanceOptimizer = {
    memoCache,
    intervalManager,
    performanceMonitor,
    cleanupMemoCache
  }
}
