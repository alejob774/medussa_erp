from pydantic import BaseModel, Field
from typing import List, Optional

class ConteoCreate(BaseModel):
    bodega_id: int
    nombre_sesion: str
    tipo_conteo: str  # 'Cíclico', 'Wall-to-Wall'

class RegistroFisico(BaseModel):
    conteo_id: int
    producto_id: int
    cantidad_encontrada: float = Field(..., ge=0)
    lote_id: Optional[str] = None
    ubicacion_id: Optional[int] = None

class VarianzaResumen(BaseModel):
    sku: str
    stock_sistema: float
    conteo_fisico: float
    diferencia: float
    impacto_financiero: float