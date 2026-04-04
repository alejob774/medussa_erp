from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.seguridad import Rol, UsuarioEmpresaRol, Perfil # Actualizar import
from app.schemas.seguridad import (
    RolCreate, RolUpdate, RolResponse, 
    PerfilCreate, PerfilUpdate, PerfilResponse # Agregar estos
)
from app.utils.auditoria import registrar_log
from typing import List

router = APIRouter()

# CREATE: Crear un rol único por empresa
@router.post("/roles/", response_model=RolResponse)
async def crear_rol(rol_in: RolCreate, request: Request, db: Session = Depends(get_db)):
    # Escenario 1: Validar nombre único en la empresa
    existe = db.query(Rol).filter(
        Rol.nombre == rol_in.nombre, 
        Rol.empresa_id == rol_in.empresa_id
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="El nombre del rol ya existe en esta empresa")

    nuevo_rol = Rol(**rol_in.model_dump())
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)
    
    await registrar_log(db, request, user_id=0, user_name="SISTEMA", 
                        empresa_id=rol_in.empresa_id, modulo="SEGURIDAD", 
                        accion="CREATE_ROLE", despues=rol_in.model_dump())
    return nuevo_rol

# READ: Consultar roles de la empresa activa
@router.get("/roles/empresa/{empresa_id}", response_model=List[RolResponse])
def obtener_roles_empresa(empresa_id: str, db: Session = Depends(get_db)):
    return db.query(Rol).filter(Rol.empresa_id == empresa_id).all()

# UPDATE: Editar un rol
@router.put("/roles/{rol_id}", response_model=RolResponse)
async def editar_rol(rol_id: int, rol_edit: RolUpdate, request: Request, db: Session = Depends(get_db)):
    db_rol = db.query(Rol).filter(Rol.id == rol_id).first()
    if not db_rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    # Si intenta desactivar, validar que no tenga usuarios activos
    if rol_edit.estado == "inactivo":
        usuarios_vinculados = db.query(UsuarioEmpresaRol).filter(
            UsuarioEmpresaRol.rol_id == rol_id,
            UsuarioEmpresaRol.estado == "activo"
        ).first()
        if usuarios_vinculados:
            raise HTTPException(status_code=400, detail="No se puede desactivar un rol asignado a usuarios activos")

    # Aplicar cambios
    for key, value in rol_edit.model_dump(exclude_unset=True).items():
        setattr(db_rol, key, value)
    
    db.commit()
    db.refresh(db_rol)
    return db_rol

# DELETE: Desactivar un rol (Criterio Escenario 3)
@router.delete("/roles/{rol_id}")
async def desactivar_rol(rol_id: int, db: Session = Depends(get_db)):
    db_rol = db.query(Rol).filter(Rol.id == rol_id).first()
    if not db_rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    # Validar usuarios antes de "borrar" (desactivar)
    usuarios_vinculados = db.query(UsuarioEmpresaRol).filter(
        UsuarioEmpresaRol.rol_id == rol_id,
        UsuarioEmpresaRol.estado == "activo"
    ).first()
    
    if usuarios_vinculados:
        raise HTTPException(status_code=400, detail="No se puede desactivar un rol asignado a usuarios activos")
    
    db_rol.estado = "inactivo"
    db.commit()
    return {"message": "Rol desactivado correctamente (trazabilidad mantenida)"}
    
@router.post("/empresas/{empresa_id}/perfiles", response_model=PerfilResponse)
async def crear_perfil(empresa_id: str, perfil_in: PerfilCreate, request: Request, db: Session = Depends(get_db)):
    # Validar nombre único por empresa [cite: 74, 83]
    existe = db.query(Perfil).filter(
        Perfil.nombre == perfil_in.nombre,
        Perfil.empresa_id == empresa_id
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="El nombre del perfil ya existe en esta empresa")

    nuevo_perfil = Perfil(**perfil_in.model_dump())
    db.add(nuevo_perfil)
    db.commit()
    db.refresh(nuevo_perfil)
    
    await registrar_log(db, request, modulo="SEGURIDAD", accion="CREATE_PROFILE", empresa_id=empresa_id)
    return nuevo_perfil

@router.get("/empresas/{empresa_id}/perfiles", response_model=List[PerfilResponse])
def obtener_perfiles_empresa(empresa_id: str, db: Session = Depends(get_db)):
    # Consulta filtrada por empresa activa [cite: 81]
    return db.query(Perfil).filter(Perfil.empresa_id == empresa_id).all()

@router.put("/empresas/{empresa_id}/perfiles/{perfil_id}", response_model=PerfilResponse)
async def actualizar_perfil(empresa_id: str, perfil_id: int, perfil_edit: PerfilUpdate, db: Session = Depends(get_db)):
    db_perfil = db.query(Perfil).filter(Perfil.id == perfil_id, Perfil.empresa_id == empresa_id).first()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    for key, value in perfil_edit.model_dump(exclude_unset=True).items():
        setattr(db_perfil, key, value)
    
    db.commit()
    db.refresh(db_perfil)
    return db_perfil

@router.delete("/empresas/{empresa_id}/perfiles/{perfil_id}")
async def desactivar_perfil(empresa_id: str, perfil_id: int, db: Session = Depends(get_db)):
    # Escenario 3: No eliminar, solo desactivar [cite: 79]
    db_perfil = db.query(Perfil).filter(Perfil.id == perfil_id, Perfil.empresa_id == empresa_id).first()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    db_perfil.estado = False
    db.commit()
    return {"message": "Perfil desactivado correctamente"}