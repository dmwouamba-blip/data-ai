/**
 * Service de chat avec polling pour éviter les timeouts 504.
 * Utilise les nouveaux endpoints asynchrones du backend.
 */

import { api } from './api'
import { globalNotificationService } from './globalNotificationService'

// Types pour le système de polling
export interface AsyncJobRequest {
  message: string
  conversation_id?: string
  context?: string
}

export interface AsyncJobResponse {
  job_id: string
  status: JobStatus
  message: string
  estimated_duration_seconds: number
}

export interface JobStatusResponse {
  job_id: string
  status: JobStatus
  progress: number
  progress_message: string
  created_at: string
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  error?: string
  result?: any
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface PollingChatTask {
  taskId: string
  jobId: string
  question: string
  conversationId?: string
  context?: string
  status: JobStatus
  progress: number
  progressMessage: string
  result?: any
  error?: string
  createdAt: Date
  backgroundNotificationSent?: boolean
  completionNotificationSent?: boolean
  onProgress?: (progress: number, message: string) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

class PollingChatService {
  private tasks: Map<string, PollingChatTask> = new Map()
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private defaultPollingInterval = 2000 // 2 secondes
  private maxPollingTime = 600000 // 10 minutes maximum

  /**
   * Démarre une conversation asynchrone avec polling
   */
  async startAsyncChat(
    message: string,
    conversationId?: string,
    context?: string,
    callbacks?: {
      onProgress?: (progress: number, message: string) => void
      onComplete?: (result: any) => void
      onError?: (error: string) => void
    }
  ): Promise<string> {
    try {
      console.log('🚀 Démarrage du chat asynchrone avec polling')
      
      // Créer la requête
      const request: AsyncJobRequest = {
        message,
        conversation_id: conversationId,
        context
      }

      // Appeler l'endpoint asynchrone
      const response = await api.post<AsyncJobResponse>('/api/v1/genie/chat/async', request)
      const { job_id, status, estimated_duration_seconds } = response.data

      // Créer une tâche de polling
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const task: PollingChatTask = {
        taskId,
        jobId: job_id,
        question: message,
        conversationId,
        context,
        status,
        progress: 0,
        progressMessage: "Job créé, démarrage en cours...",
        createdAt: new Date(),
        onProgress: callbacks?.onProgress,
        onComplete: callbacks?.onComplete,
        onError: callbacks?.onError
      }

      this.tasks.set(taskId, task)

      // Démarrer le polling
      this.startPolling(taskId)

      console.log(`✅ Chat asynchrone démarré - Task ID: ${taskId}, Job ID: ${job_id}`)
      return taskId

    } catch (error: any) {
      console.error('❌ Erreur lors du démarrage du chat asynchrone:', error)
      throw new Error(`Échec du démarrage du chat asynchrone: ${error.message}`)
    }
  }

  /**
   * Démarre le polling pour une tâche
   */
  private startPolling(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    console.log(`📡 Démarrage du polling pour la tâche ${taskId}`)

    const startTime = Date.now()
    
    const pollInterval = setInterval(async () => {
      try {
        const currentTask = this.tasks.get(taskId)
        if (!currentTask) {
          this.stopPolling(taskId)
          return
        }

        // Vérifier le timeout
        if (Date.now() - startTime > this.maxPollingTime) {
          console.warn(`⏰ Timeout atteint pour la tâche ${taskId}`)
          this.handleTaskError(taskId, 'Timeout: la tâche a pris trop de temps')
          return
        }

        // Récupérer le statut du job
        const statusResponse = await api.get<JobStatusResponse>(`/api/v1/genie/jobs/${task.jobId}/status`)
        const jobStatus = statusResponse.data

        // Mettre à jour la tâche
        currentTask.status = jobStatus.status as JobStatus
        currentTask.progress = jobStatus.progress
        currentTask.progressMessage = jobStatus.progress_message

        // Callbacks de progression
        if (currentTask.onProgress) {
          currentTask.onProgress(jobStatus.progress, jobStatus.progress_message)
        }

        console.log(`📊 Task status ${taskId}: ${jobStatus.status} (${jobStatus.progress}%) - ${jobStatus.progress_message}`)

        // Send background notification after 10 seconds if not already sent
        if (!currentTask.backgroundNotificationSent && 
            (Date.now() - startTime) > 10000 && 
            jobStatus.status === JobStatus.RUNNING) {
          
          currentTask.backgroundNotificationSent = true
          
          globalNotificationService.info(
            '🔄 Background Processing',
            'Your request is taking longer than expected. We\'ll notify you when it\'s ready!',
            6000,
            'chat'
          )
          
          console.log(`📢 Background notification sent for task ${taskId}`)
        }

        // Special handling for agent handoffs - look for "Handed off to" messages or chain processing
        if (jobStatus.progress_message && 
            (jobStatus.progress_message.includes('Handed off to') || 
             jobStatus.progress_message.toLowerCase().includes('handed off to') ||
             jobStatus.progress_message.includes('agent chain') ||
             jobStatus.progress_message.includes('polling for final response'))) {
          
          console.log(`🔄 Agent chain processing detected: ${jobStatus.progress_message}`)
          
          // Update progress message to indicate agent chain processing
          if (jobStatus.progress_message.includes('polling for final response')) {
            currentTask.progressMessage = `Multiple agents are collaborating on your request - waiting for final response...`
          } else {
            currentTask.progressMessage = `Agent handoff in progress - specialized agents are processing your request...`
          }
          
          // Send notification only once per task for agent handoffs
          if (!currentTask.backgroundNotificationSent || 
              (Date.now() - currentTask.createdAt.getTime()) < 15000) { // Within first 15 seconds
            
            globalNotificationService.info(
              '🤖 Multi-Agent Processing',
              'Your request is being handled by multiple specialized agents working together. This may take a moment...',
              5000,
              'chat'
            )
          }
        }

        // Vérifier si le job est terminé
        if (jobStatus.status === JobStatus.COMPLETED) {
          await this.handleTaskCompletion(taskId)
        } else if (jobStatus.status === JobStatus.FAILED || jobStatus.status === JobStatus.TIMEOUT) {
          this.handleTaskError(taskId, jobStatus.error || 'Job failed')
        }

      } catch (error: any) {
        console.error(`❌ Erreur lors du polling de la tâche ${taskId}:`, error)
        
        // En cas d'erreur 404, le job n'existe plus
        if (error.response?.status === 404) {
          this.handleTaskError(taskId, 'Job non trouvé (peut-être expiré)')
        } else {
          // Pour les autres erreurs, continuer le polling quelques fois
          const task = this.tasks.get(taskId)
          if (task) {
            task.progress = Math.max(task.progress - 5, 0)
            task.progressMessage = `Erreur temporaire: ${error.message}`
          }
        }
      }
    }, this.defaultPollingInterval)

    this.pollingIntervals.set(taskId, pollInterval)
  }

  /**
   * Gère la completion d'une tâche
   */
  private async handleTaskCompletion(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      console.log(`✅ Retrieving result for task ${taskId}`)
      
      // Récupérer le résultat du job
      const resultResponse = await api.get(`/api/v1/genie/jobs/${task.jobId}/result`)
      const result = resultResponse.data

      // Mettre à jour la tâche
      task.result = result
      task.status = JobStatus.COMPLETED
      task.progress = 100
      task.progressMessage = "Processing completed successfully"

      // Send completion notification if not already sent
      if (!task.completionNotificationSent) {
        task.completionNotificationSent = true
        
        // Import chat utils dynamically and use static notification service
        import('../utils/chatUtils').then(({ createChatNotificationHandler }) => {
          // Create a clickable notification that opens the chat
          globalNotificationService.chatNotification(
            '🎉 Response Ready!',
            'Your AI agent has finished processing. Click here to see the response!',
            createChatNotificationHandler(), // Click handler to open chat
            true // Persistent notification
          )
          
          // Also log for debugging
          console.log(`📢 Clickable chat completion notification sent for task ${taskId}`)
        })
        
        console.log(`📢 Completion notification sent for task ${taskId}`)
      }

      // Callback de completion
      if (task.onComplete) {
        task.onComplete(result)
      }

      console.log(`🎉 Task ${taskId} completed successfully`)

    } catch (error: any) {
      console.error(`❌ Error retrieving result for task ${taskId}:`, error)
      this.handleTaskError(taskId, `Error retrieving result: ${error.message}`)
    } finally {
      this.stopPolling(taskId)
    }
  }

  /**
   * Gère les erreurs d'une tâche
   */
  private handleTaskError(taskId: string, error: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = JobStatus.FAILED
    task.error = error
    task.progressMessage = `Erreur: ${error}`

    if (task.onError) {
      task.onError(error)
    }

    console.error(`❌ Tâche ${taskId} échouée: ${error}`)
    this.stopPolling(taskId)
  }

  /**
   * Arrête le polling pour une tâche
   */
  private stopPolling(taskId: string) {
    const interval = this.pollingIntervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(taskId)
      console.log(`⏹️ Polling arrêté pour la tâche ${taskId}`)
    }
  }

  /**
   * Annule une tâche en cours
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    try {
      // Annuler le job côté backend
      await api.delete(`/api/v1/genie/jobs/${task.jobId}`)
      
      // Arrêter le polling
      this.stopPolling(taskId)
      
      // Marquer comme annulé
      task.status = JobStatus.FAILED
      task.error = "Annulé par l'utilisateur"
      task.progressMessage = "Tâche annulée"

      console.log(`🚫 Tâche ${taskId} annulée`)
      return true

    } catch (error: any) {
      console.error(`❌ Erreur lors de l'annulation de la tâche ${taskId}:`, error)
      return false
    }
  }

  /**
   * Récupère le statut d'une tâche
   */
  getTaskStatus(taskId: string): PollingChatTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Récupère toutes les tâches actives
   */
  getAllTasks(): PollingChatTask[] {
    const tasks: PollingChatTask[] = []
    for (const task of this.tasks.values()) {
      tasks.push(task)
    }
    return tasks
  }

  /**
   * Nettoie les anciennes tâches terminées
   */
  cleanupOldTasks() {
    const now = Date.now()
    const maxAge = 3600000 // 1 heure

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === JobStatus.COMPLETED || task.status === JobStatus.FAILED) &&
        (now - task.createdAt.getTime()) > maxAge
      ) {
        this.stopPolling(taskId)
        this.tasks.delete(taskId)
        console.log(`🧹 Nettoyage de l'ancienne tâche ${taskId}`)
      }
    }
  }

  /**
   * Arrête toutes les tâches et nettoie le service
   */
  shutdown() {
    const taskIds: string[] = []
    for (const taskId of this.tasks.keys()) {
      taskIds.push(taskId)
    }
    
    for (const taskId of taskIds) {
      this.stopPolling(taskId)
    }
    
    this.tasks.clear()
    console.log('🔌 PollingChatService arrêté')
  }
}

// Service singleton
export const pollingChatService = new PollingChatService()

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  pollingChatService.cleanupOldTasks()
}, 300000)

// Nettoyage lors de la fermeture de la page
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pollingChatService.shutdown()
  })
}
