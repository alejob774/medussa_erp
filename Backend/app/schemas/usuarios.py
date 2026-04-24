from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional

# Esquema para la relación multiempresa (HU-011-BE)
class MembresiaOut(BaseModel):
    empresa_id: str
    rol_id: int
    rol_nombre: Optional[str] = None
    perfil_id: Optional[int] = None
    perfil_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UsuarioCreate(BaseModel):
    nombre: str
    apellido: str
    username: str
    email: EmailStr
    password: str
    cargo: str
    celular: str
    telefono_fijo: Optional[str] = None
    membresias: List[MembresiaOut] 

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cargo: Optional[str] = None
    celular: Optional[str] = None
    telefono_fijo: Optional[str] = None
    estado: Optional[bool] = None

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    username: str
    email: EmailStr
    cargo: str
    celular: str
    estado: bool
    membresias: List[MembresiaOut] = []
    
    model_config = ConfigDict(from_attributes=True)
class UsuarioDetalleResponse(UsuarioResponse):
    # Aquí puedes agregar campos adicionales si son necesarios
    # o simplemente usarlo para diferenciar respuestas simples de detalladas
    pass