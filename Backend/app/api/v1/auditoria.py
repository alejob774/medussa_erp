from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
from app.db.session import get_db
from app.models.auditoria import Auditoria

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
def listar_auditoria(
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
    """
    Lista los logs de auditoría filtrados por empresa con soporte para 
    paginación y rangos de fecha.
    """
    # 1. Consulta base filtrada por Tenant
    query = db.query(Auditoria).filter(Auditoria.empresa_id == empresa_id)
    
    # 2. Aplicación de filtros opcionales
    if user_id:
        query = query.filter(Auditoria.user_id == user_id)
    if modulo:
        query = query.filter(Auditoria.modulo == modulo)
    if accion:
        query = query.filter(Auditoria.accion == accion)
    
    # Filtros de fecha (HEAD version)
    if fecha_desde:
        query = query.filter(Auditoria.fecha_hora >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Auditoria.fecha_hora <= fecha_hasta)
        
    # 3. Conteo total para paginación
    total = query.count()
    
    # 4. Obtención de resultados paginados
    logs = query.order_by(Auditoria.fecha_hora.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
    
    # 5. Respuesta estructurada estándar
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": logs
    }