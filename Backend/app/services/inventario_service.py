from sqlalchemy.orm import Session
from app.models.inventario import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate
from app.core.context import get_company_context
from fastapi import HTTPException, status

async def crear_producto(db: Session, obj_in: ProductoCreate):
    empresa_id = get_company_context()
    
    if not empresa_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Contexto de empresa no encontrado. Verifique el header X-Company-ID."
        )

    # Inyección forzada de empresa_id del contexto
    data = obj_in.model_dump()
    data["empresa_id"] = empresa_id

    db_obj = Producto(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def obtener_productos_contextual(db: Session, skip: int = 0, limit: int = 100):
    empresa_id = get_company_context()
    return db.query(Producto).filter(Producto.empresa_id == empresa_id).offset(skip).limit(limit).all()

async def obtener_producto_por_id(db: Session, producto_id: int):
    empresa_id = get_company_context()
    return db.query(Producto).filter(
        Producto.id == producto_id, 
        Producto.empresa_id == empresa_id
    ).first()

async def actualizar_producto(db: Session, producto_id: int, obj_in: ProductoUpdate):
    db_obj = await obtener_producto_por_id(db, producto_id)
    if not db_obj: return None
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_producto(db: Session, producto_id: int):
    # Soft Delete: Cambiar estado a Inactivo en lugar de borrar
    empresa_id = get_company_context()
    db_obj = db.query(Producto).filter(
        Producto.id == producto_id, 
        Producto.empresa_id == empresa_id
    ).first()
    
    if db_obj:
        db_obj.producto_status = "Inactivo"
        db.commit()
        db.refresh(db_obj)
    return db_obj