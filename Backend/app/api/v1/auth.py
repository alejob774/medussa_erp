# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
async def login(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = db.query(Usuario).filter(
        or_(Usuario.email == form_data.username, Usuario.username == form_data.username)
    ).first()
    
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        await registrar_log(db, request, modulo="AUTH", accion="LOGIN_FAILED")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    access_token = create_access_token(data={"sub": usuario.username})
    await registrar_log(db, request, user_id=usuario.id, user_name=usuario.username, modulo="AUTH", accion="LOGIN_SUCCESS")
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserMeResponse)
async def get_me(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Obtener todas las membresías con sus detalles
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

    # 2. Lógica de resolución de Empresa Activa
    # Prioridad 1: Header X-Company-ID (ya resuelto en el contexto por el middleware)
    active_id = get_company_context()
    
    # Fallback: Si no hay header o el contexto está vacío, tomar la primera membresía
    if not active_id and lista_membresias:
        active_id = lista_membresias[0]["empresa_id"]

    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "apellido": current_user.apellido,
        "username": current_user.username,
        "email": current_user.email,
        "active_company_id": active_id, # Retorno del ID resuelto
        "empresas": lista_membresias
    }
    
@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Endpoint de Logout. 
    Invalida la sesión actual en el contexto del cliente y registra el evento.
    """
    # 1. Registro en Auditoría
    # Identificamos el cierre de sesión para trazabilidad de seguridad
    await registrar_log(
        db, 
        request, 
        user_id=current_user.id, 
        user_name=current_user.username, 
        modulo="AUTH", 
        accion="LOGOUT_SUCCESS",
        descripcion="El usuario cerró sesión exitosamente."
    )

    # 2. Nota sobre JWT:
    # Al ser una implementación stateless, el servidor no "borra" el token de la memoria.
    # Si en el futuro implementas una Blacklist en Redis, aquí se añadiría el jti del token.

    return {"message": "Logout exitoso"}