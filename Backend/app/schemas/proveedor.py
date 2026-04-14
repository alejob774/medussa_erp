from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    ciudad: str = Field(..., max_length=100)
    direccion: str = Field(..., max_length=200)
    telefono: str = Field(..., max_length=20)
    nit: str = Field(..., max_length=20)
    producto: Optional[str] = Field(None, max_length=150)

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    producto: Optional[str] = None
    estado: Optional[bool] = None

class ProveedorResponse(ProveedorBase):
    id: int
    estado: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True