from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...db.session import get_db
from ...models.configuracion import ParametrosGenerales
from ...schemas.configuracion import ConfiguracionBase, ConfiguracionResponse
# En app/api/v1/configuracion.py
from app.core.auth_utils import get_password_hash, verify_password, create_tokens, get_current_user # <--- Debe llamarse igual
from app.schemas.configuracion import ConfigSchema # <--- Ajusta la ruta y el nombre


router = APIRouter(prefix="/configuracion", tags=["Configuración"])

@router.post("/")
@router.post("/", response_model=ConfiguracionResponse)
def crear_configuracion(
    datos: ConfigSchema, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user) # Si ya agregaste seguridad
):
    # TODO LO QUE SIGUE DEBE TENER 4 ESPACIOS DE SANGRÍA
    nueva_config = Configuracion(**datos.dict())
    db.add(nueva_config)
    db.commit()
    db.refresh(nueva_config)
    return nueva_config
    
@router.post("/", response_model=ConfiguracionResponse)
def guardar_configuracion(data: ConfiguracionBase, db: Session = Depends(get_db)):
    # Solo permitimos un registro de configuración global
    config_existente = db.query(ParametrosGenerales).first()
    
    if config_existente:
        # Escenario Dos: Actualización
        for key, value in data.dict().items():
            setattr(config_existente, key, value)
        db.commit()
        db.refresh(config_existente)
        return config_existente
    
    # Escenario Uno: Creación inicial
    nueva_config = ParametrosGenerales(**data.dict())
    db.add(nueva_config)
    db.commit()
    db.refresh(nueva_config)
    return nueva_config

@router.get("/", response_model=ConfiguracionResponse)
def obtener_configuracion(db: Session = Depends(get_db)):
    config = db.query(ParametrosGenerales).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return config