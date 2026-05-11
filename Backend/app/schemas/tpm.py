from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class RepuestoConsumo(BaseModel):
    producto_id: int
    bodega_id: int
    cantidad: float

class OTBase(BaseModel):
    equipo_id: int
    tipo: str  
    tecnico_asignado: str
    observaciones: Optional[str] = None

class OTCreate(OTBase):
    pass

class OTUpdate(BaseModel):
    estado: Optional[str] = None
    tiempo_reparacion: Optional[int] = None
    costo_estimado: Optional[float] = None
    observaciones: Optional[str] = None
    repuestos: Optional[List[RepuestoConsumo]] = [] # <-- REQUERIDO PARA INVENTORY CORE

class OTResponse(OTBase):
    id: int
    estado: str
    fecha_programada: date
    fecha_cierre: Optional[datetime] = None
    class Config:
        from_attributes = True