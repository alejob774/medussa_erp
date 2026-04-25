from sqlalchemy.orm import Session
from app.models.vendedores import Vendedor
from app.models.clientes import Cliente
from app.schemas.vendedor import VendedorCreate, VendedorUpdate
from app.core.context import get_company_context
from fastapi import HTTPException, status

async def obtener_vendedores(db: Session, skip: int = 0, limit: int = 100):
    empresa_id = get_company_context()
    return db.query(Vendedor).filter(
        Vendedor.empresa_id == empresa_id,
        Vendedor.estado == True
    ).offset(skip).limit(limit).all()

async def obtener_vendedor_por_id(db: Session, id: int):
    empresa_id = get_company_context()
    vendedor = db.query(Vendedor).filter(
        Vendedor.id == id,
        Vendedor.empresa_id == empresa_id
    ).first()
    
    if not vendedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Vendedor con ID {id} no encontrado"
        )
    return vendedor

async def crear_vendedor(db: Session, obj_in: VendedorCreate):
    empresa_id = get_company_context()
    if not empresa_id:
        raise HTTPException(status_code=422, detail="Contexto de empresa faltante")

    data = obj_in.model_dump(exclude={"id_clientes"})
    db_obj = Vendedor(**data, empresa_id=empresa_id)
    
    # Manejo de relación con clientes si existen IDs
    if obj_in.id_clientes:
        clientes = db.query(Cliente).filter(Cliente.id.in_(obj_in.id_clientes)).all()
        db_obj.clientes = clientes

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def actualizar_vendedor(db: Session, id: int, obj_in: VendedorUpdate):
    vendedor = await obtener_vendedor_por_id(db, id)
    update_data = obj_in.model_dump(exclude_unset=True)
    
    if "id_clientes" in update_data:
        id_clientes = update_data.pop("id_clientes")
        clientes = db.query(Cliente).filter(Cliente.id.in_(id_clientes)).all()
        vendedor.clientes = clientes

    for field, value in update_data.items():
        setattr(vendedor, field, value)
    
    db.commit()
    db.refresh(vendedor)
    return vendedor

async def eliminar_vendedor_logico(db: Session, id: int):
    vendedor = await obtener_vendedor_por_id(db, id)
    vendedor.estado = False
    db.commit()
    return vendedor