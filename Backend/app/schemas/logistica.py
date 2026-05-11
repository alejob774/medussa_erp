from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RutaBase(BaseModel):
    id_rut: str
    nombre_rut: str
    origen: Optional[str] = None
    destino: Optional[str] = None
    distancia_km: Optional[float] = None
    estado: Optional[bool] = True

class RutaCreate(RutaBase):
    pass

class RutaUpdate(BaseModel):
    nombre_rut: Optional[str] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    distancia_km: Optional[float] = None
    estado: Optional[bool] = None

class RutaResponse(RutaBase):
    id: int
    fecha_creacion: datetime
    class Config:
        from_attributes = True

# Contrato estandarizado para tablas del frontend
class RutaPaginatedResponse(BaseModel):
    success: bool = True
    data: List[RutaResponse]
    total: int
    skip: int
    limit: int