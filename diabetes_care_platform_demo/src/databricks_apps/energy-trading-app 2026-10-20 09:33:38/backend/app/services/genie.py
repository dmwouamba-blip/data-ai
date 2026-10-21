"""
Databricks Genie service for natural language data interactions.
Refactorisé pour utiliser les meilleures pratiques de connexion Databricks.
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import time
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import os
import logging
from datetime import datetime, timedelta

from app.services.databricks_client import get_databricks_client
from app.services.async_job_manager import job_manager, AsyncJob

logger = logging.getLogger(__name__)


class GenieMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class GenieConversation(BaseModel):
    conversation_id: str
    messages: List[GenieMessage]
    status: str = "active"
    orchestration_details: Optional[Dict[str, Any]] = None


class GenieService:
    """Service for interacting with Databricks Genie Conversation API."""
    
    def __init__(self):
        # Utiliser le service centralisé de connexion Databricks
        self.databricks_client = get_databricks_client()
        
        # Get AgentBricks endpoint
        self.agentbricks_endpoint = self._get_agentbricks_endpoint()
        
        # Vérifier la configuration
        if not self.agentbricks_endpoint:
            logger.warning("AgentBricks service not fully configured. Missing endpoint.")
        elif not self.databricks_client.is_configured():
            logger.warning("AgentBricks service not fully configured. Missing Databricks authentication.")
        else:
            logger.info("AgentBricks service configured successfully with centralized Databricks client.")
        
        # Store conversations in memory (in production, use a proper database)
        self.conversations: Dict[str, GenieConversation] = {}
        
        # Circuit breaker for timeout protection
        self.last_timeout = None
        self.timeout_count = 0
        self.circuit_breaker_threshold = 5  # Increased for complex queries
        self.circuit_breaker_reset_time = timedelta(minutes=5)
        
        # Agent performance tracking
        self.agent_metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0,
            'agent_usage': {},
            'last_updated': datetime.now()
        }
        
        # Current orchestration details for this request
        self._current_orchestration_details = None
        
        # Create a session with connection pooling and retry strategy
        self.session = self._create_robust_session()
    
    def _create_robust_session(self) -> requests.Session:
        """Create a requests session with robust retry and connection pooling."""
        session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,  # Total number of retries
            status_forcelist=[429, 500, 502, 503, 504],  # HTTP status codes to retry
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST"],  # Methods to retry (updated parameter name)
            backoff_factor=1,  # Backoff factor for retries
            raise_on_status=False  # Don't raise exception on retry failure
        )
        
        # Configure HTTP adapter with retry strategy
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=10,  # Number of connection pools to cache
            pool_maxsize=20,  # Maximum number of connections in the pool
            pool_block=False  # Don't block when pool is full
        )
        
        # Mount adapter for both HTTP and HTTPS
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # Set default timeout
        session.timeout = 120
        
        logger.info("Created robust HTTP session with retry strategy and connection pooling")
        return session
    
    def _test_connectivity(self, url: str) -> bool:
        """Test connectivity to the AgentBricks endpoint."""
        try:
            # Simple HEAD request to test connectivity
            response = self.session.head(url.replace('/invocations', ''), timeout=10)
            logger.info(f"Connectivity test successful: {response.status_code}")
            return True
        except Exception as e:
            logger.warning(f"Connectivity test failed: {e}")
            return False
    
    def _get_agentbricks_endpoint(self) -> str:
        """Get AgentBricks endpoint from environment or hardcoded fallback."""
        # Try environment variable first
        endpoint = os.getenv("AGENTBRICKS_ENDPOINT", "")
        if endpoint:
            logger.info(f"Using AGENTBRICKS_ENDPOINT from environment: {endpoint}")
            return endpoint
        
        # Hardcoded fallback for Databricks Apps deployment
        fallback_endpoint = "mas-e24eb1c1-endpoint"
        logger.info(f"Using hardcoded AGENTBRICKS_ENDPOINT: {fallback_endpoint}")
        return fallback_endpoint
    
    @property
    def base_url(self) -> str:
        """Obtenir l'URL de base Databricks depuis le client centralisé."""
        return self.databricks_client.config.host if self.databricks_client.config else ""
    
    @property
    def headers(self) -> Dict[str, str]:
        """Obtenir les en-têtes d'authentification depuis le client centralisé."""
        base_headers = {
            "Content-Type": "application/json"
        }
        
        try:
            auth_headers = self.databricks_client.get_auth_headers()
            base_headers.update(auth_headers)
        except Exception as e:
            logger.warning(f"Impossible d'obtenir les en-têtes d'authentification: {e}")
        
        return base_headers
    
    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open due to repeated timeouts."""
        if self.timeout_count < self.circuit_breaker_threshold:
            return False
        
        if self.last_timeout is None:
            return False
        
        # Reset circuit breaker after timeout period
        if datetime.now() - self.last_timeout > self.circuit_breaker_reset_time:
            logger.info("Circuit breaker reset - clearing timeout count")
            self.timeout_count = 0
            self.last_timeout = None
            return False
        
        return True
    
    def _record_timeout(self):
        """Record a timeout event for circuit breaker."""
        self.timeout_count += 1
        self.last_timeout = datetime.now()
        logger.warning(f"Timeout recorded. Count: {self.timeout_count}/{self.circuit_breaker_threshold}")
    
    def _record_success(self):
        """Record a successful request to reset circuit breaker."""
        if self.timeout_count > 0:
            logger.info("Successful request - resetting timeout count")
            self.timeout_count = 0
            self.last_timeout = None
    
    def _poll_for_final_response(self, url: str, payload: dict, conversation_id: str, max_attempts: int = 15, delay: float = 3.0) -> str:
        """
        Poll for the final response from an agent chain, handling multiple handoffs.
        
        Args:
            url: The AgentBricks endpoint URL
            payload: The request payload
            conversation_id: Conversation ID for logging
            max_attempts: Maximum number of polling attempts (default: 15 = ~45 seconds)
            delay: Delay between attempts in seconds (default: 3 seconds)
            
        Returns:
            str: The final agent response or a fallback message
        """
        logger.info(f"Starting polling for final response from agent chain (max {max_attempts} attempts, {delay}s delay)")
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Polling attempt {attempt + 1}/{max_attempts}")
                time.sleep(delay)
                
                # Use robust session with built-in retry logic
                response = self.session.post(url, headers=self.headers, json=payload, timeout=120)
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Polling response {attempt + 1}: {str(result)[:200]}...")
                    
                    # Extract response and check if it's the final message type
                    extracted_response = ""
                    is_still_function_call = False
                    is_final_message = False
                    
                    if isinstance(result, dict):
                        # Handle function call output format - this means still processing
                        if result.get('type') == 'function_call_output':
                            is_still_function_call = True
                            output = result.get('output', '')
                            logger.info(f"Function call output detected (continue polling): {output}")
                        
                        # Handle message type - this is the final response
                        elif result.get('type') == 'message':
                            is_final_message = True
                            # Extract content from message type
                            if 'content' in result:
                                content = result['content']
                                if isinstance(content, list) and content:
                                    # Handle content array format
                                    content_item = content[0]
                                    if isinstance(content_item, dict) and 'text' in content_item:
                                        extracted_response = content_item['text']
                                    else:
                                        extracted_response = str(content_item)
                                else:
                                    extracted_response = str(content)
                            else:
                                extracted_response = str(result)
                            logger.info(f"Final message type response found: {extracted_response[:200]}...")
                        
                        # Handle AgentBricks response format: {'object': 'response', 'output': [...]}
                        elif 'output' in result and isinstance(result['output'], list) and result['output']:
                            output_item = result['output'][0]
                            if isinstance(output_item, dict) and 'content' in output_item:
                                content_list = output_item['content']
                                if isinstance(content_list, list) and content_list:
                                    content_item = content_list[0]
                                    if isinstance(content_item, dict) and 'text' in content_item:
                                        extracted_response = content_item['text']
                                        logger.info(f"Final response from full format: {extracted_response[:200]}...")
                                    else:
                                        extracted_response = str(content_item)
                                else:
                                    extracted_response = str(content_list)
                            else:
                                extracted_response = str(output_item)
                        
                        # Handle other formats
                        elif 'output' in result and isinstance(result['output'], str):
                            extracted_response = result['output']
                        elif 'predictions' in result:
                            extracted_response = result['predictions'][0] if result['predictions'] else ""
                        elif 'outputs' in result:
                            extracted_response = result['outputs'][0] if result['outputs'] else ""
                        elif 'choices' in result:
                            extracted_response = result['choices'][0].get('text', '') if result['choices'] else ""
                        else:
                            extracted_response = str(result)
                    
                    # If we got a final message type response, return it
                    if is_final_message and extracted_response.strip():
                        logger.info(f"Final message response obtained after {attempt + 1} attempts")
                        return extracted_response
                    
                    # If it's still a function call output, continue polling
                    if is_still_function_call:
                        logger.info(f"Still processing (function call output), continuing to poll...")
                        continue
                    
                    # If we got any other valid response that's not empty, return it
                    if extracted_response.strip() and not is_still_function_call:
                        logger.info(f"Valid response obtained after {attempt + 1} attempts")
                        return extracted_response
                        
                else:
                    logger.warning(f"Polling attempt {attempt + 1} failed with status {response.status_code}")
                    
            except requests.exceptions.ConnectionError as e:
                logger.error(f"Connection error during polling attempt {attempt + 1}: {str(e)}")
                # For connection errors, wait longer before next attempt
                if attempt < max_attempts - 1:
                    extended_delay = delay * 2  # Double the delay for connection issues
                    logger.info(f"Waiting {extended_delay}s before next attempt due to connection error...")
                    time.sleep(extended_delay - delay)  # Subtract already waited delay
                continue
            except requests.exceptions.Timeout as e:
                logger.error(f"Timeout during polling attempt {attempt + 1}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error during polling attempt {attempt + 1}: {str(e)}")
                continue
        
        logger.warning(f"Max polling attempts ({max_attempts}) reached without final response")
        return "The agent chain is still processing your request. Please wait a moment..."
    
    def _extract_agent_details_from_content(self, content: str) -> Dict[str, Any]:
        """Extract agent details from response content using pattern matching."""
        import re
        
        agent_details = {
            'agents_mentioned': [],
            'tools_used': [],
            'reasoning_steps': []
        }
        
        if not isinstance(content, str):
            return agent_details
        
        # Look for agent mentions
        agent_patterns = [
            r'using\s+(\w+)\s+agent',
            r'via\s+(\w+)\s+agent', 
            r'through\s+(\w+)\s+agent',
            r'(\w+)\s+agent\s+processed',
            r'agent\s+(\w+)\s+analyzed',
            r'(\w+)\s+agent\s+found'
        ]
        
        for pattern in agent_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            agent_details['agents_mentioned'].extend(matches)
        
        # Look for tool usage
        tool_patterns = [
            r'using\s+(\w+)\s+tool',
            r'via\s+(\w+)\s+tool',
            r'(\w+)\s+tool\s+executed',
            r'executed\s+(\w+)\s+tool'
        ]
        
        for pattern in tool_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            agent_details['tools_used'].extend(matches)
        
        # Look for reasoning patterns
        reasoning_patterns = [
            r'first\s+(.+?)(?:\.|,|$)',
            r'then\s+(.+?)(?:\.|,|$)',
            r'next\s+(.+?)(?:\.|,|$)',
            r'finally\s+(.+?)(?:\.|,|$)',
            r'analyzed\s+(.+?)(?:\.|,|$)',
            r'calculated\s+(.+?)(?:\.|,|$)',
            r'processed\s+(.+?)(?:\.|,|$)'
        ]
        
        for pattern in reasoning_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches[:3]:  # Limit to first 3 matches
                agent_details['reasoning_steps'].append({
                    'type': 'content_analysis',
                    'content': match.strip(),
                    'timestamp': datetime.now().isoformat()
                })
        
        return agent_details

    def _analyze_response_for_agent_usage(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Intelligently analyze the response to infer what agents were used and what they accomplished."""
        import re
        
        analysis = {
            'reasoning_steps': [],
            'inferred_agents': [],
            'metadata': {}
        }
        
        # Extract the actual response content
        response_content = ""
        if 'output' in response_data and isinstance(response_data['output'], list) and response_data['output']:
            output_item = response_data['output'][0]
            if isinstance(output_item, dict):
                # Try different possible content fields
                for content_field in ['content', 'text', 'message', 'response']:
                    if content_field in output_item:
                        content = output_item[content_field]
                        if isinstance(content, str):
                            response_content = content
                            break
                        elif isinstance(content, list):
                            # Handle case where content is a list of strings
                            response_content = ' '.join(str(item) for item in content if isinstance(item, str))
                            break
                # If no content field found, try to extract from the output item itself
                if not response_content and isinstance(output_item, dict):
                    # Look for any string value in the output item
                    for key, value in output_item.items():
                        if isinstance(value, str) and len(value) > 50:  # Likely to be content
                            response_content = value
                            break
        
        if not response_content:
            # Debug: log what we actually received
            logger.warning(f"No content extracted from response. Response structure: {response_data}")
            analysis['reasoning_steps'] = [{
                'type': 'no_content',
                'content': f'No response content available for analysis. Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else "not a dict"}',
                'timestamp': datetime.now().isoformat()
            }]
            return analysis
        
        # Analyze content to infer agent usage based on response characteristics
        inferred_agents = []
        reasoning_steps = []
        
        # Check for data analysis patterns
        if any(keyword in response_content.lower() for keyword in ['analysis', 'analyzed', 'calculated', 'computed', 'processed']):
            inferred_agents.append('Data Analysis Agent')
            reasoning_steps.append({
                'type': 'data_analysis',
                'content': 'Data Analysis Agent processed and analyzed the requested information',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check for market data patterns
        if any(keyword in response_content.lower() for keyword in ['market', 'price', 'trading', 'volume', 'epex', 'eex', 'ice']):
            inferred_agents.append('Market Data Agent')
            reasoning_steps.append({
                'type': 'market_data',
                'content': 'Market Data Agent retrieved and processed current market information',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check for risk analysis patterns
        if any(keyword in response_content.lower() for keyword in ['risk', 'exposure', 'var', 'penalty', 'compliance', 'regulatory']):
            inferred_agents.append('Risk Analysis Agent')
            reasoning_steps.append({
                'type': 'risk_analysis',
                'content': 'Risk Analysis Agent calculated risk metrics and compliance factors',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check for financial calculations
        if any(keyword in response_content.lower() for keyword in ['€', 'euro', 'million', 'billion', 'cost', 'revenue', 'profit']):
            inferred_agents.append('Financial Calculation Agent')
            reasoning_steps.append({
                'type': 'financial_calculation',
                'content': 'Financial Calculation Agent performed monetary calculations and currency conversions',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check for report generation
        if any(keyword in response_content.lower() for keyword in ['report', 'summary', 'executive', 'conclusion', 'recommendation']):
            inferred_agents.append('Report Generation Agent')
            reasoning_steps.append({
                'type': 'report_generation',
                'content': 'Report Generation Agent structured and formatted the response into a comprehensive report',
                'timestamp': datetime.now().isoformat()
            })
        
        # Check for table/chart generation
        if '|' in response_content or 'table' in response_content.lower() or 'chart' in response_content.lower():
            inferred_agents.append('Data Visualization Agent')
            reasoning_steps.append({
                'type': 'data_visualization',
                'content': 'Data Visualization Agent formatted data into tables and structured presentations',
                'timestamp': datetime.now().isoformat()
            })
        
        # If no specific agents detected, infer based on response complexity
        if not inferred_agents:
            if len(response_content) > 1000:
                inferred_agents.append('Comprehensive Analysis Agent')
                reasoning_steps.append({
                    'type': 'comprehensive_analysis',
                    'content': 'Comprehensive Analysis Agent performed detailed multi-faceted analysis of the request',
                    'timestamp': datetime.now().isoformat()
                })
            else:
                inferred_agents.append('Query Processing Agent')
                reasoning_steps.append({
                    'type': 'query_processing',
                    'content': 'Query Processing Agent handled the request and provided a direct response',
                    'timestamp': datetime.now().isoformat()
                })
        
        # Add response quality analysis
        if len(response_content) > 500:
            reasoning_steps.append({
                'type': 'response_quality',
                'content': f'Generated comprehensive response with {len(response_content)} characters of detailed information',
                'timestamp': datetime.now().isoformat()
            })
        
        # Add content structure analysis
        if '##' in response_content or '###' in response_content:
            reasoning_steps.append({
                'type': 'content_structure',
                'content': 'Response structured with hierarchical sections and subsections for clarity',
                'timestamp': datetime.now().isoformat()
            })
        
        analysis['reasoning_steps'] = reasoning_steps
        analysis['inferred_agents'] = list(set(inferred_agents))  # Remove duplicates
        analysis['metadata'] = {
            'response_length': len(response_content),
            'has_tables': '|' in response_content,
            'has_sections': '##' in response_content,
            'content_type': 'structured_report' if '##' in response_content else 'direct_response'
        }
        
        return analysis

    def _log_agent_orchestration(self, response_data):
        """Extract and log agent orchestration details from AgentBricks response."""
        try:
            logger.info("=== AGENT ORCHESTRATION ANALYSIS ===")
            
            # Store detailed orchestration info for frontend
            orchestration_details = {
                'reasoning_steps': [],
                'agents_used': [],
                'tool_calls': [],
                'function_calls': [],
                'execution_metadata': {},
                'raw_response_keys': list(response_data.keys()) if isinstance(response_data, dict) else []
            }
            
            if isinstance(response_data, dict):
                # Look for agent execution traces
                if 'usage' in response_data:
                    usage = response_data['usage']
                    logger.info(f"Agent Usage: {usage}")
                    orchestration_details['execution_metadata']['usage'] = usage
                
                # Look for function calls or tool usage
                if 'function_calls' in response_data:
                    function_calls = response_data['function_calls']
                    logger.info(f"Function Calls: {function_calls}")
                    orchestration_details['function_calls'] = function_calls
                
                # Look for agent steps or reasoning
                if 'steps' in response_data:
                    steps = response_data['steps']
                    logger.info(f"Agent Steps: {steps}")
                    orchestration_details['reasoning_steps'] = steps
                
                # Look for tool calls
                if 'tool_calls' in response_data:
                    tool_calls = response_data['tool_calls']
                    logger.info(f"Tool Calls: {tool_calls}")
                    orchestration_details['tool_calls'] = tool_calls
                
                # Look for reasoning or thinking
                if 'reasoning' in response_data:
                    reasoning = response_data['reasoning']
                    logger.info(f"Reasoning: {reasoning}")
                    orchestration_details['reasoning_steps'].append({
                        'type': 'reasoning',
                        'content': reasoning,
                        'timestamp': datetime.now().isoformat()
                    })
                
                # Look for agent metadata
                if 'metadata' in response_data:
                    metadata = response_data['metadata']
                    logger.info(f"Agent Metadata: {metadata}")
                    orchestration_details['execution_metadata'].update(metadata)
                    if isinstance(metadata, dict):
                        if 'agents_used' in metadata:
                            logger.info(f"Agents Used: {metadata['agents_used']}")
                            orchestration_details['agents_used'] = metadata['agents_used']
                        if 'execution_steps' in metadata:
                            logger.info(f"Execution Steps: {metadata['execution_steps']}")
                            orchestration_details['reasoning_steps'].extend(metadata['execution_steps'])
                
                # Look for nested output structure that might contain agent details
                if 'output' in response_data:
                    output = response_data['output']
                    if isinstance(output, list) and output:
                        for i, item in enumerate(output):
                            if isinstance(item, dict):
                                logger.info(f"Output Item {i}: {item}")
                                # Look for agent-specific fields
                                for key in ['agent', 'tool', 'function', 'step', 'reasoning']:
                                    if key in item:
                                        logger.info(f"  {key.title()}: {item[key]}")
                                        if key == 'agent':
                                            orchestration_details['agents_used'].append(item[key])
                                        elif key in ['tool', 'function']:
                                            orchestration_details['tool_calls'].append({
                                                'type': key,
                                                'details': item[key],
                                                'step': i
                                            })
                                        elif key in ['step', 'reasoning']:
                                            orchestration_details['reasoning_steps'].append({
                                                'type': key,
                                                'content': item[key],
                                                'step': i,
                                                'timestamp': datetime.now().isoformat()
                                            })
                
                # Look for any fields that might indicate agent orchestration
                agent_indicators = ['agent', 'tool', 'function', 'step', 'reasoning', 'orchestration', 'workflow']
                for key, value in response_data.items():
                    if any(indicator in key.lower() for indicator in agent_indicators):
                        logger.info(f"Potential Agent Field '{key}': {value}")
                        orchestration_details['execution_metadata'][key] = value
                
                # Extract more detailed information from the response content
                if 'output' in response_data and isinstance(response_data['output'], list) and response_data['output']:
                    output_content = response_data['output'][0]
                    if isinstance(output_content, dict):
                        # Look for content that might contain agent details
                        if 'content' in output_content:
                            content = output_content['content']
                            # Try to extract agent mentions from the content
                            agent_mentions = []
                            if isinstance(content, str):
                                # Look for patterns that might indicate agent usage
                                import re
                                # Look for agent-like patterns in the content
                                agent_patterns = [
                                    r'agent\s+\w+',
                                    r'using\s+\w+\s+agent',
                                    r'via\s+\w+\s+agent',
                                    r'through\s+\w+\s+agent'
                                ]
                                for pattern in agent_patterns:
                                    matches = re.findall(pattern, content, re.IGNORECASE)
                                    agent_mentions.extend(matches)
                            
                            if agent_mentions:
                                orchestration_details['agents_used'] = list(set(agent_mentions))
                                orchestration_details['reasoning_steps'].append({
                                    'type': 'agent_extraction',
                                    'content': f'Detected agent usage patterns in response: {", ".join(agent_mentions)}',
                                    'timestamp': datetime.now().isoformat()
                                })
                        
                        # Look for function calls or tool usage in the output
                        if 'function_calls' in output_content:
                            function_calls = output_content['function_calls']
                            orchestration_details['function_calls'] = function_calls
                            orchestration_details['reasoning_steps'].append({
                                'type': 'function_calls',
                                'content': f'Executed {len(function_calls)} function calls',
                                'timestamp': datetime.now().isoformat()
                            })
                
                # Analyze the response structure for more insights
                if 'object' in response_data:
                    object_type = response_data['object']
                    orchestration_details['execution_metadata']['response_type'] = object_type
                    orchestration_details['reasoning_steps'].append({
                        'type': 'response_analysis',
                        'content': f'Response type: {object_type}',
                        'timestamp': datetime.now().isoformat()
                    })
                
                # Always run intelligent analysis to infer agent usage from response content
                response_analysis = self._analyze_response_for_agent_usage(response_data)
                
                # Add the intelligent analysis to existing reasoning steps
                orchestration_details['reasoning_steps'].extend(response_analysis['reasoning_steps'])
                
                # Update agents used with inferred agents
                if response_analysis['inferred_agents']:
                    orchestration_details['agents_used'].extend(response_analysis['inferred_agents'])
                    orchestration_details['agents_used'] = list(set(orchestration_details['agents_used']))  # Remove duplicates
                
                # Update metadata
                orchestration_details['execution_metadata'].update(response_analysis['metadata'])
                
                # Add a step showing what we found in the response
                if orchestration_details['raw_response_keys']:
                    orchestration_details['reasoning_steps'].append({
                        'type': 'response_structure',
                        'content': f'Response contained keys: {", ".join(orchestration_details["raw_response_keys"])}',
                        'timestamp': datetime.now().isoformat()
                    })
                
                # Extract agent details from the actual response content
                if 'output' in response_data and isinstance(response_data['output'], list) and response_data['output']:
                    output_content = response_data['output'][0]
                    if isinstance(output_content, dict) and 'content' in output_content:
                        content = output_content['content']
                        if isinstance(content, str):
                            # Extract agent details from content
                            content_analysis = self._extract_agent_details_from_content(content)
                            
                            # Add extracted agents to the list
                            if content_analysis['agents_mentioned']:
                                orchestration_details['agents_used'].extend(content_analysis['agents_mentioned'])
                                orchestration_details['agents_used'] = list(set(orchestration_details['agents_used']))  # Remove duplicates
                            
                            # Add extracted tools
                            if content_analysis['tools_used']:
                                orchestration_details['tool_calls'].extend([
                                    {'type': 'tool', 'details': tool, 'step': len(orchestration_details['tool_calls'])}
                                    for tool in content_analysis['tools_used']
                                ])
                            
                            # Add extracted reasoning steps
                            orchestration_details['reasoning_steps'].extend(content_analysis['reasoning_steps'])
                            
                            # Add a summary step
                            if content_analysis['agents_mentioned'] or content_analysis['tools_used']:
                                orchestration_details['reasoning_steps'].append({
                                    'type': 'content_extraction',
                                    'content': f'Extracted from response: {len(content_analysis["agents_mentioned"])} agent mentions, {len(content_analysis["tools_used"])} tool references',
                                    'timestamp': datetime.now().isoformat()
                                })
            
            # Store orchestration details for this response
            self._current_orchestration_details = orchestration_details
            
            logger.info("=== END AGENT ORCHESTRATION ANALYSIS ===")
            logger.info(f"Captured orchestration details: {orchestration_details}")
            
        except Exception as e:
            logger.warning(f"Error analyzing agent orchestration: {e}")
            # Try to provide basic analysis even if there's an error
            try:
                basic_analysis = self._analyze_response_for_agent_usage(response_data)
                self._current_orchestration_details = {
                    'reasoning_steps': [{
                        'type': 'error_recovery',
                        'content': f'Error in detailed analysis, using basic analysis: {str(e)}',
                        'timestamp': datetime.now().isoformat()
                    }] + basic_analysis['reasoning_steps'],
                    'agents_used': basic_analysis['inferred_agents'],
                    'tool_calls': [],
                    'function_calls': [],
                    'execution_metadata': basic_analysis['metadata'],
                    'raw_response_keys': list(response_data.keys()) if isinstance(response_data, dict) else []
                }
            except Exception as e2:
                logger.error(f"Error in basic analysis fallback: {e2}")
                self._current_orchestration_details = {
                    'reasoning_steps': [{
                        'type': 'error',
                        'content': f'Error analyzing orchestration: {str(e)}',
                        'timestamp': datetime.now().isoformat()
                    }],
                    'agents_used': [],
                    'tool_calls': [],
                    'function_calls': [],
                    'execution_metadata': {},
                    'raw_response_keys': []
                }
    
    def _track_agent_performance(self, response_time: float, success: bool, agents_used: list = None):
        """Track agent performance metrics."""
        try:
            self.agent_metrics['total_requests'] += 1
            self.agent_metrics['last_updated'] = datetime.now()
            
            if success:
                self.agent_metrics['successful_requests'] += 1
            else:
                self.agent_metrics['failed_requests'] += 1
            
            # Update average response time
            total_requests = self.agent_metrics['total_requests']
            current_avg = self.agent_metrics['average_response_time']
            self.agent_metrics['average_response_time'] = (
                (current_avg * (total_requests - 1) + response_time) / total_requests
            )
            
            # Track agent usage
            if agents_used:
                for agent in agents_used:
                    if agent not in self.agent_metrics['agent_usage']:
                        self.agent_metrics['agent_usage'][agent] = {
                            'count': 0,
                            'success_rate': 0,
                            'avg_response_time': 0
                        }
                    self.agent_metrics['agent_usage'][agent]['count'] += 1
            
            logger.info(f"Agent performance updated: {self.agent_metrics}")
            
        except Exception as e:
            logger.warning(f"Error tracking agent performance: {e}")
    
    def get_agent_metrics(self) -> Dict[str, Any]:
        """Get current agent performance metrics."""
        return self.agent_metrics.copy()
    
    def create_conversation(self, initial_message: str) -> Dict[str, Any]:
        """Create a new conversation with AgentBricks."""
        if not self._is_configured():
            logger.warning("AgentBricks service not configured - using demo mode")
            return self._mock_response("I'm running in demo mode since AgentBricks integration isn't fully configured yet.", initial_message)
        
        # Check circuit breaker
        if self._is_circuit_breaker_open():
            logger.warning("Circuit breaker is open due to repeated timeouts - using fallback response")
            return self._mock_response("The AI service is currently experiencing high load. Please try again in a few minutes.", initial_message)
        
        try:
            # Track request start time for performance metrics
            request_start_time = time.time()
            
            # AgentBricks uses model serving endpoint API
            url = f"{self.base_url}/serving-endpoints/{self.agentbricks_endpoint}/invocations"
            conversation_id = f"conv_{int(time.time())}"
            
            logger.info(f"=== STARTING AGENTBRICKS REQUEST ===")
            logger.info(f"AgentBricks URL: {url}")
            logger.info(f"AgentBricks Endpoint: {self.agentbricks_endpoint}")
            logger.info(f"Base URL: {self.base_url}")
            logger.info(f"Request Headers: {self.headers}")
            logger.info(f"Initial Message: {initial_message}")
            logger.info(f"Conversation ID: {conversation_id}")
            
            # Test connectivity before making requests
            if not self._test_connectivity(url):
                logger.warning("Connectivity test failed - proceeding with caution")
                # Reduce timeout and max attempts for unreliable connections
                timeouts_to_try = [60, 90]  # Shorter timeouts
            else:
                timeouts_to_try = [120, 180]  # Normal timeouts
            
            # ResponsesAgentRequest schema for AgentBricks
            payload_formats = [
                # Format 1: Direct request format (no instances wrapper) - WORKING FORMAT
                {
                    "input": [{
                        "role": "user",
                        "content": initial_message
                    }],
                    "user": "user",
                    "context": {
                        "conversation_id": conversation_id,
                        "user_id": "user"
                    }
                },
                # Format 2: Minimal format
                {
                    "input": [{
                        "role": "user",
                        "content": initial_message
                    }],
                    "user": "user"
                },
                # Format 3: Correct ResponsesAgentRequest format with Message objects
                {
                    "instances": [{
                        "input": [{
                            "role": "user",
                            "content": initial_message
                        }],
                        "user": "user",
                        "context": {
                            "conversation_id": conversation_id,
                            "user_id": "user"
                        },
                        "temperature": 0.7,
                        "max_output_tokens": 1000
                    }]
                },
                # Format 4: Simple Message format
                {
                    "instances": [{
                        "input": [{
                            "role": "user", 
                            "content": initial_message
                        }],
                        "user": "user"
                    }]
                },
                # Format 5: Multiple message format (for conversation)
                {
                    "instances": [{
                        "input": [
                            {
                                "role": "system",
                                "content": "You are a helpful assistant for energy trading and risk management."
                            },
                            {
                                "role": "user",
                                "content": initial_message
                            }
                        ],
                        "user": "user",
                        "temperature": 0.7
                    }]
                }
            ]
            
            response = None
            last_error = None
            
            logger.info(f"Trying {len(payload_formats)} different payload formats for AgentBricks")
            
            # Use timeouts determined by connectivity test
            
            for timeout_seconds in timeouts_to_try:
                logger.info(f"=== TRYING WITH {timeout_seconds}s TIMEOUT ===")
                
                for i, payload in enumerate(payload_formats):
                    logger.info(f"Trying AgentBricks payload format {i+1} with {timeout_seconds}s timeout: {payload}")
                    
                    try:
                        logger.info(f"=== SENDING REQUEST TO AGENTBRICKS ===")
                        logger.info(f"Payload format {i+1}: {payload}")
                        logger.info(f"Payload type: {type(payload)}")
                        logger.info(f"Payload JSON: {json.dumps(payload, indent=2)}")
                        logger.info(f"Request timeout: {timeout_seconds} seconds")
                        logger.info(f"Starting AgentBricks request at: {datetime.now()}")
                        
                        response = self.session.post(url, headers=self.headers, json=payload, timeout=timeout_seconds)
                        
                        logger.info(f"AgentBricks request completed at: {datetime.now()}")
                        
                        logger.info(f"=== AGENTBRICKS RESPONSE RECEIVED ===")
                        logger.info(f"Response status: {response.status_code}")
                        logger.info(f"Response headers: {dict(response.headers)}")
                        logger.info(f"Response text (first 500 chars): {response.text[:500]}")
                        
                        if response.status_code == 200:
                            logger.info(f"Successful response with payload format {i+1}")
                            self._record_success()
                            break
                        elif response.status_code == 400:
                            # Only log detailed 400 errors for the first few attempts to reduce noise
                            if i < 2:  # Only log details for first 2 attempts
                                logger.warning(f"Payload format {i+1} failed with 400 - trying next format")
                                logger.warning(f"400 Error response: {response.text[:500]}")
                            else:
                                logger.info(f"Payload format {i+1} failed with 400 - trying next format")
                            continue
                        else:
                            # Non-400 errors should be handled normally
                            break
                            
                    except requests.exceptions.Timeout as e:
                        logger.error(f"Timeout with payload format {i+1} ({timeout_seconds}s): {e}")
                        self._record_timeout()
                        last_error = e
                        continue
                    except requests.exceptions.ConnectionError as e:
                        error_str = str(e)
                        if "Failed to resolve" in error_str or "nodename nor servname provided" in error_str:
                            logger.error(f"DNS resolution error with payload format {i+1}: {e}")
                            logger.error("This indicates a network connectivity issue. The hostname cannot be resolved.")
                        else:
                            logger.error(f"Connection error with payload format {i+1}: {e}")
                        last_error = e
                        continue
                    except Exception as e:
                        logger.error(f"Error with payload format {i+1}: {e}")
                        last_error = e
                        continue
                
                # If we got a successful response, break out of timeout loop
                if response is not None and response.status_code == 200:
                    break
            
            if response is None:
                # Check if the last error was a timeout
                if isinstance(last_error, requests.exceptions.Timeout):
                    logger.warning("AgentBricks endpoint timed out after 50s. Providing fallback response.")
                    fallback_response = "I apologize, but the AI service is currently experiencing high load and took too long to respond. Please try your question again in a moment, or try rephrasing it more simply."
                    
                    conversation_id = f"conv_{int(time.time())}"
                    self.conversations[conversation_id] = GenieConversation(
                        conversation_id=conversation_id,
                        messages=[
                            GenieMessage(role="user", content=initial_message),
                            GenieMessage(role="assistant", content=fallback_response)
                        ],
                        orchestration_details=self._current_orchestration_details
                    )
                    
                    return {
                        "conversation_id": conversation_id,
                        "response": fallback_response,
                        "status": "timeout_fallback"
                    }
                else:
                    raise Exception(f"All payload formats failed. Last error: {last_error}")
            
            logger.info(f"AgentBricks API response status: {response.status_code}")
            logger.info(f"AgentBricks API response headers: {dict(response.headers)}")
            logger.info(f"AgentBricks API response text (first 500 chars): {response.text[:500]}")
            
            # Log the full response for debugging
            try:
                full_response = response.json()
                logger.info(f"AgentBricks API full response: {full_response}")
                
                # Extract and log agent orchestration details
                self._log_agent_orchestration(full_response)
            except Exception as e:
                logger.warning(f"Could not parse response as JSON: {e}")
            
            # Check if the response is HTML (indicating a redirect to login page)
            content_type = response.headers.get('content-type', '').lower()
            if 'text/html' in content_type:
                logger.error("AgentBricks API returned HTML instead of JSON - likely a redirect to login page")
                return self._mock_response("The service principal may not have proper access to AgentBricks. The API is redirecting to a login page. Running in demo mode.", initial_message)
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    conversation_id = f"conv_{int(time.time())}"
                    
                    # Extract response from AgentBricks model serving format
                    agent_response = ""
                    is_agent_handoff = False
                    
                    if isinstance(result, dict):
                        # Handle function call output format: {'type': 'function_call_output', 'output': '...'}
                        if result.get('type') == 'function_call_output':
                            output = result.get('output', '')
                            logger.info(f"Received function call output: {output}")
                            
                            # Function call output means we need to wait for the final message type
                            is_agent_handoff = True
                            logger.info("Function call output detected - need to poll for final message type response")
                            
                        # Handle final message type - this is what we want to display
                        elif result.get('type') == 'message':
                            logger.info("Final message type received - extracting response")
                            # Extract content from message type
                            if 'content' in result:
                                content = result['content']
                                if isinstance(content, list) and content:
                                    content_item = content[0]
                                    if isinstance(content_item, dict) and 'text' in content_item:
                                        agent_response = content_item['text']
                                    else:
                                        agent_response = str(content_item)
                                else:
                                    agent_response = str(content)
                            else:
                                agent_response = str(result)
                        # Handle AgentBricks response format: {'object': 'response', 'output': [...]}
                        elif 'output' in result and isinstance(result['output'], list) and result['output']:
                            output_item = result['output'][0]
                            if isinstance(output_item, dict) and 'content' in output_item:
                                content_list = output_item['content']
                                if isinstance(content_list, list) and content_list:
                                    content_item = content_list[0]
                                    if isinstance(content_item, dict) and 'text' in content_item:
                                        agent_response = content_item['text']
                                    else:
                                        agent_response = str(content_item)
                                else:
                                    agent_response = str(content_list)
                            else:
                                agent_response = str(output_item)
                        # Handle direct output field
                        elif 'output' in result and isinstance(result['output'], str):
                            agent_response = result['output']
                        elif 'predictions' in result:
                            agent_response = result['predictions'][0] if result['predictions'] else ""
                        elif 'outputs' in result:
                            agent_response = result['outputs'][0] if result['outputs'] else ""
                        elif 'choices' in result:
                            agent_response = result['choices'][0].get('text', '') if result['choices'] else ""
                        else:
                            agent_response = str(result)
                    elif isinstance(result, list) and result:
                        agent_response = str(result[0])
                    else:
                        agent_response = str(result)
                    
                    # If this is an agent handoff, keep polling until we get the final response
                    if is_agent_handoff:
                        logger.info("Agent handoff detected in create_conversation - polling for final response from agent chain")
                        agent_response = self._poll_for_final_response(url, payload, conversation_id)
                    
                    logger.info(f"Successfully created AgentBricks conversation: {conversation_id}")
                    
                    # Track performance metrics
                    response_time = time.time() - request_start_time
                    self._track_agent_performance(response_time, True)
                    
                    # Enhance orchestration details with final response analysis
                    if self._current_orchestration_details:
                        # Analyze the final response content to infer agent usage
                        final_analysis = self._analyze_response_for_agent_usage({'output': [{'content': agent_response}]})
                        if final_analysis['reasoning_steps']:
                            self._current_orchestration_details['reasoning_steps'].extend(final_analysis['reasoning_steps'])
                        if final_analysis['inferred_agents']:
                            self._current_orchestration_details['agents_used'].extend(final_analysis['inferred_agents'])
                            self._current_orchestration_details['agents_used'] = list(set(self._current_orchestration_details['agents_used']))
                        self._current_orchestration_details['execution_metadata'].update(final_analysis['metadata'])
                    
                    # Store conversation
                    self.conversations[conversation_id] = GenieConversation(
                        conversation_id=conversation_id,
                        messages=[
                            GenieMessage(role="user", content=initial_message),
                            GenieMessage(role="assistant", content=agent_response)
                        ],
                        orchestration_details=self._current_orchestration_details
                    )
                    
                    return {
                        "conversation_id": conversation_id,
                        "response": agent_response,
                        "status": "success",
                        "query_result": None,  # AgentBricks typically doesn't return structured query results
                        "attachments": []
                    }
                except ValueError as e:
                    logger.error(f"Failed to parse AgentBricks API JSON response: {e}")
                    return self._mock_response("AgentBricks API returned invalid JSON. Running in demo mode.")
            elif response.status_code == 401:
                logger.error("AgentBricks API authentication failed - service principal may not have access")
                return self._mock_response("Authentication failed. The service principal may not have access to AgentBricks. Running in demo mode.")
            elif response.status_code == 403:
                logger.error("AgentBricks API access forbidden - insufficient permissions")
                return self._mock_response("Access forbidden. The service principal doesn't have permission to access this AgentBricks endpoint. Running in demo mode.")
            elif response.status_code == 404:
                logger.error(f"AgentBricks endpoint not found: {self.agentbricks_endpoint}")
                return self._mock_response(f"AgentBricks endpoint '{self.agentbricks_endpoint}' not found. Please check the endpoint configuration. Running in demo mode.")
            else:
                logger.error(f"AgentBricks API error: {response.status_code} - {response.text}")
                return self._mock_response(f"AgentBricks API returned error {response.status_code}. Running in demo mode instead.")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error calling AgentBricks API: {str(e)}")
            return self._mock_response("Network error connecting to AgentBricks. Running in demo mode.")
        except Exception as e:
            logger.error(f"Unexpected error in AgentBricks service: {str(e)}")
            return self._mock_response("An unexpected error occurred. Running in demo mode.")
    
    async def create_conversation_stream(self, initial_message: str):
        """Create a new conversation with AgentBricks using streaming."""
        import asyncio
        
        if not self._is_configured():
            logger.warning("AgentBricks service not configured - using demo mode")
            yield {"type": "delta", "content": "I'm running in demo mode since AgentBricks integration isn't fully configured yet."}
            yield {"type": "done", "content": "I'm running in demo mode since AgentBricks integration isn't fully configured yet."}
            return
        
        try:
            url = f"{self.base_url}/serving-endpoints/{self.agentbricks_endpoint}/invocations"
            
            logger.info(f"=== STREAMING AGENTBRICKS REQUEST ===")
            logger.info(f"URL: {url}")
            logger.info(f"Message: {initial_message}")
            
            payload = {
                "input": [{
                    "role": "user",
                    "content": initial_message
                }],
                "user": "user",
                "stream": True
            }
            
            headers = {
                **self.headers,
                "Accept": "text/event-stream"
            }
            
            # Use requests with streaming
            response = self.session.post(
                url, 
                headers=headers, 
                json=payload, 
                stream=True, 
                timeout=120
            )
            
            if response.status_code != 200:
                error_msg = f"AgentBricks API error: {response.status_code}"
                logger.error(error_msg)
                yield {"type": "error", "content": error_msg}
                return
            
            full_response = ""
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    
                    # Parse SSE format: "data: {...}"
                    if line_str.startswith("data: "):
                        try:
                            data = json.loads(line_str[6:])  # Skip "data: " prefix
                            
                            # Handle different event types
                            if data.get("type") == "response.output_text.delta":
                                delta_text = data.get("delta", "")
                                full_response += delta_text
                                yield {"type": "delta", "content": delta_text}
                            elif data.get("type") == "response.output_text.done":
                                # Response complete
                                pass
                            elif data.get("type") == "response.done":
                                # Full response done
                                yield {"type": "done", "content": full_response}
                                return
                            elif data.get("type") == "error":
                                yield {"type": "error", "content": data.get("message", "Unknown error")}
                                return
                        except json.JSONDecodeError as e:
                            logger.warning(f"Failed to parse SSE line: {line_str[:100]}")
                            continue
                    elif line_str == "data: [DONE]":
                        yield {"type": "done", "content": full_response}
                        return
                
                # Yield control to event loop
                await asyncio.sleep(0)
            
            # If we reach here, stream ended without [DONE]
            if full_response:
                yield {"type": "done", "content": full_response}
            
        except requests.exceptions.Timeout:
            logger.error("Streaming request timed out")
            yield {"type": "error", "content": "Request timed out. Please try again."}
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield {"type": "error", "content": f"Streaming error: {str(e)}"}
    
    def continue_conversation(self, conversation_id: str, message: str) -> Dict[str, Any]:
        """Continue an existing conversation with AgentBricks."""
        if not self._is_configured():
            return self._mock_response("I'm not configured yet. Please set up AgentBricks integration.")
        
        # Check circuit breaker
        if self._is_circuit_breaker_open():
            logger.warning("Circuit breaker is open due to repeated timeouts - using fallback response")
            return self._mock_response("The AI service is currently experiencing high load. Please try again in a few minutes.")
        
        try:
            # Build conversation context for AgentBricks
            conversation_context = ""
            if conversation_id in self.conversations:
                conv = self.conversations[conversation_id]
                for msg in conv.messages[-4:]:  # Last 4 messages for context
                    role = "Human" if msg.role == "user" else "Assistant"
                    conversation_context += f"{role}: {msg.content}\n"
            
            # Current message with context
            full_message = conversation_context + f"Human: {message}\nAssistant:"
            
            url = f"{self.base_url}/serving-endpoints/{self.agentbricks_endpoint}/invocations"
            
            logger.info(f"=== STARTING CONTINUE CONVERSATION REQUEST ===")
            logger.info(f"AgentBricks URL: {url}")
            logger.info(f"Conversation ID: {conversation_id}")
            logger.info(f"Message: {message}")
            logger.info(f"Full Message with Context: {full_message}")
            logger.info(f"Request Headers: {self.headers}")
            
            # Use ResponsesAgentRequest format with conversation history
            # Build message history for conversation context
            messages = []
            
            # Add conversation context as system message if available
            if conversation_context.strip():
                messages.append({
                    "role": "system",
                    "content": "Previous conversation context:\n" + conversation_context
                })
            
            # Add current user message
            messages.append({
                "role": "user",
                "content": message
            })
            
            payload_formats = [
                # Format 1: Direct request format - WORKING FORMAT
                {
                    "input": messages,
                    "user": "user",
                    "context": {
                        "conversation_id": conversation_id,
                        "user_id": "user"
                    }
                },
                # Format 2: Full conversation with context
                {
                    "instances": [{
                        "input": messages,
                        "user": "user",
                        "context": {
                            "conversation_id": conversation_id,
                            "user_id": "user"
                        },
                        "temperature": 0.7,
                        "max_output_tokens": 1000
                    }]
                },
                # Format 3: Simple message format
                {
                    "instances": [{
                        "input": [{
                            "role": "user",
                            "content": message
                        }],
                        "user": "user"
                    }]
                }
            ]
            
            response = None
            last_error = None
            
            logger.info(f"Trying {len(payload_formats)} different payload formats for continue conversation")
            for i, payload in enumerate(payload_formats):
                logger.info(f"Trying continue conversation payload format {i+1}: {payload}")
                
                try:
                    logger.info(f"=== SENDING CONTINUE CONVERSATION REQUEST TO AGENTBRICKS ===")
                    logger.info(f"Payload format {i+1}: {payload}")
                    logger.info(f"Request timeout: 120 seconds (increased for complex queries)")
                    logger.info(f"Starting continue conversation request at: {datetime.now()}")
                    
                    # Try with longer timeout for complex queries
                    response = self.session.post(url, headers=self.headers, json=payload, timeout=120)
                    
                    logger.info(f"Continue conversation request completed at: {datetime.now()}")
                    
                    logger.info(f"=== CONTINUE CONVERSATION RESPONSE RECEIVED ===")
                    logger.info(f"Response status: {response.status_code}")
                    logger.info(f"Response headers: {dict(response.headers)}")
                    logger.info(f"Response text (first 500 chars): {response.text[:500]}")
                    
                    if response.status_code == 200:
                        logger.info(f"Successful continue conversation with payload format {i+1}")
                        self._record_success()
                        break
                    elif response.status_code == 400:
                        # Only log detailed 400 errors for the first few attempts to reduce noise
                        if i < 2:  # Only log details for first 2 attempts
                            logger.warning(f"Continue conversation payload format {i+1} failed with 400 - trying next format")
                            logger.warning(f"400 Error response: {response.text[:500]}")
                        else:
                            logger.info(f"Continue conversation payload format {i+1} failed with 400 - trying next format")
                        continue
                    else:
                        break
                        
                except requests.exceptions.Timeout as e:
                    logger.error(f"Timeout with continue conversation payload format {i+1} (50s): {e}")
                    self._record_timeout()
                    last_error = e
                    continue
                except requests.exceptions.ConnectionError as e:
                    error_str = str(e)
                    if "Failed to resolve" in error_str or "nodename nor servname provided" in error_str:
                        logger.error(f"DNS resolution error with continue conversation payload format {i+1}: {e}")
                        logger.error("This indicates a network connectivity issue. The hostname cannot be resolved.")
                    else:
                        logger.error(f"Connection error with continue conversation payload format {i+1}: {e}")
                    last_error = e
                    continue
                except Exception as e:
                    logger.error(f"Error with continue conversation payload format {i+1}: {e}")
                    last_error = e
                    continue
            
            if response is None:
                # Check if the last error was a timeout
                if isinstance(last_error, requests.exceptions.Timeout):
                    logger.warning("AgentBricks endpoint timed out after 50s. Providing fallback response.")
                    fallback_response = "I apologize, but the AI service is currently experiencing high load and took too long to respond. Please try your question again in a moment, or try rephrasing it more simply."
                    
                    # Update conversation with fallback
                    if conversation_id in self.conversations:
                        self.conversations[conversation_id].messages.extend([
                            GenieMessage(role="user", content=message),
                            GenieMessage(role="assistant", content=fallback_response)
                        ])
                    
                    return {
                        "conversation_id": conversation_id,
                        "response": fallback_response,
                        "status": "timeout_fallback"
                    }
                else:
                    raise Exception(f"All continue conversation payload formats failed. Last error: {last_error}")
            
            if response.status_code == 200:
                result = response.json()
                
                # Extract response from AgentBricks
                agent_response = ""
                is_agent_handoff = False
                
                if isinstance(result, dict):
                    # Handle function call output format: {'type': 'function_call_output', 'output': '...'}
                    if result.get('type') == 'function_call_output':
                        output = result.get('output', '')
                        logger.info(f"Received function call output: {output}")
                        
                        # Function call output means we need to wait for the final message type
                        is_agent_handoff = True
                        logger.info("Function call output detected - need to poll for final message type response")
                        
                    # Handle final message type - this is what we want to display
                    elif result.get('type') == 'message':
                        logger.info("Final message type received - extracting response")
                        # Extract content from message type
                        if 'content' in result:
                            content = result['content']
                            if isinstance(content, list) and content:
                                content_item = content[0]
                                if isinstance(content_item, dict) and 'text' in content_item:
                                    agent_response = content_item['text']
                                else:
                                    agent_response = str(content_item)
                            else:
                                agent_response = str(content)
                        else:
                            agent_response = str(result)
                    # Handle AgentBricks response format: {'object': 'response', 'output': [...]}
                    elif 'output' in result and isinstance(result['output'], list) and result['output']:
                        output_item = result['output'][0]
                        if isinstance(output_item, dict) and 'content' in output_item:
                            content_list = output_item['content']
                            if isinstance(content_list, list) and content_list:
                                content_item = content_list[0]
                                if isinstance(content_item, dict) and 'text' in content_item:
                                    agent_response = content_item['text']
                                else:
                                    agent_response = str(content_item)
                            else:
                                agent_response = str(content_list)
                        else:
                            agent_response = str(output_item)
                    # Handle direct output field
                    elif 'output' in result and isinstance(result['output'], str):
                        agent_response = result['output']
                    elif 'predictions' in result:
                        agent_response = result['predictions'][0] if result['predictions'] else ""
                    elif 'outputs' in result:
                        agent_response = result['outputs'][0] if result['outputs'] else ""
                    elif 'choices' in result:
                        agent_response = result['choices'][0].get('text', '') if result['choices'] else ""
                    else:
                        agent_response = str(result)
                elif isinstance(result, list) and result:
                    agent_response = str(result[0])
                else:
                    agent_response = str(result)
                
                # If this is an agent handoff, keep polling until we get the final response
                if is_agent_handoff:
                    logger.info("Agent handoff detected - polling for final response from agent chain")
                    agent_response = self._poll_for_final_response(url, payload, conversation_id)
                    
                    # Update the result for orchestration details if we got a response
                    if agent_response != "The agent chain is still processing your request. Please wait a moment...":
                        # We got a final response, but we don't have the full result object
                        # Use the original result for orchestration but with the final response
                        pass
                
                # Parse orchestration details if available
                orchestration_details = None
                try:
                    orchestration_details = self._parse_orchestration_details(result, conversation_id)
                except Exception as e:
                    logger.warning(f"Failed to parse orchestration details: {e}")
                
                # Store orchestration details for this request
                self._current_orchestration_details = orchestration_details
                
                # Update conversation
                if conversation_id in self.conversations:
                    self.conversations[conversation_id].messages.extend([
                        GenieMessage(role="user", content=message),
                        GenieMessage(role="assistant", content=agent_response)
                    ])
                
                return {
                    "conversation_id": conversation_id,
                    "response": agent_response,
                    "status": "success",
                    "query_result": None,
                    "attachments": []
                }
            else:
                logger.error(f"AgentBricks API error: {response.status_code} - {response.text}")
                if response.status_code == 401:
                    return self._mock_response("Authentication failed. Running in demo mode.")
                elif response.status_code == 404:
                    return self._mock_response(f"AgentBricks endpoint '{self.agentbricks_endpoint}' not found. Running in demo mode.")
                else:
                    return self._mock_response(f"AgentBricks API error {response.status_code}. Running in demo mode.")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error calling AgentBricks API: {str(e)}")
            return self._mock_response("Network error connecting to AgentBricks.")
        except Exception as e:
            logger.error(f"Unexpected error in AgentBricks service: {str(e)}")
            return self._mock_response("An unexpected error occurred.")
    
    def get_conversation_history(self, conversation_id: str) -> Optional[GenieConversation]:
        """Get conversation history."""
        return self.conversations.get(conversation_id)
    
    def _is_configured(self) -> bool:
        """Check if AgentBricks service is properly configured."""
        return self.databricks_client.is_configured() and bool(self.agentbricks_endpoint)
    
    def get_auth_status(self) -> Dict[str, Any]:
        """Get detailed authentication status for debugging."""
        databricks_status = self.databricks_client.get_connection_status()
        
        return {
            "base_url": self.base_url,
            "agentbricks_endpoint": self.agentbricks_endpoint,
            "is_configured": self._is_configured(),
            "serving_url": f"{self.base_url}/serving-endpoints/{self.agentbricks_endpoint}/invocations" if self.base_url and self.agentbricks_endpoint else None,
            "databricks_connection": databricks_status,
            "available_env_vars": {
                "DATABRICKS_HOST": bool(os.getenv("DATABRICKS_HOST")),
                "DATABRICKS_CLIENT_ID": bool(os.getenv("DATABRICKS_CLIENT_ID")),
                "DATABRICKS_CLIENT_SECRET": bool(os.getenv("DATABRICKS_CLIENT_SECRET")),
                "DATABRICKS_TOKEN": bool(os.getenv("DATABRICKS_TOKEN")),
                "AGENTBRICKS_ENDPOINT": bool(os.getenv("AGENTBRICKS_ENDPOINT"))
            }
        }
    
    def _mock_response(self, message: str, user_message: str = None) -> Dict[str, Any]:
        """Return a mock response when service is not configured or has errors."""
        conversation_id = f"mock_{int(time.time())}"
        
        # Provide helpful mock responses based on the message content
        if "demo mode" in message.lower():
            demo_responses = [
                "Here are some example insights: Your portfolio shows strong performance in energy commodities this month.",
                "Based on mock data: Current VaR is within acceptable limits at $2.3M.",
                "Sample analysis: Top performing trades are in Brent Crude with 15% gains.",
                "Demo insight: Risk exposure is well-distributed across asset classes."
            ]
            import random
            response_text = f"{message}\n\n{random.choice(demo_responses)}"
        else:
            response_text = message
        
        # Create mock orchestration details
        mock_orchestration = {
            'reasoning_steps': [
                {
                    'type': 'demo_mode',
                    'content': 'Running in demo mode due to authentication or configuration issues',
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'type': 'mock_processing',
                    'content': 'Generated mock response based on available demo data patterns',
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'agents_used': ['Demo Mode Agent'],
            'tool_calls': [],
            'function_calls': [],
            'execution_metadata': {
                'mode': 'demo',
                'reason': 'authentication_or_configuration_issue'
            },
            'raw_response_keys': ['mock_response']
        }
        
        # Store the conversation if we have a user message
        if user_message:
            self.conversations[conversation_id] = GenieConversation(
                conversation_id=conversation_id,
                messages=[
                    GenieMessage(role="user", content=user_message),
                    GenieMessage(role="assistant", content=response_text)
                ],
                orchestration_details=mock_orchestration
            )
            
        return {
            "conversation_id": conversation_id,
            "response": response_text,
            "status": "mock",
            "query_result": None,
            "attachments": []
        }
    
    def create_conversation_async(self, message: str, progress_callback=None) -> Dict[str, Any]:
        """Version asynchrone de create_conversation pour éviter les timeouts."""
        if progress_callback:
            progress_callback(20.0, "Démarrage de la conversation...")
        
        try:
            if progress_callback:
                progress_callback(50.0, "Connexion à AgentBricks...")
            
            result = self.create_conversation(message)
            
            if progress_callback:
                progress_callback(90.0, "Finalisation de la réponse...")
            
            return result
        except Exception as e:
            logger.error(f"Erreur dans create_conversation_async: {str(e)}")
            raise
    
    def continue_conversation_async(self, conversation_id: str, message: str, progress_callback=None) -> Dict[str, Any]:
        """Version asynchrone de continue_conversation pour éviter les timeouts."""
        if progress_callback:
            progress_callback(20.0, "Reprise de la conversation...")
        
        try:
            if progress_callback:
                progress_callback(50.0, "Traitement de votre message...")
            
            result = self.continue_conversation(conversation_id, message)
            
            if progress_callback:
                progress_callback(90.0, "Génération de la réponse...")
            
            return result
        except Exception as e:
            logger.error(f"Erreur dans continue_conversation_async: {str(e)}")
            raise
    
    def start_async_conversation(self, message: str, conversation_id: Optional[str] = None) -> str:
        """
        Démarre une conversation de manière asynchrone et retourne immédiatement un job_id.
        
        Args:
            message: Message de l'utilisateur
            conversation_id: ID de conversation existante (optionnel)
            
        Returns:
            str: ID du job pour suivre le progrès
        """
        if conversation_id:
            # Continuer une conversation existante
            job_id = job_manager.create_job(
                self.continue_conversation_async,
                conversation_id,
                message
            )
        else:
            # Créer une nouvelle conversation
            job_id = job_manager.create_job(
                self.create_conversation_async,
                message
            )
        
        logger.info(f"Job asynchrone créé: {job_id} pour message: {message[:50]}...")
        return job_id
    
    def get_conversation_suggestions(self, context: str = "") -> List[str]:
        """Get suggested questions based on context."""
        # Default suggestions for ETRM domain
        base_suggestions = [
            "What are the top 10 trades by volume this month?",
            "Show me the P&L breakdown by trading hub",
            "What is our current VaR exposure?",
            "Calculate potential CRE penalty exposure if our high risk trading positions on the epex spot market with volumes higher than 500 MW fail to deliver",
            "What are our open positions by market?"
        ]
        
        # Context-specific suggestions
        if "trading" in context.lower():
            return [
                "Show me today's trading activity",
                "What's the average trade size for Brent crude?",
                "Which traders have the highest P&L?",
                "Show me failed trades and their reasons"
            ]
        elif "risk" in context.lower():
            return [
                "Calculate our portfolio VaR",
                "Show me stress test results",
                "What are our largest exposures?",
                "Display risk limits and utilization"
            ]
        elif "compliance" in context.lower():
            return [
                "Show me recent compliance violations",
                "Which trades need regulatory reporting?",
                "Display audit trail for suspicious trades",
                "Show me KYC status for counterparties"
            ]
        elif "finance" in context.lower():
            return [
                "Show P&L by business unit",
                "What's our cash flow forecast?",
                "Display month-end reconciliation status",
                "Show me mark-to-market valuations"
            ]
        
        return base_suggestions


# Singleton instance
genie_service = GenieService()

