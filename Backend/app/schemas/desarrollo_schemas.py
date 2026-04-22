# app/schemas/desarrollo_schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class ProyectoBOMBase(BaseModel):
    item_codigo: str
    descripcion: str
    cantidad: float
    unidad_medida: str
    costo_estimado: float

class ProyectoCreate(BaseModel):
    empresa_id: str
    nombre_producto: str
    categoria: str
    sku_propuesto: str
    mercado_objetivo: str
    fecha_lanzamiento: date
    proyeccion_ventas: float
    responsable_id: int
    bom_preliminar: List[ProyectoBOMBase]

class ProyectoResponse(BaseModel):
    id: int
    estado_proyecto: str
    nombre_producto: str
    
    class Config:
        from_attributes = True