from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario
from app.schemas.usuarios import UsuarioCreate, UsuarioResponse
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register-admin", response_model=UsuarioResponse)
def registrar_admin(user_in: UsuarioCreate, db: Session = Depends(get_db)):
    # ... (Código de registro que ya funcionó)
    user_exists = db.query(Usuario).filter(
        (Usuario.email == user_in.email) | (Usuario.username == user_in.username)
    ).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Usuario ya existe")
    
    nuevo_usuario = Usuario(
        nombre=user_in.nombre,
        username=user_in.username,
        email=user_in.email,
        password_hash=pwd_context.hash(user_in.password),
        rol=user_in.rol,
        estado=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.post("/login")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Buscar al usuario por email (usamos el campo 'username' del form para el email)
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

    return {
        "access_token": f"token_simulado_para_{usuario.username}",
        "token_type": "bearer",
        "user": {
            "email": usuario.email,
            "rol": usuario.rol,
            "nombre": usuario.nombre
        }
    }