from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.logistica import Ruta
from app.schemas.logistica import RutaCreate, RutaUpdate

async def obtener_rutas(db: Session, empresa_id: str, skip: int = 0, limit: int = 100):
    query = db.query(Ruta).filter(
        Ruta.empresa_id == empresa_id, 
        Ruta.estado == True
    )
    total = query.count()
    data = query.offset(skip).limit(limit).all()
    return total, data

async def obtener_ruta_por_id(db: Session, id: int, empresa_id: str):
    ruta = db.query(Ruta).filter(Ruta.id == id, Ruta.empresa_id == empresa_id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return ruta

async def crear_ruta(db: Session, obj_in: RutaCreate, empresa_id: str):
    if db.query(Ruta).filter(Ruta.id_rut == obj_in.id_rut, Ruta.empresa_id == empresa_id).first():
        raise HTTPException(status_code=400, detail="ID de ruta ya existe en esta empresa")
    
    db_obj = Ruta(**obj_in.model_dump(), empresa_id=empresa_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def actualizar_ruta(db: Session, id: int, obj_in: RutaUpdate, empresa_id: str):
    db_obj = await obtener_ruta_por_id(db, id, empresa_id)
    for key, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, key, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj

async def eliminar_ruta(db: Session, id: int, empresa_id: str):
    db_obj = await obtener_ruta_por_id(db, id, empresa_id)
    db_obj.estado = False # Soft Delete
    db.commit()
    return db_obj