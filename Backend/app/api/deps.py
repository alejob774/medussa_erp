from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.usuarios import Usuario
from app.core.config import settings
from app.core.context import get_company_context, set_company_context

# Configuración de OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """
    Valida el token JWT y retorna el objeto de usuario actual.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_company(
    x_company_id: str = Header(..., alias="X-Company-ID"),
    current_user: Usuario = Depends(get_current_user)
) -> str:
    """
    Valida que el contexto de la empresa esté establecido y que el usuario
    tenga acceso a dicha empresa.
    """
    empresa_id = get_company_context()
    
    if not empresa_id:
        # El middleware debería haberlo capturado, pero esto es una doble validación
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="El header X-Company-ID es obligatorio para esta operación."
        )

    # Lógica de seguridad: Validamos que el usuario pertenezca a la empresa
    # Esto asume que tu modelo Usuario tiene una relación o campo empresa_id
    if current_user.empresa_id != empresa_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a los datos de esta empresa."
        )
    
    return empresa_id