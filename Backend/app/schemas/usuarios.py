from pydantic import BaseModel, EmailStr, ConfigDict, model_validator
from typing import List, Optional, Any
from app.schemas.auth import EmpresaMe

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
    
    # Campo oficial del Backend
    membresias: Optional[List[MembresiaOut]] = None
    # Campo temporal para compatibilidad Frontend
    empresas: Optional[List[MembresiaOut]] = None

    @model_validator(mode='before')
    @classmethod
    def normalizar_nomenclatura(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Si viene 'empresas' y no 'membresias', hacemos el swap
            if "empresas" in data and not data.get("membresias"):
                data["membresias"] = data.pop("empresas")
            
            # Validación: Al menos uno debe existir al final
            if not data.get("membresias"):
                raise ValueError("Debe proporcionar al menos una membresía (o lista de empresas).")
        return data

    model_config = ConfigDict(from_attributes=True)

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cargo: Optional[str] = None
    celular: Optional[str] = None
    telefono_fijo: Optional[str] = None
    estado: Optional[bool] = None
    # Campo para actualizar membresías
    membresias: Optional[List[MembresiaOut]] = None 

    model_config = ConfigDict(from_attributes=True)

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