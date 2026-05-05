from fastapi import APIRouter, Depends, HTTPException, Query, Request  # <--- Agregado Request
from sqlalchemy.orm import Session
from typing import List

# Importaciones de dependencias y contexto
from app.api.deps import get_current_company, get_current_user
from app.db.session import get_db

# Importaciones de modelos y esquemas
from app.models.proveedores import Proveedor
from app.schemas.proveedor import ProveedorCreate, ProveedorResponse, ProveedorUpdate # <--- Asegurar ProveedorUpdate
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ProveedorResponse)
async def crear_proveedor(
    request: Request, # Agregado para auditoría
    obj_in: ProveedorCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    current_user = Depends(get_current_user)
):
    nuevo_obj = Proveedor(**obj_in.model_dump(), empresa_id=empresa_id)
    db.add(nuevo_obj)
    db.commit()
    db.refresh(nuevo_obj)
    
    # Corregido: Se pasa 'request' y datos del usuario[cite: 15]
    await registrar_log(db, request, user_id=current_user.id, user_name=current_user.username,
                        modulo="MAESTROS", accion="CREATE_PROVEEDOR", empresa_id=empresa_id)
    return nuevo_obj

@router.get("/{proveedor_id}", response_model=ProveedorResponse)
def obtener_proveedor(
    proveedor_id: int, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    # Validación de tenant[cite: 15, 21]
    db_obj = db.query(Proveedor).filter(Proveedor.id == proveedor_id, Proveedor.empresa_id == empresa_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return db_obj

@router.get("/", response_model=dict)
def listar_proveedores(
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company),
    skip: int = Query(0),
    limit: int = Query(50)
):
    query = db.query(Proveedor).filter(Proveedor.empresa_id == empresa_id)
    return {
        "total": query.count(),
        "items": query.offset(skip).limit(limit).all()
    }

@router.put("/{proveedor_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(
    request: Request, 
    proveedor_id: int, 
    proveedor_in: ProveedorUpdate, 
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    # Lógica de actualización directa para evitar dependencias de 'crud' externas si no están definidas
    db_obj = db.query(Proveedor).filter(
        Proveedor.id == proveedor_id, 
        Proveedor.empresa_id == empresa_id
    ).first()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado en esta empresa")
    
    update_data = proveedor_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.commit()
    db.refresh(db_obj)
    
    await registrar_log(db, request, modulo="COMPRAS", accion="ACTUALIZAR_PROVEEDOR", empresa_id=empresa_id)
    return db_obj