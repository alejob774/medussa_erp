from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario
from app.schemas.usuario import UsuarioCreate, Token
from app.core.auth_utils import get_password_hash, verify_password, create_tokens, get_current_user # <--- Debe llamarse igual
from fastapi.security import OAuth2PasswordRequestForm  # <--- ESTA ES LA QUE FALTA


router = APIRouter(prefix="/auth", tags=["Seguridad"])

@router.post("/register-admin", response_model=dict)
def registrar_admin(user_in: UsuarioCreate, db: Session = Depends(get_db)):
    # Verificar si ya existe
    if db.query(Usuario).filter(Usuario.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    nuevo_usuario = Usuario(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        roles=user_in.roles,
        permisos=["configuracion_total", "admin_usuarios"], # Permisos granulares
        empresa_id=user_in.empresa_id # <--- VERIFICA QUE ESTO NO FALTE
    )
    db.add(nuevo_usuario)
    db.commit()
    return {"message": "Administrador creado exitosamente"}

# app/api/v1/auth.py

def authenticate_user(db: Session, username: str, password: str):
    # 1. Buscar al usuario por username
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user:
        return False
    
    # 2. Verificar la contraseña usando la función que arreglamos antes
    if not verify_password(password, user.password_hash):
        return False
    
    return user

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Aquí es donde ocurre el 'unpacking' (access, refresh)
    access, refresh = create_tokens(
        user_id=str(user.id),
        roles=user.roles,
        permisos=user.permisos,
        empresa_id=str(user.empresa_id) if user.empresa_id else ""
    )
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer"
    }
    