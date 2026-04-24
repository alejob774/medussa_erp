from sqlalchemy.orm import Session
from app.models.vendedores import Vendedor
from app.models.clientes import Cliente
from app.schemas.vendedor import VendedorCreate, VendedorUpdate
from fastapi import HTTPException

async def obtener_vendedor_por_id(db: Session, id: int):
    vendedor = db.query(Vendedor).filter(Vendedor.id == id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return vendedor

async def actualizar_vendedor(db: Session, id: int, obj_in: VendedorUpdate):
    vendedor = await obtener_vendedor_por_id(db, id)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    
    # Manejo especial para la relación de clientes
    if "id_clientes" in update_data:
        id_clientes = update_data.pop("id_clientes")
        clientes = db.query(Cliente).filter(Cliente.id.in_(id_clientes)).all()
        if len(clientes) != len(id_clientes):
            raise HTTPException(status_code=400, detail="Uno o más IDs de clientes no son válidos")
        vendedor.clientes = clientes

    # Actualización de campos directos
    for field, value in update_data.items():
        setattr(vendedor, field, value)
    
    db.commit()
    db.refresh(vendedor)
    return vendedor
async def eliminar_vendedor(db: Session, id: int):
    # Soft Delete: Cambio de estado lógico
    vendedor = db.query(Vendedor).filter(Vendedor.id == id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    
    vendedor.estado = False
    db.commit()
    db.refresh(vendedor)
    return vendedor