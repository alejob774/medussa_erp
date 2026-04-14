from sqlalchemy.orm import Session
from app.models.equipos import Equipo
from app.schemas.equipos import EquipoCreate, EquipoUpdate

def get_equipos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Equipo).filter(Equipo.estado == True).offset(skip).limit(limit).all()

def get_equipo_by_id_maq(db: Session, id_maq: str):
    return db.query(Equipo).filter(Equipo.id_maq == id_maq).first()

def create_equipo(db: Session, equipo: EquipoCreate):
    db_equipo = Equipo(**equipo.model_dump())
    db.add(db_equipo)
    db.commit()
    db.refresh(db_equipo)
    return db_equipo

def update_equipo(db: Session, equipo_id: int, equipo_data: EquipoUpdate):
    db_equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if db_equipo:
        for key, value in equipo_data.model_dump(exclude_unset=True).items():
            setattr(db_equipo, key, value)
        db.commit()
        db.refresh(db_equipo)
    return db_equipo