import axios from 'axios'

export const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  timeout: 250000, // 250 seconds - slightly longer than backend for Databricks Apps platform
})

// Agent orchestration types
export interface ReasoningStep {
  type: string
  content: string
  timestamp?: string
  step?: number
}

export interface ToolCall {
  type: string
  details: any
  step: number
}

export interface AgentOrchestration {
  conversation_id: string
  message_count: number
  created_at: string | null
  agent_orchestration: {
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

// API functions
export const getAgentOrchestration = async (conversationId: string): Promise<AgentOrchestration> => {
  const response = await api.get(`/api/v1/genie/agent-orchestration/${conversationId}`)
  return response.data
}

