import os
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings # Importación vital
from dotenv import load_dotenv

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    return pwd_context.verify(plain_password, hashed_password)
    
def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    # Se usa la KEY y el ALGORITHM del archivo centralizado
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt