<<<<<<< HEAD
from pydantic import BaseModel
from typing import Optional

class ProductoBase(BaseModel):
    producto_nom: str
    producto_sku: str
    producto_fam: str
    uom_base: str
    maneja_lote: bool = False
    maneja_venc: bool = False
    metodo_costo: str = "Promedio"

class ProductoCreate(ProductoBase):
    producto_descrip: str
    vida_util: Optional[int] = None

class ProductoUpdate(BaseModel):
    producto_nom: Optional[str] = None
    producto_descrip: Optional[str] = None
    producto_status: Optional[str] = None
    metodo_costo: Optional[str] = None
=======
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
>>>>>>> Back

class ProductoResponse(ProductoBase):
    id: int
    empresa_id: str
    producto_status: str

    class Config:
        from_attributes = True