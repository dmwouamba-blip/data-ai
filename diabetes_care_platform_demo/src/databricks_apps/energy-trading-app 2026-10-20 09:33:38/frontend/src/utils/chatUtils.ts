/**
 * Utilities to improve chat user experience
 */

/**
 * Creates a handler to open chat from a notification
 */
export function createChatNotificationHandler() {
  return () => {
    console.log('🎯 Navigating to chat from notification')
    
    // Trigger the chat modal opening
    // Find the "Ask Databricks Agent" button and click it
    const chatButton = document.querySelector('.fab button') as HTMLButtonElement
    
    if (chatButton) {
      // Scroll to the button to make it visible
      chatButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Wait a bit then click
      setTimeout(() => {
        chatButton.click()
        
        // Add temporary visual effect to draw attention
        chatButton.style.transform = 'scale(1.1)'
        chatButton.style.boxShadow = '0 0 20px rgba(91, 156, 255, 0.8)'
        
        setTimeout(() => {
          chatButton.style.transform = ''
          chatButton.style.boxShadow = ''
        }, 500)
        
        console.log('✅ Chat opened from notification')
      }, 300)
    } else {
      console.warn('⚠️ Chat button not found')
    }
  }
}

/**
 * Améliore l'expérience utilisateur avec des messages contextuels
 */
export function generateContextualMessage(question: string): string {
  const lowerQuestion = question.toLowerCase()
  
  if (lowerQuestion.includes('risk') || lowerQuestion.includes('risque')) {
    return '🛡️ Analyse des risques en cours avec nos experts spécialisés...'
  }
  
  if (lowerQuestion.includes('trading') || lowerQuestion.includes('trade')) {
    return '📈 Traitement de votre demande de trading par nos algorithmes avancés...'
  }
  
  if (lowerQuestion.includes('finance') || lowerQuestion.includes('financial')) {
    return '💰 Analyse financière en cours avec nos modèles économétriques...'
  }
  
  if (lowerQuestion.includes('compliance') || lowerQuestion.includes('réglementation')) {
    return '⚖️ Vérification de conformité réglementaire en cours...'
  }
  
  if (lowerQuestion.includes('data') || lowerQuestion.includes('données')) {
    return '📊 Analyse des données en cours par nos agents intelligents...'
  }
  
  // Message par défaut
  return '🤖 Nos agents spécialisés analysent votre requête...'
}

/**
 * Formate le temps d'attente de manière conviviale
 */
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `environ ${Math.round(seconds)} secondes`
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60)
    return `environ ${minutes} minute${minutes > 1 ? 's' : ''}`
  } else {
    const hours = Math.round(seconds / 3600)
    return `environ ${hours} heure${hours > 1 ? 's' : ''}`
  }
}

/**
 * Créé des suggestions d'amélioration pour les questions
 */
export function suggestQueryImprovements(question: string): string[] {
  const suggestions: string[] = []
  const lowerQuestion = question.toLowerCase()
  
  if (lowerQuestion.length < 10) {
    suggestions.push('💡 Ajoutez plus de détails pour une réponse plus précise')
  }
  
  if (!lowerQuestion.includes('?') && !lowerQuestion.includes('comment') && !lowerQuestion.includes('quoi')) {
    suggestions.push('❓ Formulez votre demande sous forme de question pour plus de clarté')
  }
  
  if (lowerQuestion.includes('urgent') || lowerQuestion.includes('rapide')) {
    suggestions.push('⚡ Pour les demandes urgentes, précisez le contexte et la deadline')
  }
  
  return suggestions
}

/**
 * Vérifie si une question nécessite une attention particulière
 */
export function analyzeQuestionPriority(question: string): 'high' | 'medium' | 'low' {
  const lowerQuestion = question.toLowerCase()
  const highPriorityKeywords = ['urgent', 'critique', 'alerte', 'problème', 'erreur', 'panne']
  const mediumPriorityKeywords = ['important', 'rapidement', 'priorité', 'besoin']
  
  if (highPriorityKeywords.some(keyword => lowerQuestion.includes(keyword))) {
    return 'high'
  }
  
  if (mediumPriorityKeywords.some(keyword => lowerQuestion.includes(keyword))) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Génère un ID unique pour les sessions de chat
 */
export function generateChatSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sauvegarde l'historique du chat dans localStorage
 */
export function saveChatHistory(sessionId: string, messages: any[]) {
  try {
    const chatHistory = {
      sessionId,
      messages,
      timestamp: Date.now()
    }
    localStorage.setItem(`chat_${sessionId}`, JSON.stringify(chatHistory))
    console.log(`💾 Historique du chat sauvegardé pour la session ${sessionId}`)
  } catch (error) {
    console.warn('⚠️ Impossible de sauvegarder l\'historique du chat:', error)
  }
}

/**
 * Récupère l'historique du chat depuis localStorage
 */
export function loadChatHistory(sessionId: string): any[] {
  try {
    const saved = localStorage.getItem(`chat_${sessionId}`)
    if (saved) {
      const chatHistory = JSON.parse(saved)
      console.log(`📂 Historique du chat chargé pour la session ${sessionId}`)
      return chatHistory.messages || []
    }
  } catch (error) {
    console.warn('⚠️ Impossible de charger l\'historique du chat:', error)
  }
  return []
}