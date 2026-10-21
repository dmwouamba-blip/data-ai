/**
 * Service de chat avec streaming pour les réponses en temps réel.
 * Utilise Server-Sent Events (SSE) pour recevoir les chunks de texte.
 */

export interface StreamingChatCallbacks {
  onChunk?: (chunk: string) => void
  onComplete?: (fullResponse: string, conversationId: string) => void
  onError?: (error: string) => void
}

class StreamingChatService {
  private abortControllers: Map<string, AbortController> = new Map()

  /**
   * Démarre une conversation en streaming
   */
  async startStreamingChat(
    message: string,
    conversationId?: string,
    context?: string,
    callbacks?: StreamingChatCallbacks
  ): Promise<string> {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const abortController = new AbortController()
    this.abortControllers.set(streamId, abortController)

    try {
      console.log('🌊 Starting streaming chat')

      const response = await fetch('/api/v1/genie/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          context
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''
      let finalConversationId = conversationId || ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('🏁 Stream complete')
          break
        }

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'delta') {
                fullResponse += data.content
                if (callbacks?.onChunk) {
                  callbacks.onChunk(data.content)
                }
                if (data.conversation_id) {
                  finalConversationId = data.conversation_id
                }
              } else if (data.type === 'done') {
                if (data.content) {
                  fullResponse = data.content
                }
                if (data.conversation_id) {
                  finalConversationId = data.conversation_id
                }
                if (callbacks?.onComplete) {
                  callbacks.onComplete(fullResponse, finalConversationId)
                }
              } else if (data.type === 'error') {
                if (callbacks?.onError) {
                  callbacks.onError(data.content)
                }
              }
            } catch (e) {
              console.warn('Failed to parse SSE line:', line)
            }
          }
        }
      }

      // Clean up
      this.abortControllers.delete(streamId)
      
      // If we didn't get a done event, call onComplete with what we have
      if (fullResponse && callbacks?.onComplete) {
        callbacks.onComplete(fullResponse, finalConversationId)
      }

      return streamId

    } catch (error: any) {
      this.abortControllers.delete(streamId)
      
      if (error.name === 'AbortError') {
        console.log('🛑 Stream aborted')
        return streamId
      }

      console.error('❌ Streaming error:', error)
      if (callbacks?.onError) {
        callbacks.onError(error.message)
      }
      throw error
    }
  }

  /**
   * Annule un stream en cours
   */
  cancelStream(streamId: string): boolean {
    const controller = this.abortControllers.get(streamId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(streamId)
      console.log(`🛑 Stream ${streamId} cancelled`)
      return true
    }
    return false
  }

  /**
   * Annule tous les streams en cours
   */
  cancelAllStreams(): void {
    for (const [streamId, controller] of this.abortControllers.entries()) {
      controller.abort()
      console.log(`🛑 Stream ${streamId} cancelled`)
    }
    this.abortControllers.clear()
  }
}

// Service singleton
export const streamingChatService = new StreamingChatService()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    streamingChatService.cancelAllStreams()
  })
}
