from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth_utils import get_current_user
from app.schemas.configuracion import ConfigSchema, ConfiguracionResponse
from app.models.usuarios import Usuario
# Asumiendo que tienes un modelo llamado Configuracion en app.models.config
from app.models.configuracion import Configuracion 

router = APIRouter()

@router.post("/", response_model=ConfiguracionResponse)
def guardar_configuracion(
    datos: ConfigSchema, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(get_current_user)
):
    # Validamos que el usuario sea Administrador
    if "Administrador" not in current_user.roles:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    # Buscamos si ya existe configuración para la empresa del usuario
    config = db.query(Configuracion).filter(Configuracion.empresa_id == current_user.empresa_id).first()

    if config:
        # Actualizar existente
        for key, value in datos.model_dump().items():
            setattr(config, key, value)
    else:
        # Crear nueva asociada a la empresa del admin
        config = Configuracion(**datos.model_dump(), empresa_id=current_user.empresa_id)
        db.add(config)
    
    db.commit()
    db.refresh(config)
    return config