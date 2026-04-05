from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from app.db.session import get_db
from app.models.configuracion import Configuracion as Empresa
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.usuarios import Usuario
from app.schemas.auth import UserMeResponse
from app.core.security import create_access_token, verify_password
from app.api.deps import get_current_user
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/login")
async def login(
    request: Request, 
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Genera el Access Token (JWT). 
    Permite el ingreso tanto con 'email' como con 'username'.
    """
    # Buscamos al usuario por email o por username
    usuario = db.query(Usuario).filter(
        or_(
            Usuario.email == form_data.username,
            Usuario.username == form_data.username
        )
    ).first()
    
    # Verificación de existencia y de password_hash (columna oficial)
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        # Auditoría de intento fallido
        await registrar_log(db, request, user_id=None, user_name=form_data.username, 
                            modulo="AUTH", accion="LOGIN_FAILED")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Credenciales incorrectas"
        )

    if not usuario.estado:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Usuario inactivo. Contacte al administrador."
        )

    # Auditoría del login exitoso
    await registrar_log(db, request, user_id=usuario.id, user_name=usuario.username, 
                        modulo="AUTH", accion="LOGIN_SUCCESS")

    # El "sub" del JWT suele ser el username para identificar al sujeto
    access_token = create_access_token(data={"sub": usuario.username})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/authorize")
async def authorize(current_user: Usuario = Depends(get_current_user)):
    """
    HU-011/014: Verifica si el token actual es válido.
    """
    return {
        "status": "success",
        "message": "Token válido",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        }
    }

@router.get("/me", response_model=UserMeResponse)
async def get_me(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna la información del usuario y sus membresías (Empresa + Rol + Perfil).
    """
    # Consulta uniendo la tabla de relación con Empresa, Rol y Perfil
    resultados = db.query(
        UsuarioEmpresaRol, 
        Empresa.nombre_empresa,
        Rol.nombre.label("nombre_rol"),
        Perfil.nombre.label("nombre_perfil"),
        Perfil.permisos.label("permisos_efectivos")
    ).join(Empresa, UsuarioEmpresaRol.empresa_id == Empresa.empresa_id)\
     .join(Rol, UsuarioEmpresaRol.rol_id == Rol.id)\
     .outerjoin(Perfil, UsuarioEmpresaRol.perfil_id == Perfil.id)\
     .filter(UsuarioEmpresaRol.usuario_id == current_user.id).all()

    membresias = []
    for r in resultados:
        membresias.append({
            "empresa_id": r.UsuarioEmpresaRol.empresa_id,
            "nombre_empresa": r.nombre_empresa,
            "rol": r.nombre_rol,
            "perfil": r.nombre_perfil or "Sin Perfil",
            "permisos": r.permisos_efectivos or {}
        })

    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "apellido": current_user.apellido,
        "username": current_user.username,
        "email": current_user.email,
        "cargo": current_user.cargo,
        "empresas": membresias
    }