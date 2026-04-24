from fastapi import APIRouter, Depends, Query, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
from app.db.session import get_db
from app.models.auditoria import Auditoria

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

router = APIRouter()

@router.get("/")
def listar_auditoria(
    response: Response,
    empresa_id: str,
    user_id: Optional[int] = None,
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 1. Construcción de la consulta base
    query = db.query(Auditoria).filter(Auditoria.empresa_id == empresa_id)
    
    # 2. Aplicación de filtros opcionales
    if user_id:
        query = query.filter(Auditoria.user_id == user_id)
    if modulo:
        query = query.filter(Auditoria.modulo == modulo)
    if accion:
        query = query.filter(Auditoria.accion == accion)
    
    # Filtros de fecha
    if fecha_desde:
        query = query.filter(Auditoria.fecha_hora >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Auditoria.fecha_hora <= fecha_hasta)
        
    # 3. Obtener el conteo total antes de paginar
    total_count = query.count()
    
    # 4. Aplicar orden y paginación (offset y limit)
    logs = query.order_by(Auditoria.fecha_hora.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
    
    # 5. Configurar el header X-Total-Count para el frontend
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    
    return logs