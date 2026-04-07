from sqlalchemy.orm import Session
from app.models.inventario import Producto
from app.schemas.producto import ProductoCreate, ProductoUpdate

async def crear_producto(db: Session, obj_in: ProductoCreate):
    db_obj = Producto(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ESTA ES LA FUNCIÓN QUE FALTABA O TENÍA OTRO NOMBRE
async def obtener_productos(db: Session, empresa_id: str, skip: int = 0, limit: int = 100):
    return db.query(Producto).filter(
        Producto.empresa_id == empresa_id
    ).offset(skip).limit(limit).all()

async def obtener_producto_por_id(db: Session, producto_id: int):
    return db.query(Producto).filter(Producto.id == producto_id).first()

async def actualizar_producto(db: Session, producto_id: int, obj_in: ProductoUpdate):
    db_obj = db.query(Producto).filter(Producto.id == producto_id).first()
    if not db_obj:
        return None
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_producto(db: Session, producto_id: int):
    db_obj = db.query(Producto).filter(Producto.id == producto_id).first()
    if db_obj:
        db_obj.producto_status = "Inactivo"
        db.commit()
        db.refresh(db_obj)
    return db_obj