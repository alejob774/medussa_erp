# app/schemas/logistica.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RutaBase(BaseModel):
    id_rut: str
    nombre_rut: str

class RutaCreate(RutaBase):
    pass

class RutaUpdate(BaseModel):
    nombre_rut: Optional[str] = None
    estado: Optional[bool] = None

class RutaResponse(RutaBase):
    id: int
    estado: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True