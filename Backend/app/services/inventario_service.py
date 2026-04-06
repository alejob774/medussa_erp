from sqlalchemy.orm import Session
from app.models.inventario import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate
from fastapi import HTTPException

async def crear_producto(db: Session, obj_in: ProductoCreate):
    # Validar SKU único por empresa [cite: 45, 77]
    check_sku = db.query(Producto).filter(
        Producto.producto_sku == obj_in.producto_sku,
        Producto.empresa_id == obj_in.empresa_id
    ).first()
    if check_sku:
        raise HTTPException(status_code=400, detail="El SKU ya existe para esta empresa")
    
    db_obj = Producto(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_producto(db: Session, producto_id: int):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Simulación de validación de movimientos (HU-BE-016C) [cite: 78]
    tiene_movimientos = False # Aquí iría un count de tablas de inventario
    if tiene_movimientos:
        producto.producto_status = "Inactivo" [cite: 29, 47]
        db.commit()
        return {"message": "Producto inactivado por tener movimientos previos"}
    
    db.delete(producto)
    db.commit()
    return {"message": "Producto eliminado exitosamente"}