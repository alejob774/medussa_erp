from sqlalchemy.orm import Session
from app.models.vendedores import Vendedor
from app.models.clientes import Cliente
from app.schemas.vendedor import VendedorCreate, VendedorUpdate
from fastapi import HTTPException

async def crear_vendedor(db: Session, obj_in: VendedorCreate):
    # 1. Validar ID único [cite: 219]
    if db.query(Vendedor).filter(Vendedor.id_ven == obj_in.id_ven).first():
        raise HTTPException(status_code=400, detail="El ID del vendedor ya existe")
    
    # 2. Validar existencia de clientes [cite: 220]
    clientes = db.query(Cliente).filter(Cliente.id.in_(obj_in.id_clientes)).all()
    if len(clientes) != len(obj_in.id_clientes):
        raise HTTPException(status_code=404, detail="Uno o más clientes no encontrados")

    nuevo_vendedor = Vendedor(id_ven=obj_in.id_ven, nombre_ven=obj_in.nombre_ven)
    nuevo_vendedor.clientes = clientes
    
    db.add(nuevo_vendedor)
    db.commit()
    db.refresh(nuevo_vendedor)
    return nuevo_vendedor

async def obtener_vendedores(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Vendedor).filter(Vendedor.estado == True).offset(skip).limit(limit).all()

async def actualizar_vendedor(db: Session, id: int, obj_in: VendedorUpdate):
    vendedor = db.query(Vendedor).filter(Vendedor.id == id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    
    # Sincronizar clientes si vienen en el payload [cite: 240]
    if "id_clientes" in update_data:
        clientes = db.query(Cliente).filter(Cliente.id.in_(update_data["id_clientes"])).all()
        vendedor.clientes = clientes
        del update_data["id_clientes"]

    for field in update_data:
        setattr(vendedor, field, update_data[field])
    
    db.commit()
    db.refresh(vendedor)
    return vendedor
    
async def obtener_vendedor_por_id(db: Session, id: int):
    vendedor = db.query(Vendedor).filter(Vendedor.id == id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return vendedor

async def eliminar_vendedor_logico(db: Session, id: int):
    vendedor = await obtener_vendedor_por_id(db, id)
    
    # Validación de dependencias (HU-006-BE-04) [cite: 247]
    # Aquí se podrían sumar validaciones de ventas activas en el futuro
    
    vendedor.estado = False # Soft delete [cite: 266]
    db.commit()
    return vendedor