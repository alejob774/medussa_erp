from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.context import get_company_context
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.configuracion import Configuracion as Empresa
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.usuarios import Usuario, UsuarioEmpresaConfig
from app.schemas.auth import SeleccionarEmpresaRequest, UserMeResponse
from app.services.empresa_service import obtener_empresa_usuario

router = APIRouter()


@router.post("/login")
async def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not getattr(usuario, "estado", True):
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    config_inicial = db.query(UsuarioEmpresaConfig).filter(
        UsuarioEmpresaConfig.usuario_id == usuario.id
    ).first()
    token_data = {"sub": usuario.username}
    if config_inicial:
        token_data.update({
            "empresa_id": config_inicial.empresa_id,
            "rol_id": config_inicial.rol_id
        })

    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


def _aplanar_permisos(permisos_raw: Any) -> set:
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
    current_user=Depends(get_current_user)
):
    resultados = db.query(
        UsuarioEmpresaRol,
        Empresa.nombre_empresa,
        Rol.nombre.label("nombre_rol"),
        Rol.permisos.label("rol_permisos"),
        Perfil.nombre.label("nombre_perfil"),
        Perfil.permisos.label("perfil_permisos")
    ).join(
        Empresa, UsuarioEmpresaRol.empresa_id == Empresa.empresa_id
    ).join(
        Rol, UsuarioEmpresaRol.rol_id == Rol.id
    ).outerjoin(
        Perfil, UsuarioEmpresaRol.perfil_id == Perfil.id
    ).filter(
        UsuarioEmpresaRol.usuario_id == current_user.id,
        UsuarioEmpresaRol.estado == "activo",
        Empresa.estado == True
    ).all()

    empresas_disp = []
    permisos_activos = set()

    active_id = request.headers.get("X-Company-ID") or get_company_context()
    if not active_id and resultados:
        active_id = resultados[0].UsuarioEmpresaRol.empresa_id

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

    nombre_user = getattr(current_user, "nombre", getattr(current_user, "username", "N/A"))
    estado_user = "activo" if getattr(current_user, "estado", True) else "inactivo"

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
    return {"success": True, "detail": "Sesion cerrada correctamente"}


@router.post("/seleccionar-empresa")
async def seleccionar_empresa(
    payload: SeleccionarEmpresaRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    empresa_activa = obtener_empresa_usuario(
        db,
        current_user,
        payload.empresa_id_solicitada()
    )
    return {
        "success": True,
        "data": {
            "activeCompanyId": empresa_activa["empresaId"],
            "empresaActiva": empresa_activa
        }
    }
