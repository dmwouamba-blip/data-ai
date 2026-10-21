/**
 * Service global de notifications pour éviter le blocage de l'application
 * et améliorer les performances
 */

export interface GlobalNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  timestamp: number
  clickable?: boolean
  onClick?: () => void
  isRead?: boolean
  persistent?: boolean
  category?: 'chat' | 'system' | 'trading' | 'alert'
}

class GlobalNotificationService {
  private notifications: GlobalNotification[] = []
  private history: GlobalNotification[] = []
  private listeners: Set<(notifications: GlobalNotification[]) => void> = new Set()
  private historyListeners: Set<(history: GlobalNotification[]) => void> = new Set()
  private notificationId = 0
  private maxHistorySize = 100

  // Générer un ID unique
  private generateId(): string {
    return `notif_${Date.now()}_${++this.notificationId}`
  }

  // Afficher une notification
  show(
    title: string, 
    message: string, 
    type: GlobalNotification['type'] = 'info', 
    duration = 4000, 
    onClick?: () => void,
    category: GlobalNotification['category'] = 'system',
    persistent = false
  ): string {
    const notification: GlobalNotification = {
      id: this.generateId(),
      title,
      message,
      type,
      duration,
      timestamp: Date.now(),
      clickable: !!onClick,
      onClick,
      isRead: false,
      persistent,
      category
    }

    this.notifications.unshift(notification)
    this.addToHistory(notification)
    this.notifyListeners()

    // Auto-suppression seulement si pas persistante
    if (duration > 0 && !persistent) {
      setTimeout(() => {
        this.remove(notification.id)
      }, duration)
    }

    return notification.id
  }

  // Ajouter à l'historique
  private addToHistory(notification: GlobalNotification) {
    this.history.unshift({ ...notification })
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize)
    }
    
    this.notifyHistoryListeners()
  }

  // Supprimer une notification
  remove(id: string) {
    const index = this.notifications.findIndex(n => n.id === id)
    if (index !== -1) {
      // Marquer comme lue dans l'historique
      this.markAsRead(id)
      this.notifications.splice(index, 1)
      this.notifyListeners()
    }
  }

  // Marquer une notification comme lue
  markAsRead(id: string) {
    const historyItem = this.history.find(n => n.id === id)
    if (historyItem) {
      historyItem.isRead = true
      this.notifyHistoryListeners()
    }
  }

  // Effacer toutes les notifications
  clear() {
    this.notifications = []
    this.notifyListeners()
  }

  // S'abonner aux changements
  subscribe(callback: (notifications: GlobalNotification[]) => void) {
    this.listeners.add(callback)
    
    // Retourner fonction de désabonnement
    return () => {
      this.listeners.delete(callback)
    }
  }

  // S'abonner aux changements d'historique
  subscribeToHistory(callback: (history: GlobalNotification[]) => void) {
    this.historyListeners.add(callback)
    
    // Retourner fonction de désabonnement
    return () => {
      this.historyListeners.delete(callback)
    }
  }

  // Notifier les listeners
  private notifyListeners() {
    // Utiliser requestAnimationFrame pour éviter les blocages
    requestAnimationFrame(() => {
      this.listeners.forEach(callback => {
        try {
          callback([...this.notifications])
        } catch (error) {
          console.error('Error in notification listener:', error)
        }
      })
    })
  }

  // Notifier les listeners d'historique
  private notifyHistoryListeners() {
    requestAnimationFrame(() => {
      this.historyListeners.forEach(callback => {
        try {
          callback([...this.history])
        } catch (error) {
          console.error('Error in history listener:', error)
        }
      })
    })
  }

  // Obtenir toutes les notifications
  getNotifications(): GlobalNotification[] {
    return [...this.notifications]
  }

  // Obtenir l'historique
  getHistory(): GlobalNotification[] {
    return [...this.history]
  }

  // Obtenir le nombre de notifications non lues dans l'historique
  getUnreadCount(): number {
    return this.history.filter(n => !n.isRead).length
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead() {
    this.history.forEach(n => n.isRead = true)
    this.notifyHistoryListeners()
  }

  // Supprimer une notification de l'historique
  removeNotification(id: string) {
    this.history = this.history.filter(n => n.id !== id)
    // Also remove from active notifications if present
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifyHistoryListeners()
    this.notifyListeners()
  }

  // Méthodes raccourcies améliorées
  success(title: string, message: string, duration?: number, onClick?: () => void, category: GlobalNotification['category'] = 'system') {
    return this.show(title, message, 'success', duration, onClick, category)
  }

  error(title: string, message: string, duration?: number, category: GlobalNotification['category'] = 'system') {
    return this.show(title, message, 'error', duration, undefined, category)
  }

  warning(title: string, message: string, duration?: number, category: GlobalNotification['category'] = 'system') {
    return this.show(title, message, 'warning', duration, undefined, category)
  }

  info(title: string, message: string, duration?: number, category: GlobalNotification['category'] = 'system') {
    return this.show(title, message, 'info', duration, undefined, category)
  }

  // Notification spéciale pour le chat
  chatNotification(title: string, message: string, onClick?: () => void, persistent = true) {
    return this.show(title, message, 'success', persistent ? 0 : 8000, onClick, 'chat', persistent)
  }
}

// Instance singleton
export const globalNotificationService = new GlobalNotificationService()

// Expose pour debug en développement
if (typeof window !== 'undefined') {
  (window as any).globalNotificationService = globalNotificationService
}
