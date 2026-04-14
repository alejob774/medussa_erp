from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class EquipoBase(BaseModel):
    id_maq: str = Field(..., example="MAQ-001")
    nombre_maq: str = Field(..., example="Montacargas Eléctrico")
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    especificaciones_tecnicas: Optional[str] = None
    empresa_fabricante: Optional[str] = None
    contacto_fabricante: Optional[EmailStr] = None # Valida formato de correo

class EquipoCreate(EquipoBase):
    pass

class EquipoUpdate(BaseModel):
    nombre_maq: Optional[str] = None
    marca: Optional[str] = None
    especificaciones_tecnicas: Optional[str] = None
    contacto_fabricante: Optional[EmailStr] = None
    estado: Optional[bool] = None

class EquipoResponse(EquipoBase):
    id: int
    estado: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True