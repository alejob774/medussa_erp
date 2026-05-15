from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.configuracion import Configuracion as Empresa
from app.models.seguridad import Perfil, Rol, UsuarioEmpresaRol
from app.models.usuarios import Usuario


def _aplanar_permisos(permisos_raw: Any) -> List[str]:
    if not permisos_raw:
        return []
    if isinstance(permisos_raw, list):
        return sorted({str(item) for item in permisos_raw})
    if isinstance(permisos_raw, dict):
        return sorted({str(key) for key, value in permisos_raw.items() if value})
    return []


def _validar_usuario_activo(usuario: Usuario) -> None:
    if not getattr(usuario, "estado", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )


def _filas_empresas_usuario(db: Session, usuario: Usuario):
    _validar_usuario_activo(usuario)
    return db.query(
        UsuarioEmpresaRol,
        Empresa,
        Rol.nombre.label("nombre_rol"),
        Rol.permisos.label("rol_permisos"),
        Perfil.nombre.label("nombre_perfil"),
        Perfil.permisos.label("perfil_permisos"),
    ).join(
        Empresa, UsuarioEmpresaRol.empresa_id == Empresa.empresa_id
    ).join(
        Rol, UsuarioEmpresaRol.rol_id == Rol.id
    ).outerjoin(
        Perfil, UsuarioEmpresaRol.perfil_id == Perfil.id
    ).filter(
        UsuarioEmpresaRol.usuario_id == usuario.id,
        UsuarioEmpresaRol.estado == "activo",
        Empresa.estado == True
    ).all()


def formatear_empresa_usuario(fila) -> Dict[str, Any]:
    empresa = fila.Empresa
    permisos = set(_aplanar_permisos(fila.rol_permisos))
    permisos.update(_aplanar_permisos(fila.perfil_permisos))
    perfiles = [fila.nombre_perfil] if fila.nombre_perfil else []

    return {
        "id": empresa.empresa_id,
        "backendId": empresa.id,
        "empresaId": empresa.empresa_id,
        "nombre": empresa.nombre_empresa,
        "nombre_empresa": empresa.nombre_empresa,
        "nit": empresa.nit,
        "estado": bool(empresa.estado),
        "rol": fila.nombre_rol,
        "perfiles": perfiles,
        "permisos": sorted(permisos),
    }


def listar_empresas_usuario(db: Session, usuario: Usuario) -> List[Dict[str, Any]]:
    return [formatear_empresa_usuario(fila) for fila in _filas_empresas_usuario(db, usuario)]


def obtener_empresa_usuario(db: Session, usuario: Usuario, empresa_id: Optional[str]) -> Dict[str, Any]:
    if not empresa_id:
        raise HTTPException(status_code=422, detail="empresaId es obligatorio")

    _validar_usuario_activo(usuario)
    filtros = [UsuarioEmpresaRol.empresa_id == str(empresa_id)]
    if str(empresa_id).isdigit():
        filtros.append(Empresa.id == int(empresa_id))

    fila = db.query(
        UsuarioEmpresaRol,
        Empresa,
        Rol.nombre.label("nombre_rol"),
        Rol.permisos.label("rol_permisos"),
        Perfil.nombre.label("nombre_perfil"),
        Perfil.permisos.label("perfil_permisos"),
    ).join(
        Empresa, UsuarioEmpresaRol.empresa_id == Empresa.empresa_id
    ).join(
        Rol, UsuarioEmpresaRol.rol_id == Rol.id
    ).outerjoin(
        Perfil, UsuarioEmpresaRol.perfil_id == Perfil.id
    ).filter(
        UsuarioEmpresaRol.usuario_id == usuario.id,
        UsuarioEmpresaRol.estado == "activo",
        Empresa.estado == True,
        or_(*filtros)
    ).first()

    if not fila:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene membresia activa para la empresa solicitada"
        )

    return formatear_empresa_usuario(fila)
