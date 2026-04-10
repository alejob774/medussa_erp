from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.cliente import ClienteResponse

class VendedorBase(BaseModel):
    id_ven: Optional[str] = None
    nombre_ven: Optional[str] = None
    estado: Optional[bool] = True

class VendedorCreate(VendedorBase):
    id_ven: str
    nombre_ven: str
    id_clientes: List[int] # Lista de IDs de clientes para asociar [cite: 161]

class VendedorUpdate(VendedorBase):
    id_clientes: Optional[List[int]] = None

class VendedorResponse(VendedorBase):
    id: int
    clientes: List[ClienteResponse] = [] # Incluye detalle de clientes asociados [cite: 155]
    model_config = ConfigDict(from_attributes=True)