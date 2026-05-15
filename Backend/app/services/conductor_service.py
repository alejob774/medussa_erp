from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.conductores import Conductor
from app.models.logistica import Ruta
from app.schemas.conductor import ConductorCreate, ConductorUpdate


async def obtener_conductores(db: Session, empresa_id: str, skip: int = 0, limit: int = 100):
    return db.query(Conductor).filter(
        Conductor.empresa_id == empresa_id,
        Conductor.estado == True
    ).offset(skip).limit(limit).all()


async def obtener_conductor_por_id(db: Session, id: int, empresa_id: str):
    conductor = db.query(Conductor).filter(
        Conductor.id == id,
        Conductor.empresa_id == empresa_id
    ).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return conductor


async def crear_conductor(db: Session, obj_in: ConductorCreate, empresa_id: str):
    if db.query(Conductor).filter(
        Conductor.id_con == obj_in.id_con,
        Conductor.empresa_id == empresa_id
    ).first():
        raise HTTPException(status_code=400, detail="ID de conductor ya existe en esta empresa")

    rutas = db.query(Ruta).filter(
        Ruta.id.in_(obj_in.id_rutas),
        Ruta.empresa_id == empresa_id
    ).all()
    if len(rutas) != len(obj_in.id_rutas):
        raise HTTPException(status_code=404, detail="Una o mas rutas no encontradas")

    nuevo_conductor = Conductor(
        id_con=obj_in.id_con,
        nombre_con=obj_in.nombre_con,
        empresa_id=empresa_id,
        estado=obj_in.estado,
        rutas=rutas
    )
    db.add(nuevo_conductor)
    db.commit()
    db.refresh(nuevo_conductor)
    return nuevo_conductor


async def actualizar_conductor(db: Session, id: int, obj_in: ConductorUpdate, empresa_id: str):
    conductor = await obtener_conductor_por_id(db, id, empresa_id)
    update_data = obj_in.model_dump(exclude_unset=True)

    if "id_rutas" in update_data:
        id_rutas = update_data.pop("id_rutas") or []
        rutas = db.query(Ruta).filter(
            Ruta.id.in_(id_rutas),
            Ruta.empresa_id == empresa_id
        ).all()
        if len(rutas) != len(id_rutas):
            raise HTTPException(status_code=404, detail="Una o mas rutas no encontradas")
        conductor.rutas = rutas

    for field, value in update_data.items():
        setattr(conductor, field, value)

    db.commit()
    db.refresh(conductor)
    return conductor


async def eliminar_conductor_logico(db: Session, id: int, empresa_id: str):
    conductor = await obtener_conductor_por_id(db, id, empresa_id)
    conductor.estado = False
    db.commit()
    db.refresh(conductor)
    return conductor
