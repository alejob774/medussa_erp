from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Any
from datetime import datetime

class EmpresaBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=200)
    nit: str = Field(..., max_length=50)
    direccion: Optional[str] = Field(None, max_length=200)
    telefono: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    sector: str = Field(..., max_length=100)
    ciudad: str
    pais: str
    moneda: str
    zona_horaria: str
    configuraciones_iniciales: dict = Field(default_factory=lambda: {"impuestos": "IVA", "idioma": "es"})

class EmpresaCreate(EmpresaBase):
    empresa_id: str = Field(..., description="ID único para el tenant")

class EmpresaUpdate(BaseModel):
    nombre_empresa: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    logo: Optional[str] = None
    estado: Optional[bool] = None # Para desactivación lógica 

class EmpresaResponse(EmpresaBase):
    id: int
    empresa_id: str
    estado: bool
    logo: Optional[str] = None
    fecha_creacion: datetime
    
    model_config = {"from_attributes": True}