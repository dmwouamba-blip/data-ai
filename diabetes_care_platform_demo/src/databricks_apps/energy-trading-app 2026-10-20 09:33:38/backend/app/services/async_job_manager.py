"""
Gestionnaire de jobs asynchrones pour éviter les timeouts 504.
Permet d'exécuter les requêtes AgentBricks en arrière-plan avec polling côté client.
"""
import asyncio
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
from enum import Enum
import logging
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class AsyncJob:
    """Représente un job asynchrone en cours d'exécution."""
    job_id: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: float = 0.0
    progress_message: str = "En attente..."
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertit le job en dictionnaire pour la sérialisation JSON."""
        return {
            "job_id": self.job_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "result": self.result,
            "error": self.error,
            "progress": self.progress,
            "progress_message": self.progress_message,
            "duration_seconds": (
                (self.completed_at - self.started_at).total_seconds() 
                if self.started_at and self.completed_at 
                else (datetime.now() - self.started_at).total_seconds()
                if self.started_at
                else 0
            )
        }


class AsyncJobManager:
    """Gestionnaire de jobs asynchrones pour les requêtes longues."""
    
    def __init__(self):
        self.jobs: Dict[str, AsyncJob] = {}
        self.executor = None
        self._running = True
        self._cleanup_interval = 300  # 5 minutes
        self._job_timeout = 600  # 10 minutes maximum par job
        
        # Démarrer le thread de nettoyage
        self._cleanup_thread = threading.Thread(target=self._cleanup_old_jobs, daemon=True)
        self._cleanup_thread.start()
        
        logger.info("AsyncJobManager initialisé avec succès")
    
    def create_job(self, job_function: Callable, *args, **kwargs) -> str:
        """
        Crée un nouveau job asynchrone.
        
        Args:
            job_function: Fonction à exécuter de manière asynchrone
            *args, **kwargs: Arguments pour la fonction
            
        Returns:
            str: ID du job créé
        """
        job_id = str(uuid.uuid4())
        job = AsyncJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=datetime.now(),
            progress_message="Job créé, en attente d'exécution..."
        )
        
        self.jobs[job_id] = job
        
        # Exécuter le job dans un thread séparé
        thread = threading.Thread(
            target=self._execute_job,
            args=(job_id, job_function, args, kwargs),
            daemon=True
        )
        thread.start()
        
        logger.info(f"Job {job_id} créé et démarré")
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le statut d'un job.
        
        Args:
            job_id: ID du job
            
        Returns:
            Dict avec les informations du job ou None si non trouvé
        """
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        return job.to_dict()
    
    def get_job_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère le résultat d'un job complété.
        
        Args:
            job_id: ID du job
            
        Returns:
            Résultat du job ou None si pas encore complété
        """
        job = self.jobs.get(job_id)
        if not job or job.status != JobStatus.COMPLETED:
            return None
        
        return job.result
    
    def cancel_job(self, job_id: str) -> bool:
        """
        Annule un job (marque comme failed).
        
        Args:
            job_id: ID du job à annuler
            
        Returns:
            bool: True si le job a été annulé, False sinon
        """
        job = self.jobs.get(job_id)
        if not job or job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
            return False
        
        job.status = JobStatus.FAILED
        job.error = "Job annulé par l'utilisateur"
        job.completed_at = datetime.now()
        
        logger.info(f"Job {job_id} annulé")
        return True
    
    def _execute_job(self, job_id: str, job_function: Callable, args: tuple, kwargs: dict):
        """
        Exécute un job de manière asynchrone.
        
        Args:
            job_id: ID du job
            job_function: Fonction à exécuter
            args, kwargs: Arguments pour la fonction
        """
        job = self.jobs.get(job_id)
        if not job:
            logger.error(f"Job {job_id} non trouvé pour exécution")
            return
        
        try:
            # Marquer le job comme en cours
            job.status = JobStatus.RUNNING
            job.started_at = datetime.now()
            job.progress = 10.0
            job.progress_message = "Traitement en cours..."
            
            logger.info(f"Démarrage de l'exécution du job {job_id}")
            
            # Fonction de callback pour mettre à jour le progrès
            def update_progress(progress: float, message: str):
                if job_id in self.jobs:
                    self.jobs[job_id].progress = progress
                    self.jobs[job_id].progress_message = message
            
            # Ajouter le callback aux kwargs si la fonction le supporte
            if 'progress_callback' in job_function.__code__.co_varnames:
                kwargs['progress_callback'] = update_progress
            
            # Exécuter la fonction
            result = job_function(*args, **kwargs)
            
            # Marquer le job comme complété
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now()
            job.result = result
            job.progress = 100.0
            job.progress_message = "Traitement terminé avec succès"
            
            logger.info(f"Job {job_id} complété avec succès")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'exécution du job {job_id}: {str(e)}")
            
            # Marquer le job comme en erreur
            job.status = JobStatus.FAILED
            job.completed_at = datetime.now()
            job.error = str(e)
            job.progress_message = f"Erreur: {str(e)}"
    
    def _cleanup_old_jobs(self):
        """Thread de nettoyage pour supprimer les anciens jobs."""
        while self._running:
            try:
                now = datetime.now()
                jobs_to_remove = []
                
                for job_id, job in self.jobs.items():
                    # Supprimer les jobs terminés de plus de 1 heure
                    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                        if job.completed_at and (now - job.completed_at) > timedelta(hours=1):
                            jobs_to_remove.append(job_id)
                    
                    # Timeout les jobs qui tournent depuis trop longtemps
                    elif job.status == JobStatus.RUNNING:
                        if job.started_at and (now - job.started_at) > timedelta(seconds=self._job_timeout):
                            job.status = JobStatus.TIMEOUT
                            job.error = "Timeout: le job a pris trop de temps à s'exécuter"
                            job.completed_at = now
                            job.progress_message = "Timeout dépassé"
                            logger.warning(f"Job {job_id} timeout après {self._job_timeout} secondes")
                
                # Supprimer les anciens jobs
                for job_id in jobs_to_remove:
                    del self.jobs[job_id]
                    logger.debug(f"Job {job_id} supprimé (nettoyage automatique)")
                
                if jobs_to_remove:
                    logger.info(f"Nettoyage: {len(jobs_to_remove)} jobs supprimés")
                
            except Exception as e:
                logger.error(f"Erreur lors du nettoyage des jobs: {str(e)}")
            
            # Attendre avant le prochain nettoyage
            threading.Event().wait(self._cleanup_interval)
    
    def shutdown(self):
        """Arrête le gestionnaire de jobs."""
        self._running = False
        logger.info("AsyncJobManager arrêté")
    
    def get_all_jobs_summary(self) -> Dict[str, Any]:
        """
        Retourne un résumé de tous les jobs actifs.
        
        Returns:
            Dict avec les statistiques des jobs
        """
        stats = {
            "total_jobs": len(self.jobs),
            "pending": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
            "timeout": 0
        }
        
        for job in self.jobs.values():
            stats[job.status.value] += 1
        
        return stats


# Instance globale du gestionnaire de jobs
job_manager = AsyncJobManager()


