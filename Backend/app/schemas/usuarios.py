from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional

# Esquema para la relación multiempresa (HU-011-BE)
class EmpresaAsignada(BaseModel):
    empresa_id: str
    rol_id: int
    perfil_id: Optional[int] = None 
    
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
    empresas: List[EmpresaAsignada] 

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
    username: str
    email: EmailStr
    apellido: Optional[str] = None 
    cargo: Optional[str] = None
    celular: Optional[str] = None
    estado: bool
    
    model_config = ConfigDict(from_attributes=True)

# Corregido: El nombre del campo debe ser 'empresas' para coincidir con el router
class UsuarioDetalleResponse(UsuarioResponse):
    empresas: List[EmpresaAsignada] = []