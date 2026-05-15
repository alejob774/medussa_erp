from pydantic import BaseModel, EmailStr
from typing import Any, List, Optional

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

class SeleccionarEmpresaRequest(BaseModel):
    empresaId: Optional[Any] = None
    empresa_id: Optional[Any] = None
    companyId: Optional[Any] = None

    def empresa_id_solicitada(self) -> Optional[str]:
        value = self.empresaId or self.empresa_id or self.companyId
        return str(value) if value is not None else None
