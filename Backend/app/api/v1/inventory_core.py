from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_company
from app.schemas.inventario import MovimientoCreate, SaldoResponse, TransferenciaCreate
from app.services import inventario_service as crud

router = APIRouter()

@router.get("/saldos", response_model=List[SaldoResponse])
async def obtener_saldos(
    producto_id: Optional[int] = None,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    query = db.query(InventarioSaldo).filter(InventarioSaldo.empresa_id == empresa_id)
    if producto_id:
        query = query.filter(InventarioSaldo.producto_id == producto_id)[cite: 17]
    return query.all()

@router.post("/movimientos", status_code=201)
async def crear_movimiento(
    mov_in: MovimientoCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    # Registrar entrada/salida/ajuste[cite: 15]
    return await crud.registrar_movimiento(db, mov_in, empresa_id)

@router.post("/transferencias")
async def ejecutar_transferencia(
    trans_in: TransferenciaCreate,
    db: Session = Depends(get_db),
    empresa_id: str = Depends(get_current_company)
):
    # Mover stock entre bodegas[cite: 15, 17]
    return await crud.transferir_stock(db, trans_in, empresa_id)