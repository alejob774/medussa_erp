from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PickingCreate(BaseModel):
    pedido_id: int
    operario_id: int
    prioridad: str

class ConfirmarItemPicking(BaseModel):
    tarea_id: int
    producto_id: int
    lote_id: str
    ubicacion_id: int
    cantidad_recogida: float

class PackingClose(BaseModel):
    pedido_id: int
    tipo_empaque: str
    numero_cajas: int
    peso_total_kg: float
    precinto_seguridad: Optional[str] = None