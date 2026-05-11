from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class InspeccionDetalleBase(BaseModel):
    parametro: str
    resultado: float
    min_esperado: float
    max_esperado: float
    conforme: Optional[bool] = None

class InspeccionCreate(BaseModel):
    empresa_id: Optional[str] = None # Se inyecta en router
    tipo_control: str
    lote: str
    producto_id: int
    bodega_id: int           # <-- REQUERIDO PARA INVENTORY CORE
    cantidad_lote: float     # <-- REQUERIDO PARA INVENTORY CORE
    analista: str
    equipo_utilizado: Optional[str] = None
    parametros: List[InspeccionDetalleBase]
    observaciones: Optional[str] = None

class InspeccionResponse(BaseModel):
    id: int
    lote: str
    resultado_final: str # Ajustado al modelo
    liberado: bool
    
    class Config:
        from_attributes = True