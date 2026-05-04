from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any

class EmpresaMe(BaseModel):
    empresa_id: str
    nombre_empresa: str
    rol: str
    perfil: str
    permisos: Any # Soporta el JSON de permisos efectivos[cite: 22]

class UserMeResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    empresas: List[EmpresaMe]