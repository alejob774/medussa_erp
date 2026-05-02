from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.inventario import Producto, MovimientoInventario
from app.schemas.producto import ProductoCreate, ProductoUpdate
from app.core.context import get_company_context
from fastapi import HTTPException, status

async def obtener_productos_contextual(db: Session, skip: int = 0, limit: int = 100):
    empresa_id = get_company_context()
    return db.query(Producto).filter(Producto.empresa_id == empresa_id).offset(skip).limit(limit).all()

async def crear_producto(db: Session, obj_in: ProductoCreate):
    empresa_id = get_company_context()
    if not empresa_id:
        raise HTTPException(status_code=422, detail="X-Company-ID faltante")

    data = obj_in.model_dump()
    data["empresa_id"] = empresa_id
    
    db_obj = Producto(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def recalcular_costo_promedio(db: Session, producto_id: int):
    empresa_id = get_company_context()
    
    movimientos = db.query(MovimientoInventario).filter(
        MovimientoInventario.producto_id == producto_id,
        MovimientoInventario.empresa_id == empresa_id,
        MovimientoInventario.tipo_movimiento.in_(['COMPRA', 'PRODUCCION_INGRESO'])
    ).all()
    
    if not movimientos:
        return 0.0

    total_valor = sum(float(m.costo_total) for m in movimientos)
    total_cantidad = sum(float(m.cantidad) for m in movimientos)
    
    if total_cantidad > 0:
        return round(total_valor / total_cantidad, 4)
    return 0.0