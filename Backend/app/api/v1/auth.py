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
from typing import Any

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

def _aplanar_permisos(permisos_raw: Any) -> set:
    """Extrae y aplana permisos soportando listas y diccionarios {permiso: true}."""
    if not permisos_raw:
        return set()
    if isinstance(permisos_raw, list):
        return set(permisos_raw)
    if isinstance(permisos_raw, dict):
        return {k for k, v in permisos_raw.items() if v}
    return set()

@router.get("/me", response_model=UserMeResponse)
async def get_me(
    request: Request, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    resultados = db.query(
        UsuarioEmpresaRol, 
        Empresa.nombre_empresa, 
        Rol.nombre.label("nombre_rol"),
        Rol.permisos.label("rol_permisos"),
        Perfil.nombre.label("nombre_perfil"), 
        Perfil.permisos.label("perfil_permisos")
    ).join(Empresa, UsuarioEmpresaRol.empresa_id == Empresa.empresa_id)\
    .join(Rol, UsuarioEmpresaRol.rol_id == Rol.id)\
    .outerjoin(Perfil, UsuarioEmpresaRol.perfil_id == Perfil.id)\
    .filter(
        UsuarioEmpresaRol.usuario_id == current_user.id,
        UsuarioEmpresaRol.estado == "activo"
    ).all()
    
    empresas_disp = []
    permisos_activos = set()
    
    # 1. Determinar empresa activa (Prioridad: Header X-Company-ID -> Contexto BD -> Primer disponible)
    active_id = request.headers.get("X-Company-ID") or get_company_context()
    if not active_id and resultados:
        active_id = resultados[0].UsuarioEmpresaRol.empresa_id

    # 2. Iterar resultados, llenar selector y extraer permisos de la empresa activa
    for r in resultados:
        emp_id = r.UsuarioEmpresaRol.empresa_id
        empresas_disp.append({
            "empresa_id": emp_id,
            "nombre_empresa": r.nombre_empresa,
            "rol": r.nombre_rol,
            "perfil": r.nombre_perfil or "N/A"
        })

        if emp_id == active_id:
            permisos_activos.update(_aplanar_permisos(r.rol_permisos))
            permisos_activos.update(_aplanar_permisos(r.perfil_permisos))

    # Fallback seguro para atributos del usuario base
    nombre_user = getattr(current_user, 'nombre', getattr(current_user, 'username', 'N/A'))
    estado_user = "activo" if getattr(current_user, 'estado', True) else "inactivo"

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "nombre": nombre_user,
        "estado": estado_user,
        "active_company_id": active_id,
        "empresas_disponibles": empresas_disp,
        "permisos": list(permisos_activos)
    }
@router.post("/logout")
async def logout():
    # Simplificado para evitar dependencia de registrar_log si no está listo
    return {"success": True, "detail": "Sesión cerrada correctamente"}