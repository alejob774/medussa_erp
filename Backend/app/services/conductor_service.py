from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.conductores import Conductor, Ruta
from app.schemas.conductor import ConductorCreate, ConductorUpdate

async def crear_conductor(db: Session, obj_in: ConductorCreate):
    # Validar ID único [cite: 234]
    if db.query(Conductor).filter(Conductor.id_con == obj_in.id_con).first():
        raise HTTPException(status_code=400, detail="ID de conductor ya existe")
    
    # Validar existencia de rutas [cite: 235]
    rutas = db.query(Ruta).filter(Ruta.id.in_(obj_in.id_rutas)).all()
    if len(rutas) != len(obj_in.id_rutas):
        raise HTTPException(status_code=404, detail="Una o más rutas no encontradas")

    nuevo_conductor = Conductor(
        id_con=obj_in.id_con,
        nombre_con=obj_in.nombre_con,
        estado=obj_in.estado,
        rutas=rutas
    )
    db.add(nuevo_conductor)
    db.commit()
    db.refresh(nuevo_conductor)
    return nuevo_conductor

async def actualizar_conductor(db: Session, id: int, obj_in: ConductorUpdate):
    conductor = db.query(Conductor).filter(Conductor.id == id).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    
    update_data = obj_in.dict(exclude_unset=True)
    
    if "id_rutas" in update_data:
        rutas = db.query(Ruta).filter(Ruta.id.in_(obj_in.id_rutas)).all()
        conductor.rutas = rutas # Sincronización automática [cite: 255]
        del update_data["id_rutas"]

    for field, value in update_data.items():
        setattr(conductor, field, value)
    
    db.commit()
    db.refresh(conductor)
    return conductor