from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date

class DashboardResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

class DashboardFiltros(BaseModel):
    empresaId: str
    fechaDesde: date
    fechaHasta: date
    sedeId: Optional[int] = None

class AlertaResponse(BaseModel):
    id: int
    tipo: str
    severidad: str
    mensaje: str
    estado: str
    
    class Config:
        from_attributes = True