from sqlalchemy.orm import Session
from app.models.proveedores import Proveedor
from app.schemas.proveedor import ProveedorCreate, ProveedorUpdate

def get_proveedores(db: Session, empresa_id: str, skip: int = 0, limit: int = 100):
    return db.query(Proveedor).filter(
        Proveedor.empresa_id == empresa_id,
        Proveedor.estado == "Activo"
    ).offset(skip).limit(limit).all()

def get_proveedor_by_nit(db: Session, nit: str, empresa_id: str):
    return db.query(Proveedor).filter(
        Proveedor.nit == nit,
        Proveedor.empresa_id == empresa_id
    ).first()

def get_proveedor(db: Session, proveedor_id: int, empresa_id: str):
    return db.query(Proveedor).filter(
        Proveedor.id == proveedor_id,
        Proveedor.empresa_id == empresa_id
    ).first()

def create_proveedor(db: Session, proveedor: ProveedorCreate, empresa_id: str):
    db_proveedor = Proveedor(**proveedor.model_dump(), empresa_id=empresa_id)
    db.add(db_proveedor)
    db.commit()
    db.refresh(db_proveedor)
    return db_proveedor

def update_proveedor(db: Session, proveedor_id: int, proveedor_data: ProveedorUpdate, empresa_id: str):
    db_proveedor = get_proveedor(db, proveedor_id, empresa_id)
    if db_proveedor:
        for key, value in proveedor_data.model_dump(exclude_unset=True).items():
            setattr(db_proveedor, key, value)
        db.commit()
        db.refresh(db_proveedor)
    return db_proveedor
