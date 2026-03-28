from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, Token
from app.core.auth_utils import get_password_hash, verify_password, create_tokens, get_current_user # <--- Debe llamarse igual

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
        permisos=["configuracion_total", "admin_usuarios"] # Permisos granulares
    )
    db.add(nuevo_usuario)
    db.commit()
    return {"message": "Administrador creado exitosamente"}

@router.post("/login", response_model=Token)
def login(payload: dict, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == payload["username"]).first()
    if not user or not verify_password(payload["password"], user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access, refresh = create_tokens(
        user_id=str(user.id),
        roles=user.roles,
        permisos=user.permisos,
        empresa_id=str(user.empresa_id) if user.empresa_id else ""
    )
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}