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

<<<<<<< HEAD
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
=======
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
>>>>>>> Back
