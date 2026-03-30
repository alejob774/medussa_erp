from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.usuarios import Usuario, UsuarioEmpresaRol
from app.schemas.usuarios import UsuarioResponse

router = APIRouter()

@router.get("/me", response_model=None)
def obtener_perfil_actual(email: str, db: Session = Depends(get_db)):
    # 1. Buscar el usuario
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # 2. Buscar su relación con Empresa y Rol (HU-002)
    relacion = db.query(UsuarioEmpresaRol).filter(UsuarioEmpresaRol.usuario_id == usuario.id).first()
    
    return {
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol_slug": usuario.rol
        },
        "acceso_empresa": {
            "empresa_id": relacion.empresa_id if relacion else None,
            "rol_id": relacion.rol_id if relacion else None
        }
    }