import os
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import jwt
from dotenv import load_dotenv

# Carga de variables de entorno para manejar SECRET_KEY de forma segura
load_dotenv()

# Configuraciones para JWT
# Se recomienda que en producción el SECRET_KEY sea una cadena aleatoria larga
SECRET_KEY = os.getenv("SECRET_KEY", "medussa_erp_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas (ajustable según necesidad)

def get_password_hash(password: str) -> str:
    """
    Genera un hash seguro utilizando bcrypt.
    Se trunca a 72 bytes para mantener compatibilidad con Python 3.13 y el límite de bcrypt.
    """
    pwd_bytes = password.encode('utf-8')
    # El límite de bcrypt es de 72 bytes; truncamos para evitar errores de valor
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña en texto plano coincide con el hash almacenado.
    Retorna False si hay cualquier error en el formato del hash.
    """
    try:
        if not hashed_password:
            return False
            
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
            
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except (ValueError, TypeError, Exception):
        # Captura errores si el hash en la DB no es un formato válido de bcrypt
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT firmado para la sesión del usuario.
    Incluye una fecha de expiración automática.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt