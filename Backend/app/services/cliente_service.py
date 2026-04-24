from sqlalchemy.orm import Session
from app.models.clientes import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from fastapi import HTTPException

async def obtener_cliente_por_id(db: Session, cliente_id: int):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

async def actualizar_cliente(db: Session, cliente_id: int, obj_in: ClienteUpdate):
    db_obj = await obtener_cliente_por_id(db, cliente_id)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_cliente(db: Session, cliente_id: int):
    # Soft Delete: Cambio de estado lógico
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente.estado = False
    db.commit()
    db.refresh(cliente)
    return cliente