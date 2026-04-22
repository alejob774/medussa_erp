# app/schemas/calidad.py
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
    empresa_id: str
    tipo_control: str
    lote: str
    producto_id: int
    analista: str
    equipo_utilizado: Optional[str] = None
    parametros: List[InspeccionDetalleBase]
    observaciones: Optional[str] = None

class InspeccionResponse(BaseModel):
    id: int
    lote: str
    estado_lote: str
    liberado: bool
    fecha_crea: datetime
    
    class Config:
        from_attributes = True