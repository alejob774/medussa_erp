from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class ConfigSchema(BaseModel):
    nombre: str
    valor: str

class ConfiguracionBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=150)
    nit: str = Field(..., max_length=20)
    moneda: str = Field(..., max_length=10)
    zona_horaria: str = Field(..., max_length=50)
    formato_fecha: str = Field(..., max_length=20)
    correo_corporativo: Optional[EmailStr] = None

class ConfiguracionResponse(ConfiguracionBase):
    class Config:
        from_attributes = True # Permite mapear desde SQLAlchemy