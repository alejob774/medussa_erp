from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Rol
from pydantic import BaseModel
from typing import List

router = APIRouter()

# Esquema rápido para el POST
class RolCreate(BaseModel):
    nombre: str
    descripcion: str
    empresa_id: str
    permisos: List[str]

@router.post("/", status_code=201)
def crear_rol(rol_in: RolCreate, db: Session = Depends(get_db)):
    # Verificamos si ya existe el rol en esa empresa (HU-000: Segregación)
    existe = db.query(Rol).filter(
        Rol.nombre == rol_in.nombre, 
        Rol.empresa_id == rol_in.empresa_id
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="El rol ya existe en esta empresa")
    
    nuevo_rol = Rol(
        nombre=rol_in.nombre,
        descripcion=rol_in.descripcion,
        empresa_id=rol_in.empresa_id,
        permisos=rol_in.permisos
    )
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)
    return nuevo_rol

@router.get("/")
def listar_roles(empresa_id: str, db: Session = Depends(get_db)):
    # HU-000: Siempre filtrar por empresa_id
    return db.query(Rol).filter(Rol.empresa_id == empresa_id).all()