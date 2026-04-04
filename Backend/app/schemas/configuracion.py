from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Any
from datetime import datetime

class EmpresaBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=200)
    nit: str = Field(..., max_length=50)
    direccion: Optional[str] = Field(None, max_length=200)
    telefono: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    # CORRECCIÓN: sector ahora es opcional para evitar el ResponseValidationError
    sector: Optional[str] = Field(None, max_length=100) 
    ciudad: str
    pais: str
    moneda: str
    zona_horaria: str
    # CORRECCIÓN: configuraciones_iniciales ahora es opcional y acepta cualquier estructura o None
    configuraciones_iniciales: Optional[Any] = Field(
        default_factory=lambda: {"impuestos": "IVA", "idioma": "es"}
    )

class EmpresaCreate(EmpresaBase):
    empresa_id: str = Field(..., description="ID único para el tenant (Ej: MED-BOG-01)")

class EmpresaUpdate(BaseModel):
    nombre_empresa: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    sector: Optional[str] = None
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    moneda: Optional[str] = None
    zona_horaria: Optional[str] = None
    configuraciones_iniciales: Optional[Any] = None
    logo: Optional[str] = None
    estado: Optional[bool] = None # Para desactivación lógica (Soft Delete)

class EmpresaResponse(EmpresaBase):
    id: int
    empresa_id: str
    estado: bool
    logo: Optional[str] = None
    # Se añade valor por defecto en caso de que registros antiguos no tengan fecha
    fecha_creacion: Optional[datetime] = None 
    
    model_config = {"from_attributes": True}