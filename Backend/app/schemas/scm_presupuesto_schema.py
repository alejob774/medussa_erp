from pydantic import BaseModel
from typing import List, Optional

class PresupuestoCreate(BaseModel):
    empresa_id: str
    anio: int
    mes: int
    centro_costo_id: int
    categoria_id: str
    valor_aprobado: float

class PresupuestoResumen(BaseModel):
    id: int
    valor_aprobado: float
    valor_ejecutado: float
    disponible: float
    porcentaje_ejecucion: float