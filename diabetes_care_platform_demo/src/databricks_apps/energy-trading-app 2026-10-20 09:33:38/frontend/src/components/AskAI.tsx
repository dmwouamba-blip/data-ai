import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import ReactMarkdown from 'react-markdown'
import AgentOrchestrationPanel from './AgentOrchestrationPanel'
import { asyncChatService } from '../services/asyncChatService'
import { globalNotificationService } from '../services/globalNotificationService'
import { pollingChatService, JobStatus } from '../services/pollingChatService'
import { streamingChatService } from '../services/streamingChatService'

type Props = {
  label?: string
  description?: string
  examples?: string[]
  context?: string
}

interface ReasoningStep {
  type: string
  content: string
  timestamp?: string
  step?: number
}

interface ToolCall {
  type: string
  details: any
  step: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  conversation_id?: string
  agent_orchestration?: {
    note: string
    reasoning_steps?: ReasoningStep[]
    agents_used?: string[]
    tool_calls?: ToolCall[]
    function_calls?: any[]
    execution_metadata?: Record<string, any>
    raw_response_keys?: string[]
    available_agents?: string[]
  }
}

interface ChatResponse {
  conversation_id: string
  response: string
  status: string
  query_result?: {
    sql?: string
    data?: any[]
    columns?: string[]
    row_count?: number
  }
  attachments?: any[]
  suggestions?: string[]
}

export default function AskAI({ label = 'Ask Databricks Agent', description, examples = [], context = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAgentOrchestration, setShowAgentOrchestration] = useState(false)
  const [expandedAgentDetails, setExpandedAgentDetails] = useState<Set<number>>(new Set())
  const [loadingTimeout, setLoadingTimeout] = useState<number | null>(null)
  const [showLoadingMessage, setShowLoadingMessage] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [useStreaming, setUseStreaming] = useState(true) // Enable streaming by default
  const conversationRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const applyExample = (txt: string) => {
    setQ(txt)
  }

  const toggleAgentDetails = (messageIndex: number) => {
    const newExpanded = new Set(expandedAgentDetails)
    if (newExpanded.has(messageIndex)) {
      newExpanded.delete(messageIndex)
    } else {
      newExpanded.add(messageIndex)
    }
    setExpandedAgentDetails(newExpanded)
  }

  const loadSuggestions = async () => {
    try {
      const response = await api.post('/api/v1/genie/suggestions', { context })
      setSuggestions(response.data.suggestions)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    }
  }

  useEffect(() => {
    if (open && suggestions.length === 0) {
      loadSuggestions()
    }
  }, [open, context])

  const sendMessage = async () => {
    if (!q.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: q.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setError(null)
    setShowLoadingMessage(false)
    setShowNotification(false)
    setStreamingContent('')
    const currentQuery = q
    setQ('')
    
    // Use streaming for real-time responses
    if (useStreaming) {
      try {
        console.log('🌊 Starting streaming chat')
        
        // Add placeholder message for streaming
        const placeholderMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, placeholderMessage])
        
        let accumulatedContent = ''
        
        await streamingChatService.startStreamingChat(
          currentQuery,
          conversationId || undefined,
          context,
          {
            onChunk: (chunk: string) => {
              accumulatedContent += chunk
              setStreamingContent(accumulatedContent)
              
              // Update the last message with accumulated content
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: accumulatedContent
                  }
                }
                return updated
              })
            },
            onComplete: (fullResponse: string, convId: string) => {
              console.log('✅ Streaming completed')
              
              // Update with final response
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: fullResponse,
                    conversation_id: convId
                  }
                }
                return updated
              })
              
              setConversationId(convId)
              setLoading(false)
              setStreamingContent('')
            },
            onError: (error: string) => {
              console.error('❌ Streaming error:', error)
              
              // Update placeholder with error
              setMessages(prev => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: `❌ **Error:** ${error}`
                  }
                }
                return updated
              })
              
              setLoading(false)
              setError(error)
            }
          }
        )
        
      } catch (error: any) {
        console.error('❌ Error starting streaming chat:', error)
        setLoading(false)
        setError(error.message)
        
        // Fallback to polling if streaming fails
        console.log('⚠️ Falling back to polling...')
        setUseStreaming(false)
      }
    } else {
      // Use the asynchronous polling system as fallback
      try {
        console.log('🚀 Starting async chat with polling')
        
        globalNotificationService.info(
          '🚀 Processing Started',
          'Your request is being processed',
          3000,
          'chat'
        )
        
        const taskId = await pollingChatService.startAsyncChat(
          currentQuery,
          conversationId || undefined,
          context,
          {
            onProgress: (progress: number, message: string) => {
              console.log(`📊 Progress: ${progress}% - ${message}`)
            },
            onComplete: (result: any) => {
              console.log('✅ Processing completed:', result)
              
              const finalMessage: ChatMessage = {
                role: 'assistant',
                content: result.response,
                timestamp: new Date().toISOString(),
                conversation_id: result.conversation_id,
                agent_orchestration: result.orchestration_details
              }
              
              setMessages(prev => [...prev, finalMessage])
              setConversationId(result.conversation_id)
              setLoading(false)
            },
            onError: (error: string) => {
              console.error('❌ Processing error:', error)
              
              const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `❌ **Processing Error**\n\n${error}`,
                timestamp: new Date().toISOString()
              }
              
              setMessages(prev => [...prev, errorMessage])
              setLoading(false)
              setError(error)
            }
          }
        )
        
        console.log(`🚀 Polling task created: ${taskId}`)
        
      } catch (error: any) {
        console.error('❌ Error starting async chat:', error)
        setLoading(false)
        setError(error.message)
        
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `❌ **System Error**\n\n${error.message}`,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    }
    
    // Scroll to conversation when thinking starts
    setTimeout(() => {
      if (conversationRef.current) {
        conversationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

  }

  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setQ('')
    setError(null)
  }

  return (
    <>
      <div className="fab">
        <button className="button primary" onClick={() => setOpen(true)}>{label}</button>
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div className="glass" style={{ width: 900, maxWidth: 'calc(100% - 32px)', height: '90vh', margin: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{label}</div>
              <button className="button" onClick={() => setOpen(false)}>✕ Close</button>
            </div>


            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, paddingBottom: 0 }}>
              {/* Suggested Questions */}
              {(suggestions.length > 0 || examples.length > 0) && messages.length === 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}>{suggestions.length > 0 ? 'Suggested Questions' : 'Example Questions'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(suggestions.length > 0 ? suggestions : examples).slice(0, 4).map((e, i) => (
                      <button
                        key={i}
                        className="button"
                        style={{
                          width: '100%', textAlign: 'left', justifyContent: 'flex-start',
                          whiteSpace: 'normal', lineHeight: 1.3, padding: '10px 12px', borderRadius: 12,
                          background: 'var(--bg-elev)', border: '1px solid var(--border)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => applyExample(e)}
                      >
                        "{e}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat History */}
              {messages.length > 0 && (
                <div ref={conversationRef} className="card" style={{ marginBottom: 16, flex: 1, overflow: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="section-title">Conversation</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="button" 
                        onClick={() => setShowAgentOrchestration(true)} 
                        style={{ fontSize: 12, backgroundColor: '#3b82f6', color: 'white' }}
                        title="Show which agents were used in this conversation"
                      >
                        Agent Details
                      </button>
                      <button className="button" onClick={clearConversation} style={{ fontSize: 12 }}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="chat-conversation" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 8 }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`chat-message ${msg.role}`}
                      style={{
                        padding: msg.role === 'user' ? '18px 24px' : '16px',
                        borderRadius: msg.role === 'user' ? '12px' : '12px',
                        background: msg.role === 'user' 
                          ? 'linear-gradient(135deg, #4b5563, #374151)' 
                          : 'var(--bg-elev)',
                        color: msg.role === 'user' ? '#ffffff' : 'var(--text)',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: msg.role === 'user' ? '85%' : '90%',
                        minWidth: '200px',
                        border: msg.role === 'assistant' ? '1px solid var(--border)' : '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: msg.role === 'user' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                          : '0 2px 4px rgba(0,0,0,0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                        animation: 'messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: 'translateY(0)',
                        transition: 'all 0.3s ease',
                        cursor: msg.role === 'user' ? 'default' : 'default'
                      }}
                    >
                      
                      
                      <div style={{ 
                        fontSize: msg.role === 'user' ? 16 : 14,
                        lineHeight: msg.role === 'user' ? 1.4 : 1.6,
                        fontWeight: msg.role === 'user' ? 600 : 400,
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        position: 'relative',
                        zIndex: 1,
                        letterSpacing: msg.role === 'user' ? '0.025em' : 'normal'
                      }}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              h1: ({ children }: any) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0.5em 0', color: 'var(--text)' }}>{children}</h1>,
                              h2: ({ children }: any) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0.4em 0', color: 'var(--text)' }}>{children}</h2>,
                              h3: ({ children }: any) => <h3 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0.3em 0', color: 'var(--text)' }}>{children}</h3>,
                              p: ({ children }: any) => <p style={{ margin: '0.5em 0', color: 'var(--text)' }}>{children}</p>,
                              ul: ({ children }: any) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em', color: 'var(--text)' }}>{children}</ul>,
                              ol: ({ children }: any) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em', color: 'var(--text)' }}>{children}</ol>,
                              li: ({ children }: any) => <li style={{ margin: '0.2em 0', color: 'var(--text)' }}>{children}</li>,
                              strong: ({ children }: any) => <strong style={{ fontWeight: 'bold', color: 'var(--text)' }}>{children}</strong>,
                              em: ({ children }: any) => <em style={{ fontStyle: 'italic', color: 'var(--text)' }}>{children}</em>,
                              table: ({ children }: any) => (
                                <div style={{ 
                                  overflowX: 'auto', 
                                  margin: '1.5em 0',
                                  borderRadius: '12px',
                                  border: '1px solid var(--border)',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                  background: 'var(--bg-elev)'
                                }}>
                                  <table style={{ 
                                    borderCollapse: 'collapse', 
                                    width: '100%', 
                                    fontSize: '0.9em',
                                    background: 'transparent',
                                    margin: 0
                                  }}>
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }: any) => (
                                <thead style={{ 
                                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                  color: '#ffffff'
                                }}>
                                  {children}
                                </thead>
                              ),
                              tbody: ({ children }: any) => <tbody>{children}</tbody>,
                              tr: ({ children }: any) => (
                                <tr style={{ 
                                  borderBottom: '1px solid var(--border)',
                                  transition: 'background-color 0.2s ease'
                                }}>
                                  {children}
                                </tr>
                              ),
                              th: ({ children }: any) => (
                                <th style={{ 
                                  padding: '16px 20px', 
                                  textAlign: 'left', 
                                  fontWeight: '700',
                                  fontSize: '0.85em',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  color: '#ffffff',
                                  border: 'none',
                                  background: 'transparent',
                                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                  {children}
                                </th>
                              ),
                              td: ({ children }: any) => {
                                const content = String(children);
                                const isNumeric = /^[\+\-\$€]?[\d,]+\.?\d*[%]?$/.test(content.trim());
                                const isPositive = content.includes('+') || (isNumeric && parseFloat(content.replace(/[^\d.-]/g, '')) > 0);
                                const isNegative = content.includes('-') || (isNumeric && parseFloat(content.replace(/[^\d.-]/g, '')) < 0);
                                
                                return (
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    border: 'none',
                                    borderBottom: '1px solid var(--border)',
                                    color: isPositive && isNumeric ? '#10b981' : isNegative && isNumeric ? '#ef4444' : 'var(--text)',
                                    fontSize: '0.9em',
                                    lineHeight: '1.6',
                                    fontWeight: isNumeric ? '600' : '500',
                                    textAlign: isNumeric ? 'right' : 'left',
                                    fontFamily: isNumeric ? 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' : 'inherit',
                                    background: 'transparent',
                                    transition: 'background-color 0.2s ease'
                                  }}>
                                    {children}
                                  </td>
                                );
                              },
                              code: ({ children }: any) => (
                                <code style={{ 
                                  background: 'var(--bg-elev)', 
                                  padding: '2px 4px', 
                                  borderRadius: '3px',
                                  fontFamily: 'monospace',
                                  fontSize: '0.9em',
                                  color: 'var(--text)'
                                }}>
                                  {children}
                                </code>
                              ),
                              pre: ({ children }: any) => (
                                <pre style={{ 
                                  background: 'var(--bg-elev)', 
                                  padding: '12px', 
                                  borderRadius: '6px',
                                  overflow: 'auto',
                                  margin: '0.5em 0',
                                  border: '1px solid var(--border)'
                                }}>
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }: any) => (
                                <blockquote style={{ 
                                  borderLeft: '4px solid var(--primary)', 
                                  paddingLeft: '12px', 
                                  margin: '0.5em 0',
                                  fontStyle: 'italic',
                                  color: 'var(--text-muted)'
                                }}>
                                  {children}
                                </blockquote>
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div style={{
                            fontWeight: 500,
                            letterSpacing: 'normal',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            color: '#ffffff'
                          }}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                      
                      {/* Message timestamp */}
                      {msg.timestamp && (
                        <div className={`message-timestamp ${msg.role}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                      
                      {/* Agent Details Button for Assistant Messages */}
                      {msg.role === 'assistant' && msg.agent_orchestration && (
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => toggleAgentDetails(i)}
                            style={{
                              fontSize: 12,
                              padding: '6px 12px',
                              backgroundColor: expandedAgentDetails.has(i) ? '#6b7280' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Show which agents were used for this response"
                          >
                            <svg 
                              width="12" 
                              height="12" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                              style={{ 
                                transform: expandedAgentDetails.has(i) ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {expandedAgentDetails.has(i) ? 'Hide' : 'Show'} Agent Details
                          </button>
                        </div>
                      )}
                      
                      {/* Agent Details Panel */}
                      {msg.role === 'assistant' && msg.agent_orchestration && typeof msg.agent_orchestration === 'object' && expandedAgentDetails.has(i) && (
                        <div style={{
                          marginTop: 12,
                          padding: 16,
                          backgroundColor: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 13
                        }}>
                          <div style={{ 
                            fontWeight: 'bold', 
                            marginBottom: 12, 
                            color: 'var(--text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Agent Orchestration Details
                          </div>
                          
                          <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                            {msg.agent_orchestration.note || 'No additional information available.'}
                          </div>

                          {/* Reasoning Steps */}
                          {msg.agent_orchestration.reasoning_steps && Array.isArray(msg.agent_orchestration.reasoning_steps) && msg.agent_orchestration.reasoning_steps.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ marginBottom: 8, fontWeight: 'bold', color: 'var(--text)' }}>
                                Reasoning Process:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {msg.agent_orchestration.reasoning_steps.map((step, stepIndex) => (
                                  <div
                                    key={stepIndex}
                                    style={{
                                      padding: '10px 12px',
                                      backgroundColor: 'var(--bg)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      borderLeft: '3px solid var(--primary)'
                                    }}
                                  >
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 8, 
                                      marginBottom: 4 
                                    }}>
                                      <span style={{ 
                                        fontSize: 11, 
                                        fontWeight: 'bold', 
                                        color: 'var(--primary)',
                                        textTransform: 'uppercase'
                                      }}>
                                        {step.type}
                                      </span>
                                      {step.timestamp && (
                                        <span style={{ 
                                          fontSize: 10, 
                                          color: 'var(--text-muted)' 
                                        }}>
                                          {new Date(step.timestamp).toLocaleTimeString()}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ 
                                      color: 'var(--text)', 
                                      fontSize: 12,
                                      lineHeight: '1.4'
                                    }}>
                                      {step.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Agents Used */}
                          {msg.agent_orchestration.agents_used && Array.isArray(msg.agent_orchestration.agents_used) && msg.agent_orchestration.agents_used.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ marginBottom: 8, fontWeight: 'bold', color: 'var(--text)' }}>
                                Agents Used:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {msg.agent_orchestration.agents_used.map((agent, agentIndex) => (
                                  <div
                                    key={agentIndex}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '8px 12px',
                                      backgroundColor: 'var(--bg)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      gap: 8
                                    }}
                                  >
                                    <div style={{
                                      width: 8,
                                      height: 8,
                                      backgroundColor: '#10b981',
                                      borderRadius: '50%',
                                      flexShrink: 0
                                    }}></div>
                                    <span style={{ color: 'var(--text)', fontSize: 12 }}>
                                      {agent}
                                    </span>
                                    <span style={{ 
                                      color: 'var(--text-muted)', 
                                      fontSize: 11,
                                      marginLeft: 'auto'
                                    }}>
                                      Used
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tool Calls */}
                          {msg.agent_orchestration.tool_calls && Array.isArray(msg.agent_orchestration.tool_calls) && msg.agent_orchestration.tool_calls.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ marginBottom: 8, fontWeight: 'bold', color: 'var(--text)' }}>
                                Tool Calls:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {msg.agent_orchestration.tool_calls.map((toolCall, toolIndex) => (
                                  <div
                                    key={toolIndex}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: 'var(--bg)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      fontSize: 11
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: 4 }}>
                                      {toolCall.type}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                      Step {toolCall.step}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback to available agents if no detailed info */}
                          {(!msg.agent_orchestration.reasoning_steps || !Array.isArray(msg.agent_orchestration.reasoning_steps) || msg.agent_orchestration.reasoning_steps.length === 0) && 
                           (!msg.agent_orchestration.agents_used || !Array.isArray(msg.agent_orchestration.agents_used) || msg.agent_orchestration.agents_used.length === 0) &&
                           msg.agent_orchestration.available_agents && Array.isArray(msg.agent_orchestration.available_agents) && (
                            <div>
                              <div style={{ marginBottom: 8, fontWeight: 'bold', color: 'var(--text)' }}>
                                Available Agents:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {msg.agent_orchestration.available_agents.map((agent, agentIndex) => (
                                  <div
                                    key={agentIndex}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '8px 12px',
                                      backgroundColor: 'var(--bg)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      gap: 8
                                    }}
                                  >
                                    <div style={{
                                      width: 8,
                                      height: 8,
                                      backgroundColor: '#10b981',
                                      borderRadius: '50%',
                                      flexShrink: 0
                                    }}></div>
                                    <span style={{ color: 'var(--text)', fontSize: 12 }}>
                                      {agent}
                                    </span>
                                    <span style={{ 
                                      color: 'var(--text-muted)', 
                                      fontSize: 11,
                                      marginLeft: 'auto'
                                    }}>
                                      Available
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                    {loading && (
                      <div className="thinking-container">
                        <div className="thinking-text">
                          <div className="thinking-spinner"></div>
                          <span>🧠 AI is thinking...</span>
                          <div className="thinking-dots">
                            <div className="thinking-dot thinking-dot-blue"></div>
                            <div className="thinking-dot thinking-dot-purple"></div>
                            <div className="thinking-dot thinking-dot-green"></div>
                          </div>
                        </div>
                        {showLoadingMessage && (
                          <div style={{
                            marginTop: 12,
                            padding: 12,
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: 8,
                            color: '#f59e0b',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <div style={{ fontSize: 16 }}>⏳</div>
                            <div>
                            <div style={{ fontWeight: 600 }}>Processing in progress...</div>
                            <div style={{ opacity: 0.8 }}>Your request is taking longer than expected. We'll notify you as soon as the response is ready.</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div style={{ padding: 16, paddingTop: 0, borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
              <div className="section-title" style={{ 
                background: 'linear-gradient(135deg, var(--text), var(--brand))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
                marginBottom: 12
              }}>
                ✨ Type your question
              </div>
              <div className="chat-input-container">
                <textarea 
                  value={q} 
                  onChange={e => setQ(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Ask a question or describe the action you want..."
                  style={{ 
                    width: '100%', 
                    minHeight: 80, 
                    maxHeight: 120,
                    borderRadius: 12, 
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elev)', 
                    color: 'var(--text)', 
                    padding: 16,
                    fontSize: 15,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }} 
                  disabled={loading}
                />
              </div>
              <div className="chat-buttons-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button 
                  className="button" 
                  onClick={() => setQ('')} 
                  disabled={loading}
                  style={{ 
                    padding: '10px 20px',
                    borderRadius: 12,
                    fontWeight: 500
                  }}
                >
                  Clear
                </button>
                <button 
                  className="button primary" 
                  onClick={sendMessage}
                  disabled={loading || !q.trim()}
                  style={{ 
                    padding: '10px 24px',
                    borderRadius: 12,
                    fontWeight: 600,
                    background: loading ? 'var(--muted)' : 'linear-gradient(135deg, var(--brand), var(--brand-600))',
                    boxShadow: loading ? 'none' : '0 4px 15px rgba(91, 156, 255, 0.4)',
                    transform: loading ? 'none' : 'translateY(0)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ 
                        width: 16, 
                        height: 16, 
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Sending...
                    </span>
                  ) : (
                    '🚀 Send'
                  )}
                </button>
              </div>
            </div>


            {/* Error Display */}
            {error && (
              <div style={{ 
                position: 'absolute', 
                top: 70, 
                left: 16, 
                right: 16, 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: 12,
                color: '#ef4444',
                fontSize: 14,
                zIndex: 100
              }}>
                ❌ {error}
              </div>
            )}

            {/* Notification System */}
            {showNotification && (
              <div style={{
                position: 'fixed',
                top: 20,
                right: 20,
                background: 'rgba(16, 185, 129, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                padding: 16,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'slideInRight 0.3s ease',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                maxWidth: 300
              }}
              onClick={() => {
                setShowNotification(false)
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              >
                {notificationMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Orchestration Panel */}
      <AgentOrchestrationPanel
        conversationId={conversationId}
        isVisible={showAgentOrchestration}
        onClose={() => setShowAgentOrchestration(false)}
      />
    </>
  )
}
