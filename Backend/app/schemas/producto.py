from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProductoBase(BaseModel):
    nombre: Optional[str] = None
    producto_sku: Optional[str] = None
    descripcion: Optional[str] = None
    familia: Optional[str] = None
    uom_base: Optional[str] = None
    maneja_lote: Optional[bool] = False
    maneja_venc: Optional[bool] = False
    metodo_costo: Optional[str] = "Promedio"
    estado: Optional[bool] = True
    empresa_id: Optional[str] = None

class ProductoCreate(ProductoBase):
    nombre: str
    producto_sku: str
    empresa_id: str

class ProductoUpdate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id: int
    producto_status: Optional[str] = "Activo"

    model_config = ConfigDict(from_attributes=True)