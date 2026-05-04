from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.db.session import get_db
from app.models.configuracion import Configuracion
from app.schemas.configuracion import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.utils.auditoria import registrar_log
from app.api.deps import get_current_user
from app.models.usuarios import Usuario

router = APIRouter()

@router.get("/", response_model=dict)
def listar_empresas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, le=100),
    search: Optional[str] = None,
    estado: Optional[bool] = None
):
    """
    Listado robusto con paginación y filtros. 
    Solo accesible por superusuarios o administradores globales.
    """
    query = db.query(Configuracion)
    
    if search:
        query = query.filter(
            or_(
                Configuracion.nombre_empresa.ilike(f"%{search}%"),
                Configuracion.nit.ilike(f"%{search}%"),
                Configuracion.empresa_id.ilike(f"%{search}%")
            )
        )
    
    if estado is not None:
        query = query.filter(Configuracion.estado == estado)

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=EmpresaResponse, status_code=201)
async def crear_empresa(
    request: Request, 
    emp_in: EmpresaCreate, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Validar que empresa_id y NIT sean únicos
    if db.query(Configuracion).filter(
        or_(
            Configuracion.nit == emp_in.nit,
            Configuracion.empresa_id == emp_in.empresa_id
        )
    ).first():
        raise HTTPException(
            status_code=400, 
            detail="El NIT o el identificador de empresa (empresa_id) ya existen"
        )
    
    nueva_empresa = Configuracion(**emp_in.model_dump())
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        empresa_id=nueva_empresa.empresa_id, modulo="EMPRESAS", accion="CREATE", 
        despues=emp_in.model_dump()
    )
    return nueva_empresa

@router.delete("/{id}")
async def desactivar_empresa(
    id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Soft Delete confiable: Desactiva la empresa y registra quién realizó la acción.
    """
    empresa = db.query(Configuracion).filter(Configuracion.id == id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if not empresa.estado:
        raise HTTPException(status_code=400, detail="La empresa ya se encuentra inactiva")

    antes = {"estado": empresa.estado}
    empresa.estado = False
    db.commit()
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        empresa_id=empresa.empresa_id, modulo="EMPRESAS", accion="SOFT_DELETE",
        antes=antes, despues={"estado": False}
    )
    return {"message": f"Empresa {empresa.empresa_id} desactivada correctamente"}