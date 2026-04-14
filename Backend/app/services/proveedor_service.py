from sqlalchemy.orm import Session
from app.models.compras import Proveedor
from app.schemas.proveedor import ProveedorCreate, ProveedorUpdate

def get_proveedores(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Proveedor).filter(Proveedor.estado == True).offset(skip).limit(limit).all()

def get_proveedor_by_nit(db: Session, nit: str):
    return db.query(Proveedor).filter(Proveedor.nit == nit).first()

def get_proveedor(db: Session, proveedor_id: int):
    return db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()

def create_proveedor(db: Session, proveedor: ProveedorCreate):
    db_proveedor = Proveedor(**proveedor.model_dump())
    db.add(db_proveedor)
    db.commit()
    db.refresh(db_proveedor)
    return db_proveedor

def update_proveedor(db: Session, proveedor_id: int, proveedor_data: ProveedorUpdate):
    db_proveedor = get_proveedor(db, proveedor_id)
    if db_proveedor:
        for key, value in proveedor_data.model_dump(exclude_unset=True).items():
            setattr(db_proveedor, key, value)
        db.commit()
        db.refresh(db_proveedor)
    return db_proveedor