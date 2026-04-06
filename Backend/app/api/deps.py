from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario
from app.core.config import settings

# La URL debe ser relativa al prefijo definido en main.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Validación de firma usando la SECRET_KEY de config.py
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        
        if username is None:
            print("DEBUG: Token sin campo 'sub'")
            raise credentials_exception
            
    except JWTError as e:
        # Aquí es donde verás "Signature verification failed" si las llaves no coinciden
        print(f"DEBUG: Error de validación: {e}")
        raise credentials_exception

    # Búsqueda del usuario por el username extraído del token
    user = db.query(Usuario).filter(Usuario.username == username).first()
    
    if user is None:
        print(f"DEBUG: Usuario {username} no encontrado en DB")
        raise credentials_exception
        
    return user