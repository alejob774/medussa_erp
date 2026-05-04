from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CostoSkuResponse(BaseModel):
    producto_id: int
    costo_promedio: float
    ultimo_costo: float
    ultima_actualizacion: Optional[datetime]

    class Config:
        from_attributes = True

class RentabilidadResponse(BaseModel):
    producto_id: int
    nombre_producto: str
    costo_promedio: float
    precio_venta: float
    margen_bruto: float
    porcentaje_rentabilidad: float