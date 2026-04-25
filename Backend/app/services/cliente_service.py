from sqlalchemy.orm import Session
from app.models.clientes import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate
from app.core.context import get_company_context
from fastapi import HTTPException, status

async def crear_cliente(db: Session, obj_in: ClienteCreate):
    empresa_id = get_company_context()
    if not empresa_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Contexto de empresa no encontrado"
        )
    
    # Inyectamos el empresa_id del contexto
    db_obj = Cliente(
        **obj_in.model_dump(),
        empresa_id=empresa_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def obtener_clientes(db: Session, skip: int = 0, limit: int = 100):
    empresa_id = get_company_context()
    return db.query(Cliente).filter(
        Cliente.empresa_id == empresa_id,
        Cliente.estado == True
    ).offset(skip).limit(limit).all()

async def obtener_cliente_por_id(db: Session, cliente_id: int):
    empresa_id = get_company_context()
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.empresa_id == empresa_id
    ).first()
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado en esta empresa")
    return cliente

async def actualizar_cliente(db: Session, cliente_id: int, obj_in: ClienteUpdate):
    db_obj = await obtener_cliente_por_id(db, cliente_id)
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_cliente_logico(db: Session, cliente_id: int):
    # Se alinea el nombre con la llamada del router
    cliente = await obtener_cliente_por_id(db, cliente_id)
    
    cliente.estado = False
    db.commit()
    db.refresh(cliente)
    return cliente