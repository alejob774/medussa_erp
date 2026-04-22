from pydantic import BaseModel
from typing import Optional

class ZonaLayoutCreate(BaseModel):
    bodega_id: int
    nombre_zona: str
    tipo_almacenamiento: str
    capacidad_pallets: int

class ReubicacionRequest(BaseModel):
    producto_id: int
    lote_id: str
    ubicacion_origen_id: int
    ubicacion_destino_id: int
    cantidad: float
    motivo: str

class OcupacionResumen(BaseModel):
    zona: str
    porcentaje_uso: float
    estado: str