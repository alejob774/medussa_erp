from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.configuracion import Configuracion as Empresa
from app.models.seguridad import Perfil, Rol  # Asegurando que Rol venga de seguridad
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.schemas.auth import UserMeResponse
from app.core.security import create_access_token, verify_password
from app.api.deps import get_current_user  # Esta dependencia ya valida el Token Bearer
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint de inicio de sesión que genera el Access Token (JWT).
    """
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Auditoría del login exitoso
    await registrar_log(db, request, user_id=usuario.id, user_name=usuario.username, 
                        modulo="AUTH", accion="LOGIN_SUCCESS")

    access_token = create_access_token(data={"sub": usuario.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/authorize")
async def authorize(current_user: Usuario = Depends(get_current_user)):
    """
    HU-011/014: Verifica si el token actual es válido.
    No requiere username/password porque 'get_current_user' extrae y valida 
    el Bearer Token del header de la petición.
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
    Retorna la información del usuario autenticado y sus membresías en empresas,
    incluyendo roles y permisos (HU-013 y HU-014).
    """
    # Consulta optimizada para traer perfiles y roles por empresa
    resultados = db.query(
        UsuarioEmpresaConfig, 
        Empresa.nombre_empresa.label("nombre_empresa"),
        Rol.nombre.label("nombre_rol"),
        Perfil.nombre.label("nombre_perfil"),
        Perfil.permisos.label("permisos_efectivos")
    ).join(Empresa, UsuarioEmpresaConfig.empresa_id == Empresa.empresa_id)\
     .join(Rol, UsuarioEmpresaConfig.rol_id == Rol.id)\
     .join(Perfil, UsuarioEmpresaConfig.perfil_id == Perfil.id)\
     .filter(UsuarioEmpresaConfig.usuario_id == current_user.id).all()

    membresias = [{
        "empresa_id": r.UsuarioEmpresaConfig.empresa_id,
        "nombre_empresa": r.nombre_empresa,
        "rol": r.nombre_rol,
        "perfil": r.nombre_perfil,
        "permisos": r.permisos_efectivos
    } for r in resultados]

    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "username": current_user.username,
        "email": current_user.email,
        "empresas": membresias
    }