/**
 * Service pour gérer les requêtes de chat asynchrones et les notifications
 */

export interface AsyncChatTask {
  id: string
  question: string
  conversationId?: string
  context?: string
  startTime: number
  status: 'pending' | 'completed' | 'error'
  response?: string
  error?: string
}

export interface AsyncNotification {
  id: string
  taskId: string
  question: string
  response: string
  timestamp: number
  isRead: boolean
}

class AsyncChatService {
  private tasks: Map<string, AsyncChatTask> = new Map()
  private notifications: AsyncNotification[] = []
  private listeners: Set<(notifications: AsyncNotification[]) => void> = new Set()

  // Générer un ID unique pour la tâche
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Créer une tâche asynchrone
  createAsyncTask(question: string, conversationId?: string, context?: string): string {
    const taskId = this.generateTaskId()
    const task: AsyncChatTask = {
      id: taskId,
      question,
      conversationId,
      context,
      startTime: Date.now(),
      status: 'pending'
    }
    
    this.tasks.set(taskId, task)
    
    // Lancer la requête en arrière-plan
    this.executeAsyncTask(taskId)
    
    return taskId
  }

  // Exécuter la tâche asynchrone avec performance optimisée
  private async executeAsyncTask(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      // Import dynamique de l'API pour éviter les dépendances circulaires
      const { api } = await import('./api')
      
      console.log(`🚀 Exécution de la tâche asynchrone ${taskId}:`, task.question)
      
      // Utiliser l'endpoint de test pour les questions qui contiennent "test" ou "slow"
      const endpoint = task.question.toLowerCase().includes('test') || task.question.toLowerCase().includes('slow') || task.question.toLowerCase().includes('lent')
        ? '/api/v1/genie/test-slow-response'
        : '/api/v1/genie/chat'
      
      // Performance: marquer le début
      const startTime = performance.now()
      
      const response = await api.post(endpoint, {
        message: task.question,
        conversation_id: task.conversationId,
        context: task.context
      })

      const executionTime = performance.now() - startTime
      console.log(`⚡ Tâche ${taskId} exécutée en ${executionTime.toFixed(2)}ms`)

      // Mettre à jour la tâche immédiatement
      task.status = 'completed'
      task.response = response.data.response
      this.tasks.set(taskId, task)

      // Créer une notification avec priorité haute pour performance
      const notification: AsyncNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId,
        question: task.question,
        response: response.data.response,
        timestamp: Date.now(),
        isRead: false
      }

      // Notification immédiate sans attendre
      this.notifications.unshift(notification)
      
      // Utiliser requestAnimationFrame pour une notification non-bloquante
      requestAnimationFrame(() => {
        this.notifyListeners()
      })
      
      console.log(`✅ Tâche ${taskId} terminée avec succès`)
      
    } catch (error: any) {
      console.error(`❌ Erreur lors de l'exécution de la tâche ${taskId}:`, error)
      
      task.status = 'error'
      task.error = error.response?.data?.detail || error.message || 'Unknown error'
      this.tasks.set(taskId, task)
      
      // Créer une notification d'erreur
      const notification: AsyncNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId,
        question: task.question,
        response: `Error: ${task.error}`,
        timestamp: Date.now(),
        isRead: false
      }

      this.notifications.unshift(notification)
      
      // Notification d'erreur immédiate
      requestAnimationFrame(() => {
        this.notifyListeners()
      })
    }
  }

  // S'abonner aux notifications
  subscribe(callback: (notifications: AsyncNotification[]) => void) {
    this.listeners.add(callback)
    
    // Retourner une fonction pour se désabonner
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Notifier tous les listeners de manière optimisée
  private notifyListeners() {
    // Utiliser requestIdleCallback si disponible pour de meilleures performances
    const notify = () => {
      this.listeners.forEach(callback => {
        try {
          callback([...this.notifications])
        } catch (error) {
          console.error('Error in async notification listener:', error)
        }
      })
    }

    // Utiliser requestIdleCallback ou requestAnimationFrame comme fallback
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(notify, { timeout: 100 })
    } else {
      requestAnimationFrame(notify)
    }
  }

  // Obtenir toutes les notifications
  getNotifications(): AsyncNotification[] {
    return [...this.notifications]
  }

  // Obtenir le nombre de notifications non lues
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      this.notifyListeners()
    }
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true)
    this.notifyListeners()
  }

  // Supprimer une notification
  removeNotification(notificationId: string) {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      this.notifications.splice(index, 1)
      this.notifyListeners()
    }
  }

  // Obtenir une tâche par ID
  getTask(taskId: string): AsyncChatTask | undefined {
    return this.tasks.get(taskId)
  }

  // Nettoyer les anciennes tâches (plus de 24h)
  cleanup() {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 heures
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (now - task.startTime > maxAge) {
        this.tasks.delete(taskId)
      }
    }
    
    // Nettoyer aussi les notifications anciennes
    this.notifications = this.notifications.filter(n => now - n.timestamp < maxAge)
    this.notifyListeners()
  }
}

// Instance singleton
export const asyncChatService = new AsyncChatService()

// Nettoyer automatiquement toutes les heures
setInterval(() => {
  asyncChatService.cleanup()
}, 60 * 60 * 1000)
