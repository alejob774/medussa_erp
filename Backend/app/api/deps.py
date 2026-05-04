from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario
from app.models.seguridad import UsuarioEmpresaRol  # Importación corregida
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
) -> Usuario:
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
    x_company_id: str = Header(..., alias="X-Company-ID"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    # Validación contra el modelo unificado UsuarioEmpresaRol
    vínculo = db.query(UsuarioEmpresaRol).filter(
        UsuarioEmpresaRol.usuario_id == current_user.id,
        UsuarioEmpresaRol.empresa_id == x_company_id,
        UsuarioEmpresaRol.estado == "activo"
    ).first()

    if not vínculo:
        raise HTTPException(
            status_code=403, 
            detail="No tiene permisos para la empresa solicitada o su acceso está inactivo"
        )
    
    return x_company_id