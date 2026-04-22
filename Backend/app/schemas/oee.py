from pydantic import BaseModel
from datetime import date

class OEERegistroBase(BaseModel):
    equipo_id: int
    fecha: date
    turno: str
    tiempo_programado: float
    tiempo_parado: float
    unidades_producidas: float
    unidades_objetivo: float
    unidades_rechazadas: float

class OEEResponse(OEERegistroBase):
    id: int
    disponibilidad: float
    rendimiento: float
    calidad: float
    oee_total: float
    class Config:
        from_attributes = True