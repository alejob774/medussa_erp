from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.seguridad import Rol, UsuarioEmpresaRol
from app.schemas.seguridad import RolBase, RolResponse, AsignacionBase, AsignacionResponse
from app.utils.auditoria import registrar_log
from typing import List, Optional, Any  # Agrega 'List' aquí

router = APIRouter()

# --- GESTIÓN DE ROLES ---

@router.post("/roles/", response_model=RolResponse)
async def crear_rol(rol_in: RolBase, request: Request, db: Session = Depends(get_db)):
    nuevo_rol = Rol(**rol_in.model_dump())
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)
    
    await registrar_log(db, request, user_id=0, user_name="SISTEMA", 
                        empresa_id=rol_in.empresa_id, modulo="SEGURIDAD", 
                        accion="CREATE_ROLE", despues=rol_in.model_dump())
    return nuevo_rol

@router.get("/roles/empresa/{empresa_id}", response_model=List[RolResponse])
def obtener_roles_empresa(empresa_id: str, db: Session = Depends(get_db)):
    return db.query(Rol).filter(Rol.empresa_id == empresa_id).all()

# --- GESTIÓN DE PERFILES (ASIGNACIÓN USUARIO-EMPRESA) ---

@router.post("/usuarios/asignar-perfil/", response_model=AsignacionResponse)
async def asignar_perfil(asig_in: AsignacionBase, request: Request, db: Session = Depends(get_db)):
    # Evitar duplicados
    existe = db.query(UsuarioEmpresaRol).filter(
        UsuarioEmpresaRol.usuario_id == asig_in.usuario_id,
        UsuarioEmpresaRol.empresa_id == asig_in.empresa_id
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="El usuario ya tiene un perfil en esta empresa")

    nueva_asig = UsuarioEmpresaRol(**asig_in.model_dump())
    db.add(nueva_asig)
    db.commit()
    db.refresh(nueva_asig)
    
    return nueva_asig

@router.get("/usuarios/mis-perfiles/{usuario_id}")
def obtener_perfiles_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Este es el endpoint 'espejo': retorna las empresas y roles del usuario"""
    perfiles = db.query(UsuarioEmpresaRol).filter(UsuarioEmpresaRol.usuario_id == usuario_id).all()
    return perfiles