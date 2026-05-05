# app/api/v1/auth.py (Versión Corregida)
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.configuracion import Configuracion as Empresa
from app.schemas.auth import UserMeResponse
from app.core.context import get_company_context  # Importación necesaria

router = APIRouter()

@router.post("/login")
async def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    config_inicial = db.query(UsuarioEmpresaConfig).filter(UsuarioEmpresaConfig.usuario_id == usuario.id).first()
    token_data = {"sub": usuario.username}
    if config_inicial:
        token_data.update({
            "empresa_id": config_inicial.empresa_id,
            "rol_id": config_inicial.rol_id
        })

    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserMeResponse)
async def get_me(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(get_current_user)
):
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
    
    lista_membresias = []
    for r in resultados:
        lista_membresias.append({
            "empresa_id": r.UsuarioEmpresaRol.empresa_id,
            "nombre_empresa": r.nombre_empresa,
            "rol": r.nombre_rol,
            "perfil": r.nombre_perfil or "N/A",
            "permisos": r.permisos_efectivos
        })

    active_id = get_company_context()
    if not active_id and lista_membresias:
        active_id = lista_membresias[0]["empresa_id"]

    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "apellido": current_user.apellido,
        "username": current_user.username,
        "email": current_user.email,
        "active_company_id": active_id,
        "empresas": lista_membresias
    }

@router.post("/logout")
async def logout():
    # Simplificado para evitar dependencia de registrar_log si no está listo
    return {"success": True, "detail": "Sesión cerrada correctamente"}