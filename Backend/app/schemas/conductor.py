from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RutaBase(BaseModel):
    id: int
    id_rut: str
    nombre_rut: str

    class Config:
        from_attributes = True

class ConductorBase(BaseModel):
    id_con: str
    nombre_con: str
    estado: Optional[bool] = True

class ConductorCreate(ConductorBase):
    id_rutas: List[int] # Lista de IDs de rutas a asociar [cite: 176]

class ConductorUpdate(BaseModel):
    nombre_con: Optional[str] = None
    id_rutas: Optional[List[int]] = None
    estado: Optional[bool] = None

class ConductorResponse(ConductorBase):
    id: int
    rutas: List[RutaBase] # [cite: 178]
    fecha_creacion: datetime

    class Config:
        from_attributes = True