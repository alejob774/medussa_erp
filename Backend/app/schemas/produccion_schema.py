from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- OEE ---
class OeeCreate(BaseModel):
    equipo_id: int
    tiempo_total: float
    tiempo_parada: float
    unidades_totales: float
    unidades_defectuosas: float

# --- CALIDAD ---
class InspeccionCreate(BaseModel):
    producto_id: int
    lote_id: Optional[str] = None
    cantidad_muestra: float
    defectos_encontrados: int
    resultado_final: str # APROBADO, RECHAZADO
    observaciones: Optional[str] = None

class InspeccionResponse(InspeccionCreate):
    id: int
    empresa_id: str
    liberado: bool
    
    class Config:
        from_attributes = True

# --- TPM ---
class TpmOrdenCreate(BaseModel):
    equipo_id: int
    tipo_mantenimiento: str
    descripcion_falla: str