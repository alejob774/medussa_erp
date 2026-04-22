from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class OTBase(BaseModel):
    equipo_id: int
    tipo: str  # PREVENTIVO, CORRECTIVO, SANITARIO
    tecnico_asignado: str
    observaciones: Optional[str] = None

class OTCreate(OTBase):
    empresa_id: str

class OTUpdate(BaseModel):
    estado: Optional[str] = None
    tiempo_reparacion: Optional[int] = None
    costo_estimado: Optional[float] = None
    observaciones: Optional[str] = None

class OTResponse(OTBase):
    id: int
    estado: str
    fecha_programada: date
    fecha_cierre: Optional[datetime] = None
    class Config:
        from_attributes = True