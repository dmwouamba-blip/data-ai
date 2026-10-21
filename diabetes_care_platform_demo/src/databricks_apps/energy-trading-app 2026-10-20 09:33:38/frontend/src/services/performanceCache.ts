/**
 * Cache performant pour les réponses API et amélioration des performances
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100
  private cleanupInterval: number | null = null

  constructor() {
    // Nettoyer automatiquement toutes les 5 minutes
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  // Générer une clé de cache
  generateKey(url: string, params?: any): string {
    return params ? `${url}:${JSON.stringify(params)}` : url
  }

  // Stocker dans le cache
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000): void {
    // Si le cache est plein, supprimer les plus anciens
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone pour éviter les mutations
      timestamp: Date.now(),
      ttl
    })
  }

  // Récupérer du cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Vérifier si l'entrée a expiré
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  // Vérifier si une clé existe et est valide
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // Supprimer une entrée
  delete(key: string): void {
    this.cache.delete(key)
  }

  // Nettoyer les entrées expirées
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Vider le cache
  clear(): void {
    this.cache.clear()
  }

  // Obtenir les statistiques du cache
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys())
    }
  }

  // Détruire le cache
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Instance singleton
export const performanceCache = new PerformanceCache()

// Wrapper pour les requêtes API avec cache
export const cachedApiRequest = async <T>(
  url: string,
  options: RequestInit = {},
  ttl = 5 * 60 * 1000
): Promise<T> => {
  const cacheKey = performanceCache.generateKey(url, options.body || undefined)
  
  // Vérifier le cache d'abord
  const cached = performanceCache.get<T>(cacheKey)
  if (cached) {
    console.log(`📋 Cache hit pour: ${url}`)
    return cached
  }

  // Si pas en cache, faire la requête
  console.log(`🌐 Cache miss, requête API: ${url}`)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Stocker en cache
    performanceCache.set(cacheKey, data, ttl)
    
    return data
  } catch (error) {
    console.error(`❌ Erreur API pour ${url}:`, error)
    throw error
  }
}

// Expose pour debug
if (typeof window !== 'undefined') {
  (window as any).performanceCache = performanceCache
}
