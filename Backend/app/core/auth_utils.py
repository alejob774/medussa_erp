from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.usuarios import Usuario
import bcrypt  # Importación directa

# Configuración para encriptar contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# --- FUNCIONES DE HASHING (Lo que faltaba) ---

import bcrypt  # Importación directa

# Eliminamos el pwd_context de passlib para evitar el conflicto
# pwd_context = CryptContext(schemes=["bcrypt"], ...) <- Borra o comenta esta línea

def get_password_hash(password: str) -> str:
    """Genera un hash usando bcrypt directamente para evitar errores de passlib"""
    # Convertimos a bytes
    pwd_bytes = password.encode('utf-8')
    # Generamos la sal y el hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    # Retornamos como string para la DB
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica la contraseña usando bcrypt directamente"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False
            
# app/core/auth_utils.py

def create_tokens(user_id: str, roles: list, permisos: list, empresa_id: str) -> tuple:
    """Genera los strings de Access y Refresh Token"""
    access_token_expires = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Payload para el Access Token
    to_encode = {
        "sub": str(user_id),
        "roles": roles,
        "permisos": permisos,
        "empresa_id": empresa_id,
        "exp": access_token_expires
    }
    
    access_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # Generamos un refresh token simple (puedes ampliarlo luego)
    refresh_token = jwt.encode({"sub": str(user_id), "type": "refresh"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # DEVOLVEMOS UNA TUPLA (Importante para que el unpack funcione)
    return access_token, refresh_token
    
# --- FUNCIÓN DE VALIDACIÓN DE USUARIO ACTUAL ---

def get_current_user(res: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = res.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise credentials_exception
    return user