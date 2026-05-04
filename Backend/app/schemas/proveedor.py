from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class ProveedorBase(BaseModel):
    # Alineado con 'nombre_razon_social' en el modelo[cite: 18]
    nombre_razon_social: str = Field(..., max_length=100)
    nit: str = Field(..., max_length=20)
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=20)
    categoria: Optional[str] = Field(None, max_length=50)

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(BaseModel):
    nombre_razon_social: Optional[str] = None
    contacto_nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    categoria: Optional[str] = None
    estado: Optional[str] = None # "Activo" o "Inactivo"

class ProveedorResponse(ProveedorBase):
    id: int
    estado: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True