from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.db.session import get_db
from app.models.configuracion import Configuracion
from app.schemas.configuracion import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.utils.auditoria import registrar_log
<<<<<<< HEAD
from app.api.deps import get_current_user  # <--- Agrega esta línea
=======
from app.api.deps import get_current_user
from app.models.usuarios import Usuario
>>>>>>> Back

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

<<<<<<< HEAD
@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def desactivar_empresa(
    id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # Asumiendo que usas protección de rutas
):
    # 1. Validar existencia antes de cualquier operación
    empresa = db.query(Configuracion).filter(Configuracion.id == id).first()
    
    if not empresa:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró la empresa con ID {id}"
        )

    # 2. Capturar estado anterior para auditoría
    antes = {
        "id": empresa.id,
        "empresa_id": empresa.empresa_id,
        "nombre_empresa": empresa.nombre_empresa,
        "estado": empresa.estado
    }

    # 3. Ejecutar borrado lógico (Soft Delete)
    # Se corrige el error de variable 'emp_in' que no existía
    empresa.estado = False
    
    try:
        db.commit()
        db.refresh(empresa)
        
        # 4. Registro de auditoría corregido
        await registrar_log(
            db, 
            request, 
            user_id=current_user.id if current_user else 0, 
            user_name=current_user.username if current_user else "SISTEMA",
            empresa_id=empresa.empresa_id, 
            modulo="CONFIGURACION", 
            accion="DELETE_LOGICO",
            descripcion=f"Desactivación lógica de la empresa: {empresa.nombre_empresa}",
            payload_antes=antes,
            payload_despues={"id": empresa.id, "estado": empresa.estado}
        )

        return {
            "status": "success",
            "message": f"Empresa '{empresa.nombre_empresa}' desactivada correctamente.",
            "id": id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al procesar la solicitud: {str(e)}"
        )
=======
    antes = {"estado": empresa.estado}
    empresa.estado = False
    db.commit()
    
    await registrar_log(
        db, request, user_id=current_user.id, user_name=current_user.username,
        empresa_id=empresa.empresa_id, modulo="EMPRESAS", accion="SOFT_DELETE",
        antes=antes, despues={"estado": False}
    )
    return {"message": f"Empresa {empresa.empresa_id} desactivada correctamente"}
>>>>>>> Back
