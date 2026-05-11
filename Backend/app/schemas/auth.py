from pydantic import BaseModel, EmailStr
from typing import List, Optional

class EmpresaMe(BaseModel):
    empresa_id: str
    nombre_empresa: str
    rol: str
    perfil: str

class UserMeResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    nombre: str
    estado: str
    active_company_id: Optional[str] = None 
    empresas_disponibles: List[EmpresaMe]
    permisos: List[str]

    class Config:
        from_attributes = True