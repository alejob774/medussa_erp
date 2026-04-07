from sqlalchemy.orm import Session
from app.models.clientes import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from fastapi import HTTPException

async def crear_cliente(db: Session, obj_in: ClienteCreate):
    # Validar si el ID_CLI ya existe
    db_obj = db.query(Cliente).filter(Cliente.id_cli == obj_in.id_cli).first()
    if db_obj:
        raise HTTPException(status_code=400, detail="El ID del cliente ya existe")
    
    nuevo_cliente = Cliente(**obj_in.model_dump())
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente

async def obtener_clientes(db: Session, skip: int = 0, limit: int = 100):
    # Solo traemos los que tengan estado True (Eliminación lógica)
    return db.query(Cliente).filter(Cliente.estado == True).offset(skip).limit(limit).all()

async def obtener_cliente_por_id(db: Session, cliente_id: int):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

async def actualizar_cliente(db: Session, cliente_id: int, obj_in: ClienteUpdate):
    db_obj = await obtener_cliente_por_id(db, cliente_id)
    
    # Extraemos solo los datos que el usuario envió (PATCH)
    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_cliente_logico(db: Session, cliente_id: int):
    db_obj = await obtener_cliente_por_id(db, cliente_id)
    db_obj.estado = False  # Soft delete según HU-005
    db.commit()
    db.refresh(db_obj)
    return db_obj