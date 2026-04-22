from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class BOMDetalleBase(BaseModel):
    materia_prima_id: int
    cantidad: float
    unidad_medida: str
    costo_unitario: float

class BOMBase(BaseModel):
    producto_id: int
    version: str = "1.0"
    vigencia_desde: date
    merma_esperada: float = 0.0
    tiempo_proceso: int
    rendimiento_esperado: float
    observaciones: Optional[str] = None

class BOMCreate(BOMBase):
    ingredientes: List[BOMDetalleBase]

class BOMResponse(BOMBase):
    id: int
    estado: str
    class Config:
        from_attributes = True