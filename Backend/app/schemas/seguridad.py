from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime

class RolBase(BaseModel):
    # Longitud de 100 caracteres según HU-013 [cite: 31]
    nombre: str = Field(..., max_length=100)
    # Longitud de 300 caracteres según HU-013 [cite: 31]
    descripcion: Optional[str] = Field(None, max_length=300)
    empresa_id: str
    permisos: Optional[Any] = None
    estado: str = "activo"

class RolCreate(RolBase):
    """Esquema para la creación de roles (HU-013)"""
    pass

class RolUpdate(BaseModel):
    """Esquema para actualizaciones parciales y desactivación"""
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=300)
    permisos: Optional[Any] = None
    estado: Optional[str] = None

class RolResponse(RolBase):
    """Esquema de salida con datos de auditoría [cite: 32, 37]"""
    id: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True

class AsignacionBase(BaseModel):
    usuario_id: int
    empresa_id: str
    rol_id: int
    estado: str = "activo"

class AsignacionResponse(AsignacionBase):
    id: int
    class Config:
        from_attributes = True