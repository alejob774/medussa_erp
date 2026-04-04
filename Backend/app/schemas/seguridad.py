from pydantic import BaseModel
from typing import Optional, Any, List

class RolBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    empresa_id: str
    permisos: Optional[Any] = None

class RolResponse(RolBase):
    id: int
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