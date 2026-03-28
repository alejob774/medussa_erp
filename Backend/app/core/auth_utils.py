from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuario import Usuario # Ajusta según tu modelo
from app.core.config import settings # Donde guardas tu SECRET_KEY
from passlib.context import CryptContext
from datetime import datetime, timedelta
from app.core.config import settings
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
# Seguridad de autenticación: Hashing con Argon2/Bcrypt
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
security = HTTPBearer()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None:
        raise credentials_exception
    return user
   
# Configuración JWT (Estos valores deberían venir de un archivo .env en el futuro)
SECRET_KEY = "TU_LLAVE_SECRETA_MEDUSSA_ERP" 
ALGORITHM = "HS256" # Para desarrollo. En producción usaremos RS256.

# Funciones de utilidad
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_tokens(user_id: str, roles: list, permisos: list, empresa_id: str):
    """
    Genera el par Access y Refresh Token siguiendo el flujo JWT robusto.
    Incluye los claims requeridos por la normativa: user_id, roles, permisos, empresa_id.
    """
    # Access Token: Vida corta (15 min)
    access_expire = datetime.utcnow() + timedelta(minutes=15)
    access_payload = {
        "sub": user_id,
        "roles": roles,
        "permisos": permisos,
        "empresa_id": empresa_id,
        "exp": access_expire,
        "type": "access"
    }
    
    # Refresh Token: Vida larga (7 días)
    refresh_expire = datetime.utcnow() + timedelta(days=7)
    refresh_payload = {
        "sub": user_id, 
        "exp": refresh_expire, 
        "type": "refresh"
    }
    
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return access_token, refresh_token