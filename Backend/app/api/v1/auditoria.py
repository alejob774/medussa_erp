from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.auditoria import Auditoria

# Definimos el esquema aquí también para que Swagger lo detecte en este recurso
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

router = APIRouter()

@router.get("/")
def listar_auditoria(
    empresa_id: str,
    user_id: Optional[int] = None,
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    query = db.query(Auditoria).filter(Auditoria.empresa_id == empresa_id)
    
    if user_id:
        query = query.filter(Auditoria.user_id == user_id)
    if modulo:
        query = query.filter(Auditoria.modulo == modulo)
    if accion:
        query = query.filter(Auditoria.accion == accion)
        
    total = query.count()
    logs = query.order_by(Auditoria.fecha_hora.desc()).offset(skip).limit(limit).all()
    
    return query.all()