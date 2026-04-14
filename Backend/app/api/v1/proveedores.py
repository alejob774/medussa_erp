from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.proveedor import ProveedorCreate, ProveedorResponse, ProveedorUpdate
from app.services import proveedor_service as crud
from app.utils.auditoria import registrar_log

router = APIRouter()

@router.post("/", response_model=ProveedorResponse)
async def crear_proveedor(request: Request, proveedor_in: ProveedorCreate, db: Session = Depends(get_db)):
    if crud.get_proveedor_by_nit(db, proveedor_in.nit):
        raise HTTPException(status_code=400, detail="El NIT ya está registrado")
    
    nuevo = crud.create_proveedor(db, proveedor_in)
    await registrar_log(db, request, modulo="COMPRAS", accion="CREAR_PROVEEDOR", objeto_id=nuevo.id)
    return nuevo

@router.get("/", response_model=list[ProveedorResponse])
async def listar_proveedores(db: Session = Depends(get_db), skip: int = 0, limit: int = 100):
    return crud.get_proveedores(db, skip=skip, limit=limit)

@router.put("/{proveedor_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(request: Request, proveedor_id: int, proveedor_in: ProveedorUpdate, db: Session = Depends(get_db)):
    actualizado = crud.update_proveedor(db, proveedor_id, proveedor_in)
    if not actualizado:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await registrar_log(db, request, modulo="COMPRAS", accion="ACTUALIZAR_PROVEEDOR", objeto_id=proveedor_id)
    return actualizado