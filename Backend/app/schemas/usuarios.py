from pydantic import BaseModel, EmailStr
from typing import Optional

# Esquema base con campos comunes
class UsuarioBase(BaseModel):
    nombre: str
    username: str
    email: EmailStr
    rol: Optional[str] = None
    estado: Optional[bool] = True

# Esquema para la creación (Input)
class UsuarioCreate(UsuarioBase):
    password: str
    empresa_id: str
    rol_id: int

# Esquema para la respuesta (Output)
class UsuarioResponse(UsuarioBase):
    id: int

    class Config:
        from_attributes = True