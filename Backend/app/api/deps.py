# app/api/deps.py
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.usuarios import Usuario
from app.models.seguridad import UsuarioEmpresaRol
from app.core.config import settings
from app.core.context import get_company_context

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> Usuario:
    """
    Valida el token JWT y retorna el objeto de usuario actual.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
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

async def get_current_company(
    x_company_id: str = Header(..., alias="X-Company-ID", description="ID de la empresa (Tenant)"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    """
    Estrategia unificada: Valida que el usuario tenga acceso activo a la empresa 
    especificada exclusivamente vía el header X-Company-ID.
    """
    vinculo = db.query(UsuarioEmpresaRol).filter(
        UsuarioEmpresaRol.usuario_id == current_user.id,
        UsuarioEmpresaRol.empresa_id == x_company_id,
        UsuarioEmpresaRol.estado == "activo"
    ).first()

    if not vinculo:
        if not getattr(current_user, 'is_superuser', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El usuario no tiene permisos activos para la empresa: {x_company_id}"
            )
            
    return x_company_id