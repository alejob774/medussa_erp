from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class ClienteBase(BaseModel):
    id_cli: Optional[str] = None
    nombre: Optional[str] = None
    nombre_comercial: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None # Validación automática de formato
    estado: Optional[bool] = True

class ClienteCreate(ClienteBase):
    id_cli: str
    nombre: str
    direccion: str
    ciudad: str

class ClienteUpdate(ClienteBase):
    pass # Todos los campos son opcionales para actualizaciones parciales

class ClienteResponse(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)