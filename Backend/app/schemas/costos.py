from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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