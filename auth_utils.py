from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

# Seguridad de autenticación: Hashing robusto con Argon2/Bcrypt
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Configuración de JWT (Para desarrollo usamos HS256, en prod RS256)
SECRET_KEY = "MEDUSSA_SUPER_SECRET_KEY"
ALGORITHM = "HS256"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_tokens(user_id: str, roles: list, permisos: list):
    """Genera el par Access y Refresh Token"""
    # Access Token (Vida corta: 15 min)
    access_expire = datetime.utcnow() + timedelta(minutes=15)
    access_payload = {
        "sub": user_id,
        "roles": roles,
        "permisos": permisos,
        "exp": access_expire,
        "type": "access"
    }
    
    # Refresh Token (Vida larga: 7-30 días)
    refresh_expire = datetime.utcnow() + timedelta(days=7)
    refresh_payload = {"sub": user_id, "exp": refresh_expire, "type": "refresh"}
    
    return (
        jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM),
        jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)
    )