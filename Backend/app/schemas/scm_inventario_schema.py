from pydantic import BaseModel
from typing import Optional, List

class ConteoCreate(BaseModel):
    empresa_id: str
    bodega_id: int
    responsable_id: int
    descripcion: Optional[str] = None

class RegistroFisico(BaseModel):
    conteo_id: int
    producto_id: int
    lote_id: Optional[str] = None
    cantidad_fisica: float
    ubicacion: Optional[str] = None

class VarianzaResumen(BaseModel):
    sku: str
    stock_sistema: float
    conteo_fisico: float
    diferencia: float
    impacto_financiero: float