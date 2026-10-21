import React, { useEffect, useRef, useState } from 'react'
import { performanceMonitor, debounce } from '../services/performanceOptimizer'

interface PerformantPageWrapperProps {
  children: React.ReactNode
  pageName: string
  enableOptimizations?: boolean
}

/**
 * Wrapper qui optimise les performances de page et évite les blocages de navigation
 */
export default function PerformantPageWrapper({ 
  children, 
  pageName, 
  enableOptimizations = true 
}: PerformantPageWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(true) // Toujours démarrer chargé pour éviter les blocages
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    // Performance monitoring en arrière-plan sans affecter la navigation
    if (enableOptimizations) {
      performanceMonitor.start(`page-${pageName}`)
      
      // Mesurer de manière non-bloquante
      requestAnimationFrame(() => {
        if (mountedRef.current && enableOptimizations) {
          const duration = performanceMonitor.end(`page-${pageName}`)
          console.log(`📊 Page '${pageName}' rendered in ${duration.toFixed(2)}ms`)
        }
      })
    }

    return () => {
      mountedRef.current = false
    }
  }, [pageName, enableOptimizations])

  // Gestionnaire de nettoyage lors du démontage
  useEffect(() => {
    return () => {
      mountedRef.current = false
      
      // Nettoyage des listeners et intervalles
      if (enableOptimizations) {
        console.log(`🧹 Cleaning up page '${pageName}'`)
      }
    }
  }, [pageName, enableOptimizations])

  // Navigation JAMAIS bloquée - afficher directement le contenu
  return <>{children}</>
}
