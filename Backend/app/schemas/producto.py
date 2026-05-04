# app/schemas/producto.py

from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProductoBase(BaseModel):
    nombre: Optional[str] = None
    producto_sku: Optional[str] = None
    descripcion: Optional[str] = None
    maneja_lote: Optional[bool] = False
    estado: Optional[bool] = True
    empresa_id: Optional[str] = None

class ProductoCreate(ProductoBase):
    nombre: str  # Se eliminó la etiqueta de citación
    producto_sku: str
    empresa_id: str

class ProductoUpdate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)