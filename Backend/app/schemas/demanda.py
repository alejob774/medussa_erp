from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Esquema base para compartir campos
class ForecastBase(BaseModel):
    version: Optional[str] = None
    horizonte: Optional[str] = None
    estado: Optional[str] = "Borrador"

# Para la creación (POST)
class ForecastCreate(ForecastBase):
    version: str  # Obligatorio al crear
    horizonte: str

# --- AQUÍ ESTÁ EL QUE FALTA ---
class ForecastUpdate(BaseModel):
    version: Optional[str] = None
    horizonte: Optional[str] = None
    estado: Optional[str] = None
    es_activo: Optional[bool] = None

# Para la respuesta (Response)
class ForecastResponse(ForecastBase):
    id: int
    empresa_id: str
    fecha_crea: datetime

    class Config:
        from_attributes = True