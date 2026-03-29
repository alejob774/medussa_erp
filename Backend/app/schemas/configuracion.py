from pydantic import BaseModel, Field
from typing import Optional

class ConfiguracionBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=100)
    nit: str = Field(..., max_length=20)
    direccion: str = Field(..., max_length=150)
    ciudad: str = Field(..., max_length=100)
    pais: str = Field(..., max_length=100)
    moneda: str = Field(..., max_length=10)
    zona_horaria: str = Field(..., max_length=50)
    telefono: Optional[str] = None
    formato_fecha: str = Field("DD/MM/YYYY")

class ConfigSchema(ConfiguracionBase):
    pass

class ConfiguracionResponse(ConfiguracionBase):
    id: int
    empresa_id: str

    class Config:
        from_attributes = True