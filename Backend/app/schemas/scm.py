from pydantic import BaseModel, Field
from typing import Optional, List
from .inventario import ProductoSimple

class UbicacionBase(BaseModel):
    zona: str
    pasillo: str
    rack: str
    nivel: str
    posicion: str
    capacidad_maxima: float
    tipo_almacenamiento: str

class UbicacionResponse(UbicacionBase):
    id: int
    bodega_id: int
    capacidad_ocupada: float
    ocupacion_pct: float # Calculado en el servicio

    class Config:
        from_attributes = True

class MapaBodega(BaseModel):
    bodega_id: int
    ubicaciones: List[UbicacionResponse]