from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario, UsuarioEmpresaRol
from app.schemas.usuarios import UsuarioCreate, UsuarioResponse
from passlib.context import CryptContext
from app.utils.auditoria import registrar_log  # Importación de la HU-004

router = APIRouter()

# Configuración de seguridad para contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register-admin", response_model=UsuarioResponse)
async def registrar_admin(
    request: Request, 
    user_in: UsuarioCreate, 
    db: Session = Depends(get_db)
):
    # 1. Verificar si el usuario ya existe
    user_exists = db.query(Usuario).filter(
        (Usuario.email == user_in.email) | (Usuario.username == user_in.username)
    ).first()
    
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El email o el nombre de usuario ya están registrados"
        )
    
    # 2. Crear nuevo usuario administrador
    nuevo_usuario = Usuario(
        nombre=user_in.nombre,
        username=user_in.username,
        email=user_in.email,
        password_hash=pwd_context.hash(user_in.password),
        rol=user_in.rol,
        estado=True
    )
    db.add(nuevo_usuario)
    db.flush() # Para obtener el ID antes del commit

    # 3. Vincular con empresa y rol (HU-002)
    vinculo = UsuarioEmpresaRol(
        usuario_id=nuevo_usuario.id,
        empresa_id=user_in.empresa_id,
        rol_id=user_in.rol_id
    )
    db.add(vinculo)
    db.commit()
    db.refresh(nuevo_usuario)

    # 4. Registro de Auditoría (HU-004)
    await registrar_log(
        db=db,
        request=request,
        user_id=nuevo_usuario.id,
        user_name=nuevo_usuario.nombre,
        empresa_id=user_in.empresa_id,
        modulo="SEGURIDAD",
        accion="CREATE",
        descripcion=f"Registro inicial de administrador: {nuevo_usuario.username}"
    )

    return nuevo_usuario

@router.post("/login")
async def login(
    request: Request, 
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    # 1. Buscar al usuario por email
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verificar la contraseña
    if not pwd_context.verify(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Verificar si está activo
    if not usuario.estado:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    # 4. Obtener empresa activa para el log (HU-002/HU-004)
    relacion = db.query(UsuarioEmpresaRol).filter(UsuarioEmpresaRol.usuario_id == usuario.id).first()
    empresa_id = relacion.empresa_id if relacion else "SISTEMA"

    # 5. Registro de Auditoría de Login (HU-004)
    await registrar_log(
        db=db,
        request=request,
        user_id=usuario.id,
        user_name=usuario.nombre,
        empresa_id=empresa_id,
        modulo="SEGURIDAD",
        accion="LOGIN",
        descripcion=f"Inicio de sesión exitoso desde IP: {request.client.host}"
    )

    return {
        "access_token": f"token_simulado_para_{usuario.username}",
        "token_type": "bearer",
        "user": {
            "id": usuario.id,
            "email": usuario.email,
            "rol": usuario.rol,
            "nombre": usuario.nombre,
            "empresa_id": empresa_id
        }
    }