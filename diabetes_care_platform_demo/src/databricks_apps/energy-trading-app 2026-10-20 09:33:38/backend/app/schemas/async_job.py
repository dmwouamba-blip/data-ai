"""
Schémas Pydantic pour les jobs asynchrones.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum


class JobStatusEnum(str, Enum):
    """États possibles d'un job asynchrone."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class AsyncJobRequest(BaseModel):
    """Requête pour démarrer un job asynchrone."""
    message: str = Field(..., description="Message à traiter par l'agent")
    conversation_id: Optional[str] = Field(None, description="ID de conversation existante")
    context: Optional[str] = Field(None, description="Contexte additionnel pour l'agent")


class AsyncJobResponse(BaseModel):
    """Réponse lors de la création d'un job asynchrone."""
    job_id: str = Field(..., description="Identifiant unique du job")
    status: JobStatusEnum = Field(..., description="Statut initial du job")
    message: str = Field(..., description="Message de confirmation")
    estimated_duration_seconds: int = Field(default=60, description="Durée estimée en secondes")


class JobStatusResponse(BaseModel):
    """Réponse pour le statut d'un job."""
    job_id: str = Field(..., description="Identifiant du job")
    status: JobStatusEnum = Field(..., description="Statut actuel du job")
    progress: float = Field(..., description="Progrès en pourcentage (0-100)")
    progress_message: str = Field(..., description="Message descriptif du progrès")
    created_at: str = Field(..., description="Date de création du job")
    started_at: Optional[str] = Field(None, description="Date de démarrage du job")
    completed_at: Optional[str] = Field(None, description="Date de completion du job")
    duration_seconds: Optional[float] = Field(None, description="Durée d'exécution en secondes")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")
    result: Optional[Dict[str, Any]] = Field(None, description="Résultat du job si complété")


class JobCancelResponse(BaseModel):
    """Réponse pour l'annulation d'un job."""
    job_id: str = Field(..., description="Identifiant du job")
    cancelled: bool = Field(..., description="Si le job a été annulé avec succès")
    message: str = Field(..., description="Message de confirmation")


class JobsListResponse(BaseModel):
    """Réponse pour la liste des jobs actifs."""
    total_jobs: int = Field(..., description="Nombre total de jobs")
    pending: int = Field(..., description="Jobs en attente")
    running: int = Field(..., description="Jobs en cours")
    completed: int = Field(..., description="Jobs complétés")
    failed: int = Field(..., description="Jobs en erreur")
    timeout: int = Field(..., description="Jobs en timeout")


