"""
Pydantic schemas for Genie API endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(default=None, description="Message timestamp")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to send to Genie")
    conversation_id: Optional[str] = Field(default=None, description="Existing conversation ID for follow-ups")
    context: Optional[str] = Field(default="", description="Context for the conversation (e.g., 'trading', 'risk')")


class QueryResult(BaseModel):
    sql: Optional[str] = Field(default=None, description="Generated SQL query")
    data: Optional[List[Dict[str, Any]]] = Field(default=None, description="Query result data")
    columns: Optional[List[str]] = Field(default=None, description="Column names")
    row_count: Optional[int] = Field(default=None, description="Number of rows returned")


class ChatAttachment(BaseModel):
    type: str = Field(..., description="Attachment type (e.g., 'chart', 'table')")
    title: Optional[str] = Field(default=None, description="Attachment title")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Attachment data")


class ChatResponse(BaseModel):
    conversation_id: str = Field(..., description="Conversation identifier")
    response: str = Field(..., description="Genie's response message")
    status: str = Field(..., description="Response status")
    query_result: Optional[QueryResult] = Field(default=None, description="SQL query result if applicable")
    attachments: List[ChatAttachment] = Field(default_factory=list, description="Response attachments")
    suggestions: List[str] = Field(default_factory=list, description="Follow-up question suggestions")
    orchestration_details: Optional[Dict[str, Any]] = Field(default=None, description="Agent orchestration details")


class ConversationHistory(BaseModel):
    conversation_id: str = Field(..., description="Conversation identifier")
    messages: List[ChatMessage] = Field(..., description="List of messages in the conversation")
    status: str = Field(default="active", description="Conversation status")
    created_at: Optional[datetime] = Field(default=None, description="Conversation creation time")


class SuggestionsRequest(BaseModel):
    context: Optional[str] = Field(default="", description="Context for generating suggestions")


class SuggestionsResponse(BaseModel):
    suggestions: List[str] = Field(..., description="List of suggested questions")
    context: str = Field(..., description="Context used for suggestions")

