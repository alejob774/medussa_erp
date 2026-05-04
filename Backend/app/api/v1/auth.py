# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Importaciones de configuración y seguridad
from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user

# Importaciones de modelos
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.configuracion import Configuracion as Empresa

# Importaciones de esquemas
from app.schemas.auth import UserMeResponse

router = APIRouter()

@router.post("/login")
async def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Búsqueda estricta por username según requerimiento
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Obtener la empresa por defecto (la primera asignada) para el token inicial
    config_inicial = db.query(UsuarioEmpresaConfig).filter(UsuarioEmpresaConfig.usuario_id == usuario.id).first()
    
    token_data = {"sub": usuario.username}
    if config_inicial:
        token_data.update({
            "empresa_id": config_inicial.empresa_id,
            "rol_id": config_inicial.rol_id
        })

    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout():
    # El JWT es stateless, el logout se confirma para que el front limpie el estado
    return {"success": True, "detail": "Sesión cerrada correctamente"}

@router.get("/me")
async def get_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    # Consulta de membresías y detección de empresa activa
    resultados = db.query(
        UsuarioEmpresaConfig, 
        Empresa.nombre_empresa, 
        Rol.nombre.label("rol_nombre")
    ).join(Empresa, UsuarioEmpresaConfig.empresa_id == Empresa.empresa_id)\
     .join(Rol, UsuarioEmpresaConfig.rol_id == Rol.id)\
     .filter(UsuarioEmpresaConfig.usuario_id == current_user.id).all()

    membresias = [{
        "empresa_id": r.UsuarioEmpresaConfig.empresa_id,
        "nombre_empresa": r.nombre_empresa,
        "rol": r.rol_nombre
    } for r in resultados]

    return {
        "id": current_user.id,
        "username": current_user.username,
        "active_company_id": membresias[0]["empresa_id"] if membresias else None,
        "empresas": membresias
    }