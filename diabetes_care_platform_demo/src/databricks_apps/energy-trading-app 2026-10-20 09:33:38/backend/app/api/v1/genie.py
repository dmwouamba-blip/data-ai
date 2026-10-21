"""
Databricks Genie API endpoints for natural language data interactions.
"""
import asyncio
import json
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.schemas.genie import (
    ChatRequest, 
    ChatResponse, 
    ConversationHistory, 
    SuggestionsRequest, 
    SuggestionsResponse,
    QueryResult,
    ChatAttachment
)
from app.schemas.async_job import (
    AsyncJobRequest,
    AsyncJobResponse, 
    JobStatusResponse,
    JobCancelResponse,
    JobsListResponse,
    JobStatusEnum
)
from app.services.genie import genie_service
from app.services.async_job_manager import job_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/genie", tags=["genie"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_genie(request: ChatRequest) -> ChatResponse:
    """
    Send a message to Databricks Genie and get a response.
    Supports both new conversations and continuing existing ones.
    """
    try:
        logger.info(f"=== CHAT API ENDPOINT CALLED ===")
        logger.info(f"Message: {request.message}")
        logger.info(f"Conversation ID: {request.conversation_id}")
        logger.info(f"Context: {request.context}")
        
        # For Databricks Apps platform, use a shorter timeout to avoid gateway timeouts
        if request.conversation_id:
            # Continue existing conversation
            result = genie_service.continue_conversation(
                request.conversation_id, 
                request.message
            )
        else:
            # Start new conversation
            result = genie_service.create_conversation(request.message)
        
        # Parse query result if present
        query_result = None
        if result.get("query_result"):
            qr = result["query_result"]
            query_result = QueryResult(
                sql=qr.get("sql"),
                data=qr.get("data"),
                columns=qr.get("columns"),
                row_count=qr.get("row_count")
            )
        
        # Parse attachments
        attachments = []
        for att in result.get("attachments", []):
            attachments.append(ChatAttachment(
                type=att.get("type", "unknown"),
                title=att.get("title"),
                data=att.get("data")
            ))
        
        # Get context-based suggestions
        suggestions = genie_service.get_conversation_suggestions(request.context)
        
        response = ChatResponse(
            conversation_id=result["conversation_id"],
            response=result["response"],
            status=result["status"],
            query_result=query_result,
            attachments=attachments,
            suggestions=suggestions[:4]  # Limit to 4 suggestions
        )
        
        logger.info(f"=== CHAT API RESPONSE ===")
        logger.info(f"Conversation ID: {response.conversation_id}")
        logger.info(f"Status: {response.status}")
        logger.info(f"Response length: {len(response.response)}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in Genie chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request: {str(e)}"
        )


@router.post("/chat/stream")
async def chat_with_genie_stream(request: ChatRequest):
    """
    Stream a response from Databricks AgentBricks using Server-Sent Events.
    Returns a streaming response with real-time text chunks.
    """
    async def generate_stream():
        try:
            logger.info(f"=== STREAMING CHAT API CALLED ===")
            logger.info(f"Message: {request.message}")
            
            # Get the streaming generator from the service
            conversation_id = f"conv_{int(asyncio.get_event_loop().time())}"
            
            async for chunk in genie_service.create_conversation_stream(request.message):
                if chunk.get("type") == "delta":
                    # Send text delta
                    yield f"data: {json.dumps({'type': 'delta', 'content': chunk['content'], 'conversation_id': conversation_id})}\n\n"
                elif chunk.get("type") == "done":
                    # Send completion signal with full response
                    yield f"data: {json.dumps({'type': 'done', 'content': chunk.get('content', ''), 'conversation_id': conversation_id})}\n\n"
                elif chunk.get("type") == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': chunk.get('content', 'Unknown error')})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in streaming: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/conversation/{conversation_id}", response_model=ConversationHistory)
async def get_conversation_history(conversation_id: str) -> ConversationHistory:
    """
    Get the history of a conversation.
    """
    try:
        conversation = genie_service.get_conversation_history(conversation_id)
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        
        return ConversationHistory(
            conversation_id=conversation.conversation_id,
            messages=conversation.messages,
            status=conversation.status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )


@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(request: SuggestionsRequest) -> SuggestionsResponse:
    """
    Get suggested questions based on context.
    """
    try:
        suggestions = genie_service.get_conversation_suggestions(request.context)
        
        return SuggestionsResponse(
            suggestions=suggestions,
            context=request.context or "general"
        )
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}"
        )


@router.get("/health")
async def genie_health_check() -> dict:
    """
    Check if Genie service is configured and available.
    """
    try:
        is_configured = genie_service._is_configured()
        circuit_breaker_open = genie_service._is_circuit_breaker_open()
        
        return {
            "status": "configured" if is_configured else "not_configured",
            "service": "databricks-genie",
            "agentbricks_endpoint": genie_service.agentbricks_endpoint if is_configured else None,
            "host": genie_service.base_url if is_configured else None,
            "circuit_breaker": {
                "open": circuit_breaker_open,
                "timeout_count": genie_service.timeout_count,
                "threshold": genie_service.circuit_breaker_threshold,
                "last_timeout": genie_service.last_timeout.isoformat() if genie_service.last_timeout else None
            }
        }
        
    except Exception as e:
        logger.error(f"Error in Genie health check: {str(e)}")
        return {
            "status": "error",
            "service": "databricks-genie",
            "error": str(e)
        }


@router.get("/debug/auth")
async def genie_auth_debug() -> dict:
    """
    Debug endpoint to check Genie authentication configuration.
    Only available in development/debug mode.
    """
    try:
        auth_status = genie_service.get_auth_status()
        
        # Add environment debugging (variables essentielles seulement)
        import os
        essential_vars = [
            "DATABRICKS_HOST",
            "DATABRICKS_CLIENT_ID", 
            "DATABRICKS_CLIENT_SECRET",
            "DATABRICKS_TOKEN",
            "AGENTBRICKS_ENDPOINT"
        ]
        
        env_debug = {}
        for var in essential_vars:
            value = os.getenv(var)
            if "SECRET" in var or "TOKEN" in var:
                env_debug[var] = "***SET***" if value else "***NOT SET***"
            else:
                env_debug[var] = value or "***NOT SET***"
        
        return {
            "auth_status": auth_status,
            "environment_variables": env_debug,
            "service_principal_context": {
                "running_in_databricks": bool(os.getenv("DATABRICKS_RUNTIME_VERSION")),
                "has_minimal_config": all(os.getenv(var) for var in ["DATABRICKS_HOST", "DATABRICKS_CLIENT_ID", "DATABRICKS_CLIENT_SECRET"]) or all(os.getenv(var) for var in ["DATABRICKS_HOST", "DATABRICKS_TOKEN"])
            }
        }
        
    except Exception as e:
        logger.error(f"Error in Genie auth debug: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }


@router.post("/debug/test-agentbricks")
async def test_agentbricks_api() -> dict:
    """
    Test endpoint to force an AgentBricks API call and see what happens.
    """
    try:
        logger.info("Testing AgentBricks API call...")
        
        if not genie_service._is_configured():
            return {
                "status": "error",
                "message": "Service not configured",
                "is_configured": False
            }
        
        base_url = genie_service.base_url
        endpoint = genie_service.agentbricks_endpoint
        headers = genie_service.headers
        
        url = f"{base_url}/serving-endpoints/{endpoint}/invocations"
        
        # Test ResponsesAgentRequest format for AgentBricks
        test_payloads = [
            # Format 1: Correct ResponsesAgentRequest with Message objects
            {
                "instances": [{
                    "input": [{
                        "role": "user",
                        "content": "Hello"
                    }],
                    "user": "test",
                    "context": {
                        "conversation_id": "test",
                        "user_id": "test"
                    },
                    "temperature": 0.7,
                    "max_output_tokens": 1000
                }]
            },
            # Format 2: Simple Message format
            {
                "instances": [{
                    "input": [{
                        "role": "user",
                        "content": "Hello"
                    }],
                    "user": "test"
                }]
            },
            # Format 3: System + User messages
            {
                "instances": [{
                    "input": [
                        {
                            "role": "system",
                            "content": "You are a helpful assistant."
                        },
                        {
                            "role": "user",
                            "content": "Hello"
                        }
                    ],
                    "user": "test"
                }]
            },
            # Format 4: Direct request (no instances)
            {
                "input": [{
                    "role": "user",
                    "content": "Hello"
                }],
                "user": "test"
            },
            # Format 5: Minimal direct format
            {
                "input": [{
                    "role": "user",
                    "content": "Hello"
                }],
                "user": "test"
            }
        ]
        
        results = []
        for i, payload in enumerate(test_payloads):
            logger.info(f"Testing payload format {i+1}: {payload}")
            
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                results.append({
                    "format": i+1,
                    "payload": payload,
                    "status_code": response.status_code,
                    "response_text": response.text[:300] if response.text else None,
                    "content_type": response.headers.get('content-type', '')
                })
                
                if response.status_code == 200:
                    break  # Stop on first successful format
                    
            except Exception as e:
                results.append({
                    "format": i+1,
                    "payload": payload,
                    "error": str(e)
                })
        
        return {
            "status": "test_completed",
            "url": url,
            "endpoint": endpoint,
            "results": results,
            "suggestion": "Look for the format with status_code 200 or the most informative error message"
        }
        
    except Exception as e:
        logger.error(f"Error in AgentBricks API test: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }


@router.post("/debug/test-response-format")
async def test_response_format() -> dict:
    """
    Test endpoint to see what response format AgentBricks returns.
    """
    try:
        import requests
        import os
        
        if not genie_service._is_configured():
            return {
                "status": "error",
                "message": "Service not configured",
                "is_configured": False
            }
        
        base_url = genie_service.base_url
        endpoint = genie_service.agentbricks_endpoint
        headers = genie_service.headers
        
        url = f"{base_url}/serving-endpoints/{endpoint}/invocations"
        
        # Test with a simple message
        test_payload = {
            "instances": [{
                "input": [{
                    "role": "user",
                    "content": "Hello, can you help me with regulatory compliance?"
                }],
                "user": "test"
            }]
        }
        
        logger.info(f"Testing AgentBricks response format with: {test_payload}")
        
        response = requests.post(url, headers=headers, json=test_payload, timeout=30)
        
        return {
            "status": "test_completed",
            "url": url,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "response_headers": dict(response.headers),
            "response_text": response.text[:1000] if response.text else None,
            "response_json": response.json() if response.status_code == 200 else None,
            "content_type": response.headers.get('content-type', '')
        }
        
    except Exception as e:
        logger.error(f"Error in response format test: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }


@router.get("/setup-instructions")
async def genie_setup_instructions() -> dict:
    """
    Provide instructions for setting up Genie with Databricks Apps service principal.
    """
    return {
        "title": "Databricks Genie Integration Setup",
        "status": "info",
        "current_config": {
            "is_configured": genie_service._is_configured(),
            "has_agentbricks_endpoint": bool(genie_service.agentbricks_endpoint),
            "has_base_url": bool(genie_service.base_url),
            "databricks_configured": genie_service.databricks_client.is_configured(),
            "auth_method": genie_service.databricks_client.get_connection_status().get('auth_method', 'none')
        },
        "setup_steps": [
            {
                "step": 1,
                "title": "Verify Service Principal Permissions",
                "description": "Ensure the Databricks Apps service principal has access to the AgentBricks endpoint",
                "details": [
                    "The service principal needs 'CAN_USE' permission on the AgentBricks endpoint",
                    "Contact your Databricks admin to grant AgentBricks endpoint access",
                    f"Current AgentBricks Endpoint: {genie_service.agentbricks_endpoint or 'Not configured'}"
                ]
            },
            {
                "step": 2,
                "title": "Check Environment Configuration",
                "description": "Verify the AGENTBRICKS_ENDPOINT is correctly set",
                "details": [
                    "AGENTBRICKS_ENDPOINT should be set in app.yaml environment variables",
                    "The endpoint should be a valid AgentBricks endpoint that exists in your workspace",
                    "You can find endpoint names in the Databricks Model Serving UI"
                ]
            },
            {
                "step": 3,
                "title": "Service Principal Authentication",
                "description": "Databricks Apps automatically provides service principal authentication",
                "details": [
                    "No need to manually set DATABRICKS_HOST or DATABRICKS_TOKEN",
                    "The service principal token is automatically injected by Databricks Apps",
                    "If authentication fails, check with your admin about service principal setup"
                ]
            }
        ],
        "troubleshooting": {
            "popup_issue": "If you see a popup window, it usually means authentication is failing",
            "common_causes": [
                "Service principal doesn't have access to the AgentBricks endpoint",
                "AgentBricks endpoint is incorrect or doesn't exist",
                "Service principal doesn't have the necessary permissions",
                "The app is trying to use user authentication instead of service principal"
            ],
            "solutions": [
                "Contact your Databricks admin to verify service principal permissions",
                "Check the AgentBricks endpoint in your Databricks workspace",
                "Review the app logs for specific error messages",
                "Try the /api/v1/genie/debug/auth endpoint for detailed diagnostics"
            ]
        }
    }

@router.get("/agent-orchestration/{conversation_id}")
async def get_agent_orchestration(conversation_id: str):
    """Get agent orchestration details for a specific conversation."""
    try:
        # Use the imported genie_service instance
        
        if conversation_id not in genie_service.conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        conversation = genie_service.conversations[conversation_id]
        
        # Return actual orchestration details if available
        orchestration_details = conversation.orchestration_details
        
        if orchestration_details:
            return {
                "conversation_id": conversation_id,
                "message_count": len(conversation.messages),
                "created_at": conversation.created_at.isoformat() if hasattr(conversation, 'created_at') else None,
                "agent_orchestration": {
                    "reasoning_steps": orchestration_details.get('reasoning_steps', []),
                    "agents_used": orchestration_details.get('agents_used', []),
                    "tool_calls": orchestration_details.get('tool_calls', []),
                    "function_calls": orchestration_details.get('function_calls', []),
                    "execution_metadata": orchestration_details.get('execution_metadata', {}),
                    "raw_response_keys": orchestration_details.get('raw_response_keys', []),
                    "note": "Detailed agent execution traces captured from AgentBricks response."
                }
            }
        else:
            # Fallback to basic info if no orchestration details available
            return {
                "conversation_id": conversation_id,
                "message_count": len(conversation.messages),
                "created_at": conversation.created_at.isoformat() if hasattr(conversation, 'created_at') else None,
                "agent_orchestration": {
                    "note": "No orchestration details available for this conversation. This may be an older conversation or the details were not captured.",
                    "available_agents": [
                        "Energy Market Knowledge Assistant",
                        "Energy Market Intelligence Platform", 
                        "ETRM Trading Agent",
                        "Regulatory Compliance Agent"
                    ]
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent orchestration: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/agent-metrics")
async def get_agent_metrics():
    """Get agent performance metrics and usage statistics."""
    try:
        # Use the imported genie_service instance
        metrics = genie_service.get_agent_metrics()
        
        return {
            "status": "success",
            "metrics": metrics,
            "timestamp": metrics.get('last_updated').isoformat() if metrics.get('last_updated') else None
        }
        
    except Exception as e:
        logger.error(f"Error getting agent metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/test-slow-response")
async def test_slow_response(request: ChatRequest) -> ChatResponse:
    """
    Endpoint de test pour simuler une réponse lente (15 secondes)
    Utile pour tester le système asynchrone.
    """
    logger.info(f"=== TEST SLOW RESPONSE STARTED ===")
    logger.info(f"Message: {request.message}")
    
    # Simuler un traitement long
    await asyncio.sleep(15)
    
    # Créer une réponse avec un tableau pour tester l'affichage
    response_content = f"""# Réponse de Test Asynchrone

Votre question était: **{request.message}**

## Données de Test avec Tableau

| Produit | Prix | Volume | P&L |
|---------|------|--------|-----|
| Brent Crude | $75.45 | 1,250,000 | +$125,500 |
| Natural Gas | $3.24 | 2,100,000 | -$45,200 |
| Power (Peak) | €85.50 | 500,000 | +$67,800 |
| Coal | $95.20 | 750,000 | +$23,450 |

## Résumé
- **Total P&L**: +$171,550
- **Meilleur Performer**: Brent Crude
- **Attention**: Natural Gas en perte

Cette réponse a été générée après 15 secondes pour tester le système asynchrone ! 🚀"""

    return ChatResponse(
        conversation_id=f"test_slow_{int(asyncio.get_event_loop().time())}",
        response=response_content,
        status="success",
        suggestions=[
            "Analyser les performances du Brent",
            "Investiguer les pertes du Natural Gas",
            "Optimiser le portefeuille Power"
        ]
    )


# =============================================================================
# ENDPOINTS ASYNCHRONES POUR ÉVITER LES TIMEOUTS 504
# =============================================================================

@router.post("/chat/async", response_model=AsyncJobResponse)
async def start_async_chat(request: AsyncJobRequest) -> AsyncJobResponse:
    """
    Démarre une conversation asynchrone avec Genie pour éviter les timeouts 504.
    Retourne immédiatement un job_id pour suivre le progrès via polling.
    """
    try:
        logger.info(f"=== ASYNC CHAT API ENDPOINT CALLED ===")
        logger.info(f"Message: {request.message}")
        logger.info(f"Conversation ID: {request.conversation_id}")
        logger.info(f"Context: {request.context}")
        
        # Démarrer le job asynchrone
        job_id = genie_service.start_async_conversation(
            message=request.message,
            conversation_id=request.conversation_id
        )
        
        return AsyncJobResponse(
            job_id=job_id,
            status=JobStatusEnum.PENDING,
            message="Job asynchrone créé avec succès. Utilisez le job_id pour suivre le progrès.",
            estimated_duration_seconds=60
        )
        
    except Exception as e:
        logger.error(f"Error starting async chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du démarrage du chat asynchrone: {str(e)}"
        )


@router.get("/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """
    Récupère le statut d'un job asynchrone.
    Utilisé pour le polling côté client.
    """
    try:
        job_status = job_manager.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} non trouvé"
            )
        
        return JobStatusResponse(**job_status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status for {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du statut du job: {str(e)}"
        )


@router.get("/jobs/{job_id}/result")
async def get_job_result(job_id: str):
    """
    Récupère le résultat d'un job complété.
    """
    try:
        # Vérifier le statut du job
        job_status = job_manager.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} non trouvé"
            )
        
        if job_status["status"] != JobStatusEnum.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job {job_id} n'est pas encore complété. Statut actuel: {job_status['status']}"
            )
        
        # Récupérer le résultat
        result = job_manager.get_job_result(job_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Résultat du job {job_id} non trouvé"
            )
        
        # Transformer le résultat en format ChatResponse pour compatibilité
        query_result = None
        if result.get("query_result"):
            qr = result["query_result"]
            query_result = QueryResult(
                sql=qr.get("sql"),
                data=qr.get("data"),
                columns=qr.get("columns"),
                row_count=qr.get("row_count")
            )
        
        # Transformer les attachments
        attachments = []
        for att in result.get("attachments", []):
            attachments.append(ChatAttachment(
                type=att.get("type", "text"),
                content=att.get("content", ""),
                metadata=att.get("metadata", {})
            ))
        
        return ChatResponse(
            conversation_id=result.get("conversation_id", ""),
            response=result.get("response", ""),
            status=result.get("status", "success"),
            query_result=query_result,
            attachments=attachments,
            orchestration_details=result.get("orchestration_details")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job result for {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération du résultat du job: {str(e)}"
        )


@router.delete("/jobs/{job_id}", response_model=JobCancelResponse)
async def cancel_job(job_id: str) -> JobCancelResponse:
    """
    Annule un job asynchrone.
    """
    try:
        cancelled = job_manager.cancel_job(job_id)
        
        if not cancelled:
            # Vérifier si le job existe
            job_status = job_manager.get_job_status(job_id)
            if not job_status:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Job {job_id} non trouvé"
                )
            else:
                return JobCancelResponse(
                    job_id=job_id,
                    cancelled=False,
                    message=f"Job {job_id} ne peut pas être annulé (statut: {job_status['status']})"
                )
        
        return JobCancelResponse(
            job_id=job_id,
            cancelled=True,
            message=f"Job {job_id} annulé avec succès"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'annulation du job: {str(e)}"
        )


@router.get("/jobs/stats", response_model=JobsListResponse)
async def get_jobs_stats() -> JobsListResponse:
    """
    Récupère les statistiques des jobs actifs.
    """
    try:
        stats = job_manager.get_all_jobs_summary()
        return JobsListResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting jobs stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )

