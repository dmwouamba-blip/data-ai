import { useEffect, useRef } from 'react'

/**
 * Hook personnalisé pour des useEffect non-bloquants qui n'interfèrent pas avec la navigation
 */
export function useNonBlockingEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList,
  options: {
    delay?: number
    useIdleCallback?: boolean
    priority?: 'low' | 'normal' | 'high'
  } = {}
) {
  const { delay = 0, useIdleCallback = true, priority = 'normal' } = options
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Nettoyer l'effet précédent si nécessaire
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    const executeEffect = () => {
      const cleanup = effect()
      if (typeof cleanup === 'function') {
        cleanupRef.current = cleanup
      }
    }

    if (delay > 0) {
      // Utiliser setTimeout pour différer l'exécution
      const timeoutId = setTimeout(executeEffect, delay)
      return () => {
        clearTimeout(timeoutId)
        if (cleanupRef.current) {
          cleanupRef.current()
          cleanupRef.current = null
        }
      }
    }

    // Choisir la méthode d'exécution en fonction de la priorité
    switch (priority) {
      case 'high':
        // Exécution immédiate mais non-bloquante
        requestAnimationFrame(executeEffect)
        break
      
      case 'low':
        // Utiliser requestIdleCallback si disponible
        if (useIdleCallback && typeof requestIdleCallback !== 'undefined') {
          const id = requestIdleCallback(executeEffect, { timeout: 1000 })
          return () => {
            cancelIdleCallback(id)
            if (cleanupRef.current) {
              cleanupRef.current()
              cleanupRef.current = null
            }
          }
        } else {
          // Fallback avec setTimeout
          const timeoutId = setTimeout(executeEffect, 100)
          return () => {
            clearTimeout(timeoutId)
            if (cleanupRef.current) {
              cleanupRef.current()
              cleanupRef.current = null
            }
          }
        }
        break
      
      default: // 'normal'
        // Utiliser requestAnimationFrame par défaut
        const id = requestAnimationFrame(executeEffect)
        return () => {
          cancelAnimationFrame(id)
          if (cleanupRef.current) {
            cleanupRef.current()
            cleanupRef.current = null
          }
        }
    }

    // Cleanup par défaut
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, deps)
}

/**
 * Hook pour les intervalles non-bloquants
 */
export function useNonBlockingInterval(
  callback: () => void,
  delay: number | null,
  options: {
    immediate?: boolean
    priority?: 'low' | 'normal' | 'high'
  } = {}
) {
  const { immediate = false, priority = 'normal' } = options
  const savedCallback = useRef(callback)

  // Se souvenir du dernier callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useNonBlockingEffect(() => {
    if (delay === null) return

    // Exécuter immédiatement si demandé
    if (immediate) {
      savedCallback.current()
    }

    // Créer l'intervalle
    const intervalId = setInterval(() => {
      savedCallback.current()
    }, delay)

    return () => clearInterval(intervalId)
  }, [delay, immediate], { priority })
}

/**
 * Hook pour les timeouts non-bloquants
 */
export function useNonBlockingTimeout(
  callback: () => void,
  delay: number | null,
  deps?: React.DependencyList
) {
  const savedCallback = useRef(callback)

  // Se souvenir du dernier callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useNonBlockingEffect(() => {
    if (delay === null) return

    const timeoutId = setTimeout(() => {
      savedCallback.current()
    }, delay)

    return () => clearTimeout(timeoutId)
  }, deps, { priority: 'normal' })
}
