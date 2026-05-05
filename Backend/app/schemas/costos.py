from pydantic import BaseModel
from typing import Optional
from datetime import datetime

<<<<<<< HEAD
class CostoProductoResponse(BaseModel):
    producto_id: int
    sku: str
    costo_actual: float
    metodo_costeo: str # FIFO / Promedio[cite: 22]
    ultima_actualizacion: datetime

class MargenSKUResponse(BaseModel):
    sku: str
    precio_venta: float
    costo_unitario: float
    margen_valor: float
    margen_porcentaje: float[cite: 22]
=======
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
>>>>>>> Back
