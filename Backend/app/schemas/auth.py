from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any

class EmpresaMe(BaseModel):
    empresa_id: str
    nombre_empresa: str
    rol: str
    perfil: str
    permisos: Any

class UserMeResponse(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    username: str
    email: EmailStr
    empresas: List[EmpresaMe]

    class Config:
        from_attributes = True