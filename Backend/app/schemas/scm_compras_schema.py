from pydantic import BaseModel
from datetime import date
from typing import Optional

class AnalisisCompraRequest(BaseModel):
    empresa_id: str
    fecha_desde: date
    fecha_hasta: date

class AnalisisCompraResponse(BaseModel):
    status: str
    registros_procesados: int
    mensaje: Optional[str] = None